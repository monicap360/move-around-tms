export default function HealthPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Health Check</h1>
      <p>Status: OK</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}
