"use client";

/* Accounting Command Center — Phase 5: Job Costing & Margin Control.
   Seeded demo data; wires to job_cost_snapshots + aggregate_tickets + cost_allocations. */

import { useMemo, useState } from "react";
import { AcctShell, fmt, fmtc, ctrlBtn, primaryBtn, th, td, chip } from "../AcctShell";

type Status = "Healthy" | "Below Target" | "At Risk" | "Negative" | "Incomplete Cost" | "Pending Rate";
type Job = {
  id: string; customer: string; job: string; loads: number; tons: number;
  revenue: number; ooCost: number; fuel: number; pit: number; maint: number; other: number;
  missingCost: boolean; pendingRate: boolean; contractRate: number; actualRate: number; bestTruck: string; worstRoute: string; trend: number[];
};

const RAW: Job[] = [
  { id: "J1", customer: "Holt Paving",         job: "SH-249 Reload", loads: 142, tons: 2610, revenue: 30015, ooCost: 18600, fuel: 2240, pit: 4100, maint: 620, other: 0,   missingCost: false, pendingRate: false, contractRate: 11.5, actualRate: 11.5, bestTruck: "T-104", worstRoute: "Pit 3→Katy", trend: [27, 28, 29, 31] },
  { id: "J2", customer: "Sterling Materials",  job: "I-45 Base",     loads: 98,  tons: 1980, revenue: 23760, ooCost: 15050, fuel: 1900, pit: 3600, maint: 0,   other: 0,   missingCost: true,  pendingRate: false, contractRate: 12.0, actualRate: 12.0, bestTruck: "T-118", worstRoute: "Pit 7→I-45",  trend: [22, 24, 23, 26] },
  { id: "J3", customer: "Bayou Aggregates",    job: "Levee Haul",    loads: 64,  tons: 1010, revenue: 8080,  ooCost: 6200,  fuel: 980,  pit: 1900, maint: 180, other: 0,   missingCost: false, pendingRate: true,  contractRate: 8.0,  actualRate: 7.6,  bestTruck: "T-220", worstRoute: "Pit 1→Levee", trend: [10, 8, 6, 2] },
  { id: "J4", customer: "Delta Earthworks",    job: "Pad 7",         loads: 51,  tons: 714,  revenue: 6783,  ooCost: 4800,  fuel: 720,  pit: 1300, maint: 90,  other: 200, missingCost: false, pendingRate: false, contractRate: 9.5,  actualRate: 9.5,  bestTruck: "T-160", worstRoute: "Pit 2→Pad 7", trend: [4, 3, 1, -1] },
  { id: "J5", customer: "Lone Star Ready Mix", job: "Plant 3",       loads: 39,  tons: 0,    revenue: 11400, ooCost: 7100,  fuel: 1050, pit: 0,    maint: 240, other: 0,   missingCost: false, pendingRate: false, contractRate: 95,   actualRate: 95,   bestTruck: "T-150", worstRoute: "Pit 9→Plant", trend: [28, 30, 29, 27] },
];
const cost = (j: Job) => j.ooCost + j.fuel + j.pit + j.maint + j.other;
const margin = (j: Job) => j.revenue - cost(j);
const marginPct = (j: Job) => j.revenue ? (margin(j) / j.revenue) * 100 : 0;
function status(j: Job): Status {
  if (j.pendingRate) return "Pending Rate";
  if (j.missingCost) return "Incomplete Cost";
  const p = marginPct(j);
  if (p <= 0) return "Negative";
  if (p < 8) return "At Risk";
  if (p < 18) return "Below Target";
  return "Healthy";
}
const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  Healthy: { bg: "#dcfce7", fg: "#15803d" }, "Below Target": { bg: "#fef9c3", fg: "#b45309" }, "At Risk": { bg: "#ffedd5", fg: "#ea580c" }, Negative: { bg: "#fee2e2", fg: "#dc2626" }, "Incomplete Cost": { bg: "#ede9fe", fg: "#7c3aed" }, "Pending Rate": { bg: "#dbeafe", fg: "#1d4ed8" },
};
const PROTECT = ["Increase rate", "Reassign truck", "Review fuel cost", "Review driver / OO pay", "Reconcile pit price", "Stop accepting unprofitable loads", "Require manager approval before dispatch"];

