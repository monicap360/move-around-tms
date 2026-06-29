"use client";

/* Accounting Command Center — Phase 7: Accounting Sync & Exports (QuickBooks-first).
   Seeded demo data; wires to accounting_exports + accounting_sync_logs. */

import { useState } from "react";
import { AcctShell, fmt, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Status = "ready" | "exported" | "failed";
type Exp = { id: string; type: string; ref: string; count: number; amount: number; status: Status; extRef: string | null; date: string | null; by: string | null; error: string | null };

const RAW: Exp[] = [
  { id: "EX-301", type: "Customer Invoices",       ref: "Batch 06-29",  count: 6,  amount: 24080, status: "ready",    extRef: null,        date: null,    by: null,        error: null },
  { id: "EX-302", type: "Customer Payments",       ref: "06-28 deposit",count: 3,  amount: 13240, status: "ready",    extRef: null,        date: null,    by: null,        error: null },
  { id: "EX-303", type: "Owner Operator Settlements",ref: "Wk 26",      count: 5,  amount: 31100, status: "ready",    extRef: null,        date: null,    by: null,        error: null },
  { id: "EX-298", type: "Driver Payroll Summary",  ref: "Wk 25",        count: 6,  amount: 8420,  status: "exported",  extRef: "QB-JE-4471",date: "06-26", by: "Sylvia P",  error: null },
  { id: "EX-299", type: "Fuel Expenses",           ref: "06-22→06-28",  count: 9,  amount: 2940,  status: "exported",  extRef: "QB-EXP-882",date: "06-29", by: "Sylvia P",  error: null },
  { id: "EX-300", type: "Maintenance Expenses",    ref: "June",         count: 4,  amount: 1690,  status: "failed",    extRef: null,        date: "06-29", by: "Tabitha L", error: "QuickBooks: vendor 'Bear Tire' not found — add or map vendor" },
];
const TABS = [
  { key: "ready",    label: "Ready to Export", match: (e: Exp) => e.status === "ready" },
  { key: "exported", label: "Exported",        match: (e: Exp) => e.status === "exported" },
  { key: "failed",   label: "Failed Syncs",    match: (e: Exp) => e.status === "failed" },
  { key: "recon",    label: "Reconciliation",  match: () => false },
  { key: "map",      label: "Mapping Rules",   match: () => false },
  { key: "hist",     label: "Export History",  match: () => true },
];

export default function Exports() {
  const [tab, setTab] = useState("ready");
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const active = TABS.find(t => t.key === tab)!;
  const rows = RAW.filter(active.match);

  return (
    <AcctShell active="exports" title="Accounting Sync & Exports" subtitle="Push invoices, payments, payroll, settlements, and costs to QuickBooks — once each, never twice."
      controls={<><button style={ctrlBtn}>Connected: QuickBooks ✓</button><button style={primaryBtn} onClick={() => flash("Pushed ready batches to QuickBooks (demo).")}>⇪ Sync Ready</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TABS.map(t => { const n = RAW.filter(t.match).length; const on = tab === t.key; return <button key={t.key} onClick={() => setTab(t.key)} style={{ ...chip, cursor: "pointer", padding: "7px 12px", background: on ? "#0f172a" : "#fff", color: on ? "#fff" : "#475569", border: "1px solid " + (on ? "#0f172a" : "#e2e8f0"), fontWeight: 800 }}>{t.label}{["recon", "map"].includes(t.key) ? "" : <span style={{ opacity: 0.7 }}> · {n}</span>}</button>; })}
      </div>

      {tab === "map" ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", fontSize: "0.86rem" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>QuickBooks Mapping</div>
          {[["Customer Invoices", "→ QB Invoice"], ["Customer Payments", "→ QB Receive Payment"], ["OO Settlements", "→ QB Bill / Vendor"], ["Driver Payroll", "→ QB Journal Entry"], ["Fuel / Maintenance", "→ QB Expense (by category)"], ["Customers & Vendors", "→ QB Master Data"]].map(([a, b]) => <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}><span style={{ fontWeight: 700 }}>{a}</span><span style={{ color: "#1d4ed8", fontWeight: 700 }}>{b}</span></div>)}
        </div>
      ) : tab === "recon" ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", fontSize: "0.86rem" }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Reconciliation — TMS vs QuickBooks</div>
          {[["Invoiced revenue (TMS)", fmt(248300)], ["Invoices in QuickBooks", fmt(248300)], ["Difference", fmt(0)]].map(([a, b], i) => <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", fontWeight: i === 2 ? 900 : 500 }}><span>{a}</span><span style={{ color: i === 2 ? "#15803d" : "#0f172a" }}>{b}</span></div>)}
          <div style={{ marginTop: 10, color: "#15803d", fontWeight: 700, fontSize: "0.82rem" }}>✓ In balance.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.79rem", minWidth: 1000 }}>
              <thead><tr>{["Export", "Type", "Source", "Records", "Amount", "Status", "QB Reference", "Date", "By", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map(e => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9", background: e.status === "failed" ? "#fffafa" : "transparent" }}>
                    <td style={{ ...td, fontWeight: 700, color: "#4338ca" }}>{e.id}</td>
                    <td style={td}>{e.type}</td>
                    <td style={td}>{e.ref}</td>
                    <td style={{ ...td, textAlign: "right" }}>{e.count}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmt(e.amount)}</td>
                    <td style={td}><span style={{ ...chip, background: e.status === "exported" ? "#dcfce7" : e.status === "failed" ? "#fee2e2" : "#dbeafe", color: e.status === "exported" ? "#15803d" : e.status === "failed" ? "#dc2626" : "#1d4ed8" }}>{e.status === "exported" ? "Exported" : e.status === "failed" ? "Failed" : "Ready"}</span>{e.error && <div style={{ fontSize: "0.68rem", color: "#dc2626", marginTop: 3, maxWidth: 220, whiteSpace: "normal" }}>{e.error}</div>}</td>
                    <td style={{ ...td, color: "#4338ca", fontWeight: 700 }}>{e.extRef || "—"}</td>
                    <td style={td}>{e.date || "—"}</td>
                    <td style={td}>{e.by || "—"}</td>
                    <td style={td}>{e.status === "ready" ? <button onClick={() => flash(`${e.id} pushed to QuickBooks (demo)`)} style={{ ...chip, cursor: "pointer", background: "#16a34a", color: "#fff" }}>Export ▸</button> : e.status === "failed" ? <button onClick={() => flash(`${e.id} retry queued (demo)`)} style={{ ...chip, cursor: "pointer", background: "#b45309", color: "#fff" }}>Retry</button> : <button style={{ ...chip, cursor: "pointer", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }}>View source</button>}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={10} style={{ padding: "36px 0", textAlign: "center", color: "#94a3b8" }}>Nothing here. ✓</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8" }}>Phase 7 of 8 · seeded demo data · idempotent — each source record exports once (idempotency key = source ID)</div>
        </div>
      )}
    </AcctShell>
  );
}
