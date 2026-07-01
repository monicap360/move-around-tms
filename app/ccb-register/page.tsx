"use client";

import { useMemo, useState } from "react";

const MIN_DAYS = 188;
const inp: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: "0.92rem", boxSizing: "border-box", outline: "none" };
const lbl: React.CSSProperties = { fontSize: "0.76rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 };

export default function CCBRegister() {
  const [f, setF] = useState({ company_name: "", mc_number: "", dot_number: "", authority_date: "", contact_name: "", email: "", phone: "", bank_name: "", bank_routing: "", bank_account: "" });
  const [holdHarmless, setHH] = useState(false);
  const [attestActive, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setF(s => ({ ...s, [k]: v }));

  const authorityDays = useMemo(() => {
    if (!f.authority_date) return null;
    const t = new Date(f.authority_date + "T00:00:00").getTime();
    if (isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  }, [f.authority_date]);
  const authorityOk = authorityDays !== null && authorityDays >= MIN_DAYS;

  async function submit() {
    setErr(""); setBlockers([]);
    if (!f.company_name.trim()) { setErr("Company name is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setErr("Enter a valid email."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/ccb-register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, hold_harmless: holdHarmless, attest_active: attestActive }) });
      const d = await res.json();
      if (d.blocked) { setBlockers(d.blockers || []); }
      else if (res.ok && d.ok) setDone(d);
      else setErr(d.error || "Something went wrong.");
    } catch { setErr("Network error — please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0b1220,#0f2942)", display: "flex", alignItems: "center", justifyContent: "center", padding: 22, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 720, background: "#fff", borderRadius: 18, boxShadow: "0 24px 70px rgba(0,0,0,0.4)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)", padding: "22px 28px", color: "#fff" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.16em", opacity: 0.8 }}>CARRIER CLEARANCE BUREAU</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, marginTop: 3 }}>CCB Registration</div>
          <div style={{ fontSize: "0.85rem", opacity: 0.9, marginTop: 3 }}>Register & get certified to request COIs and take work.</div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 46 }}>🛡️✅</div>
              <h1 style={{ fontSize: "1.4rem", margin: "8px 0", color: "#0f172a" }}>You're CCB Certified</h1>
              <p style={{ color: "#475569", fontSize: "0.92rem", lineHeight: 1.6 }}>
                <strong>{f.company_name}</strong> cleared the {MIN_DAYS}-day authority requirement ({done.authority_days} days) and your Hold Harmless Agreement is on file. You may now <strong>request Certificates of Insurance (COIs)</strong> through CCB.
              </p>
              <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "10px 14px", fontSize: "0.82rem" }}>Banking details are <strong>not stored in CCB</strong> — they were forwarded to the owner for payment setup.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {err && <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 13px", fontSize: "0.85rem", fontWeight: 700 }}>⚠ {err}</div>}
              {blockers.length > 0 && (
                <div style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74", borderRadius: 10, padding: "12px 15px", fontSize: "0.84rem" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>🚫 You can't register yet:</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map((b, i) => <li key={i} style={{ marginBottom: 3 }}>{b}</li>)}</ul>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Company / Carrier Name *</label><input value={f.company_name} onChange={e => set("company_name", e.target.value)} style={inp} placeholder="Legal company name" /></div>
                <div><label style={lbl}>MC #</label><input value={f.mc_number} onChange={e => set("mc_number", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>DOT #</label><input value={f.dot_number} onChange={e => set("dot_number", e.target.value)} style={inp} /></div>
                <div>
                  <label style={lbl}>Operating Authority Granted *</label>
                  <input type="date" value={f.authority_date} onChange={e => set("authority_date", e.target.value)} style={{ ...inp, borderColor: authorityDays === null ? "#cbd5e1" : authorityOk ? "#86efac" : "#fca5a5" }} />
                  {authorityDays !== null && (
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, marginTop: 4, color: authorityOk ? "#15803d" : "#dc2626" }}>
                      {authorityOk ? `✓ ${authorityDays} days — meets the ${MIN_DAYS}-day minimum` : `✗ ${authorityDays} days — need at least ${MIN_DAYS} days of authority`}
                    </div>
                  )}
                </div>
                <div><label style={lbl}>Contact Name</label><input value={f.contact_name} onChange={e => set("contact_name", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Email *</label><input value={f.email} onChange={e => set("email", e.target.value)} style={inp} type="email" /></div>
                <div><label style={lbl}>Phone</label><input value={f.phone} onChange={e => set("phone", e.target.value)} style={inp} type="tel" /></div>
              </div>

              {/* Banking — not stored in CCB */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>Payment / Banking <span style={{ fontWeight: 500, fontSize: "0.76rem", color: "#94a3b8" }}>(optional)</span></div>
                <div style={{ fontSize: "0.75rem", color: "#9a3412", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "7px 10px", margin: "6px 0 10px" }}>🔒 CCB does <strong>not</strong> keep your banking details — they're forwarded to the owner for payment setup, then discarded from the clearance record.</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div><label style={lbl}>Bank</label><input value={f.bank_name} onChange={e => set("bank_name", e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Routing #</label><input value={f.bank_routing} onChange={e => set("bank_routing", e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Account #</label><input value={f.bank_account} onChange={e => set("bank_account", e.target.value)} style={inp} /></div>
                </div>
              </div>

              {/* Hold Harmless */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
                <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a", marginBottom: 6 }}>Hold Harmless Agreement</div>
                <div style={{ maxHeight: 120, overflowY: "auto", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: "0.78rem", color: "#475569", lineHeight: 1.5 }}>
                  By registering, the carrier agrees to indemnify, defend, and hold harmless the Carrier Clearance Bureau, its operator, and their affiliates from any claims, damages, losses, fines, or expenses arising out of the carrier's operations, equipment, drivers, insurance, or performance. The carrier warrants that it holds valid, active operating authority and required insurance, and that all information provided is accurate. CCB verifies clearance only and is not a party to any transportation contract, does not guarantee work, and is not liable for the carrier's acts or omissions. Permits are made available only when they become part of a job the carrier accepts.
                </div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={holdHarmless} onChange={e => setHH(e.target.checked)} style={{ marginTop: 2, width: 17, height: 17 }} />
                  <span style={{ fontSize: "0.82rem", color: "#334155" }}>I have read and agree to the <strong>Hold Harmless Agreement</strong>.</span>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={attestActive} onChange={e => setAttest(e.target.checked)} style={{ marginTop: 2, width: 17, height: 17 }} />
                  <span style={{ fontSize: "0.82rem", color: "#334155" }}>I attest my operating authority is <strong>active and in good standing</strong> and my insurance is current.</span>
                </label>
              </div>

              <button onClick={submit} disabled={busy} style={{ marginTop: 4, padding: "13px 0", borderRadius: 11, border: "none", background: busy ? "#94a3b8" : "linear-gradient(135deg,#1d4ed8,#1e40af)", color: "#fff", fontWeight: 900, fontSize: "0.98rem", cursor: busy ? "default" : "pointer" }}>
                {busy ? "Checking eligibility…" : "🛡️ Register with CCB"}
              </button>
              <p style={{ fontSize: "0.72rem", color: "#94a3b8", textAlign: "center" }}>Registration is verified against the {MIN_DAYS}-day authority requirement before you're certified.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
