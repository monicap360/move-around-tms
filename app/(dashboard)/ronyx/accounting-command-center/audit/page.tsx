"use client";

/* Accounting Command Center — Phase 8: Financial Audit Trail + period locking.
   Seeded demo data; wires to financial_audit_events + financial_periods. */

import { useMemo, useState } from "react";
import { AcctShell, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Ev = { id: string; ts: string; user: string; module: string; rtype: string; rnum: string; action: string; prev: string; next: string; reason: string; appr: string; link: string };

const RAW: Ev[] = [
  { id: "A1", ts: "06-29 17:41", user: "Sylvia P",  module: "Ticket-to-Invoice", rtype: "Invoice",    rnum: "INV-2215", action: "Invoice created",     prev: "—",        next: "$3,960.00", reason: "Batch 06-29",          appr: "Auto",     link: "INV-2215" },
  { id: "A2", ts: "06-29 16:12", user: "Tabitha L", module: "Tickets",           rtype: "Ticket",     rnum: "TKT-88238", action: "Rate edited",        prev: "$11.00",   next: "$12.00",    reason: "Match signed rate card", appr: "Approved", link: "TKT-88238" },
  { id: "A3", ts: "06-29 15:48", user: "Sylvia P",  module: "Settlements",       rtype: "Settlement", rnum: "STL-0605", action: "Settlement approved",  prev: "Draft",    next: "Approved",  reason: "Compliance clear",       appr: "Approved", link: "STL-0605" },
  { id: "A4", ts: "06-29 14:30", user: "Sylvia P",  module: "Receivables",       rtype: "Customer",   rnum: "Delta Earthworks", action: "Placed on credit hold", prev: "Active", next: "Hold", reason: "95 days overdue",      appr: "Manager",  link: "INV-2142" },
  { id: "A5", ts: "06-28 18:05", user: "Tabitha L", module: "Payroll",           rtype: "Deduction",  rnum: "PAY-D4",   action: "Deduction added",     prev: "$0.00",    next: "$90.00",    reason: "Advance repayment",      appr: "Approved", link: "D4" },
  { id: "A6", ts: "06-28 11:20", user: "Sylvia P",  module: "Exports",           rtype: "Export",     rnum: "EX-298",   action: "Exported to QuickBooks",prev: "Ready",   next: "Exported",  reason: "Wk 25 payroll",          appr: "Auto",     link: "QB-JE-4471" },
  { id: "A7", ts: "06-27 09:14", user: "Sylvia P",  module: "Period",            rtype: "Period",     rnum: "Wk 24",    action: "Period locked",       prev: "Open",     next: "Locked",    reason: "Closed for billing",     appr: "Owner",    link: "Wk 24" },
];
const MODULES = ["All", ...Array.from(new Set(RAW.map(e => e.module)))];
const PERIODS = [
  { name: "Wk 24", locked: true }, { name: "Wk 25", locked: true }, { name: "Wk 26", locked: false }, { name: "Wk 27", locked: false },
];

export default function Audit() {
  const [mod, setMod] = useState("All");
  const [q, setQ] = useState("");
  const [periods, setPeriods] = useState(PERIODS);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const rows = useMemo(() => RAW.filter(e => (mod === "All" || e.module === mod) && (!q || [e.user, e.rnum, e.action, e.reason].some(v => v.toLowerCase().includes(q.toLowerCase())))), [mod, q]);

  return (
    <AcctShell active="audit" title="Financial Audit Trail" subtitle="Every money-changing action — who, what, when, before → after, and why."
      controls={<><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search user / record / reason…" style={{ ...ctrlBtn, width: 220 }} /><button style={primaryBtn}>⬇ Export Log</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      {/* Period locking */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 18 }}>
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: "0.92rem" }}>🔒 Financial Periods</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {periods.map((p, i) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, background: p.locked ? "#0f172a" : "#f8fafc", color: p.locked ? "#fff" : "#334155", border: "1px solid " + (p.locked ? "#0f172a" : "#e2e8f0"), borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontWeight: 800, fontSize: "0.84rem" }}>{p.name}</span>
              <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>{p.locked ? "Locked" : "Open"}</span>
              <button onClick={() => { setPeriods(ps => ps.map((x, j) => j === i ? { ...x, locked: !x.locked } : x)); flash(`${p.name} ${p.locked ? "unlocked" : "locked"} (Owner/Controller only)`); }} style={{ ...chip, cursor: "pointer", background: p.locked ? "#16a34a" : "#1e293b", color: "#fff" }}>{p.locked ? "Unlock" : "Lock"}</button>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 8 }}>Only Owners &amp; Controllers can lock/unlock. A locked period blocks ticket/rate/payroll edits and is fully auditable.</div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {MODULES.map(m => <button key={m} onClick={() => setMod(m)} style={{ ...chip, cursor: "pointer", padding: "6px 11px", background: mod === m ? "#0f172a" : "#fff", color: mod === m ? "#fff" : "#475569", border: "1px solid " + (mod === m ? "#0f172a" : "#e2e8f0"), fontWeight: 800 }}>{m}</button>)}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", minWidth: 1150 }}>
            <thead><tr>{["Date / Time", "User", "Module", "Record", "Action", "Previous", "New", "Reason", "Approval", "Linked"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(e => (
                <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ ...td, color: "#64748b" }}>{e.ts}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{e.user}</td>
                  <td style={td}><span style={{ ...chip, background: "#f1f5f9", color: "#475569" }}>{e.module}</span></td>
                  <td style={{ ...td }}><span style={{ color: "#64748b" }}>{e.rtype}</span> <strong style={{ color: "#4338ca" }}>{e.rnum}</strong></td>
                  <td style={{ ...td, fontWeight: 700 }}>{e.action}</td>
                  <td style={{ ...td, color: "#dc2626" }}>{e.prev}</td>
                  <td style={{ ...td, color: "#15803d", fontWeight: 700 }}>{e.next}</td>
                  <td style={{ ...td, color: "#475569", fontStyle: "italic", whiteSpace: "normal", maxWidth: 180 }}>{e.reason}</td>
                  <td style={td}><span style={{ ...chip, background: e.appr === "Manager" || e.appr === "Owner" ? "#ede9fe" : "#dcfce7", color: e.appr === "Manager" || e.appr === "Owner" ? "#7c3aed" : "#15803d" }}>{e.appr}</span></td>
                  <td style={{ ...td, color: "#4338ca", fontWeight: 700 }}>{e.link}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} style={{ padding: "36px 0", textAlign: "center", color: "#94a3b8" }}>No matching events.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8" }}>Phase 8 of 8 · seeded demo data · posted financial records are never deleted — only adjusted with a logged reason</div>
      </div>
    </AcctShell>
  );
}
