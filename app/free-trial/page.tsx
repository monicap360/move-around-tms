"use client";

import { useEffect, useState } from "react";

const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #33415580", fontSize: "0.95rem", boxSizing: "border-box", outline: "none", background: "#0f172a", color: "#f1f5f9" };
const lbl: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" };

export default function FreeTrial() {
  const [f, setF] = useState({ name: "", company: "", email: "", phone: "", fleet_size: "", role: "", referral: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [ends, setEnds] = useState("");
  const [founding, setFounding] = useState(false);
  useEffect(() => { try { if (new URLSearchParams(window.location.search).get("founding") === "1") setFounding(true); } catch {} }, []);
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  async function submit() {
    if (!f.name.trim() || !f.company.trim()) { setErr("Name and company are required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setErr("Enter a valid email."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/trial-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, founding }) });
      const d = await res.json();
      if (res.ok && d.ok) { setEnds(d.trial_ends_at); setDone(true); }
      else setErr(d.error || "Something went wrong — try again.");
    } catch { setErr("Network error — please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 600px at 50% -10%, #1e293b 0%, #0b1220 55%, #070b14 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 560, background: "rgba(15,23,42,0.72)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, boxShadow: "0 30px 80px rgba(0,0,0,0.5)", padding: "34px 34px 30px", backdropFilter: "blur(6px)" }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.18em", color: "#2563eb", textTransform: "uppercase" }}>MoveAround TMS</div>
        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 46 }}>✅</div>
            <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", margin: "8px 0" }}>You're in — trial started</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Thanks, <strong style={{ color: "#e2e8f0" }}>{f.name}</strong>. We've started the <strong style={{ color: "#2563eb" }}>7-day free trial</strong> for <strong style={{ color: "#e2e8f0" }}>{f.company}</strong>{ends ? <> — free through <strong style={{ color: "#e2e8f0" }}>{new Date(ends + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}</strong></> : null}.
            </p>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>Check your inbox — we're setting up your private workspace and will send your login link to fill in your fleet details and customize it.</p>
            <a href="/" style={{ display: "inline-block", marginTop: 16, color: "#2563eb", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>← Back to movearoundtms.com</a>
          </div>
        ) : (
          <>
            {founding && <div style={{ display: "inline-block", background: "#fbbf24", color: "#0b1220", fontWeight: 900, fontSize: "0.68rem", letterSpacing: "0.06em", padding: "3px 10px", borderRadius: 999, marginTop: 8 }}>🚀 FOUNDING 100 — 50% OFF, LOCKED 12 MONTHS</div>}
            <h1 style={{ color: "#f8fafc", fontSize: "1.7rem", margin: "8px 0 4px", fontWeight: 800 }}>Start your 7-day free trial</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: 20 }}>{founding ? "You're claiming a Founding-100 spot: 50% off locked for 12 months, full access, and a hand in shaping the product. " : ""}No credit card. Set up your fleet, customize it, and run it free for a week.</p>

            {err && <div style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 10, padding: "10px 13px", fontSize: "0.85rem", fontWeight: 600, marginBottom: 14 }}>⚠ {err}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Your Name *</label><input value={f.name} onChange={e => set("name", e.target.value)} style={inp} placeholder="First and last name" /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Company *</label><input value={f.company} onChange={e => set("company", e.target.value)} style={inp} placeholder="Your trucking company" /></div>
              <div><label style={lbl}>Work Email *</label><input value={f.email} onChange={e => set("email", e.target.value)} style={inp} type="email" placeholder="you@company.com" /></div>
              <div><label style={lbl}>Phone</label><input value={f.phone} onChange={e => set("phone", e.target.value)} style={inp} type="tel" /></div>
              <div>
                <label style={lbl}>Fleet Size</label>
                <select value={f.fleet_size} onChange={e => set("fleet_size", e.target.value)} style={{ ...inp, appearance: "auto" as any }}>
                  <option value="">Select…</option><option>1–3 trucks</option><option>4–10 trucks</option><option>11–25 trucks</option><option>26–50 trucks</option><option>50+ trucks</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Your Role</label>
                <select value={f.role} onChange={e => set("role", e.target.value)} style={{ ...inp, appearance: "auto" as any }}>
                  <option value="">Select…</option><option>Owner</option><option>Dispatch</option><option>Office / Accounting</option><option>Safety / Compliance</option><option>Other</option>
                </select>
              </div>
            </div>

            <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 20, padding: "14px 0", borderRadius: 11, border: "none", background: busy ? "#64748b" : "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#ffffff", fontWeight: 900, fontSize: "1rem", cursor: busy ? "default" : "pointer", letterSpacing: "0.02em" }}>
              {busy ? "Starting your trial…" : "Start Free Trial →"}
            </button>
            <p style={{ color: "#64748b", fontSize: "0.72rem", textAlign: "center", marginTop: 12 }}>By starting a trial you agree to be contacted about your setup. No card required.</p>
          </>
        )}
      </div>
    </div>
  );
}
