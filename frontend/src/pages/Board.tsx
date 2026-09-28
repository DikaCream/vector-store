import { useVectorStore } from "../context/VectorStoreContext";
import { Link, useSearchParams } from "react-router-dom";
import { shortenAddress } from "../lib/client";
import type { SearchResult } from "../types";
import { useEffect, useState } from "react";

export function Board() {
  const { documents, searchResults, loading, error, search, fetchDocuments, submitText, submitUrl } = useVectorStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [topK, setTopK] = useState(3);
  const [activeTab, setActiveTab] = useState<"all" | "search">("all");

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query, k: String(topK) });
      search(query, topK);
      setActiveTab("search");
    }
  };

  const handleSubmitText = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const content = new FormData(form).get("content") as string;
    if (content.trim()) {
      await submitText(content);
      form.reset();
    }
  };

  const handleSubmitUrl = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const url = new FormData(form).get("url") as string;
    if (url.trim()) {
      await submitUrl(url);
      form.reset();
    }
  };

  const displayDocs = activeTab === "search" ? searchResults : documents;

  return (
    <div style={styles.container}>
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Submit Document</h2>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === "all" ? styles.tabActive : {}) }}
            onClick={() => setActiveTab("all")}
          >
            All Documents
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === "search" ? styles.tabActive : {}) }}
            onClick={() => setActiveTab("search")}
          >
            Search Results
          </button>
        </div>

        <div style={styles.forms}>
          <form onSubmit={handleSubmitText} style={styles.form}>
            <h3 style={styles.formTitle}>Submit Text</h3>
            <textarea
              name="content"
              style={styles.textarea}
              placeholder="Paste or type your document text here..."
              rows={4}
              required
            />
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? "Submitting..." : "Submit Text"}
            </button>
          </form>

          <form onSubmit={handleSubmitUrl} style={styles.form}>
            <h3 style={styles.formTitle}>Submit from URL</h3>
            <input
              name="url"
              type="url"
              style={styles.input}
              placeholder="https://example.com/article"
              required
            />
            <p style={styles.hint}>Fetches page text and stores it via LLM judgment</p>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? "Fetching..." : "Submit URL"}
            </button>
          </form>
        </div>
      </section>

      <section style={styles.section}>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <h2 style={styles.sectionTitle}>Search Similar Documents</h2>
          <div style={styles.searchRow}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ ...styles.input, flex: 1 }}
              placeholder="Enter search query..."
            />
            <select value={topK} onChange={(e) => setTopK(Number(e.target.value))} style={styles.select}>
              <option value={1}>Top 1</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
            <button type="submit" style={styles.btnPrimary} disabled={loading || !query.trim()}>
              Search
            </button>
          </div>
        </form>

        {activeTab === "search" && query && (
          <p style={styles.searchInfo}>Showing results for: <strong>"{query}"</strong> (top {topK})</p>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          {activeTab === "search" ? `Search Results (${searchResults.length})` : `All Documents (${documents.length})`}
        </h2>

        {error && <div style={styles.error}>{error}</div>}

        {loading && activeTab === "search" ? (
          <div style={styles.loading}>Searching...</div>
        ) : displayDocs.length === 0 ? (
          <div style={styles.empty}>
            {activeTab === "search" ? "No similar documents found." : "No documents yet. Submit one above!"}
          </div>
        ) : (
          <ul style={styles.list}>
            {displayDocs.map((doc) => (
              <li key={doc.document_id || doc.id} style={styles.listItem}>
                <Link to={`/document/${doc.document_id || doc.id}`} style={styles.docLink}>
                  <div style={styles.docHeader}>
                    <span style={styles.docId}>#{doc.document_id || doc.id}</span>
                    <span style={styles.docSubmitter}>{shortenAddress(doc.submitter as `0x${string}`)}</span>
                    <span style={styles.docTime}>{new Date(doc.timestamp * 1000).toLocaleString()}</span>
                  </div>
                  <p style={styles.docPreview}>
                    {doc.content.length > 300 ? doc.content.slice(0, 300) + "..." : doc.content}
                  </p>
                  {activeTab === "search" && "similarity_score" in doc && (
                    <div style={styles.score}>Similarity: {(doc as SearchResult).similarity_score}%</div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column", gap: "24px" },
  section: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px" },
  sectionTitle: { margin: "0 0 16px", fontSize: "1.25rem", fontWeight: 600 },
  tabs: { display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "1px solid #e0e0e0", paddingBottom: "8px" },
  tab: { background: "none", border: "none", padding: "8px 16px", cursor: "pointer", color: "#666", fontWeight: 500 },
  tabActive: { color: "#111", borderBottom: "2px solid #111" },
  forms: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  formTitle: { margin: "0 0 8px", fontSize: "1rem", fontWeight: 500 },
  textarea: { padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical" },
  input: { padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "0.9rem" },
  select: { padding: "12px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "0.9rem", background: "#fff" },
  hint: { margin: "0 0 8px", fontSize: "0.8rem", color: "#888" },
  btnPrimary: { background: "#111", color: "#fff", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: 500, fontSize: "0.9rem" },
  searchForm: { display: "flex", flexDirection: "column", gap: "12px" },
  searchRow: { display: "flex", gap: "12px", alignItems: "flex-end" },
  searchInfo: { margin: "8px 0 0", color: "#666" },
  error: { background: "#fdeaea", color: "#c62828", padding: "12px", borderRadius: "8px", marginBottom: "16px" },
  loading: { textAlign: "center", padding: "24px", color: "#666" },
  empty: { textAlign: "center", padding: "24px", color: "#888" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" },
  listItem: { border: "1px solid #e0e0e0", borderRadius: "8px", overflow: "hidden", transition: "box-shadow 0.2s" },
  docLink: { display: "block", padding: "16px", textDecoration: "none", color: "inherit" },
  docHeader: { display: "flex", gap: "12px", marginBottom: "8px", flexWrap: "wrap", fontSize: "0.8rem" },
  docId: { fontWeight: 600, color: "#111" },
  docSubmitter: { fontFamily: "monospace", color: "#666" },
  docTime: { color: "#888" },
  docPreview: { margin: 0, lineHeight: 1.5, color: "#333" },
  score: { marginTop: "8px", fontSize: "0.85rem", fontWeight: 500, color: "#1976d2" },
};