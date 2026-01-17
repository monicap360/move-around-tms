"use client";

import Link from "next/link";

export default function RonyxOnboardingSupportPage() {
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
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1000px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <p className="ronyx-pill">Onboarding & Support</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Implementation & Support</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Structured onboarding, feedback loops, and ongoing support for early customers.
            </p>
          </div>
          <Link href="/ronyx" className="ronyx-action">
            Back to Dashboard
          </Link>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Onboarding Timeline</h2>
          {[
            "Week 1: Data import, driver setup, ticket templates",
            "Week 2: Dispatch workflow configuration + training",
            "Week 3: Driver app rollout + ticket OCR tuning",
            "Week 4: Billing automation + AR reporting",
          ].map((item) => (
            <div key={item} className="ronyx-row" style={{ marginBottom: 10 }}>
              <span>{item}</span>
            </div>
          ))}
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Support & Feedback</h2>
          {[
            "Dedicated onboarding manager and weekly check-ins",
            "In-app feedback pipeline for feature requests",
            "Priority support for early customers",
            "Monthly roadmap review based on field usage",
          ].map((item) => (
            <div key={item} className="ronyx-row" style={{ marginBottom: 10 }}>
              <span>{item}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
