"use client";

import Link from "next/link";
import { useState } from "react";

export default function LaunchPartnerPage() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    fleetSize: "",
    currentTools: "",
    notes: "",
    agree: false,
  });

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.agree) return;
    const subject = encodeURIComponent("Launch Partner Application");
    const body = encodeURIComponent(
      [
        `Name: ${form.name}`,
        `Company: ${form.company}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone}`,
        `Fleet Size: ${form.fleetSize}`,
        `Current Tools: ${form.currentTools}`,
        `Notes: ${form.notes}`,
      ].join("\n"),
    );
    window.location.href = `mailto:sales@movearoundtms.com?subject=${subject}&body=${body}`;
  }

  return (
    <div className="landing-performance" style={{ minHeight: "100vh" }}>
      <div className="container" style={{ padding: "80px 20px" }}>
        <Link href="/" className="btn btn-secondary">
          ← Back to Sales
        </Link>
        <h1 style={{ marginTop: 24 }}>Launch Partner Application</h1>
        <p style={{ color: "rgba(255,255,255,0.75)", maxWidth: 720 }}>
          Apply to run the 90‑day evaluation. If we hit your success metrics, you’ll receive a launch partner rate
          (30% below public pricing) for your first contract term.
        </p>

        <div className="reporting-card" style={{ marginTop: 32, maxWidth: 720 }}>
          <form onSubmit={submitForm} style={{ display: "grid", gap: 16 }}>
            <input
              className="input"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Company Name"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className="input"
              placeholder="Fleet Size (e.g., 8 trucks)"
              value={form.fleetSize}
              onChange={(e) => setForm({ ...form, fleetSize: e.target.value })}
            />
            <input
              className="input"
              placeholder="Current tools (Excel, QuickBooks, etc.)"
              value={form.currentTools}
              onChange={(e) => setForm({ ...form, currentTools: e.target.value })}
            />
            <textarea
              className="input"
              rows={4}
              placeholder="Notes or success metrics you want to track"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => setForm({ ...form, agree: e.target.checked })}
              />
              I agree to the{" "}
              <Link href="/launch-partner/terms" style={{ color: "var(--hyper-yellow)" }}>
                Launch Partner Terms
              </Link>
              .
            </label>
            <button className="btn btn-primary" type="submit" disabled={!form.agree}>
              Submit Application
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
