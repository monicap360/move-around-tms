"use client";

import { useState } from "react";
import Link from "next/link";

export default function SupportPage() {
  const [form, setForm] = useState({ name: "", company: "", email: "", subject: "", message: "", category: "concern" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setErr("");
    if (!form.email.trim() || !form.message.trim()) { setErr("Please add your email and a message."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json();
      if (j.ok) setDone(true); else setErr(j.error || "Something went wrong — try again.");
    } catch { setErr("Network error — please try again."); }
    finally { setBusy(false); }
  }

  const field = (label: string, key: keyof typeof form, type = "text", ph = "") => (
    <div><label style={lbl}>{label}</label><input type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder={ph} style={inp} /></div>
  );

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "linear-gradient(135deg,#0a1428 0%,#12294d 55%,#0d1d38 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontWeight: 900, fontSize: "1.4rem" }}>MoveAround <span style={{ color: "#38bdf8" }}>TMS</span></div>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.28em", color: "#8ea3c0", fontWeight: 700, marginTop: 4 }}>SUPPORT · WE'RE HERE TO HELP</div>
        </div>
        <div style={{ background: "rgba(15,32,57,0.7)", backdropFilter: "blur(16px)", border: "1px solid rgba(56,189,248,0.22)", borderRadius: 20, padding: "28px 26px", boxShadow: "0 30px 90px rgba(0,0,0,0.5)" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: "3rem", marginBottom: 10 }}>✅</div>
              <h2 style={{ margin: "0 0 8px", fontSize: "1.3rem", fontWeight: 900 }}>Got it{form.name ? `, ${form.name.split(" ")[0]}` : ""}!</h2>
              <p style={{ margin: "0 0 22px", color: "#aebfd6", fontSize: "0.9rem", lineHeight: 1.6 }}>Your message is in our support queue. We'll get back to you shortly.</p>
              <Link href="/" style={{ color: "#38bdf8", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>← Back to MoveAround</Link>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 20px", color: "#8ea3c0", fontSize: "0.86rem", lineHeight: 1.6 }}>Have a concern, a question, or found a problem? Send it here and it goes straight to our support team.</p>
              <div style={{ display: "grid", gap: 13 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>{field("Your name", "name")}{field("Company", "company")}</div>
                {field("Email *", "email", "email", "you@company.com")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 13 }}>
                  {field("Subject", "subject", "text", "Brief summary")}
                  <div><label style={lbl}>Type</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                      <option value="concern">Concern</option><option value="question">Question</option><option value="bug">Problem / bug</option><option value="billing">Billing</option>
                    </select>
                  </div>
                </div>
                <div><label style={lbl}>Message *</label><textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} style={{ ...inp, minHeight: 110, resize: "vertical" }} placeholder="Tell us what's going on…" /></div>
              </div>
              {err && <div style={{ color: "#fca5a5", fontSize: "0.82rem", marginTop: 12, fontWeight: 600 }}>{err}</div>}
              <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 18, padding: "13px", borderRadius: 12, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.95rem", color: "#fff", background: busy ? "rgba(37,99,235,0.5)" : "linear-gradient(135deg,#2563eb,#0891b2)" }}>{busy ? "Sending…" : "Send to Support"}</button>
              <div style={{ textAlign: "center", marginTop: 14 }}><Link href="/" style={{ color: "#64748b", fontSize: "0.78rem", textDecoration: "none" }}>← Back to MoveAround</Link></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: "0.66rem", fontWeight: 800, color: "#8ea3c0", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 };
const inp: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid rgba(148,163,184,0.25)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" };
