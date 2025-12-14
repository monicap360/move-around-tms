export default function AdminTopBar() {
  return (
    <div
      className="glass-panel neon-blue"
      style={{
        width: "100%",
        padding: "18px 26px",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "24px",
      }}
    >
      <h2 style={{ fontSize: "20px", fontWeight: 600 }}>MoveAround Command</h2>
      <div style={{ opacity: 0.8 }}>Admin</div>
    </div>
  );
}
