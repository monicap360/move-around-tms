"use client";

// Public owner-operator self-registration. Carrier enters the office-issued PIN (1234),
// fills out their company info, and submits — it lands in the office OO list as "pending"
// for staff review. No staff login required.

import { useRef, useState } from "react";

const inp: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: "0.95rem", boxSizing: "border-box", outline: "none" };
const lbl: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 5 };

// [tile label, stored doc_type]. doc_type must match the office's named slots so
// uploads land automatically (the signed agreement files as "Contract").
const OO_DOCS: [string, string][] = [
  ["Insurance Certificate (COI)", "Insurance Certificate (COI)"],
  ["W-9 / Tax Form", "W-9 / Tax Form"],
  ["Signed Subhauler Agreement", "Contract"],
  ["Operating Authority (MC)", "Operating Authority (MC)"],
  ["Voided Check / Banking", "Voided Check / Banking"],
];

// Tap-to-upload tile (photo or PDF).
function FileSlot({ label, file, onPick }: { label: string; file: File | null | undefined; onPick: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div onClick={() => ref.current?.click()} style={{ border: `1.5px dashed ${file ? "#16a34a" : "#cbd5e1"}`, background: file ? "#f0fdf4" : "#f8fafc", borderRadius: 10, padding: "12px 8px", textAlign: "center", cursor: "pointer" }}>
      <input ref={ref} type="file" accept="image/*,.pdf,.heic,.heif" style={{ display: "none" }} onChange={e => onPick(e.target.files?.[0] || null)} />
      <div style={{ fontSize: "1.1rem" }}>{file ? "✅" : "📎"}</div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: file ? "#15803d" : "#475569", marginTop: 2, lineHeight: 1.2 }}>{label}</div>
      {file && <div style={{ fontSize: "0.6rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>}
    </div>
  );
}

// Ronyx insurance requirements — all certificate holders must be listed as Additional Insured
// with a Waiver of Subrogation; VIN(s) must appear on the Auto Liability certificate.
const CERT_HOLDERS = [
  ["Ronyx Logistics LLC", "3741 Graves Ave, Groves, TX 77619"],
  ["Bas Equipment & Trucking LLC", "P.O. Box 36, Throckmorton, TX 76483"],
  ["M.A. Mortenson Company", "700 Meadow Lane N, Minneapolis, MN 55422"],
  ["Bondco LLC", "PO Box 95, West Monroe, LA 71294"],
];
const COI_EMAIL = "info@ronyxlogistics.llc";

export default function OwnerOperatorSignupPage() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_phone: "", contact_email: "", business_address: "", mc_number: "", dot_number: "", ein: "",
    insurance_agent_name: "", insurance_agent_phone: "", insurance_agent_email: "", gl_amount: "1,000,000", al_amount: "1,000,000", insurance_expiration: "", truck_vins: "",
  });
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [acctNum, setAcctNum] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function checkPin() {
    if (pin.trim().length < 4) { setPinErr("Enter the access PIN."); return; }
    setUnlocked(true); setPinErr(""); // real validation happens server-side on submit
  }

  async function submit() {
    if (!form.company_name.trim()) { setErr("Company / owner-operator name is required."); return; }
    if (!ack) { setErr("Please acknowledge the insurance requirements to continue."); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/oo-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, pin }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Could not submit. Please try again."); setSubmitting(false); return; }
      // Upload any attached documents to the new owner-operator record.
      const chosen = OO_DOCS.filter(([, type]) => files[type]);
      if (d.id && chosen.length) {
        setUploadingDocs(true);
        for (const [, type] of chosen) {
          const fd = new FormData();
          fd.append("file", files[type]!);
          fd.append("oo_id", d.id);
          fd.append("doc_type", type);
          try { await fetch("/api/onboarding-docs", { method: "POST", body: fd }); } catch {}
        }
        setUploadingDocs(false);
      }
      setAcctNum(d.in_house_account_number || "");
      setDone(true);
    } catch { setErr("Network error — please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e3a8a)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "24px 28px", color: "#fff", position: "relative" }}>
          {(unlocked || done) && (
            <button onClick={() => { setUnlocked(false); setPin(""); setDone(false); setErr(""); }} title="Log out / start over"
              style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8, padding: "5px 11px", fontWeight: 700, fontSize: "0.74rem", cursor: "pointer" }}>⎋ Log out</button>
          )}
          <div style={{ display: "inline-block", background: "#fff", borderRadius: 9, padding: "6px 11px", marginBottom: 10 }}>
            <img src="/ronyx_logo.png" alt="Ronyx Logistics" style={{ height: 36, width: "auto", display: "block" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
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
                Thanks, <strong>{form.company_name}</strong>.{OO_DOCS.some(([, type]) => files[type]) ? " Your documents were received." : ""} The Ronyx office has your info and will reach out to finish onboarding (insurance, contract, W-9, and driver setup).
              </div>
              {acctNum && (
                <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", display: "inline-block" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>Your account #</span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#15803d" }}>{acctNum}</div>
                </div>
              )}
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

              {/* Insurance Requirements */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>🛡 Insurance Requirements</div>
                <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: 4, lineHeight: 1.5 }}>
                  Your COIs must list <strong>General Liability $1,000,000</strong> and <strong>Auto Liability $1,000,000</strong>. Every certificate holder below must be listed as <strong>Additional Insured with a Waiver of Subrogation</strong>, and your <strong>truck VIN(s) must appear on the Auto Liability certificate</strong>.
                </div>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", margin: "10px 0", fontSize: "0.8rem" }}>
                  <div style={{ fontWeight: 800, color: "#334155", marginBottom: 6 }}>Certificate Holders</div>
                  {CERT_HOLDERS.map(([name, addr], i) => (
                    <div key={name} style={{ padding: "4px 0", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{i + 1}. {name}</span>
                      <div style={{ color: "#64748b", fontSize: "0.74rem" }}>{addr}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 8, color: "#475569", fontSize: "0.76rem" }}>Send your COIs to <strong>{COI_EMAIL}</strong>.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={lbl}>Insurance Agent / Agency</label><input value={form.insurance_agent_name} onChange={e => set("insurance_agent_name", e.target.value)} style={inp} placeholder="Agency name" /></div>
                  <div><label style={lbl}>Agent Phone</label><input value={form.insurance_agent_phone} onChange={e => set("insurance_agent_phone", e.target.value)} style={inp} type="tel" /></div>
                </div>
                <div style={{ marginTop: 12 }}><label style={lbl}>Agent Email</label><input value={form.insurance_agent_email} onChange={e => set("insurance_agent_email", e.target.value)} style={inp} type="email" placeholder="So the office can request COIs directly" /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
                  <div><label style={lbl}>GL Coverage</label><input value={form.gl_amount} onChange={e => set("gl_amount", e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>AL Coverage</label><input value={form.al_amount} onChange={e => set("al_amount", e.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Policy Expires</label><input value={form.insurance_expiration} onChange={e => set("insurance_expiration", e.target.value)} style={inp} type="date" /></div>
                </div>
                <div style={{ marginTop: 12 }}><label style={lbl}>Truck VIN(s) <span style={{ fontWeight: 500, color: "#94a3b8" }}>— must be on the AL certificate</span></label><textarea value={form.truck_vins} onChange={e => set("truck_vins", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} placeholder="One VIN per line" /></div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} style={{ marginTop: 3, width: 17, height: 17, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.82rem", color: "#334155", lineHeight: 1.45 }}>I agree to list all four certificate holders as <strong>Additional Insured with a Waiver of Subrogation</strong>, carry GL and AL of at least <strong>$1,000,000</strong> each, include my <strong>VIN(s) on the AL certificate</strong>, and send current COIs to {COI_EMAIL}.</span>
                </label>
              </div>

              {/* Document uploads */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>📎 Upload your documents <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "#94a3b8" }}>(optional — speeds up onboarding)</span></div>
                <div style={{ fontSize: "0.78rem", color: "#475569", margin: "4px 0 8px" }}>Attach them here instead of emailing — they go straight to your file in the office system.</div>
                <a href="/owner-operator-signup/agreement" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 10, fontSize: "0.78rem", fontWeight: 800, color: "#1d4ed8", textDecoration: "none" }}>📄 Open, print &amp; sign the Subhauler Agreement → then attach it below</a>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {OO_DOCS.map(([label, type]) => <FileSlot key={type} label={label} file={files[type]} onPick={f => setFiles(s => ({ ...s, [type]: f }))} />)}
                </div>
              </div>

              <button onClick={submit} disabled={submitting || !form.company_name.trim() || !ack} style={{ marginTop: 6, padding: "13px 0", borderRadius: 10, border: "none", background: submitting || !form.company_name.trim() || !ack ? "#94a3b8" : "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: submitting || !form.company_name.trim() || !ack ? "default" : "pointer" }}>
                {uploadingDocs ? "Uploading documents…" : submitting ? "Submitting…" : "Submit Registration"}
              </button>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", textAlign: "center" }}>Documents you attach are sent straight to the Ronyx office. You can still email COIs to {COI_EMAIL}.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
