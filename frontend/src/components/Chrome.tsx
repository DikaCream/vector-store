import { useVectorStore } from "../context/VectorStoreContext";
import { shortenAddress } from "../lib/client";

export function Chrome({ children }: { children: React.ReactNode }) {
  const { account, isConnected, connect, disconnect, toasts, removeToast } = useVectorStore();

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>vector-store</h1>
        <nav style={styles.nav}>
          {isConnected ? (
            <>
              <span style={styles.account}>{shortenAddress(account!)}</span>
              <button style={styles.btnGhost} onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button style={styles.btnPrimary} onClick={connect}>
              Connect Wallet
            </button>
          )}
        </nav>
      </header>
      <main style={styles.main}>{children}</main>
      <footer style={styles.footer}>
        <p>Text similarity registry on GenLayer StudioNet</p>
      </footer>
      <div style={styles.toastContainer}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...styles.toast, ...styles[t.type] }}>
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid #e0e0e0", background: "#fff" },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 600 },
  nav: { display: "flex", alignItems: "center", gap: "12px" },
  account: { fontFamily: "monospace", fontSize: "0.9rem", color: "#666" },
  btnPrimary: { background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: 500 },
  btnGhost: { background: "transparent", color: "#111", border: "1px solid #111", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: 500 },
  main: { flex: 1, padding: "24px", maxWidth: "900px", width: "100%", margin: "0 auto", boxSizing: "border-box" },
  footer: { padding: "16px 24px", borderTop: "1px solid #e0e0e0", textAlign: "center", color: "#888", fontSize: "0.85rem" },
  toastContainer: { position: "fixed", bottom: "24px", right: "24px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 100 },
  toast: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "280px", animation: "slideIn 0.3s ease" },
  success: { background: "#e8f5e9", color: "#2e7d32", borderLeft: "4px solid #4caf50" },
  error: { background: "#fdeaea", color: "#c62828", borderLeft: "4px solid #f44336" },
  info: { background: "#e3f2fd", color: "#1565c0", borderLeft: "4px solid #2196f3" },
};