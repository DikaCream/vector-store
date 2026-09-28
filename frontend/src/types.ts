export interface Document {
  id: number;
  document_id: number;
  content: string;
  submitter: string;
  timestamp: number;
}

export interface SearchResult {
  document_id: number;
  id: number;
  similarity_score: number;
  reason: string;
  content: string;
  submitter: string;
  timestamp: number;
}

export interface ContractStats {
  documents: number;
}

export type TransactionStatus = "idle" | "pending" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}