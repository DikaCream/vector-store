import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Address } from "viem";
import { getAccount, switchToStudionet } from "../lib/client";
import type { Document, SearchResult, Toast } from "../types";

interface VectorStoreContextType {
  account: Address | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  documents: Document[];
  searchResults: SearchResult[];
  loading: boolean;
  error: string | null;
  toasts: Toast[];
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: number) => void;
  fetchDocuments: () => Promise<void>;
  search: (query: string, topK: number) => Promise<void>;
  submitText: (content: string) => Promise<void>;
  submitUrl: (url: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const VectorStoreContext = createContext<VectorStoreContextType | null>(null);

let toastId = 0;

export function VectorStoreProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await switchToStudionet();
      const addr = await getAccount();
      setAccount(addr);
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      addToast("Failed to connect wallet", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setDocuments([]);
    setSearchResults([]);
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!account) return;
    try {
      const { readContract } = await import("../lib/contract");
      const docs = await readContract<any[]>("listDocuments");
      setDocuments(
        docs.map((d) => ({
          id: Number(d.id),
          document_id: Number(d.id),
          content: d.content,
          submitter: d.submitter,
          timestamp: Number(d.timestamp),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
    }
  }, [account]);

  const search = useCallback(async (query: string, topK: number) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    if (!account) {
      addToast("Connect wallet first", "error");
      return;
    }
    try {
      setLoading(true);
      const { getWalletClient } = await import("../lib/client");
      const { writeContractAndDecode, readContract } = await import("../lib/contract");
      const client = await getWalletClient();
      
      // Call search as a write transaction and decode return value
      const rawResults = await writeContractAndDecode<any[]>(
        client,
        "search",
        [query, BigInt(topK)]
      );
      
      // For each result, fetch full document details
      const fullResults = await Promise.all(
        rawResults.map(async (r) => {
          const doc = await readContract<any>("getDocument", [BigInt(r.document_id)]);
          return {
            document_id: Number(r.document_id),
            id: Number(r.document_id),
            similarity_score: Number(r.similarity_score),
            reason: r.reason,
            content: doc?.content || "",
            submitter: doc?.submitter || "",
            timestamp: Number(doc?.timestamp || 0),
          };
        })
      );
      
      setSearchResults(fullResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      addToast("Search failed", "error");
    } finally {
      setLoading(false);
    }
  }, [account, addToast]);

  const submitText = useCallback(async (content: string) => {
    if (!account) throw new Error("Not connected");
    try {
      setLoading(true);
      const { getWalletClient } = await import("../lib/client");
      const { writeContract, waitForTransaction } = await import("../lib/contract");
      const client = await getWalletClient();
      const hash = await writeContract(client, "submit", [content]);
      addToast("Submitting document...", "info");
      await waitForTransaction(hash);
      addToast("Document submitted!", "success");
      await fetchDocuments();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Submit failed", "error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, addToast, fetchDocuments]);

  const submitUrl = useCallback(async (url: string) => {
    if (!account) throw new Error("Not connected");
    try {
      setLoading(true);
      const { getWalletClient } = await import("../lib/client");
      const { writeContract, waitForTransaction } = await import("../lib/contract");
      const client = await getWalletClient();
      const hash = await writeContract(client, "submit_from_url", [url]);
      addToast("Fetching and submitting...", "info");
      await waitForTransaction(hash);
      addToast("URL submitted!", "success");
      await fetchDocuments();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Submit failed", "error");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [account, addToast, fetchDocuments]);

  const refresh = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  return (
    <VectorStoreContext.Provider
      value={{
        account,
        isConnected: !!account,
        connect,
        disconnect,
        documents,
        searchResults,
        loading,
        error,
        toasts,
        addToast,
        removeToast,
        fetchDocuments,
        search,
        submitText,
        submitUrl,
        refresh,
      }}
    >
      {children}
    </VectorStoreContext.Provider>
  );
}

export function useVectorStore() {
  const ctx = useContext(VectorStoreContext);
  if (!ctx) throw new Error("useVectorStore must be used within VectorStoreProvider");
  return ctx;
}