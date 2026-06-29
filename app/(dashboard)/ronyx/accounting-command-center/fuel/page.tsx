"use client";

/* Accounting Command Center — Phase 6: Fuel & Cost Allocation.
   Seeded demo data; wires to fuel_transactions + cost_allocations. */

import { useEffect, useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Cost = { id: string; date: string; vendor: string; type: string; amount: number; truck: string | null; party: string | null; job: string | null; method: string | null; tab: string };

const DEMO: Cost[] = [
  { id: "FUEL-7781", date: "06-27", vendor: "Pilot #482",   type: "Fuel",        amount: 412, truck: "T-220", party: "Pineda Commodity", job: null,            method: null,            tab: "unmatched" },
  { id: "FUEL-7783", date: "06-27", vendor: "Loves #311",   type: "Fuel",        amount: 388, truck: "T-118", party: null,               job: null,            method: null,            tab: "unmatched" },
  { id: "FUEL-7790", date: "06-28", vendor: "Pilot #482",   type: "Fuel",        amount: 64,  truck: "T-104", party: "Double F",         job: "SH-249 Reload", method: "Per Load",      tab: "assigned" },
  { id: "FUEL-7791", date: "06-28", vendor: "Loves #311",   type: "Fuel",        amount: 70,  truck: "T-118", party: "Urdaneta",         job: "I-45 Base",     method: "Per Load",      tab: "assigned" },
  { id: "MNT-5102",  date: "06-20", vendor: "Bear Tire",    type: "Maintenance", amount: 1240,truck: null,    party: null,               job: null,            method: null,            tab: "maint" },
  { id: "MNT-5108",  date: "06-24", vendor: "Quick Lube",   type: "Maintenance", amount: 180, truck: "T-104", party: "Double F",         job: null,            method: "Direct to Truck",tab: "maint" },
  { id: "TOLL-330",  date: "06-26", vendor: "TxTag",        type: "Toll",        amount: 42,  truck: "T-150", party: "Coyans",           job: "Plant 3",       method: "Direct to Job", tab: "tolls" },
  { id: "PMT-118",   date: "06-22", vendor: "TX DOT",       type: "Permit",      amount: 95,  truck: "T-220", party: "Pineda",           job: null,            method: null,            tab: "tolls" },
  { id: "OTH-204",   date: "06-25", vendor: "Site Cleanup", type: "Other",       amount: 350, truck: null,    party: "Pineda",           job: "Levee Haul",    method: "Direct to Job", tab: "other" },
];

const TABS = [
  { key: "unmatched", label: "Unmatched Fuel",   match: (c: Cost) => c.tab === "unmatched" },
  { key: "assigned",  label: "Assigned Fuel",    match: (c: Cost) => c.tab === "assigned" },
  { key: "maint",     label: "Maintenance",      match: (c: Cost) => c.tab === "maint" },
  { key: "tolls",     label: "Tolls / Permits",  match: (c: Cost) => c.tab === "tolls" },
  { key: "other",     label: "Other Job Costs",  match: (c: Cost) => c.tab === "other" },
  { key: "rules",     label: "Allocation Rules", match: () => false },
];
const METHODS = ["Direct to Truck", "Direct to Job", "Per Mile", "Per Load", "Per Ton", "Percentage of Revenue", "Manual"];
const RULES = [
  ["Fuel", "Per Load to the truck's job"], ["Maintenance", "Direct to Truck, spread across the truck's jobs by load"],
  ["Tolls / Permits", "Direct to Job when a job is on the receipt, else Direct to Truck"], ["Other", "Manual review"],
];

export default function Fuel() {
  const [tab, setTab] = useState("unmatched");
  const [assign, setAssign] = useState<Cost | null>(null);
  const [toast, setToast] = useState("");
  const [data, setData] = useState(DEMO);
  const [live, setLive] = useState(false);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };
  const active = TABS.find(t => t.key === tab)!;
  const rows = data.filter(active.match);

  useEffect(() => {
    fetch("/api/ronyx/accounting/fuel").then(r => r.json()).then(d => {
      if (d.live && Array.isArray(d.items) && d.items.length) { setData(d.items); setLive(true); }
    }).catch(() => {});
  }, []);

  const unmatchedTotal = useMemo(() => data.filter(c => !c.method).reduce((s, c) => s + c.amount, 0), [data]);
  const unmatchedCount = data.filter(c => !c.method).length;

  return (
    <AcctShell active="fuel" title="Fuel & Cost Allocation" subtitle="Assign every cost to a truck or job — so margin is real, not a guess."
      controls={<><span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: live ? "#dcfce7" : "#f1f5f9", color: live ? "#15803d" : "#94a3b8", alignSelf: "center" }}>{live ? "● Live data" : "Demo data"}</span><button style={ctrlBtn}>Import Fuel Card ▾</button><button style={primaryBtn}>+ Add Cost</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      {unmatchedCount > 0 && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 700 }}>⚠ {fmtc(unmatchedTotal)} across {unmatchedCount} unassigned cost{unmatchedCount > 1 ? "s" : ""} — job margins stay estimated until these are allocated.</div>}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {TABS.map(t => { const n = data.filter(t.match).length; const on = tab === t.key; return <button key={t.key} onClick={() => setTab(t.key)} style={{ ...chip, cursor: "pointer", padding: "7px 12px", background: on ? "#0f172a" : "#fff", color: on ? "#fff" : "#475569", border: "1px solid " + (on ? "#0f172a" : "#e2e8f0"), fontWeight: 800 }}>{t.label}{t.key !== "rules" && <span style={{ opacity: 0.7 }}> · {n}</span>}</button>; })}
      </div>

      {tab === "rules" ? (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Cost Allocation Rules</div>
          {RULES.map(([t, r]) => <div key={t} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.86rem" }}><span style={{ fontWeight: 800, color: "#0f172a" }}>{t}</span><span style={{ color: "#475569" }}>{r}</span></div>)}
          <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 12 }}>Rules auto-suggest an allocation; staff confirm. Unmatched costs always require review before margin is final.</div>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.79rem", minWidth: 1000 }}>
              <thead><tr>{["Date", "Vendor", "Type", "Amount", "Truck", "Driver/OO", "Job", "Allocation", "Status", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9", background: !c.method ? "#fffafa" : "transparent" }}>
                    <td style={td}>{c.date}</td>
                    <td style={{ ...td, fontWeight: 700 }}>{c.vendor} <span style={{ color: "#94a3b8", fontWeight: 500 }}>· {c.id}</span></td>
                    <td style={td}>{c.type}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtc(c.amount)}</td>
                    <td style={td}>{c.truck || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={td}>{c.party || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={td}>{c.job || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={td}>{c.method ? <span style={{ ...chip, background: "#eff6ff", color: "#1d4ed8" }}>{c.method}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={td}>{c.method ? <span style={{ ...chip, background: "#dcfce7", color: "#15803d" }}>Assigned</span> : <span style={{ ...chip, background: "#fee2e2", color: "#dc2626" }}>Unassigned</span>}</td>
                    <td style={td}>{c.method ? <button onClick={() => setAssign(c)} style={{ ...chip, cursor: "pointer", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }}>Reassign</button> : <button onClick={() => setAssign(c)} style={{ ...chip, cursor: "pointer", background: "#1e40af", color: "#fff" }}>Allocate ▸</button>}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={10} style={{ padding: "36px 0", textAlign: "center", color: "#94a3b8" }}>Nothing here. ✓</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8" }}>Phase 6 of 8 · seeded demo data · margins are final only when costs are fully allocated</div>
        </div>
      )}

      {assign && (
        <div onClick={() => setAssign(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, padding: "22px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>Allocate {assign.type} — {fmtc(assign.amount)}</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", margin: "4px 0 14px" }}>{assign.vendor} · {assign.id} · {assign.truck || "no truck"}</div>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Allocation method</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {METHODS.map(m => <button key={m} onClick={() => { setAssign(null); flash(`${assign.id} allocated: ${m} (demo)`); }} style={{ textAlign: "left", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: "#1e293b" }}>{m}</button>)}
            </div>
            <div style={{ textAlign: "right", marginTop: 12 }}><button onClick={() => setAssign(null)} style={ctrlBtn}>Cancel</button></div>
          </div>
        </div>
      )}
    </AcctShell>
  );
}