export default function Margin() {
  const [drawer, setDrawer] = useState<Job | null>(null);
  const [protect, setProtect] = useState<Job | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const totals = useMemo(() => ({ rev: RAW.reduce((s, j) => s + j.revenue, 0), margin: RAW.reduce((s, j) => s + margin(j), 0), missing: RAW.filter(j => j.missingCost).reduce((s, j) => s + 1, 0) }), []);

  return (
    <AcctShell active="margin" title="Job Costing & Margin Control" subtitle="See the true margin on every job — before the money leaves."
      controls={<><button style={ctrlBtn}>All Customers ▾</button><button style={ctrlBtn}>Margin Status ▾</button><button style={primaryBtn}>⬇ Export</button></>}>

      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 18 }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}><div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Revenue (all jobs)</div><div style={{ fontSize: "1.5rem", fontWeight: 900, marginTop: 4 }}>{fmt(totals.rev)}</div></div>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}><div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Gross Margin</div><div style={{ fontSize: "1.5rem", fontWeight: 900, marginTop: 4, color: "#15803d" }}>{fmt(totals.margin)} <span style={{ fontSize: "0.9rem", color: "#64748b" }}>({((totals.margin / totals.rev) * 100).toFixed(0)}%)</span></div></div>
        <div style={{ background: totals.missing ? "#fffbeb" : "#fff", border: "1px solid " + (totals.missing ? "#fde68a" : "#e2e8f0"), borderRadius: 12, padding: "14px 16px" }}><div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Jobs w/ Incomplete Cost</div><div style={{ fontSize: "1.5rem", fontWeight: 900, marginTop: 4, color: "#b45309" }}>{totals.missing}</div></div>
      </div>

      {totals.missing > 0 && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", fontWeight: 700 }}>⚠ Some margins are estimated because fuel/maintenance costs aren&apos;t fully allocated. Finish allocation in Fuel &amp; Cost Allocation for final numbers.</div>}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.79rem", minWidth: 1150 }}>
            <thead><tr>{["Customer", "Job", "Loads", "Tons", "Revenue", "Driver/OO", "Fuel", "Pit", "Maint", "Margin", "Margin %", "Status", "Trend", ""].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {RAW.map(j => {
                const st = status(j); const ss = STATUS_STYLE[st]; const mp = marginPct(j);
                return (
                  <tr key={j.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontWeight: 700 }}>{j.customer}</td>
                    <td style={td}><button onClick={() => setDrawer(j)} style={{ background: "none", border: "none", color: "#1d4ed8", fontWeight: 800, cursor: "pointer", padding: 0, fontSize: "0.79rem" }}>{j.job}</button></td>
                    <td style={{ ...td, textAlign: "right" }}>{j.loads}</td>
                    <td style={{ ...td, textAlign: "right" }}>{j.tons || "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmt(j.revenue)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{fmt(j.ooCost)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{fmt(j.fuel)}</td>
                    <td style={{ ...td, textAlign: "right", color: "#64748b" }}>{fmt(j.pit)}</td>
                    <td style={{ ...td, textAlign: "right", color: j.maint ? "#64748b" : "#dc2626" }}>{j.maint ? fmt(j.maint) : "?"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 900, color: margin(j) <= 0 ? "#dc2626" : mp < 10 ? "#ea580c" : "#15803d" }}>{fmt(margin(j))}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: mp <= 0 ? "#dc2626" : mp < 10 ? "#ea580c" : "#15803d" }}>{mp.toFixed(0)}%</td>
                    <td style={td}><span style={{ ...chip, background: ss.bg, color: ss.fg }}>{st}</span></td>
                    <td style={td}><Spark data={j.trend} /></td>
                    <td style={td}><button onClick={() => setProtect(j)} style={{ ...chip, cursor: "pointer", background: "#1e40af", color: "#fff" }}>Protect ▸</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "0.74rem", color: "#94a3b8" }}>Phase 5 of 8 · seeded demo data · margins go final once all costs are allocated</div>
      </div>

      {/* Job side panel */}
      {drawer && (
        <div onClick={() => setDrawer(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: "92vw", background: "#fff", height: "100%", overflowY: "auto", padding: "22px 24px", boxShadow: "-10px 0 40px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div><div style={{ fontWeight: 900, fontSize: "1.15rem" }}>{drawer.job}</div><div style={{ fontSize: "0.78rem", color: "#64748b" }}>{drawer.customer} · {drawer.loads} loads</div></div><button onClick={() => setDrawer(null)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "16px 0" }}>
              {[["Contracted rate", fmtc(drawer.contractRate)], ["Actual avg rate", fmtc(drawer.actualRate)], ["Avg cost / load", fmtc(cost(drawer) / drawer.loads)], ["Fuel / load", fmtc(drawer.fuel / drawer.loads)], ["Most profitable truck", drawer.bestTruck], ["Lowest-margin route", drawer.worstRoute]].map(([k, v]) => (
                <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}><div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{k}</div><div style={{ fontSize: "0.95rem", fontWeight: 800, marginTop: 3 }}>{v}</div></div>
              ))}
            </div>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", margin: "6px 0" }}>Margin trend (by week)</div>
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px" }}><Spark data={drawer.trend} big /></div>
            <button onClick={() => { setProtect(drawer); setDrawer(null); }} style={{ ...primaryBtn, width: "100%", marginTop: 16, padding: "11px 0" }}>🛡 Protect Margin</button>
          </div>
        </div>
      )}

      {/* Protect Margin recommendations */}
      {protect && (
        <div onClick={() => setProtect(null)} style={{ position: "fixed", inset: 0, zIndex: 310, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, padding: "22px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>🛡 Protect Margin — {protect.job}</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", margin: "4px 0 14px" }}>Current margin <strong style={{ color: marginPct(protect) < 10 ? "#dc2626" : "#15803d" }}>{marginPct(protect).toFixed(0)}%</strong>. Recommended actions:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROTECT.map(p => <button key={p} onClick={() => { flash(`${p} — ${protect.job} (demo)`); }} style={{ textAlign: "left", padding: "11px 14px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", color: "#1e293b" }}>{p}</button>)}
            </div>
            <div style={{ textAlign: "right", marginTop: 14 }}><button onClick={() => setProtect(null)} style={ctrlBtn}>Close</button></div>
          </div>
        </div>
      )}
    </AcctShell>
  );
}

function Spark({ data, big }: { data: number[]; big?: boolean }) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0), h = big ? 60 : 22, w = big ? 240 : 60;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return <svg width={w} height={h} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={up ? "#16a34a" : "#dc2626"} strokeWidth={2} /></svg>;
}
