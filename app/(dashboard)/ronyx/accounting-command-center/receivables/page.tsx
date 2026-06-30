"use client";

/* Accounting Command Center — Phase 3: Accounts Receivable & Collections.
   Seeded dump-truck demo data; wires to customer_invoices + invoice_payments +
   collection_notes + customer_credit_profiles as they fill. */

import { useEffect, useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Dispute = "—" | "Open" | "Resolved";
type Invoice = {
  id: string; customer: string; date: string; due: string; original: number; paid: number;
  daysOut: number; dispute: Dispute; hold: boolean; lastContact: string; promise: string | null;
  collector: string; creditLimit: number; jobs: string[];
};

const RAW: Invoice[] = [
  { id: "INV-2204", customer: "Sterling Materials", date: "06-25", due: "07-25", original: 4820, paid: 0,    daysOut: 4,  dispute: "—",     hold: false, lastContact: "06-26", promise: null,    collector: "Sylvia P", creditLimit: 25000, jobs: ["I-45 Base"] },
  { id: "INV-2208", customer: "Holt Paving",        date: "06-22", due: "07-22", original: 6310, paid: 2000, daysOut: 7,  dispute: "—",     hold: false, lastContact: "06-28", promise: "07-05", collector: "Sylvia P", creditLimit: 40000, jobs: ["SH-249 Reload"] },
  { id: "INV-2188", customer: "Delta Earthworks",   date: "05-22", due: "06-21", original: 9650, paid: 0,    daysOut: 38, dispute: "—",     hold: true,  lastContact: "06-20", promise: null,    collector: "Sylvia P", creditLimit: 15000, jobs: ["Pad 7"] },
  { id: "INV-2156", customer: "Lone Star Ready Mix",date: "04-26", due: "05-26", original: 3120, paid: 0,    daysOut: 64, dispute: "—",     hold: false, lastContact: "06-15", promise: "07-03", collector: "Tabitha L",creditLimit: 20000, jobs: ["Plant 3"] },
  { id: "INV-2170", customer: "Bayou Aggregates",   date: "05-30", due: "06-29", original: 2480, paid: 0,    daysOut: 30, dispute: "Open",  hold: false, lastContact: "06-27", promise: null,    collector: "Tabitha L",creditLimit: 18000, jobs: ["Levee Haul"] },
  { id: "INV-2201", customer: "Holt Paving",        date: "06-18", due: "07-18", original: 5040, paid: 5040, daysOut: 0,  dispute: "—",     hold: false, lastContact: "06-19", promise: null,    collector: "Sylvia P", creditLimit: 40000, jobs: ["SH-249 Reload"] },
  { id: "INV-2142", customer: "Delta Earthworks",   date: "04-10", due: "05-10", original: 7300, paid: 1000, daysOut: 95, dispute: "—",     hold: true,  lastContact: "06-01", promise: null,    collector: "Sylvia P", creditLimit: 15000, jobs: ["Pad 5"] },
  { id: "INV-2215", customer: "Sterling Materials", date: "06-28", due: "07-28", original: 3960, paid: 0,    daysOut: 1,  dispute: "—",     hold: false, lastContact: "06-29", promise: null,    collector: "Tabitha L",creditLimit: 25000, jobs: ["I-45 Base"] },
];

const balance = (i: Invoice) => i.original - i.paid;
const bucket = (d: number) => d <= 0 ? "Current" : d <= 30 ? "1–30" : d <= 60 ? "31–60" : d <= 90 ? "61–90" : "90+";
const DEMO = RAW;

const ACTIONS = ["Send Invoice", "Send Statement", "Send Reminder", "Record Payment", "Add Collection Note", "Set Promise to Pay", "Place on Credit Hold", "Release Credit Hold", "Start Dispute", "Create Credit Memo", "Escalate to Manager"];

export default function Receivables() {
  const [filter, setFilter] = useState<string>("All");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [allInv, setAllInv] = useState<typeof DEMO>([]);
  const [live, setLive] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  // Pull real invoices; fall back to demo when there are none.
  useEffect(() => {
    fetch("/api/ronyx/accounting/invoices")
      .then(r => r.json())
      .then(d => { if (d.live && Array.isArray(d.invoices) && d.invoices.length) { setAllInv(d.invoices); setLive(true); } })
      .catch(() => {});
  }, []);

  const open = allInv.filter(i => balance(i) > 0.01);

  const kpis = useMemo(() => {
    const b = (name: string) => open.filter(i => bucket(i.daysOut) === name).reduce((s, i) => s + balance(i), 0);
    return [
      { key: "Current", label: "Current",        v: b("Current"), tone: "#15803d" },
      { key: "1–30",    label: "1–30 Days",      v: b("1–30"),    tone: "#b45309" },
      { key: "31–60",   label: "31–60 Days",     v: b("31–60"),   tone: "#ea580c" },
      { key: "61–90",   label: "61–90 Days",     v: b("61–90"),   tone: "#dc2626" },
      { key: "90+",     label: "90+ Days",       v: b("90+"),     tone: "#991b1b" },
      { key: "Disputed",label: "Disputed",       v: open.filter(i => i.dispute === "Open").reduce((s, i) => s + balance(i), 0), tone: "#7c3aed" },
      { key: "Hold",    label: "On Credit Hold", v: open.filter(i => i.hold).reduce((s, i) => s + balance(i), 0), tone: "#0e7490" },
      { key: "Promise", label: "Promise to Pay (wk)", v: open.filter(i => i.promise).reduce((s, i) => s + balance(i), 0), tone: "#1d4ed8" },
    ];
  }, [allInv]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = open.filter(i => {
    if (filter === "All") return true;
    if (filter === "Disputed") return i.dispute === "Open";
    if (filter === "Hold") return i.hold;
    if (filter === "Promise") return !!i.promise;
    return bucket(i.daysOut) === filter;
  });

  const drawerCust = drawer ? allInv.filter(i => i.customer === drawer) : [];
  const custOpen = drawerCust.filter(i => balance(i) > 0);

  return (
    <AcctShell active="ar" title="Accounts Receivable & Collections" subtitle="Know exactly who owes what, how old it is, and what to do next."
      controls={<><span style={{ ...chip, background: live ? "#dcfce7" : "#f1f5f9", color: live ? "#15803d" : "#94a3b8", padding: "7px 11px" }}>{live ? "● Live data" : "No data yet"}</span><button style={ctrlBtn}>This Period ▾</button><button style={ctrlBtn}>⬇ Export Aging</button><button style={primaryBtn}>+ Send Statements</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      {/* Aging KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
        {kpis.map(k => (
          <button key={k.key} onClick={() => setFilter(filter === k.key ? "All" : k.key)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${filter === k.key ? k.tone : "#e2e8f0"}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{k.label}</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: k.tone, marginTop: 4 }}>{fmt(k.v)}</div>
          </button>
        ))}
      </div>

      {filter !== "All" && <div style={{ marginBottom: 10, fontSize: "0.8rem", color: "#64748b" }}>Filtered: <strong>{filter}</strong> <button onClick={() => setFilter("All")} style={{ ...chip, cursor: "pointer", marginLeft: 6, background: "#f1f5f9" }}>clear ✕</button></div>}

      {/* AR table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.79rem", minWidth: 1100 }}>
            <thead><tr>{["Customer", "Invoice", "Date", "Due", "Original", "Paid", "Balance", "Days", "Aging", "Dispute", "Hold", "Last Contact", "Promise", "Collector", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(i => {
                const bal = balance(i); const ag = bucket(i.daysOut);
                return (
                  <tr key={i.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...td }}><button onClick={() => setDrawer(i.customer)} style={{ background: "none", border: "none", color: "#1d4ed8", fontWeight: 800, cursor: "pointer", padding: 0, fontSize: "0.79rem" }}>{i.customer}</button></td>
                    <td style={{ ...td, fontWeight: 700, color: "#4338ca" }}>{i.id}</td>
                    <td style={td}>{i.date}</td>
                    <td style={td}>{i.due}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmtc(i.original)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#15803d" }}>{i.paid ? fmtc(i.paid) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtc(bal)}</td>
                    <td style={{ ...td, textAlign: "right", color: i.daysOut > 60 ? "#dc2626" : i.daysOut > 30 ? "#ea580c" : "#64748b", fontWeight: i.daysOut > 30 ? 800 : 600 }}>{i.daysOut}</td>
                    <td style={td}><span style={{ ...chip, background: ag === "Current" ? "#dcfce7" : ag === "90+" ? "#fee2e2" : "#fef9c3", color: ag === "Current" ? "#15803d" : ag === "90+" ? "#dc2626" : "#b45309" }}>{ag}</span></td>
                    <td style={td}>{i.dispute === "Open" ? <span style={{ ...chip, background: "#ede9fe", color: "#7c3aed" }}>Disputed</span> : "—"}</td>
                    <td style={td}>{i.hold ? <span style={{ ...chip, background: "#cffafe", color: "#0e7490" }}>HOLD</span> : "—"}</td>
                    <td style={td}>{i.lastContact}</td>
                    <td style={td}>{i.promise ? <span style={{ ...chip, background: "#dbeafe", color: "#1d4ed8" }}>{i.promise}</span> : "—"}</td>
                    <td style={td}>{i.collector}</td>
                    <td style={td}><button onClick={() => setDrawer(i.customer)} style={{ ...chip, cursor: "pointer", background: "#0f172a", color: "#fff" }}>Manage ▸</button></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={15} style={{ padding: "36px 0", textAlign: "center", color: "#94a3b8" }}>Nothing in this aging bucket. 🎉</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>{rows.length} open invoice{rows.length === 1 ? "" : "s"} · {fmt(rows.reduce((s, i) => s + balance(i), 0))} outstanding</span>
          <span>Phase 3 of 8 · seeded demo data</span>
        </div>
      </div>

      {/* Customer drawer */}
      {drawer && (
        <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, maxWidth: "92vw", background: "#fff", height: "100%", overflowY: "auto", padding: "22px 24px", boxShadow: "-10px 0 40px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontWeight: 900, fontSize: "1.15rem" }}>{drawer}</div><div style={{ fontSize: "0.78rem", color: "#64748b" }}>Collector: {drawerCust[0]?.collector}</div></div>
              <button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
            </div>
            {(() => {
              const totalOpen = custOpen.reduce((s, i) => s + balance(i), 0);
              const limit = drawerCust[0]?.creditLimit || 0;
              const used = totalOpen;
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b" }}>OPEN A/R</div><div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#dc2626" }}>{fmt(totalOpen)}</div></div>
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b" }}>CREDIT USED</div><div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{fmt(used)} / {fmt(limit)}</div><div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, marginTop: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, (used / (limit || 1)) * 100)}%`, background: used / (limit || 1) > 0.85 ? "#dc2626" : "#1d4ed8" }} /></div></div>
                  </div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", margin: "6px 0" }}>Current Jobs</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>{Array.from(new Set(drawerCust.flatMap(i => i.jobs))).map(j => <span key={j} style={{ ...chip, background: "#eff6ff", color: "#1d4ed8" }}>{j}</span>)}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", margin: "6px 0" }}>Recent Invoices</div>
                  {drawerCust.map(i => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.82rem" }}>
                      <span style={{ fontWeight: 700, color: "#4338ca" }}>{i.id}</span><span style={{ color: "#64748b" }}>{i.date}</span><span style={{ fontWeight: 800, color: balance(i) > 0 ? "#dc2626" : "#15803d" }}>{balance(i) > 0 ? fmtc(balance(i)) + " due" : "paid"}</span>
                    </div>
                  ))}
                </>
              );
            })()}
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", margin: "16px 0 8px" }}>Actions</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ACTIONS.map(a => <button key={a} onClick={() => flash(`${a} — ${drawer} (demo)`)} style={{ ...chip, cursor: "pointer", padding: "7px 11px", background: a.includes("Hold") || a.includes("Dispute") || a.includes("Escalate") ? "#fef2f2" : "#f8fafc", color: a.includes("Hold") || a.includes("Dispute") || a.includes("Escalate") ? "#dc2626" : "#1e293b", border: "1px solid #e2e8f0", fontWeight: 700 }}>{a}</button>)}
            </div>
          </div>
        </div>
      )}
    </AcctShell>
  );
}
