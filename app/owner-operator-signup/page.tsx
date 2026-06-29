"use client";

// Public owner-operator self-registration. Carrier enters the office-issued PIN (1234),
// fills out their company info, and submits — it lands in the office OO list as "pending"
// for staff review. No staff login required.

import { useState } from "react";

const inp: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box", outline: "none" };
const lbl: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 5 };

export default function OwnerOperatorSignupPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [form, setForm] = useState({ company_name: "", contact_name: "", contact_phone: "", contact_email: "", business_address: "", mc_number: "", dot_number: "", ein: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function checkPin() {
    if (pin.trim().length < 4) { setPinErr("Enter the access PIN."); return; }
    setUnlocked(true); setPinErr(""); // real validation happens server-side on submit
  }

  async function submit() {
    if (!form.company_name.trim()) { setErr("Company / owner-operator name is required."); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/oo-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, pin }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Could not submit. Please try again."); setSubmitting(false); return; }
      setDone(true);
    } catch { setErr("Network error — please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e3a8a)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "24px 28px", color: "#fff" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.8 }}>RONYX LOGISTICS</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, marginTop: 4 }}>Owner-Operator Sign-Up</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: 4 }}>Register your trucking company to haul with Ronyx.</div>
        </div>

        <div style={{ padding: "26px 28px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 46 }}>✅</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a", marginTop: 8 }}>You&apos;re registered!</div>
              <div style={{ color: "#475569", fontSize: "0.9rem", marginTop: 8, lineHeight: 1.5 }}>
                Thanks, <strong>{form.company_name}</strong>. The Ronyx office has your info and will reach out to finish onboarding (insurance, contract, W-9, and driver setup).
              </div>
              <a href="/owner-operator-signup/agreement" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, background: "#1d4ed8", color: "#fff", padding: "11px 20px", borderRadius: 10, fontWeight: 800, fontSize: "0.9rem", textDecoration: "none" }}>📄 Review &amp; print the Subhauler Agreement</a>
            </div>
          ) : !unlocked ? (
            <div>
              <div style={lbl as React.CSSProperties}>Access PIN</div>
              <div style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 10 }}>Enter the signup PIN the office gave you.</div>
              <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={e => { if (e.key === "Enter") checkPin(); }} inputMode="numeric" placeholder="••••" style={{ ...inp, letterSpacing: "0.3em", textAlign: "center", fontSize: "1.3rem", fontWeight: 800 }} autoFocus />
              {pinErr && <div style={{ color: "#dc2626", fontSize: "0.8rem", fontWeight: 700, marginTop: 8 }}>⚠ {pinErr}</div>}
              <button onClick={checkPin} style={{ width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 10, border: "none", background: "#1d4ed8", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}>Continue</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {err && <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 13px", fontSize: "0.85rem", fontWeight: 700 }}>⚠ {err}</div>}
              <div><label style={lbl}>Company / Owner-Operator Name *</label><input value={form.company_name} onChange={e => set("company_name", e.target.value)} style={inp} placeholder="e.g. Smith Trucking LLC" autoFocus /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Contact Name</label><input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Phone</label><input value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} style={inp} type="tel" /></div>
              </div>
              <div><label style={lbl}>Email</label><input value={form.contact_email} onChange={e => set("contact_email", e.target.value)} style={inp} type="email" /></div>
              <div><label style={lbl}>Business Address</label><input value={form.business_address} onChange={e => set("business_address", e.target.value)} style={inp} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>MC #</label><input value={form.mc_number} onChange={e => set("mc_number", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>DOT #</label><input value={form.dot_number} onChange={e => set("dot_number", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>EIN</label><input value={form.ein} onChange={e => set("ein", e.target.value)} style={inp} /></div>
              </div>
              <button onClick={submit} disabled={submitting || !form.company_name.trim()} style={{ marginTop: 6, padding: "13px 0", borderRadius: 10, border: "none", background: submitting || !form.company_name.trim() ? "#94a3b8" : "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: submitting || !form.company_name.trim() ? "default" : "pointer" }}>
                {submitting ? "Submitting…" : "Submit Registration"}
              </button>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", textAlign: "center" }}>The office will follow up to collect insurance, contract, W-9, and driver details.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
