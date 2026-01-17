"use client";

import Link from "next/link";

export default function RonyxTermsPage() {
  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 40px 24px;
        }
        .ronyx-card {
          max-width: 900px;
          margin: 0 auto;
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
      `}</style>
      <div className="ronyx-card">
        <Link href="/ronyx" style={{ color: "var(--ronyx-accent)" }}>
          ← Back to Ronyx Dashboard
        </Link>
        <h1 style={{ marginTop: 16, fontSize: "2rem", fontWeight: 800 }}>Ronyx Terms of Service</h1>
        <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 8 }}>
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
        <p style={{ marginTop: 16, color: "rgba(15,23,42,0.6)" }}>
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
