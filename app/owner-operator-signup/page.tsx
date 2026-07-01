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
  ["Auto Liability (COI)", "Auto Liability Insurance"],
  ["General Liability (COI)", "General Liability Insurance"],
  ["W-9 / Tax Form", "W-9 / Tax Form"],
  ["Signed Subhauler Agreement", "Contract"],
  ["Operating Authority (MC)", "Operating Authority (MC)"],
  ["Voided Check / Banking", "Voided Check / Banking"],
];
// Per-driver document tiles. Medical FRONT keeps type "Medical Card" so it shows
// in the office's existing medical tile. Stored as "[Driver Name] <type>".
const PER_DRIVER_DOCS: [string, string][] = [
  ["CDL Front", "CDL Front"],
  ["CDL Back", "CDL Back"],
  ["Medical Front", "Medical Card"],
  ["Medical Back", "Medical Card Back"],
];
type DriverRow = { name: string; phone: string; cdl_number: string; cdl_state: string; cdl_expiration: string; med_card_expiration: string; files: Record<string, File | null> };
const BLANK_DRIVER: DriverRow = { name: "", phone: "", cdl_number: "", cdl_state: "TX", cdl_expiration: "", med_card_expiration: "", files: {} };

type TruckRow = { truck_number: string; make: string; model: string; year: string; vin: string; license_plate: string; driver_name: string; plateFile: File | null };
const BLANK_TRUCK: TruckRow = { truck_number: "", make: "", model: "", year: "", vin: "", license_plate: "", driver_name: "", plateFile: null };

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
  const [newOoId, setNewOoId] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const addDriver = () => setDrivers(d => [...d, { ...BLANK_DRIVER, files: {} }]);
  const removeDriver = (i: number) => setDrivers(d => d.filter((_, x) => x !== i));
  const setDriver = (i: number, k: keyof DriverRow, v: string) => setDrivers(d => d.map((row, x) => x === i ? { ...row, [k]: k === "cdl_state" ? v.toUpperCase().slice(0, 2) : v } : row));
  const setDriverFile = (i: number, slot: string, f: File | null) => setDrivers(d => d.map((row, x) => x === i ? { ...row, files: { ...row.files, [slot]: f } } : row));
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const addTruck = () => setTrucks(t => [...t, { ...BLANK_TRUCK }]);
  const removeTruck = (i: number) => setTrucks(t => t.filter((_, x) => x !== i));
  const setTruck = (i: number, k: keyof TruckRow, v: string) => setTrucks(t => t.map((row, x) => x === i ? { ...row, [k]: v } : row));
  const setTruckPlate = (i: number, f: File | null) => setTrucks(t => t.map((row, x) => x === i ? { ...row, plateFile: f } : row));

  function checkPin() {
    if (pin.trim().length < 4) { setPinErr("Enter the access PIN."); return; }
    setUnlocked(true); setPinErr(""); // real validation happens server-side on submit
  }

  async function submit() {
    if (!form.company_name.trim()) { setErr("Company / owner-operator name is required."); return; }
    if (!ack) { setErr("Please acknowledge the insurance requirements to continue."); return; }
    setSubmitting(true); setErr("");
    try {
      const driverPayload = drivers.filter(dr => dr.name.trim()).map(dr => ({ name: dr.name.trim(), phone: dr.phone, cdl_number: dr.cdl_number, cdl_state: dr.cdl_state, cdl_expiration: dr.cdl_expiration, med_card_expiration: dr.med_card_expiration }));
      const truckPayload = trucks.filter(t => t.truck_number.trim() || t.vin.trim()).map(t => ({ truck_number: t.truck_number.trim(), make: t.make, model: t.model, year: t.year, vin: t.vin, license_plate: t.license_plate, driver_name: t.driver_name }));
      const res = await fetch("/api/oo-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, pin, drivers: driverPayload, trucks: truckPayload }) });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "Could not submit. Please try again."); setSubmitting(false); return; }
      // Upload company documents + each driver's documents to the new record.
      const chosen = OO_DOCS.filter(([, type]) => files[type]);
      const driverUploads = drivers.filter(dr => dr.name.trim()).flatMap(dr => PER_DRIVER_DOCS.filter(([slot]) => dr.files[slot]).map(([slot, type]) => ({ dr, slot, type })));
      if (d.id && (chosen.length || driverUploads.length || trucks.some(t => t.plateFile))) {
        setUploadingDocs(true);
        for (const [, type] of chosen) {
          const fd = new FormData();
          fd.append("file", files[type]!); fd.append("oo_id", d.id); fd.append("doc_type", type);
          try { await fetch("/api/onboarding-docs", { method: "POST", body: fd }); } catch {}
        }
        for (const u of driverUploads) {
          const fd = new FormData();
          fd.append("file", u.dr.files[u.slot]!); fd.append("oo_id", d.id); fd.append("doc_type", `[${u.dr.name.trim()}] ${u.type}`);
          try { await fetch("/api/onboarding-docs", { method: "POST", body: fd }); } catch {}
        }
        // License plate photos, labeled by truck.
        for (const t of trucks) {
          if (!t.plateFile) continue;
          const label = t.truck_number.trim() || t.license_plate.trim() || "Truck";
          const fd = new FormData();
          fd.append("file", t.plateFile); fd.append("oo_id", d.id); fd.append("doc_type", `[Truck ${label}] License Plate`);
          try { await fetch("/api/onboarding-docs", { method: "POST", body: fd }); } catch {}
        }
        setUploadingDocs(false);
      }
      setAcctNum(d.in_house_account_number || "");
      setNewOoId(d.id || "");
      setDone(true);
    } catch { setErr("Network error — please try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a,#1e3a8a)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 820, background: "#fff", borderRadius: 18, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", padding: "24px 28px", color: "#fff", position: "relative" }}>
          {(unlocked || done) && (
            <button onClick={() => { setUnlocked(false); setPin(""); setDone(false); setErr(""); }} title="Log out / start over"
              style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 8, padding: "5px 11px", fontWeight: 700, fontSize: "0.74rem", cursor: "pointer" }}>⎋ Log out</button>
          )}
          <div style={{ display: "inline-block", background: "#fff", borderRadius: 12, padding: "8px 14px", marginBottom: 10 }}>
            <img src="/ronyx_logo.png" alt="Ronyx Logistics" style={{ height: 62, width: "auto", display: "block" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, marginTop: 2 }}>Owner-Operator Sign-Up</div>
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
              <a href={`/owner-operator-signup/agreement?oo_id=${encodeURIComponent(newOoId)}&company=${encodeURIComponent(form.company_name)}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 16, background: "#16a34a", color: "#fff", padding: "11px 20px", borderRadius: 10, fontWeight: 800, fontSize: "0.9rem", textDecoration: "none" }}>✍️ Review &amp; e-sign the Subhauler Agreement</a>
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

              {/* Your Drivers */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>🚚 Your Drivers <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "#94a3b8" }}>(add everyone who drives for you)</span></div>
                <div style={{ fontSize: "0.78rem", color: "#475569", margin: "4px 0 10px" }}>Add each driver with their CDL and medical card. You can add yourself here too.</div>
                {drivers.map((dr, i) => (
                  <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 10, background: "#fafcff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: "0.86rem" }}>Driver {i + 1}{dr.name ? ` — ${dr.name}` : ""}</span>
                      <button onClick={() => removeDriver(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Driver Name *</label><input value={dr.name} onChange={e => setDriver(i, "name", e.target.value)} style={inp} placeholder="Full name" /></div>
                      <div><label style={lbl}>Phone</label><input value={dr.phone} onChange={e => setDriver(i, "phone", e.target.value)} style={inp} type="tel" /></div>
                      <div><label style={lbl}>CDL #</label><input value={dr.cdl_number} onChange={e => setDriver(i, "cdl_number", e.target.value)} style={inp} /></div>
                      <div><label style={lbl}>CDL State</label><input value={dr.cdl_state} onChange={e => setDriver(i, "cdl_state", e.target.value)} style={inp} maxLength={2} /></div>
                      <div><label style={lbl}>CDL Expiration</label><input value={dr.cdl_expiration} onChange={e => setDriver(i, "cdl_expiration", e.target.value)} style={inp} type="date" /></div>
                      <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Medical Card Expiration</label><input value={dr.med_card_expiration} onChange={e => setDriver(i, "med_card_expiration", e.target.value)} style={inp} type="date" /></div>
                    </div>
                    {dr.name.trim() ? (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>📎 Upload {dr.name.trim()}&apos;s documents</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                          {PER_DRIVER_DOCS.map(([slot]) => <FileSlot key={slot} label={slot} file={dr.files[slot]} onPick={f => setDriverFile(i, slot, f)} />)}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 10, fontSize: "0.74rem", color: "#94a3b8", fontStyle: "italic", background: "#f8fafc", border: "1px dashed #e2e8f0", borderRadius: 8, padding: "8px 10px" }}>
                        ✍️ Enter the driver&apos;s name above, then their CDL &amp; medical card upload boxes appear here.
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addDriver} style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px dashed #93c5fd", borderRadius: 10, padding: "10px 0", width: "100%", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>+ Add {drivers.length ? "another " : ""}driver</button>
              </div>

              {/* Your Trucks */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>🚛 Your Trucks <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "#94a3b8" }}>(add your fleet)</span></div>
                <div style={{ fontSize: "0.78rem", color: "#475569", margin: "4px 0 10px" }}>List each truck — make/model, year, VIN, plate, and which driver runs it.</div>
                <datalist id="oo-driver-names">{drivers.filter(d => d.name.trim()).map((d, i) => <option key={i} value={d.name} />)}</datalist>
                {trucks.map((t, i) => (
                  <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", marginBottom: 10, background: "#fafcff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: "0.86rem" }}>Truck {i + 1}{t.truck_number ? ` — #${t.truck_number}` : ""}</span>
                      <button onClick={() => removeTruck(i)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div><label style={lbl}>Truck #</label><input value={t.truck_number} onChange={e => setTruck(i, "truck_number", e.target.value)} style={inp} placeholder="e.g. 8164" /></div>
                      <div><label style={lbl}>Assigned Driver</label><input list="oo-driver-names" value={t.driver_name} onChange={e => setTruck(i, "driver_name", e.target.value)} style={inp} placeholder="Driver name" /></div>
                      <div><label style={lbl}>Make</label><input value={t.make} onChange={e => setTruck(i, "make", e.target.value)} style={inp} placeholder="e.g. Peterbilt" /></div>
                      <div><label style={lbl}>Model</label><input value={t.model} onChange={e => setTruck(i, "model", e.target.value)} style={inp} placeholder="e.g. 567" /></div>
                      <div><label style={lbl}>Year</label><input value={t.year} onChange={e => setTruck(i, "year", e.target.value)} style={inp} placeholder="e.g. 2022" maxLength={4} /></div>
                      <div><label style={lbl}>License Plate</label><input value={t.license_plate} onChange={e => setTruck(i, "license_plate", e.target.value)} style={inp} placeholder="Plate & state" /></div>
                      <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>VIN</label><input value={t.vin} onChange={e => setTruck(i, "vin", e.target.value)} style={inp} placeholder="17-character VIN" /></div>
                    </div>
                    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
                      <FileSlot label="License Plate photo" file={t.plateFile} onPick={f => setTruckPlate(i, f)} />
                    </div>
                  </div>
                ))}
                <button onClick={addTruck} style={{ background: "#f0fdf4", color: "#15803d", border: "1px dashed #86efac", borderRadius: 10, padding: "10px 0", width: "100%", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>+ Add {trucks.length ? "another " : ""}truck</button>
              </div>

              {/* Document uploads */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>📎 Company documents <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "#94a3b8" }}>(optional — speeds up onboarding)</span></div>
                <div style={{ fontSize: "0.78rem", color: "#475569", margin: "4px 0 8px" }}>Attach them here instead of emailing — they go straight to your file in the office system.</div>
                <a href="/owner-operator-signup/agreement" target="_blank" rel="noreferrer" style={{ display: "inline-block", marginBottom: 10, fontSize: "0.78rem", fontWeight: 800, color: "#1d4ed8", textDecoration: "none" }}>📄 Read the Subhauler Agreement — you can <strong>e-sign it right after you submit</strong> (no printing needed)</a>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
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
