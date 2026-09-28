import { Link } from "react-router-dom";

export function HowItWorks() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>How vector-store Works</h1>
      <p style={styles.intro}>
        A text similarity registry on GenLayer StudioNet. No embeddings, no vector databases — just
        LLM judgment via the equivalence principle.
      </p>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Submit a Document</h2>
        <ul style={styles.steps}>
          <li>
            <strong>Text:</strong> Paste any text (up to 10,000 characters). Stored with your address
            and timestamp.
          </li>
          <li>
            <strong>URL:</strong> Provide a public URL. The contract fetches the page as plain text
            via <code>gl.nondet.web.render(mode="text")</code> and stores the extracted content.
          </li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Search for Similar Documents</h2>
        <ul style={styles.steps}>
          <li>Enter a query and choose top-K (1–10).</li>
          <li>The contract builds a candidate list with a local word-overlap heuristic.</li>
          <li>An LLM judges semantic similarity under an equivalence principle:
            <pre style={styles.principle}>
"Two answers are equivalent if they select the same top documents
in the same order with comparable scores (±15 points) and coherent reasons.
Minor wording differences in reasons are acceptable."
            </pre>
          </li>
          <li>Returns ranked results with <code>document_id</code>, <code>similarity_score (0–100)</code>, and a <code>reason</code>.</li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Why This Works on StudioNet Today</h2>
        <ul style={styles.steps}>
          <li><strong>No embeddings runner needed</strong> — unlike the original VectorStore idea, this uses only primitives already live on StudioNet v0.3.0-rc7.</li>
          <li><strong>Web text fetch</strong> — <code>gl.nondet.web.render</code> is available and consensus-verified.</li>
          <li><strong>Equivalence principle</strong> — <code>gl.eq_principle.prompt_comparative</code> ensures validators agree on the ranking.</li>
          <li><strong>Deterministic local tests</strong> — all 11 direct tests pass in gltest's direct VM with mocked web/LLM responses.</li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Contract Interface</h2>
        <div style={styles.codeBlock}>
          <pre>{`// Write
submit(content: string) -> u256
submitFromUrl(url: string) -> u256

// Read
search(query: string, top_k: u256) -> SearchResult[]
getDocument(doc_id: u256) -> Document?
listDocuments() -> Document[]
count() -> u256

// Types
Document = { id: u256, content: string, submitter: Address, timestamp: u256 }
SearchResult = { document_id: u256, similarity_score: u256, reason: string }`}</pre>
        </div>
      </section>

      <div style={styles.cta}>
        <Link to="/" style={styles.btnPrimary}>Try It Now</Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" },
  title: { margin: "0 0 8px", fontSize: "2rem" },
  intro: { color: "#666", fontSize: "1.1rem", lineHeight: 1.6 },
  section: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: "12px", padding: "24px" },
  sectionTitle: { margin: "0 0 12px", fontSize: "1.25rem", fontWeight: 600 },
  steps: { margin: 0, paddingLeft: "20px", lineHeight: 1.8, color: "#333" },
  principle: { background: "#f5f5f5", padding: "12px", borderRadius: "8px", fontSize: "0.85rem", overflow: "auto", margin: "8px 0", whiteSpace: "pre-wrap" },
  codeBlock: { background: "#1e1e1e", borderRadius: "8px", overflow: "auto" },
  cta: { textAlign: "center", marginTop: "16px" },
  btnPrimary: { display: "inline-block", background: "#111", color: "#fff", padding: "14px 28px", borderRadius: "8px", textDecoration: "none", fontWeight: 600, fontSize: "1rem" },
};