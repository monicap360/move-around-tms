"use client";

// Public driver self-registration. Driver enters the office PIN (1234), fills out their
// info + which carrier they drive for, and submits — it lands on that carrier in the
// office system. No staff login required.

import { useState } from "react";

const inp: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box", outline: "none" };
const lbl: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 5 };

export default function DriverSignupPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [form, setForm] = useState({ name: "", company_name: "", phone: "", cdl_number: "", cdl_state: "TX", cdl_expiration: "", med_card_expiration: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [carriers, setCarriers] = useState<string[]>([]);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function checkPin() {
    if (pin.trim().length < 4) { setPinErr("Enter the access PIN."); return; }
    setUnlocked(true); setPinErr("");
    // Load existing carriers for the dropdown (validated against the same PIN).
    fetch(`/api/driver-signup/carriers?pin=${encodeURIComponent(pin.trim())}`)
      .then(r => r.json())
      .then(d => setCarriers(Array.isArray(d.carriers) ? d.carriers : []))
      .catch(() => {});
  }

  async function submit() {
    if (!form.name.trim()) { setErr("Your name is required."); return; }
    if (!form.company_name.trim()) { setErr("Your trucking company / carrier name is required."); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/driver-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, pin }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Could not submit. Please try again."); setSubmitting(false); return; }
      setDone(true);
    } catch { setErr("Network error — please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#0e7490,#06b6d4)", padding: "24px 28px", color: "#fff" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.85 }}>RONYX LOGISTICS</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, marginTop: 4 }}>Driver Sign-Up</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: 4 }}>Register to drive with Ronyx.</div>
        </div>

        <div style={{ padding: "26px 28px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 46 }}>✅</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#0f172a", marginTop: 8 }}>You&apos;re registered!</div>
              <div style={{ color: "#475569", fontSize: "0.9rem", marginTop: 8, lineHeight: 1.5 }}>
                Thanks, <strong>{form.name}</strong>. You&apos;ve been added under <strong>{form.company_name}</strong>. The Ronyx office will follow up to collect your CDL, medical card, and finish setup.
              </div>
            </div>
          ) : !unlocked ? (
            <div>
              <div style={lbl as React.CSSProperties}>Access PIN</div>
              <div style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 10 }}>Enter the driver signup PIN the office gave you.</div>
              <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={e => { if (e.key === "Enter") checkPin(); }} inputMode="numeric" placeholder="••••" style={{ ...inp, letterSpacing: "0.3em", textAlign: "center", fontSize: "1.3rem", fontWeight: 800 }} autoFocus />
              {pinErr && <div style={{ color: "#dc2626", fontSize: "0.8rem", fontWeight: 700, marginTop: 8 }}>⚠ {pinErr}</div>}
              <button onClick={checkPin} style={{ width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 10, border: "none", background: "#0e7490", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer" }}>Continue</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {err && <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 13px", fontSize: "0.85rem", fontWeight: 700 }}>⚠ {err}</div>}
              <div><label style={lbl}>Your Name *</label><input value={form.name} onChange={e => set("name", e.target.value)} style={inp} placeholder="First and last name" autoFocus /></div>
              <div>
                <label style={lbl}>Trucking Company / Carrier you drive for *</label>
                <input list="ronyx-carriers" value={form.company_name} onChange={e => set("company_name", e.target.value)} style={inp} placeholder="Start typing to find your company…" autoComplete="off" />
                <datalist id="ronyx-carriers">{carriers.map(c => <option key={c} value={c} />)}</datalist>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>Pick your company from the list. If it isn&apos;t there yet, just type it in.</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Phone</label><input value={form.phone} onChange={e => set("phone", e.target.value)} style={inp} type="tel" /></div>
                <div><label style={lbl}>CDL #</label><input value={form.cdl_number} onChange={e => set("cdl_number", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>CDL State</label><input value={form.cdl_state} onChange={e => set("cdl_state", e.target.value)} style={inp} maxLength={2} /></div>
                <div><label style={lbl}>CDL Expiration</label><input value={form.cdl_expiration} onChange={e => set("cdl_expiration", e.target.value)} style={inp} type="date" /></div>
                <div><label style={lbl}>Medical Card Expiration</label><input value={form.med_card_expiration} onChange={e => set("med_card_expiration", e.target.value)} style={inp} type="date" /></div>
                <div><label style={lbl}>Home Address</label><input value={form.address} onChange={e => set("address", e.target.value)} style={inp} /></div>
              </div>
              <button onClick={submit} disabled={submitting || !form.name.trim() || !form.company_name.trim()} style={{ marginTop: 6, padding: "13px 0", borderRadius: 10, border: "none", background: submitting || !form.name.trim() || !form.company_name.trim() ? "#94a3b8" : "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: submitting ? "default" : "pointer" }}>
                {submitting ? "Submitting…" : "Submit Registration"}
              </button>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", textAlign: "center" }}>The office will follow up to collect your CDL and medical card.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
