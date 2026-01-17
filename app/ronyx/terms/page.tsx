import Link from "next/link";

export default function RonyxTermsPage() {
  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #080808;
          --ronyx-carbon: #121212;
          --ronyx-border: rgba(255, 215, 0, 0.25);
          --ronyx-accent: #ffd700;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(0, 180, 255, 0.08), transparent 55%), var(--ronyx-black);
          color: #ffffff;
          padding: 40px 24px;
        }
        .ronyx-card {
          max-width: 900px;
          margin: 0 auto;
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 14px;
          padding: 24px;
        }
      `}</style>
      <div className="ronyx-card">
        <Link href="/ronyx" style={{ color: "var(--ronyx-accent)" }}>
          ← Back to Ronyx Dashboard
        </Link>
        <h1 style={{ marginTop: 16, fontSize: "2rem", fontWeight: 800 }}>Ronyx Terms of Service</h1>
        <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 8 }}>
          These terms apply to the Ronyx Logistics TMS portal.
        </p>
        <h3 style={{ marginTop: 20 }}>1. Access & Use</h3>
        <p>Ronyx users are authorized to use the portal for internal operations only.</p>
        <h3 style={{ marginTop: 16 }}>2. Data & Security</h3>
        <p>Operational data remains Ronyx property and is protected by standard security controls.</p>
        <h3 style={{ marginTop: 16 }}>3. Acceptable Use</h3>
        <p>Do not misuse, reverse engineer, or disrupt the portal.</p>
        <h3 style={{ marginTop: 16 }}>4. Updates</h3>
        <p>Terms may be updated with notice.</p>
        <p style={{ marginTop: 16, color: "rgba(255,255,255,0.6)" }}>
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
