"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";

/* ─── Types ───────────────────────────────────────────────────── */
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

type StateMileage = {
  state: string;
  miles: number;
  gallons: number;
  mpg: string;
  tax_rate: string;
  tax_owed: number;
  jurisdictions?: string;
};

type FuelReceipt = {
  id: string;
  date: string;
  truck: string;
  driver: string;
  state: string;
  gallons: number;
  price_per_gallon: number;
  total: number;
  vendor: string;
  card: string;
  status: "verified" | "pending" | "missing";
};

type WorkItem = {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "missing_receipt" | "odometer" | "tax_due" | "filing" | "audit";
  title: string;
  detail: string;
  truck?: string;
  due?: string;
};

/* ─── Shared styles ───────────────────────────────────────────── */
const mlbl: React.CSSProperties = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const minp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };
const moverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" };
const mbox = (w = 440): React.CSSProperties => ({ background: "#fff", borderRadius: 20, padding: 28, width: w, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" });
const mbtn = (primary = true): React.CSSProperties => primary
  ? { flex: 1, background: "#ca8a04", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: "pointer", fontSize: 14 }
  : { padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff", fontSize: 14 };

/* ─── Toast ───────────────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.35)" }}>{msg}</div>;
}

/* ─── Upload Receipt Modal ────────────────────────────────────── */
function UploadReceiptModal({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ date: "", truck: "", driver: "", state: "", gallons: "", price: "", vendor: "", card: "" });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.date || !f.truck || !f.gallons) { showToast("Date, Truck, and Gallons are required."); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    showToast(`Fuel receipt logged for Truck ${f.truck} — ${f.gallons} gal on ${f.date}.`);
    setSaving(false);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={mbox(520)}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Log Fuel Receipt</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>Record a fuel purchase for IFTA reporting.</p>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
            <div><label style={mlbl}>Date *</label><input type="date" value={f.date} onChange={e => set("date", e.target.value)} style={minp} /></div>
            <div><label style={mlbl}>Truck # *</label><input value={f.truck} onChange={e => set("truck", e.target.value)} style={minp} placeholder="e.g. 214" /></div>
            <div><label style={mlbl}>Driver</label><input value={f.driver} onChange={e => set("driver", e.target.value)} style={minp} placeholder="Driver name" /></div>
            <div><label style={mlbl}>State</label><input value={f.state} onChange={e => set("state", e.target.value)} style={minp} placeholder="TX" maxLength={2} /></div>
            <div><label style={mlbl}>Gallons *</label><input type="number" step="0.001" value={f.gallons} onChange={e => set("gallons", e.target.value)} style={minp} placeholder="50.000" /></div>
            <div><label style={mlbl}>Price / Gallon</label><input type="number" step="0.001" value={f.price} onChange={e => set("price", e.target.value)} style={minp} placeholder="3.850" /></div>
            <div><label style={mlbl}>Vendor</label><input value={f.vendor} onChange={e => set("vendor", e.target.value)} style={minp} placeholder="Pilot, Love's, TA…" /></div>
            <div><label style={mlbl}>Fuel Card</label><input value={f.card} onChange={e => set("card", e.target.value)} style={minp} placeholder="Card # last 4" /></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={mlbl}>Attach Receipt (optional)</label>
            <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: 14, textAlign: "center", cursor: "pointer", background: "#f8fafc" }}>
              {file ? <span style={{ fontWeight: 700, color: "#ca8a04", fontSize: 13 }}>📄 {file.name}</span>
                    : <span style={{ color: "#94a3b8", fontSize: 13 }}>Click to attach PDF or image</span>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={mbtn(true)}>{saving ? "Saving…" : "Log Receipt"}</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── File IFTA Return Modal ──────────────────────────────────── */
function FileReturnModal({ quarter, year, onClose, showToast }: { quarter: Quarter; year: number; onClose: () => void; showToast: (m: string) => void }) {
  const [method, setMethod] = useState("electronic");
  const [notes, setNotes] = useState("");
  const [filing, setFiling] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFiling(true);
    await new Promise(r => setTimeout(r, 600));
    showToast(`IFTA return for ${quarter} ${year} filed via ${method} — confirmation sent.`);
    setFiling(false);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={mbox()}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>File IFTA Return</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>{quarter} {year} — prepare and mark filing complete</p>
        <form onSubmit={submit}>
          <label style={mlbl}>Filing Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...minp, marginBottom: 14 }}>
            <option value="electronic">Electronic (IFTA Clearinghouse)</option>
            <option value="mail">Mail — Paper Return</option>
            <option value="state_portal">State Portal (base state)</option>
            <option value="third_party">Third-Party Filing Service</option>
          </select>
          <label style={mlbl}>Notes / Confirmation #</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...minp, minHeight: 72, resize: "vertical" }} placeholder="Confirmation number, agent name, notes…" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={filing} style={mbtn(true)}>{filing ? "Filing…" : "Mark as Filed"}</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Odometer Modal ──────────────────────────────────────────── */
function OdometerModal({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const [truck, setTruck] = useState("");
  const [reading, setReading] = useState("");
  const [date, setDate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!truck || !reading) { showToast("Truck and reading required."); return; }
    showToast(`Odometer logged: Truck ${truck} — ${parseInt(reading).toLocaleString()} mi on ${date || "today"}.`);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={mbox(400)}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Log Odometer Reading</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>Record start/end odometer for IFTA mileage tracking.</p>
        <form onSubmit={submit}>
          <label style={mlbl}>Truck # *</label>
          <input value={truck} onChange={e => setTruck(e.target.value)} style={{ ...minp, marginBottom: 14 }} placeholder="Unit number" />
          <label style={mlbl}>Odometer Reading *</label>
          <input type="number" value={reading} onChange={e => setReading(e.target.value)} style={{ ...minp, marginBottom: 14 }} placeholder="125430" />
          <label style={mlbl}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...minp }} />
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" style={mbtn(true)}>Save Reading</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Staff Today Panel ───────────────────────────────────────── */
const IFTA_STAFF = [
  { name: "Rosa M.",   role: "IFTA Admin",    color: "#ca8a04" },
  { name: "Kevin L.",  role: "Fleet Mgr",     color: "#1e40af" },
  { name: "Diane P.",  role: "Accountant",    color: "#065f46" },
  { name: "Sammy R.",  role: "Dispatch",      color: "#7c3aed" },
];

function StaffTodayPanel({ onReceipt, onOdometer }: { onReceipt: () => void; onOdometer: () => void }) {
  return (
    <aside style={{ width: 158, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Staff Today</div>
        {IFTA_STAFF.map(s => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {s.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>{s.name}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{s.role}</div>
            </div>
          </div>
        ))}
        <div style={{ paddingTop: 8, borderTop: "1px solid #f1f5f9" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", display: "inline-block", marginRight: 5 }} />
          <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>4 on shift</span>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Quick Log</div>
        <button onClick={onReceipt} style={{ width: "100%", padding: "8px 0", background: "#ca8a04", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer", marginBottom: 6 }}>
          + Fuel Receipt
        </button>
        <button onClick={onOdometer} style={{ width: "100%", padding: "8px 0", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
          Log Odometer
        </button>
      </div>
    </aside>
  );
}

/* ─── IFTA Assistant Panel ────────────────────────────────────── */
function IFTAAssistantPanel({
  kpis, workItems, onReceipt, onOdometer, onFileTax,
}: {
  kpis: { totalTax: number; missingReceipts: number; qStatus: string; dueDate: string };
  workItems: WorkItem[];
  onReceipt: () => void;
  onOdometer: () => void;
  onFileTax: () => void;
}) {
  const critCount = workItems.filter(i => i.priority === "critical").length;
  const insight = critCount > 0
    ? `${critCount} critical item${critCount > 1 ? "s" : ""} need attention before filing.`
    : kpis.missingReceipts > 0
    ? `${kpis.missingReceipts} missing fuel receipt${kpis.missingReceipts > 1 ? "s" : ""}. Collect before quarter ends.`
    : "All receipts accounted for. Ready to prepare IFTA return.";

  return (
    <aside style={{ width: 216, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#78350f", borderRadius: 14, padding: 16, color: "#fff" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>IFTA Insight</div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#fef3c7", lineHeight: 1.5 }}>{insight}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Est. Tax",    value: `$${kpis.totalTax.toLocaleString()}`, color: kpis.totalTax > 0 ? "#fcd34d" : "#10b981" },
            { label: "Missing",     value: kpis.missingReceipts,                  color: kpis.missingReceipts > 0 ? "#ef4444" : "#10b981" },
            { label: "Status",      value: kpis.qStatus,                          color: "#fef3c7" },
            { label: "Due Date",    value: kpis.dueDate,                          color: "#fcd34d" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#92400e", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Quick Actions</div>
        {[
          { label: "Log Fuel Receipt",    icon: "⛽", fn: onReceipt },
          { label: "Log Odometer Reading",icon: "📏", fn: onOdometer },
          { label: "File IFTA Return",    icon: "📋", fn: onFileTax },
        ].map(a => (
          <button key={a.label} onClick={a.fn} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", background: "#f8fafc", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12, color: "#1e293b", cursor: "pointer", marginBottom: 5, textAlign: "left" }}>
            <span>{a.icon}</span> {a.label}
          </button>
        ))}
      </div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 14, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Related Links</div>
        <Link href="/ronyx/fleet" style={{ display: "block", padding: "8px 10px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, fontWeight: 700, fontSize: 12, color: "#1d4ed8", textDecoration: "none", marginBottom: 6 }}>
          Fleet Work Center →
        </Link>
        <Link href="/ronyx/compliance" style={{ display: "block", padding: "8px 10px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, fontWeight: 700, fontSize: 12, color: "#92400e", textDecoration: "none" }}>
          Compliance Center →
        </Link>
      </div>
    </aside>
  );
}

/* ─── Work Queue Tab ──────────────────────────────────────────── */
function QueueTab({ items, onReceipt, onOdometer }: { items: WorkItem[]; onReceipt: () => void; onOdometer: () => void }) {
  const pColor = (p: string) => p === "critical" ? "#dc2626" : p === "high" ? "#ea580c" : p === "medium" ? "#ca8a04" : "#16a34a";
  const pBg    = (p: string) => p === "critical" ? "#fef2f2" : p === "high" ? "#fff7ed" : p === "medium" ? "#fefce8" : "#f0fdf4";

  if (!items.length) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 4 }}>Work Queue Clear</div>
      <div style={{ fontSize: 13 }}>No open IFTA action items. All receipts and readings are current.</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(["critical","high","medium","low"] as const).map(p => {
          const cnt = items.filter(i => i.priority === p).length;
          if (!cnt) return null;
          return <div key={p} style={{ background: pBg(p), border: `1px solid ${pColor(p)}30`, borderRadius: 7, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: pColor(p) }}>{cnt} {p}</div>;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: "#fff", border: `1px solid ${pColor(item.priority)}25`, borderLeft: `4px solid ${pColor(item.priority)}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: pBg(item.priority), borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 800, color: pColor(item.priority), textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{item.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{item.detail}{item.truck ? ` — Truck ${item.truck}` : ""}</div>
            </div>
            {item.category === "missing_receipt" && (
              <button onClick={onReceipt} style={{ padding: "5px 12px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Log Receipt</button>
            )}
            {item.category === "odometer" && (
              <button onClick={onOdometer} style={{ padding: "5px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Log Reading</button>
            )}
            {(item.category === "tax_due" || item.category === "filing") && (
              <button style={{ padding: "5px 12px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Take Action</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── State Mileage Tab ───────────────────────────────────────── */
function StateMileageTab({ rows }: { rows: StateMileage[] }) {
  if (!rows.length) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>No Mileage Data</div>
      <div style={{ fontSize: 13 }}>Log odometer readings and trips to populate state mileage.</div>
    </div>
  );

  const totalMiles   = rows.reduce((s, r) => s + r.miles, 0);
  const totalGallons = rows.reduce((s, r) => s + r.gallons, 0);
  const totalTax     = rows.reduce((s, r) => s + r.tax_owed, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Total Miles",   value: totalMiles.toLocaleString(),   color: "#1d4ed8" },
          { label: "Total Gallons", value: totalGallons.toLocaleString(), color: "#065f46" },
          { label: "Avg MPG",       value: totalMiles && totalGallons ? (totalMiles / totalGallons).toFixed(1) : "—", color: "#ca8a04" },
          { label: "Est. Tax Owed", value: `$${totalTax.toLocaleString()}`, color: totalTax > 0 ? "#dc2626" : "#16a34a" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 18px", minWidth: 120 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
          </div>
        ))}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["State","Miles","Gallons","Avg MPG","Tax Rate","Est. Tax"].map(h => (
              <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.sort((a, b) => b.miles - a.miles).map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0f172a" }}>{row.state}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{row.miles.toLocaleString()}</td>
              <td style={{ padding: "10px 14px", color: "#475569" }}>{row.gallons.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
              <td style={{ padding: "10px 14px", color: "#475569" }}>{row.mpg}</td>
              <td style={{ padding: "10px 14px", color: "#64748b" }}>{row.tax_rate}</td>
              <td style={{ padding: "10px 14px", fontWeight: 700, color: row.tax_owed > 0 ? "#dc2626" : "#16a34a" }}>
                {row.tax_owed >= 0 ? `$${row.tax_owed.toLocaleString()}` : `-$${Math.abs(row.tax_owed).toLocaleString()}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Fuel Receipts Tab ───────────────────────────────────────── */
function FuelReceiptsTab({ receipts, onAdd }: { receipts: FuelReceipt[]; onAdd: () => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = useMemo(() =>
    receipts.filter(r => {
      const q = search.toLowerCase();
      return (!q || r.truck.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q) || r.state.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q))
        && (statusFilter === "All" || r.status === statusFilter);
    }),
    [receipts, search, statusFilter]
  );

  const statusColor = (s: string) => s === "verified" ? "#15803d" : s === "pending" ? "#b45309" : "#dc2626";
  const statusBg    = (s: string) => s === "verified" ? "#f0fdf4" : s === "pending" ? "#fffbeb" : "#fef2f2";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search truck, driver, state, vendor…" style={{ flex: "1 1 200px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, outline: "none" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff" }}>
          <option value="All">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="missing">Missing</option>
        </select>
        <button onClick={onAdd} style={{ padding: "8px 16px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Log Receipt</button>
      </div>

      {!filtered.length ? (
        <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⛽</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>No Fuel Receipts</div>
          <div style={{ fontSize: 13 }}>Log fuel receipts to track IFTA fuel purchases by state.</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Date","Truck","Driver","State","Gallons","Price/Gal","Total","Vendor","Status"].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "9px 14px", color: "#475569" }}>{r.date}</td>
                <td style={{ padding: "9px 14px", fontWeight: 700 }}>{r.truck}</td>
                <td style={{ padding: "9px 14px", color: "#475569" }}>{r.driver}</td>
                <td style={{ padding: "9px 14px", fontWeight: 700, color: "#1d4ed8" }}>{r.state}</td>
                <td style={{ padding: "9px 14px" }}>{r.gallons.toFixed(3)}</td>
                <td style={{ padding: "9px 14px", color: "#475569" }}>${r.price_per_gallon.toFixed(3)}</td>
                <td style={{ padding: "9px 14px", fontWeight: 700, color: "#0f172a" }}>${r.total.toFixed(2)}</td>
                <td style={{ padding: "9px 14px", color: "#64748b" }}>{r.vendor}</td>
                <td style={{ padding: "9px 14px" }}>
                  <span style={{ background: statusBg(r.status), color: statusColor(r.status), borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Quarterly Summary Tab ───────────────────────────────────── */
const QUARTER_DUE: Record<Quarter, string> = {
  Q1: "Apr 30", Q2: "Jul 31", Q3: "Oct 31", Q4: "Jan 31",
};

function QuarterlyTab({ quarter, year, stateRows, receipts, onFile }: {
  quarter: Quarter; year: number; stateRows: StateMileage[]; receipts: FuelReceipt[]; onFile: () => void;
}) {
  const totalMiles   = stateRows.reduce((s, r) => s + r.miles,   0);
  const totalGallons = stateRows.reduce((s, r) => s + r.gallons, 0);
  const totalTax     = stateRows.reduce((s, r) => s + r.tax_owed, 0);
  const fuelTotal    = receipts.reduce((s, r) => s + r.total, 0);
  const verified     = receipts.filter(r => r.status === "verified").length;
  const missing      = receipts.filter(r => r.status === "missing").length;
  const dueDate      = `${QUARTER_DUE[quarter]} ${quarter === "Q4" ? year + 1 : year}`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{quarter} {year} — IFTA Summary</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Filing due: <strong style={{ color: "#dc2626" }}>{dueDate}</strong></div>
        </div>
        <button onClick={onFile} style={{ padding: "10px 22px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          File IFTA Return
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Miles",      value: totalMiles.toLocaleString(),   sub: "All jurisdictions",       color: "#1d4ed8", bg: "#eff6ff" },
          { label: "Total Gallons",    value: totalGallons.toLocaleString(), sub: "Fuel purchased",          color: "#065f46", bg: "#f0fdf4" },
          { label: "Avg MPG",          value: totalMiles && totalGallons ? (totalMiles / totalGallons).toFixed(1) : "—", sub: "Fleet average", color: "#ca8a04", bg: "#fefce8" },
          { label: "Fuel Spend",       value: `$${fuelTotal.toLocaleString()}`,  sub: "All receipts",        color: "#475569", bg: "#f8fafc" },
          { label: "Est. Tax Owed",    value: `$${totalTax.toLocaleString()}`,   sub: "Across all states",   color: totalTax > 0 ? "#dc2626" : "#16a34a", bg: totalTax > 0 ? "#fef2f2" : "#f0fdf4" },
          { label: "Receipts",         value: `${verified} / ${receipts.length}`, sub: `${missing} missing`, color: missing > 0 ? "#ea580c" : "#16a34a", bg: missing > 0 ? "#fff7ed" : "#f0fdf4" },
        ].map(k => (
          <div key={k.label} style={{ background: k.bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color, marginBottom: 2 }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{k.label}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {stateRows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 13, color: "#0f172a" }}>State Breakdown</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["State","Miles","Gallons","Tax Rate","Tax Owed"].map(h => (
                  <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stateRows.sort((a, b) => b.miles - a.miles).map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "9px 14px", fontWeight: 800 }}>{r.state}</td>
                  <td style={{ padding: "9px 14px" }}>{r.miles.toLocaleString()}</td>
                  <td style={{ padding: "9px 14px", color: "#475569" }}>{r.gallons.toFixed(1)}</td>
                  <td style={{ padding: "9px 14px", color: "#64748b" }}>{r.tax_rate}</td>
                  <td style={{ padding: "9px 14px", fontWeight: 700, color: r.tax_owed > 0 ? "#dc2626" : "#16a34a" }}>
                    {r.tax_owed >= 0 ? `$${r.tax_owed.toLocaleString()}` : `-$${Math.abs(r.tax_owed).toLocaleString()}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stateRows.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", background: "#f8fafc", borderRadius: 12, border: "1px dashed #e2e8f0", color: "#94a3b8" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>No Data Yet</div>
          <div style={{ fontSize: 13 }}>Log fuel receipts and odometer readings to generate the quarterly report.</div>
        </div>
      )}
    </div>
  );
}

/* ─── Reports Tab ─────────────────────────────────────────────── */
function ReportsTab({ stateRows, receipts, showToast }: { stateRows: StateMileage[]; receipts: FuelReceipt[]; showToast: (m: string) => void }) {
  function exportCSV() {
    const headers = ["State","Miles","Gallons","MPG","Tax Rate","Tax Owed"];
    const rows = stateRows.map(r => [r.state, r.miles, r.gallons.toFixed(1), r.mpg, r.tax_rate, r.tax_owed]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ifta-state-mileage.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("State mileage report exported.");
  }

  function exportReceipts() {
    const headers = ["Date","Truck","Driver","State","Gallons","Price/Gal","Total","Vendor","Status"];
    const rows = receipts.map(r => [r.date, r.truck, r.driver, r.state, r.gallons, r.price_per_gallon, r.total, r.vendor, r.status]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ifta-fuel-receipts.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("Fuel receipts exported.");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={exportCSV} style={{ padding: "9px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Export State Mileage CSV</button>
        <button onClick={exportReceipts} style={{ padding: "9px 20px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Export Fuel Receipts CSV</button>
        <button onClick={() => showToast("Audit package generation coming soon.")} style={{ padding: "9px 20px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Generate Audit Package</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 12, fontSize: 13 }}>Top States by Miles</div>
          {stateRows.length ? stateRows.sort((a,b) => b.miles - a.miles).slice(0, 6).map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{r.state}</span>
              <strong>{r.miles.toLocaleString()} mi</strong>
            </div>
          )) : <div style={{ color: "#94a3b8", fontSize: 13 }}>No data yet.</div>}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 12, fontSize: 13 }}>Receipt Status Summary</div>
          {[
            { label: "Verified",  count: receipts.filter(r => r.status === "verified").length,  color: "#15803d" },
            { label: "Pending",   count: receipts.filter(r => r.status === "pending").length,   color: "#b45309" },
            { label: "Missing",   count: receipts.filter(r => r.status === "missing").length,   color: "#dc2626" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
              <strong style={{ color: s.color }}>{s.count}</strong>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "#475569" }}>Total</span>
            <strong>{receipts.length}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
const CURRENT_YEAR = new Date().getFullYear();
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

function getActiveQuarter(): Quarter {
  const m = new Date().getMonth();
  if (m < 3)  return "Q1";
  if (m < 6)  return "Q2";
  if (m < 9)  return "Q3";
  return "Q4";
}

export default function IFTAPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "queue" | "mileage" | "receipts" | "reports">("summary");
  const [quarter, setQuarter]     = useState<Quarter>(getActiveQuarter());
  const [year, setYear]           = useState(CURRENT_YEAR);
  const [stateRows, setStateRows] = useState<StateMileage[]>([]);
  const [receipts, setReceipts]   = useState<FuelReceipt[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState("");

  const [receiptOpen,  setReceiptOpen]  = useState(false);
  const [odometerOpen, setOdometerOpen] = useState(false);
  const [fileOpen,     setFileOpen]     = useState(false);

  function showToast(msg: string) { setToast(msg); }

  useEffect(() => {
    setLoading(true);
    const qStr = `${quarter} ${year}`;
    Promise.all([
      fetch(`/api/ifta/mileage/state?quarter=${encodeURIComponent(qStr)}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/ifta/fuel-receipts?quarter=${encodeURIComponent(qStr)}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/ifta/alerts?quarter=${encodeURIComponent(qStr)}`).then(r => r.json()).catch(() => ({})),
    ]).then(([mileageData, receiptsData, alertsData]) => {
      setStateRows(mileageData.states || mileageData.rows || []);
      setReceipts(receiptsData.receipts || receiptsData.rows || []);
      // Map alerts → work items
      const items: WorkItem[] = (alertsData.alerts || alertsData.items || []).map((a: any, i: number) => ({
        id: a.id || String(i),
        priority: a.priority || "medium",
        category: a.category || "missing_receipt",
        title: a.title || a.name || "Action Required",
        detail: a.detail || a.description || "",
        truck: a.truck || a.truck_number,
        due: a.due,
      }));
      setWorkItems(items);
    }).finally(() => setLoading(false));
  }, [quarter, year]);

  const kpis = useMemo(() => ({
    totalTax:        stateRows.reduce((s, r) => s + r.tax_owed, 0),
    missingReceipts: receipts.filter(r => r.status === "missing").length + (workItems.filter(i => i.category === "missing_receipt").length),
    qStatus:         receipts.length > 0 ? "In Progress" : "No Data",
    dueDate:         QUARTER_DUE[quarter],
  }), [stateRows, receipts, workItems, quarter]);

  const TABS = [
    { id: "summary",  label: "Quarterly Summary", badge: null },
    { id: "queue",    label: "Work Queue",         badge: workItems.filter(i => i.priority === "critical" || i.priority === "high").length || null },
    { id: "mileage",  label: "State Mileage",      badge: null },
    { id: "receipts", label: "Fuel Receipts",      badge: receipts.filter(r => r.status === "missing").length || null },
    { id: "reports",  label: "Reports",            badge: null },
  ] as const;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Money / Compliance</div>
            <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>IFTA / Fuel Tax Work Center</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Track quarterly IFTA filings, state mileage, fuel receipts, and tax calculations in one place.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* Quarter selector */}
            <div style={{ display: "flex", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "4px 6px" }}>
              {QUARTERS.map(q => (
                <button key={q} onClick={() => setQuarter(q)} style={{ padding: "5px 12px", background: quarter === q ? "#ca8a04" : "transparent", color: quarter === q ? "#fff" : "#64748b", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{q}</button>
              ))}
            </div>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: 13, background: "#fff" }}>
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map(y => <option key={y}>{y}</option>)}
            </select>
            <button onClick={() => setReceiptOpen(true)} style={{ padding: "9px 16px", background: "#ca8a04", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>+ Log Fuel Receipt</button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "flex", overflowX: "auto", borderTop: "1px solid #f1f5f9" }}>
          {[
            { label: "Quarter",         value: `${quarter} ${year}`,                                color: "#ca8a04" },
            { label: "Total Miles",     value: stateRows.reduce((s,r) => s + r.miles, 0).toLocaleString() || "—", color: "#1d4ed8" },
            { label: "Total Gallons",   value: stateRows.reduce((s,r) => s + r.gallons, 0).toLocaleString() || "—", color: "#065f46" },
            { label: "States Driven",   value: stateRows.length,                                    color: "#7c3aed" },
            { label: "Fuel Receipts",   value: receipts.length,                                     color: "#475569" },
            { label: "Missing",         value: receipts.filter(r => r.status === "missing").length, color: receipts.some(r => r.status === "missing") ? "#dc2626" : "#16a34a" },
            { label: "Est. Tax Owed",   value: `$${stateRows.reduce((s,r) => s + r.tax_owed, 0).toLocaleString()}`, color: "#dc2626" },
            { label: "Open Items",      value: workItems.length,                                    color: workItems.some(i => i.priority === "critical") ? "#dc2626" : "#64748b" },
          ].map((k, i) => (
            <div key={i} style={{ padding: "10px 18px", textAlign: "center", borderRight: "1px solid #f1f5f9", minWidth: 88 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 1 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} style={{ padding: "11px 16px", background: "transparent", border: "none", borderBottom: `3px solid ${activeTab === tab.id ? "#ca8a04" : "transparent"}`, color: activeTab === tab.id ? "#ca8a04" : "#64748b", fontWeight: activeTab === tab.id ? 800 : 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {tab.label}
              {!!tab.badge && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display: "flex", gap: 14, padding: "16px 24px 24px", alignItems: "flex-start" }}>
        <StaffTodayPanel onReceipt={() => setReceiptOpen(true)} onOdometer={() => setOdometerOpen(true)} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: 20, minHeight: 400 }}>
            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 13 }}>Loading {quarter} {year} data…</div>
              </div>
            ) : (
              <>
                {activeTab === "summary"  && <QuarterlyTab quarter={quarter} year={year} stateRows={stateRows} receipts={receipts} onFile={() => setFileOpen(true)} />}
                {activeTab === "queue"    && <QueueTab items={workItems} onReceipt={() => setReceiptOpen(true)} onOdometer={() => setOdometerOpen(true)} />}
                {activeTab === "mileage"  && <StateMileageTab rows={stateRows} />}
                {activeTab === "receipts" && <FuelReceiptsTab receipts={receipts} onAdd={() => setReceiptOpen(true)} />}
                {activeTab === "reports"  && <ReportsTab stateRows={stateRows} receipts={receipts} showToast={showToast} />}
              </>
            )}
          </div>
        </div>

        <IFTAAssistantPanel
          kpis={kpis}
          workItems={workItems}
          onReceipt={() => setReceiptOpen(true)}
          onOdometer={() => setOdometerOpen(true)}
          onFileTax={() => setFileOpen(true)}
        />
      </div>

      {/* ── Modals ── */}
      {receiptOpen  && <UploadReceiptModal onClose={() => setReceiptOpen(false)}  showToast={showToast} />}
      {odometerOpen && <OdometerModal      onClose={() => setOdometerOpen(false)} showToast={showToast} />}
      {fileOpen     && <FileReturnModal quarter={quarter} year={year} onClose={() => setFileOpen(false)} showToast={showToast} />}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </div>
  );
}
