"use client";

import Link from "next/link";

export default function RonyxPrivacyPage() {
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
        <h1 style={{ marginTop: 16, fontSize: "2rem", fontWeight: 800 }}>Ronyx Privacy Policy</h1>
        <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 8 }}>
          This policy applies to data collected within the Ronyx Logistics TMS portal.
        </p>
        <h3 style={{ marginTop: 20 }}>1. Data Collected</h3>
        <p>Operational, ticket, and user data submitted through the portal.</p>
        <h3 style={{ marginTop: 16 }}>2. Usage</h3>
        <p>Used to provide services, improve operations, and support compliance.</p>
        <h3 style={{ marginTop: 16 }}>3. Sharing</h3>
        <p>Data is not sold. It may be shared with necessary service providers.</p>
        <h3 style={{ marginTop: 16 }}>4. Requests</h3>
        <p>Contact support for access or deletion requests.</p>
        <p style={{ marginTop: 16, color: "rgba(15,23,42,0.6)" }}>
          Last updated: {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}
