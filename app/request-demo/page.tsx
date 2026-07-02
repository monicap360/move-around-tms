"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PRODUCTS = [
  "CCB Sentinel™ (carrier clearance)",
  "Fast Scan™ (ticket capture)",
  "Dispatch Guard™",
  "Accounting Command Center",
  "Owner-Operator Compliance",
  "Reconciliation",
  "AccuriScale Intelligence™",
  "The whole platform / not sure yet",
];

export default function RequestDemoPage() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", fleet_size: "", product: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("product");
    if (p) { const match = PRODUCTS.find(x => x.toLowerCase().includes(p.toLowerCase())); setForm(f => ({ ...f, product: match || p })); }
  }, []);

  async function submit() {
    setErr("");
    if (!form.name.trim() || !form.email.trim()) { setErr("Please add your name and email."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/demo-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json();
      if (j.ok) setDone(true); else setErr(j.error || "Something went wrong — try again.");
    } catch { setErr("Network error — please try again."); }
    finally { setBusy(false); }
  }

  const field = (label: string, key: keyof typeof form, type = "text", ph = "") => (
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inp} />
    </div>
  );

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "linear-gradient(135deg,#0a0510 0%,#1e1046 55%,#0c1a3a 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 900, fontSize: "1.4rem" }}>MoveAround <span style={{ color: "#a78bfa" }}>TMS</span></div>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.28em", color: "#8b7ba8", fontWeight: 700, marginTop: 4 }}>REQUEST A DEMO</div>
        </div>

        <div style={{ background: "rgba(18,10,32,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 20, padding: "28px 26px", boxShadow: "0 30px 90px rgba(0,0,0,0.5)" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>✅</div>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.3rem", fontWeight: 900 }}>Thanks, {form.name.split(" ")[0]}!</h2>
              <p style={{ margin: "0 0 22px", color: "#c4b5fd", fontSize: "0.9rem", lineHeight: 1.6 }}>Your demo request is in — we'll reach out shortly to set up a time.</p>
              <Link href="/" style={{ color: "#a78bfa", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>← Back to MoveAround</Link>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 20px", color: "#8b7ba8", fontSize: "0.86rem", lineHeight: 1.6 }}>See MoveAround in action on your own operation. Tell us a little about your fleet and we'll set up a walkthrough.</p>
              <div style={{ display: "grid", gap: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                  {field("Your name *", "name")}
                  {field("Company", "company")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                  {field("Email *", "email", "email", "you@company.com")}
                  {field("Phone", "phone", "tel")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                  {field("Fleet size (trucks)", "fleet_size", "number")}
                  <div>
                    <label style={lbl}>Interested in</label>
                    <select value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} style={inp}>
                      <option value="">Choose a product…</option>
                      {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Anything you'd like us to know?</label>
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="What are you hoping to solve?" />
                </div>
              </div>
              {err && <div style={{ color: "#fca5a5", fontSize: "0.82rem", marginTop: 12, fontWeight: 600 }}>{err}</div>}
              <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 18, padding: "13px", borderRadius: 12, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.95rem", color: "#fff", background: busy ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#2563eb)", boxShadow: "0 10px 26px rgba(124,58,237,0.4)" }}>{busy ? "Sending…" : "Request My Demo"}</button>
              <div style={{ textAlign: "center", marginTop: 14 }}>
                <Link href="/" style={{ color: "#64748b", fontSize: "0.78rem", textDecoration: "none" }}>← Back to MoveAround</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#8b7ba8", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
