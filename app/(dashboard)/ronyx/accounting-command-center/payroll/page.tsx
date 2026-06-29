"use client";

/* Accounting Command Center — Phase 4a: Driver Payroll Control (employee drivers, kept
   separate from owner-operator settlements). Seeded demo data; wires to driver_pay_runs +
   driver_pay_lines. */

import { useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Appr = "Draft" | "Approved" | "On Hold" | "Paid";
type Driver = {
  id: string; name: string; period: string; loads: number; tons: number; hours: number;
  base: number; ot: number; bonus: number; reimb: number; deduct: number; tickets: number;
  exceptions: string[]; appr: Appr; exported: boolean; missingRate?: boolean;
};

const RAW: Driver[] = [
  { id: "D1", name: "M. Chen",   period: "Wk 26", loads: 42, tons: 0,   hours: 0,  base: 1680, ot: 120, bonus: 50,  reimb: 40, deduct: 60,  tickets: 42, exceptions: [],                         appr: "Draft",    exported: false },
  { id: "D2", name: "J. Lane",   period: "Wk 26", loads: 0,  tons: 0,   hours: 38, base: 1330, ot: 0,   bonus: 0,   reimb: 0,  deduct: 0,   tickets: 19, exceptions: [],                         appr: "Approved", exported: false },
  { id: "D3", name: "S. Grant",  period: "Wk 26", loads: 31, tons: 0,   hours: 0,  base: 1240, ot: 0,   bonus: 0,   reimb: 25, deduct: 0,   tickets: 31, exceptions: ["Missing pay rate"],        appr: "Draft",    exported: false, missingRate: true },
  { id: "D4", name: "D. Perez",  period: "Wk 26", loads: 0,  tons: 0,   hours: 41, base: 1435, ot: 75,  bonus: 0,   reimb: 0,  deduct: 90,  tickets: 22, exceptions: [],                         appr: "On Hold",  exported: false },
  { id: "D5", name: "K. Miles",  period: "Wk 26", loads: 27, tons: 0,   hours: 0,  base: 1080, ot: 0,   bonus: 25,  reimb: 0,  deduct: 0,   tickets: 26, exceptions: ["1 ticket missing BOL"],    appr: "Draft",    exported: false },
  { id: "D6", name: "R. Diaz",   period: "Wk 25", loads: 0,  tons: 0,   hours: 40, base: 1400, ot: 0,   bonus: 0,   reimb: 0,  deduct: 0,   tickets: 20, exceptions: [],                         appr: "Paid",     exported: true },
];
const gross = (d: Driver) => d.base + d.ot + d.bonus;
const net = (d: Driver) => gross(d) + d.reimb - d.deduct;

const APPR_STYLE: Record<Appr, { bg: string; fg: string }> = {
  Draft: { bg: "#f1f5f9", fg: "#475569" }, Approved: { bg: "#dcfce7", fg: "#15803d" }, "On Hold": { bg: "#fef9c3", fg: "#b45309" }, Paid: { bg: "#dbeafe", fg: "#1d4ed8" },
};
const ACTIONS = ["Review Pay", "Edit Pay Rule", "Add Reimbursement", "Add Deduction", "Approve Payroll", "Place on Hold", "Export to Provider", "View Tickets", "Audit History"];

export default function Payroll() {
  const [drawer, setDrawer] = useState<Driver | null>(null);
  const [locked, setLocked] = useState(false);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const cards = useMemo(() => {
    const cur = RAW.filter(d => d.period === "Wk 26");
    return [
      { label: "Gross Payroll",   v: fmt(cur.reduce((s, d) => s + gross(d), 0)), tone: "#0f172a" },
      { label: "Approved Payroll",v: fmt(cur.filter(d => d.appr === "Approved").reduce((s, d) => s + net(d), 0)), tone: "#15803d" },
      { label: "Payroll on Hold", v: fmt(cur.filter(d => d.appr === "On Hold").reduce((s, d) => s + net(d), 0)), tone: "#b45309" },
      { label: "Missing Pay Rates", v: String(cur.filter(d => d.missingRate).length), tone: "#dc2626" },
      { label: "Reimbursements",  v: fmt(cur.reduce((s, d) => s + d.reimb, 0)), tone: "#1d4ed8" },
      { label: "Deductions",      v: fmt(cur.reduce((s, d) => s + d.deduct, 0)), tone: "#7c3aed" },
      { label: "Ready to Export", v: String(cur.filter(d => d.appr === "Approved" && !d.exported).length), tone: "#0e7490" },
      { label: "Exceptions",      v: String(cur.filter(d => d.exceptions.length).length), tone: "#ea580c" },
    ];
  }, []);

  return (
    <AcctShell active="payroll" title="Driver Payroll Control" subtitle="Pay employee drivers off validated tickets — once, and on time."
      controls={<><button style={ctrlBtn}>Wk 26 ▾</button><button style={ctrlBtn}>⬇ Export</button>
        <button onClick={() => { setLocked(l => !l); flash(locked ? "Pay period unlocked." : "Pay period LOCKED — dispatchers can no longer change it."); }} style={{ ...primaryBtn, background: locked ? "#16a34a" : "#1e293b" }}>{locked ? "🔓 Unlock Period" : "🔒 Lock Pay Period"}</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}
      {locked && <div style={{ background: "#0f172a", color: "#fff", borderRadius: 10, padding: "9px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 700 }}>🔒 Wk 26 is locked — only Owner/Controller can unlock. Dispatchers cannot edit payroll.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
        {cards.map(c => <div key={c.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{c.label}</div><div style={{ fontSize: "1.3rem", fontWeight: 900, color: c.tone, marginTop: 4 }}>{c.v}</div></div>)}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.79rem", minWidth: 1150 }}>
            <thead><tr>{["Driver", "Period", "Loads/Hrs", "Base", "OT", "Bonus", "Reimb", "Deduct", "Gross", "Net Est.", "Tickets", "Exceptions", "Approval", "Export", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {RAW.map(d => {
                const ap = APPR_STYLE[d.appr];
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontWeight: 800 }}>{d.name}</td>
                    <td style={td}>{d.period}</td>
                    <td style={{ ...td, textAlign: "right" }}>{d.loads ? `${d.loads} ld` : `${d.hours} hr`}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmtc(d.base)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{d.ot ? fmtc(d.ot) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{d.bonus ? fmtc(d.bonus) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "#15803d" }}>{d.reimb ? fmtc(d.reimb) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "#dc2626" }}>{d.deduct ? "-" + fmtc(d.deduct) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtc(gross(d))}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 900, color: "#0f172a" }}>{fmtc(net(d))}</td>
                    <td style={{ ...td, textAlign: "right" }}>{d.tickets}</td>
                    <td style={td}>{d.exceptions.length ? <span style={{ ...chip, background: "#fef2f2", color: "#dc2626" }}>⚠ {d.exceptions[0]}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={td}><span style={{ ...chip, background: ap.bg, color: ap.fg }}>{d.appr}</span></td>
                    <td style={td}>{d.exported ? <span style={{ ...chip, background: "#dbeafe", color: "#1d4ed8" }}>Exported</span> : "—"}</td>
                    <td style={td}><button onClick={() => setDrawer(d)} style={{ ...chip, cursor: "pointer", background: "#0f172a", color: "#fff" }}>Review ▸</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8" }}>Phase 4 of 8 · seeded demo data · drivers are employees — owner-operators settle separately</div>
      </div>

      {drawer && (
        <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: "92vw", background: "#fff", height: "100%", overflowY: "auto", padding: "22px 24px", boxShadow: "-10px 0 40px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontWeight: 900, fontSize: "1.15rem" }}>{drawer.name}</div><button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button></div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 14 }}>{drawer.period} · {drawer.tickets} tickets</div>
            {[["Base pay", fmtc(drawer.base)], ["Overtime", fmtc(drawer.ot)], ["Bonus", fmtc(drawer.bonus)], ["Reimbursements", "+" + fmtc(drawer.reimb)], ["Deductions", "-" + fmtc(drawer.deduct)], ["Net pay estimate", fmtc(net(drawer))]].map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.86rem", fontWeight: i === 5 ? 900 : 500 }}><span style={{ color: i === 5 ? "#0f172a" : "#475569" }}>{k}</span><span>{v}</span></div>
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 16 }}>
              {ACTIONS.map(a => <button key={a} disabled={locked && a !== "View Tickets" && a !== "Audit History"} onClick={() => flash(`${a} — ${drawer.name} (demo)`)} style={{ ...chip, cursor: locked && a.includes("Approve") ? "not-allowed" : "pointer", opacity: locked && (a.includes("Approve") || a.includes("Edit") || a.includes("Add")) ? 0.4 : 1, padding: "7px 11px", background: a.includes("Approve") ? "#16a34a" : a.includes("Hold") ? "#fef2f2" : "#f8fafc", color: a.includes("Approve") ? "#fff" : a.includes("Hold") ? "#dc2626" : "#1e293b", border: "1px solid #e2e8f0", fontWeight: 700 }}>{a}</button>)}
            </div>
            {locked && <div style={{ marginTop: 10, fontSize: "0.74rem", color: "#94a3b8" }}>Period is locked — edits/approvals disabled.</div>}
          </div>
        </div>
      )}
    </AcctShell>
  );
}
