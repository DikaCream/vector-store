import { useParams, Link } from "react-router-dom";
import { shortenAddress } from "../lib/client";
import { useEffect, useState } from "react";

export function DocumentPage() {
  const params = useParams<{ id: string }>();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const { readContract } = await import("../lib/contract");
        const doc = await readContract<any>("getDocument", [BigInt(params.id!)]);
        if (doc && doc.id) {
          setDocument({
            id: Number(doc.id),
            document_id: Number(doc.id),
            content: doc.content,
            submitter: doc.submitter,
            timestamp: Number(doc.timestamp),
          });
        } else {
          setError("Document not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load document");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [params.id]);

  if (loading) {
    return <div style={styles.loading}>Loading document...</div>;
  }

  if (error || !document) {
    return (
      <div style={styles.error}>
        <h2>Document Not Found</h2>
        <p>{error || "Document does not exist"}</p>
        <Link to="/" style={styles.backLink}>← Back to Board</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>← Back to Board</Link>

      <article style={styles.article}>
        <header style={styles.header}>
          <h1 style={styles.title}>Document #{document.id}</h1>
          <div style={styles.meta}>
            <span>Submitted by: <strong>{shortenAddress(document.submitter)}</strong></span>
            <span>•</span>
            <span>{new Date(document.timestamp * 1000).toLocaleString()}</span>
          </div>
        </header>

        <div style={styles.content}>
          <pre style={styles.pre}>{document.content}</pre>
        </div>

        <footer style={styles.footer}>
          <Link to={`/?q=${encodeURIComponent(document.content.slice(0, 100))}&k=5`} style={styles.findSimilar}>
            Find Similar Documents
          </Link>
        </footer>
      </article>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "800px", margin: "0 auto" },
  backLink: { display: "inline-block", marginBottom: "16px", color: "#1976d2", textDecoration: "none", fontWeight: 500 },
  article: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", overflow: "hidden" },
  header: { padding: "24px", borderBottom: "1px solid #e0e0e0" },
  title: { margin: "0 0 12px", fontSize: "1.5rem" },
  meta: { display: "flex", gap: "8px", color: "#666", fontSize: "0.9rem" },
  content: { padding: "24px" },
  pre: { margin: 0, whiteSpace: "pre-wrap", wordWrap: "break-word", fontFamily: "inherit", lineHeight: 1.6, fontSize: "1rem" },
  footer: { padding: "16px 24px", borderTop: "1px solid #e0e0e0", background: "#fafafa" },
  findSimilar: { color: "#1976d2", textDecoration: "none", fontWeight: 500 },
  loading: { textAlign: "center", padding: "48px", color: "#666" },
  error: { textAlign: "center", padding: "48px", color: "#c62828" },
};