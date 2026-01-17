"use client";

import Link from "next/link";

export default function LaunchPartnerTermsPage() {
  return (
    <div className="landing-performance" style={{ minHeight: "100vh" }}>
      <div className="container" style={{ padding: "80px 20px" }}>
        <Link href="/launch-partner" className="btn btn-secondary">
          ← Back to Application
        </Link>
        <h1 style={{ marginTop: 24 }}>Launch Partner Terms & Rules</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", maxWidth: 820 }}>
          These terms outline the 90‑day evaluation, success metrics, and launch partner rate.
        </p>

        <div className="reporting-card" style={{ marginTop: 32, maxWidth: 880 }}>
          <h3>Evaluation Period (First 90 Days)</h3>
          <ul>
            <li>Discounted or free access during the pilot period.</li>
            <li>Customer provides weekly feedback and real‑world usage.</li>
            <li>MoveAround provides dedicated onboarding and support.</li>
          </ul>

          <h3 style={{ marginTop: 24 }}>Success Metrics</h3>
          <ul>
            <li>Reduce admin time on ticket/payroll tasks by agreed hours.</li>
            <li>Catch agreed percentage of discrepancies before billing.</li>
            <li>Complete Excel → ticket → match → payroll without manual re‑entry.</li>
          </ul>

          <h3 style={{ marginTop: 24 }}>Launch Partner Rate</h3>
          <ul>
            <li>At least 30% below public Essential pricing for the first contract term.</li>
            <li>12‑month agreement begins after success metrics are met.</li>
          </ul>

          <h3 style={{ marginTop: 24 }}>Data & Cooperation</h3>
          <ul>
            <li>Customer supplies sample files (Excel, tickets) for testing.</li>
            <li>Both parties keep data confidential and use it only for the pilot.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
