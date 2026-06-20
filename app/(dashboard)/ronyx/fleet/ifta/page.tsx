"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ── Types ──────────────────────────────────────────────────────── */
type Kpis = {
  readiness_pct: number;
  total_jurisdiction_miles: number;
  total_gallons_recorded: number;
  missing_mileage_miles: number;
  missing_fuel_count: number;
  estimated_net_ifta_tax: number;
  average_fleet_mpg: number;
  fuel_cost_per_mile: number;
};

type Alert = {
  type: string;
  severity: string;
  title: string;
  message: string;
  count?: number;
  estimated_impact?: number;
};

type JurisdictionRow = {
  jurisdiction_code: string;
  miles: number;
  taxable_gallons: number;
  tax_paid_gallons: number;
  tax_rate: number;
  estimated_tax_due: number;
  mpg: number | null;
};

type MileRow = {
  id: string;
  date: string;
  truck_id: string | null;
  trip_reference: string | null;
  jurisdiction_code: string;
  actual_miles: number;
  gps_miles: number | null;
  dispatch_miles: number | null;
  source: string;
  verification_status: string;
  exception_reason: string | null;
};

type FuelRow = {
  id: string;
  transaction_date: string;
  truck_id: string | null;
  vendor_name: string | null;
  jurisdiction_code: string | null;
  gallons: number;
  total_cost: number | null;
  fuel_card_provider: string | null;
  source: string;
  match_status: string;
  is_ifta_eligible: boolean;
};

type FilingTask = {
  id: string;
  task_key: string;
  title: string;
  status: string;
  owner_name: string | null;
  due_date: string | null;
  impact_level: string;
  notes: string | null;
};

type Period = {
  id: string;
  year: number;
  quarter: number;
  status: string;
  readiness_percent: number;
  locked_at: string | null;
  filed_at: string | null;
};

type IftaData = {
  period: Period | null;
  kpis: Kpis;
  alerts: Alert[];
  filing_tasks: FilingTask[];
  jurisdiction_miles: MileRow[];
  fuel_transactions: FuelRow[];
  jurisdiction_summary: JurisdictionRow[];
};

/* ── Constants ──────────────────────────────────────────────────── */
const FONT  = "'Inter','Segoe UI',sans-serif";
const DARK  = "#0f172a";
const MED   = "#475569";
const LIGHT = "#64748b";
const BORD  = "#e2e8f0";
const WHITE = "#fff";
const BLUE  = "#1d4ed8";
const GREEN = "#16a34a";
const RED   = "#dc2626";
const AMBER = "#d97706";
const PURPLE= "#7c3aed";

const TABS = ["Overview","Filing Readiness","Jurisdiction Miles","Fuel & Receipts","Jurisdiction Summary","Reports & Filing","Audit Trail"] as const;
type Tab = (typeof TABS)[number];

const STEPS = [
  { key: "import_mileage",      label: "Import Mileage" },
  { key: "import_fuel_card",    label: "Import Fuel" },
  { key: "match_fuel_to_truck", label: "Match Receipts" },
  { key: "review_calculation",  label: "Review Exceptions" },
  { key: "manager_approval",    label: "Approve Quarter" },
  { key: "export_filing_packet",label: "Export Filing Packet" },
];

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: { bg: "#fff1f2", border: "#fca5a5", text: "#7f1d1d", badge: "#dc2626" },
  high:     { bg: "#fff7ed", border: "#fed7aa", text: "#7c2d12", badge: "#ea580c" },
  warning:  { bg: "#fffbeb", border: "#fde68a", text: "#78350f", badge: "#d97706" },
  info:     { bg: "#eff6ff", border: "#bfdbfe", text: "#1e3a8a", badge: BLUE },
  ready:    { bg: "#f0fdf4", border: "#86efac", text: "#14532d", badge: GREEN },
};

const TASK_STATUS_COLORS: Record<string, string> = {
  not_started: "#94a3b8",
  in_progress: BLUE,
  needs_review: AMBER,
  blocked:     RED,
  ready:       GREEN,
  approved:    "#0d9488",
};

const MILES_STATUS_COLORS: Record<string, string> = {
  verified:             GREEN,
  needs_review:         AMBER,
  missing_jurisdiction: RED,
  mileage_conflict:     "#ea580c",
  manually_adjusted:    PURPLE,
  excluded:             LIGHT,
};

const FUEL_STATUS_COLORS: Record<string, string> = {
  matched:                GREEN,
  needs_truck_assignment: RED,
  needs_state_assignment: AMBER,
  duplicate_suspected:    "#ea580c",
  missing_receipt:        "#dc2626",
  excluded:               LIGHT,
  verified:               GREEN,
};

const US_STATES: string[] = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","AB","BC","MB","NB","NL","NS","ON","PE","QC","SK"];

/* ── Helpers ────────────────────────────────────────────────────── */
function fmt$(n: number) { return `$${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function fmtN(n: number, d = 0) { return n.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}); }

function ReadinessBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? GREEN : pct >= 50 ? AMBER : RED;
  return (
    <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
    </div>
  );
}

function StatusBadge({ status, colors }: { status: string; colors: Record<string, string> }) {
  const color = colors[status] || LIGHT;
  return (
    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: color + "20", color, border: `1px solid ${color}40`, whiteSpace: "nowrap" }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function FuelIQPage() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [tab,     setTab]     = useState<Tab>("Overview");
  const [data,    setData]    = useState<IftaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingTask, setSavingTask] = useState<string | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ronyx/ifta?year=${year}&quarter=${quarter}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      showToast(e.message || "Load failed.", false);
    } finally {
      setLoading(false);
    }
  }, [year, quarter]);

  useEffect(() => { load(); }, [load]);

  async function postAction(payload: Record<string, unknown>) {
    const r = await fetch("/api/ronyx/ifta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }

  async function updateTask(taskId: string, status: string) {
    setSavingTask(taskId);
    try {
      await postAction({ action: "update_task", task_id: taskId, status });
      showToast("Task updated.");
      await load();
    } catch (e: any) {
      showToast(e.message || "Update failed.", false);
    } finally {
      setSavingTask(null);
    }
  }

  async function lockPeriod() {
    if (!data?.period?.id) return;
    try {
      await postAction({ action: "lock_period", period_id: data.period.id });
      showToast("Quarter locked.");
      await load();
    } catch (e: any) {
      showToast(e.message || "Lock failed.", false);
    }
  }

  const kpis = data?.kpis;
  const alerts = data?.alerts || [];
  const tasks  = data?.filing_tasks || [];
  const miles  = data?.jurisdiction_miles || [];
  const fuel   = data?.fuel_transactions || [];
  const jsum   = data?.jurisdiction_summary || [];
  const period = data?.period;
  const isLocked = period?.status === "locked" || period?.status === "filed";

  const moneyAtRisk = alerts.reduce((s, a) => s + Math.abs(a.estimated_impact || 0), 0);

  const quarterLabel = `Q${quarter} ${year}`;
  const stepStatuses: Record<string, string> = {};
  for (const t of tasks) stepStatuses[t.task_key] = t.status;

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, maxWidth: 1280, margin: "0 auto", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Link href="/ronyx/fleet" style={{ fontSize: 12, color: BLUE, fontWeight: 600, textDecoration: "none" }}>← Fleet</Link>
            <span style={{ color: "#cbd5e1" }}>/</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>FuelIQ™</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: DARK, letterSpacing: "-0.5px" }}>FuelIQ™ Command Center</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: PURPLE, background: "#f3e8ff", padding: "2px 8px", borderRadius: 6, border: "1px solid #d8b4fe" }}>PREMIUM</span>
          </div>
          <div style={{ fontSize: 13, color: LIGHT, marginTop: 2 }}>IFTA • Fuel • Miles • Margin • Filing Readiness</div>
        </div>

        {/* Date controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select value={quarter} onChange={e => setQuarter(Number(e.target.value))}
            style={{ padding: "8px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, background: WHITE, fontFamily: FONT, cursor: "pointer" }}>
            {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: "8px 12px", border: `1px solid ${BORD}`, borderRadius: 8, fontSize: 13, background: WHITE, fontFamily: FONT, cursor: "pointer" }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ padding: "8px 14px", background: "#f1f5f9", borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: DARK }}>
            {quarterLabel}
          </div>
          {!isLocked && period?.id && (
            <button onClick={lockPeriod}
              style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: MED, fontFamily: FONT }}>
              🔒 Lock Quarter
            </button>
          )}
          {isLocked && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 6, background: "#f0fdf4", color: GREEN, border: `1px solid #86efac` }}>
              ✓ Quarter Locked
            </span>
          )}
        </div>
      </div>

      {/* Money-at-risk banner */}
      {moneyAtRisk > 100 && !loading && (
        <div style={{ background: "linear-gradient(135deg,#fff1f2 0%,#fff7ed 100%)", border: "1px solid #fca5a5", borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14.5, color: "#7f1d1d" }}>
              💰 ${fmtN(moneyAtRisk, 0)} Potential Fuel & Tax Exposure This Quarter
            </div>
            <div style={{ fontSize: 12.5, color: "#991b1b", marginTop: 2 }}>
              {alerts.length} issue{alerts.length > 1 ? "s" : ""} affecting cost and tax position. Review and fix before filing.
            </div>
          </div>
          <button onClick={() => setTab("Filing Readiness")}
            style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: RED, color: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
            Fix Issues →
          </button>
        </div>
      )}

      {/* Alerts strip */}
      {alerts.length > 0 && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {alerts.map((a, i) => {
            const sc = SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info;
            return (
              <div key={i} style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: sc.text }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: sc.text + "cc", marginTop: 2 }}>{a.message}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {a.estimated_impact && a.estimated_impact > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc.badge }}>{fmt$(a.estimated_impact)}</span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 4, background: sc.badge, color: WHITE }}>
                    {a.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KPI Grid */}
      {!loading && kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 22 }}>
          {[
            { label: "Filing Readiness",     value: `${kpis.readiness_pct}%`,                color: kpis.readiness_pct >= 80 ? GREEN : kpis.readiness_pct >= 50 ? AMBER : RED, sub: kpis.readiness_pct >= 80 ? "Ready for review" : "Action required", tab: "Filing Readiness" as Tab },
            { label: "Jurisdiction Miles",    value: fmtN(kpis.total_jurisdiction_miles)+" mi", color: BLUE,   sub: "Across all trucks", tab: "Jurisdiction Miles" as Tab },
            { label: "Gallons Recorded",      value: fmtN(kpis.total_gallons_recorded,0)+" gal",color: BLUE,   sub: "Fuel card + receipts", tab: "Fuel & Receipts" as Tab },
            { label: "Missing Mileage",       value: fmtN(kpis.missing_mileage_miles)+" mi",   color: kpis.missing_mileage_miles > 0 ? RED : GREEN,   sub: "Needs jurisdiction", tab: "Jurisdiction Miles" as Tab },
            { label: "Missing Fuel Records",  value: String(kpis.missing_fuel_count),           color: kpis.missing_fuel_count > 0 ? RED : GREEN,      sub: "Unmatched or incomplete", tab: "Fuel & Receipts" as Tab },
            { label: "Est. Net IFTA Tax",     value: (kpis.estimated_net_ifta_tax >= 0 ? fmt$(kpis.estimated_net_ifta_tax)+" Due" : fmt$(kpis.estimated_net_ifta_tax)+" Credit"), color: kpis.estimated_net_ifta_tax > 0 ? RED : GREEN, sub: "Based on loaded tax rates", tab: "Jurisdiction Summary" as Tab },
            { label: "Avg Fleet MPG",         value: fmtN(kpis.average_fleet_mpg,2)+" MPG",    color: kpis.average_fleet_mpg < 5 ? AMBER : BLUE,  sub: "Fleet average", tab: "Overview" as Tab },
            { label: "Fuel Cost Per Mile",    value: `$${fmtN(kpis.fuel_cost_per_mile,3)}/mi`,  color: DARK,   sub: "Fleet average", tab: "Fuel & Receipts" as Tab },
          ].map(kpi => (
            <div key={kpi.label} onClick={() => setTab(kpi.tab)} style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}>
              <div style={{ fontSize: 20, fontWeight: 900, color: kpi.color, letterSpacing: "-0.5px" }}>{kpi.value}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: DARK, marginTop: 3 }}>{kpi.label}</div>
              <div style={{ fontSize: 10, color: LIGHT, marginTop: 1 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `2px solid ${BORD}`, marginBottom: 22, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: tab === t ? 800 : 500, color: tab === t ? BLUE : MED, borderBottom: tab === t ? `2px solid ${BLUE}` : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap", transition: "color 0.1s" }}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: LIGHT, fontSize: 14 }}>Loading FuelIQ™ data…</div>
      ) : (

        /* ── TAB: Overview ── */
        tab === "Overview" ? (
          <div>
            {/* Workflow step tracker */}
            <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: DARK, marginBottom: 14 }}>IFTA Filing Progress — {quarterLabel}</div>
              <div style={{ display: "flex", gap: 0, alignItems: "stretch", overflowX: "auto" }}>
                {STEPS.map((step, i) => {
                  const st = stepStatuses[step.key] || "not_started";
                  const col = TASK_STATUS_COLORS[st] || LIGHT;
                  const done = st === "approved" || st === "ready";
                  return (
                    <div key={step.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 110 }}>
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: done ? GREEN : col + "20", border: `2px solid ${done ? GREEN : col}`, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: done ? WHITE : col }}>
                          {done ? "✓" : i+1}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: DARK, lineHeight: 1.2 }}>{step.label}</div>
                        <div style={{ fontSize: 10, color: col, fontWeight: 600, marginTop: 2, textTransform: "capitalize" }}>{st.replace(/_/g," ")}</div>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div style={{ width: 32, height: 2, background: done ? GREEN : BORD, flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fuel Leak Detector */}
            <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)", borderRadius: 14, padding: "20px 24px", marginBottom: 20, color: WHITE }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 3 }}>⛽ Fuel Leak Detector™</div>
                  <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Finds trucks, routes, and purchases costing you money.</div>
                </div>
                <button onClick={() => setTab("Fuel & Receipts")}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: WHITE, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  Open Fuel Review →
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {[
                  { label: "Unusual Fuel Spend", desc: "Fuel cost vs miles per truck", icon: "📊" },
                  { label: "Out-of-Route Purchases", desc: "Fuel bought outside normal lanes", icon: "🗺️" },
                  { label: "Duplicate Receipts", desc: "Same vendor, same gallons, same day", icon: "🔁" },
                  { label: "MPG Drop Alert", desc: "Trucks 15%+ below fleet average", icon: "📉" },
                  { label: "High Idle Burn", desc: "Estimated idle fuel cost this quarter", icon: "⏱️" },
                  { label: "Surcharge Recovery Gap", desc: "Fuel surcharge vs actual fuel cost", icon: "💸" },
                ].map(item => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div style={{ fontSize: 14, marginBottom: 4 }}>{item.icon} <span style={{ fontWeight: 700, fontSize: 12 }}>{item.label}</span></div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              {fuel.filter(f => f.match_status === "duplicate_suspected").length > 0 && (
                <div style={{ marginTop: 14, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#fca5a5" }}>
                  ⚠️ {fuel.filter(f => f.match_status === "duplicate_suspected").length} duplicate fuel record{fuel.filter(f => f.match_status === "duplicate_suspected").length > 1 ? "s" : ""} detected. Review before filing.
                </div>
              )}
            </div>

            {/* AI Insights strip */}
            <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: MED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>AI Team Insights</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { name: "Leo",    role: "Command Center",       icon: "⚡", color: BLUE,   msg: `Here are the issues preventing ${quarterLabel} from filing: ${alerts.length > 0 ? alerts.map(a => a.title).slice(0,2).join("; ") + "." : "No critical blockers detected — good progress!"}` },
                  { name: "Shamsa", role: "Insights & Growth",    icon: "📊", color: PURPLE,  msg: kpis && kpis.fuel_cost_per_mile > 0 ? `Fuel cost per mile is $${fmtN(kpis.fuel_cost_per_mile,3)}. If MPG drops 10%, your quarterly exposure increases by approximately $${fmtN((kpis.total_jurisdiction_miles * kpis.fuel_cost_per_mile * 0.1),0)}.` : "Fuel cost per mile data not yet available for this quarter." },
                  { name: "Wrench", role: "Fleet & Maintenance",  icon: "🔧", color: "#b45309", msg: kpis && kpis.average_fleet_mpg < 5.5 ? `Fleet average MPG is ${fmtN(kpis.average_fleet_mpg,2)}. Trucks below 5.0 MPG may need tire pressure, idle time, or maintenance review.` : "Fleet MPG looks healthy this quarter. Monitor trucks below 5.0 MPG." },
                ].map(ai => (
                  <div key={ai.name} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: ai.color + "18", border: `2px solid ${ai.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {ai.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: ai.color }}>{ai.name} <span style={{ color: LIGHT, fontWeight: 500 }}>· {ai.role}</span></div>
                      <div style={{ fontSize: 12.5, color: DARK, lineHeight: 1.5, marginTop: 2 }}>{ai.msg}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Jurisdiction quick summary */}
            {jsum.length > 0 && (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "16px 20px" }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: DARK, marginBottom: 12 }}>Jurisdiction Summary — Top States</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["State","Miles","Taxable Gal","Tax Paid Gal","MPG","Tax Rate","Est. Due / Credit"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", fontWeight: 700, color: MED, textAlign: "left", borderBottom: `1px solid ${BORD}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jsum.slice(0,8).map(r => (
                        <tr key={r.jurisdiction_code} style={{ borderBottom: `1px solid ${BORD}` }}>
                          <td style={{ padding: "9px 12px", fontWeight: 800, color: DARK }}>{r.jurisdiction_code}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{fmtN(r.miles,1)}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{fmtN(r.taxable_gallons,2)}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{fmtN(r.tax_paid_gallons,2)}</td>
                          <td style={{ padding: "9px 12px", color: r.mpg && r.mpg < 5 ? RED : MED, fontWeight: r.mpg && r.mpg < 5 ? 700 : 400 }}>{r.mpg ? fmtN(r.mpg,2) : "—"}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{r.tax_rate > 0 ? `$${Number(r.tax_rate).toFixed(4)}` : "—"}</td>
                          <td style={{ padding: "9px 12px", fontWeight: 700, color: r.estimated_tax_due > 0 ? RED : GREEN }}>{r.estimated_tax_due !== 0 ? fmt$(r.estimated_tax_due) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {jsum.length > 8 && (
                  <button onClick={() => setTab("Jurisdiction Summary")} style={{ marginTop: 10, fontSize: 12, color: BLUE, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>
                    View all {jsum.length} jurisdictions →
                  </button>
                )}
              </div>
            )}
          </div>

        /* ── TAB: Filing Readiness ── */
        ) : tab === "Filing Readiness" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, color: DARK }}>Filing Readiness — {quarterLabel}</div>
                <div style={{ fontSize: 12.5, color: LIGHT, marginTop: 2 }}>{tasks.filter(t => ["ready","approved"].includes(t.status)).length} of {tasks.length} tasks complete</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: kpis && kpis.readiness_pct >= 80 ? GREEN : AMBER }}>{kpis?.readiness_pct}%</div>
                  <div style={{ fontSize: 10, color: LIGHT }}>Ready</div>
                </div>
                <div style={{ width: 100 }}><ReadinessBar pct={kpis?.readiness_pct || 0} /></div>
              </div>
            </div>

            <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Task","Status","Owner","Impact","Action"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", fontWeight: 700, color: MED, textAlign: "left", borderBottom: `1px solid ${BORD}`, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${BORD}` }}>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ fontWeight: 700, color: DARK }}>{t.title}</div>
                        {t.notes && <div style={{ fontSize: 11, color: LIGHT, marginTop: 2 }}>{t.notes}</div>}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <StatusBadge status={t.status} colors={TASK_STATUS_COLORS} />
                      </td>
                      <td style={{ padding: "11px 14px", color: MED, fontSize: 12 }}>{t.owner_name || "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: t.impact_level === "critical" ? RED : t.impact_level === "high" ? AMBER : MED }}>
                          {t.impact_level}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {!isLocked && !["approved","ready"].includes(t.status) && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => updateTask(t.id, "in_progress")} disabled={savingTask === t.id}
                              style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORD}`, background: WHITE, fontSize: 11, fontWeight: 600, cursor: "pointer", color: BLUE, fontFamily: FONT }}>
                              Start
                            </button>
                            <button onClick={() => updateTask(t.id, "ready")} disabled={savingTask === t.id}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: GREEN, fontSize: 11, fontWeight: 700, cursor: "pointer", color: WHITE, fontFamily: FONT }}>
                              {savingTask === t.id ? "…" : "Mark Ready"}
                            </button>
                          </div>
                        )}
                        {["approved","ready"].includes(t.status) && (
                          <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>✓ Complete</span>
                        )}
                        {isLocked && !["approved","ready"].includes(t.status) && (
                          <span style={{ fontSize: 11, color: LIGHT }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tasks.length === 0 && (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 6 }}>Filing tasks loading…</div>
                <div style={{ fontSize: 13, color: LIGHT }}>Tasks are seeded automatically when you load a quarter.</div>
              </div>
            )}
          </div>

        /* ── TAB: Jurisdiction Miles ── */
        ) : tab === "Jurisdiction Miles" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: DARK }}>
                Jurisdiction Miles — {quarterLabel}
                <span style={{ fontSize: 12, fontWeight: 500, color: LIGHT, marginLeft: 10 }}>
                  {miles.length} records · {fmtN(miles.reduce((s,m) => s + Number(m.actual_miles||0), 0),1)} total miles
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(MILES_STATUS_COLORS).map(([s,c]) => (
                  <span key={s} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: c+"15", color: c, border: `1px solid ${c}40` }}>{s.replace(/_/g," ")}</span>
                ))}
              </div>
            </div>

            {miles.length === 0 ? (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗺️</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 8 }}>No jurisdiction miles imported yet</div>
                <div style={{ fontSize: 13, color: LIGHT, maxWidth: 440, margin: "0 auto 20px" }}>
                  Import GPS or ELD mileage data, or enter trips manually. Each trip needs a jurisdiction code for IFTA filing.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", color: BLUE, fontFamily: FONT }}>
                    Import GPS / ELD File
                  </button>
                  <button style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                    Add Trip Manually
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Date","Truck","Trip Ref","State","GPS Mi","Dispatch Mi","Actual Mi","Source","Status","Action"].map(h => (
                          <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: MED, textAlign: "left", borderBottom: `1px solid ${BORD}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {miles.map(m => (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${BORD}` }}>
                          <td style={{ padding: "9px 12px", color: MED, whiteSpace: "nowrap" }}>{m.date}</td>
                          <td style={{ padding: "9px 12px", color: DARK, fontWeight: 600 }}>{m.truck_id ? m.truck_id.slice(0,8)+"…" : "—"}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{m.trip_reference || "—"}</td>
                          <td style={{ padding: "9px 12px", fontWeight: 800, color: BLUE }}>{m.jurisdiction_code || "—"}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{m.gps_miles != null ? fmtN(m.gps_miles,1) : "—"}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{m.dispatch_miles != null ? fmtN(m.dispatch_miles,1) : "—"}</td>
                          <td style={{ padding: "9px 12px", fontWeight: 700, color: DARK }}>{fmtN(m.actual_miles,1)}</td>
                          <td style={{ padding: "9px 12px", color: LIGHT, fontSize: 11 }}>{m.source.replace(/_/g," ")}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <StatusBadge status={m.verification_status} colors={MILES_STATUS_COLORS} />
                          </td>
                          <td style={{ padding: "9px 12px" }}>
                            {m.verification_status !== "verified" && !isLocked && (
                              <button onClick={() => postAction({ action: "verify_miles", mile_id: m.id }).then(load)}
                                style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${BORD}`, background: WHITE, fontSize: 10.5, cursor: "pointer", fontWeight: 600, color: GREEN, fontFamily: FONT }}>
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        /* ── TAB: Fuel & Receipts ── */
        ) : tab === "Fuel & Receipts" ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: DARK }}>
                Fuel & Receipts — {quarterLabel}
                <span style={{ fontSize: 12, fontWeight: 500, color: LIGHT, marginLeft: 10 }}>
                  {fuel.length} transactions · {fmtN(fuel.reduce((s,f) => s + Number(f.gallons||0), 0),1)} gal · {fmt$(fuel.reduce((s,f) => s + Number(f.total_cost||0), 0))}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: BLUE, fontFamily: FONT }}>
                  Import Fuel Card
                </button>
                <button style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: BLUE, fontFamily: FONT }}>
                  Upload Receipts
                </button>
              </div>
            </div>

            {/* Fuel card provider badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["EFS","Comdata","WEX","Fleet One","Manual CSV"].map(p => (
                <div key={p} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${BORD}`, background: WHITE, fontSize: 11.5, color: MED, fontWeight: 600 }}>
                  {p} <span style={{ color: LIGHT }}>— CSV Ready</span>
                </div>
              ))}
            </div>

            {fuel.length === 0 ? (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⛽</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: DARK, marginBottom: 8 }}>No fuel transactions imported yet</div>
                <div style={{ fontSize: 13, color: LIGHT, maxWidth: 440, margin: "0 auto 20px" }}>
                  Import fuel card data (EFS, Comdata, WEX, Fleet One) or manually add fuel purchases. Match receipts to trucks and jurisdictions.
                </div>
                <button style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  Import Fuel Card CSV
                </button>
              </div>
            ) : (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Date","Truck","Vendor","State","Gallons","Cost","Card","Status","IFTA","Action"].map(h => (
                          <th key={h} style={{ padding: "9px 12px", fontWeight: 700, color: MED, textAlign: "left", borderBottom: `1px solid ${BORD}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fuel.map(f => (
                        <tr key={f.id} style={{ borderBottom: `1px solid ${BORD}`, background: f.match_status === "duplicate_suspected" ? "#fff7ed" : WHITE }}>
                          <td style={{ padding: "9px 12px", color: MED, whiteSpace: "nowrap" }}>{f.transaction_date}</td>
                          <td style={{ padding: "9px 12px", color: DARK, fontWeight: 600 }}>{f.truck_id ? f.truck_id.slice(0,8)+"…" : <span style={{ color: RED }}>MISSING</span>}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{f.vendor_name || "—"}</td>
                          <td style={{ padding: "9px 12px", fontWeight: 800, color: f.jurisdiction_code ? BLUE : RED }}>{f.jurisdiction_code || "—"}</td>
                          <td style={{ padding: "9px 12px", fontWeight: 700, color: DARK }}>{fmtN(f.gallons,3)}</td>
                          <td style={{ padding: "9px 12px", color: MED }}>{f.total_cost ? fmt$(f.total_cost) : "—"}</td>
                          <td style={{ padding: "9px 12px", color: LIGHT, fontSize: 11 }}>{f.fuel_card_provider || f.source.replace(/_/g," ")}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <StatusBadge status={f.match_status} colors={FUEL_STATUS_COLORS} />
                          </td>
                          <td style={{ padding: "9px 12px", textAlign: "center" }}>
                            <span style={{ fontSize: 12, color: f.is_ifta_eligible ? GREEN : LIGHT }}>{f.is_ifta_eligible ? "✓" : "—"}</span>
                          </td>
                          <td style={{ padding: "9px 12px" }}>
                            {!isLocked && f.match_status !== "verified" && (
                              <button style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${BORD}`, background: WHITE, fontSize: 10.5, cursor: "pointer", fontWeight: 600, color: BLUE, fontFamily: FONT }}>
                                Review
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        /* ── TAB: Jurisdiction Summary ── */
        ) : tab === "Jurisdiction Summary" ? (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: DARK, marginBottom: 14 }}>
              Jurisdiction Summary — {quarterLabel}
              {kpis && (
                <span style={{ fontSize: 13, fontWeight: 700, color: kpis.estimated_net_ifta_tax > 0 ? RED : GREEN, marginLeft: 12 }}>
                  Est. Net: {kpis.estimated_net_ifta_tax > 0 ? fmt$(kpis.estimated_net_ifta_tax)+" Due" : fmt$(Math.abs(kpis.estimated_net_ifta_tax))+" Credit"}
                </span>
              )}
            </div>
            {jsum.length === 0 ? (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "40px 24px", textAlign: "center", color: LIGHT }}>
                Import mileage and fuel data to see jurisdiction breakdown.
              </div>
            ) : (
              <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Jurisdiction","Miles","Taxable Miles","Tax Paid Gal","Taxable Gal","MPG","Tax Rate","Est. Due / Credit"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", fontWeight: 700, color: MED, textAlign: "left", borderBottom: `1px solid ${BORD}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jsum.map(r => (
                      <tr key={r.jurisdiction_code} style={{ borderBottom: `1px solid ${BORD}` }}>
                        <td style={{ padding: "11px 14px", fontWeight: 900, fontSize: 14, color: DARK }}>{r.jurisdiction_code}</td>
                        <td style={{ padding: "11px 14px", color: MED }}>{fmtN(r.miles,1)}</td>
                        <td style={{ padding: "11px 14px", color: MED }}>{fmtN(r.miles,1)}</td>
                        <td style={{ padding: "11px 14px", color: MED }}>{fmtN(r.tax_paid_gallons,3)}</td>
                        <td style={{ padding: "11px 14px", color: MED }}>{fmtN(r.taxable_gallons,3)}</td>
                        <td style={{ padding: "11px 14px", color: r.mpg && r.mpg < 5 ? RED : MED, fontWeight: r.mpg && r.mpg < 5 ? 700 : 400 }}>{r.mpg ? fmtN(r.mpg,2) : "—"}</td>
                        <td style={{ padding: "11px 14px", color: MED }}>{r.tax_rate > 0 ? `$${Number(r.tax_rate).toFixed(4)}` : "—"}</td>
                        <td style={{ padding: "11px 14px", fontWeight: 800, color: r.estimated_tax_due > 0 ? RED : r.estimated_tax_due < 0 ? GREEN : MED }}>
                          {r.estimated_tax_due !== 0 ? `${r.estimated_tax_due > 0 ? "" : "-"}${fmt$(r.estimated_tax_due)} ${r.estimated_tax_due > 0 ? "Due" : "Credit"}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        /* ── TAB: Reports & Filing ── */
        ) : tab === "Reports & Filing" ? (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: DARK, marginBottom: 16 }}>Reports & Filing — {quarterLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 22 }}>
              {[
                "Quarterly IFTA Summary","Jurisdiction Miles Report","Taxable Fuel Report",
                "Fuel Purchase Detail","Truck Mileage Summary","Truck MPG Report",
                "Missing Mileage Report","Missing Fuel Receipt Report","IFTA Exception Report",
                "Fuel Cost Per Mile Report","Dispatch vs GPS Mileage Report","Estimated Tax Due / Credit",
              ].map(r => (
                <div key={r} style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: DARK }}>{r}</div>
                  <button style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${BORD}`, background: WHITE, fontSize: 11, fontWeight: 700, cursor: "pointer", color: BLUE, fontFamily: FONT }}>Export</button>
                </div>
              ))}
            </div>

            {/* Filing packet / confidence */}
            <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)", borderRadius: 14, padding: "20px 24px", color: WHITE }}>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>File With Confidence™</div>
              <div style={{ fontSize: 12.5, color: "#93c5fd", marginBottom: 16 }}>
                {kpis && kpis.readiness_pct >= 80
                  ? `Filing Confidence: High — ${quarterLabel} appears ready for manager review and filing.`
                  : `Filing Confidence: ${kpis?.readiness_pct}% — Complete all required tasks before generating the filing packet.`
                }
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                  Generate Filing Packet
                </button>
                <button style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#93c5fd", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                  Export CSV
                </button>
                <button style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#93c5fd", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                  Export Excel
                </button>
                {!isLocked && period?.id && (
                  <button onClick={lockPeriod}
                    style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: GREEN, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                    🔒 Lock & Approve Quarter
                  </button>
                )}
              </div>
            </div>
          </div>

        /* ── TAB: Audit Trail ── */
        ) : tab === "Audit Trail" ? (
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: DARK, marginBottom: 12 }}>Audit Trail</div>
            <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📜</div>
              <div style={{ fontWeight: 700, color: DARK, marginBottom: 6 }}>Audit Trail</div>
              <div style={{ fontSize: 13, color: LIGHT }}>
                All mileage adjustments, fuel edits, jurisdiction assignments, approvals, quarter lock/unlock events, and AI recommendation activity are logged here.
                Connect this panel to <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>platform_admin_audit_log</code> with <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>event_type LIKE 'ifta.%'</code>.
              </div>
            </div>
          </div>
        ) : null
      )}

      {/* Empty state when no data at all */}
      {!loading && !data?.period && (
        <div style={{ background: WHITE, border: `1px solid ${BORD}`, borderRadius: 14, padding: "48px 24px", textAlign: "center", marginTop: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>⛽</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: DARK, marginBottom: 8 }}>Get started with FuelIQ™</div>
          <div style={{ fontSize: 13, color: LIGHT, maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Import fuel card data, GPS mileage, and receipts to start your {quarterLabel} IFTA filing. FuelIQ™ tracks what is missing, what is costing you money, and what to fix.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button style={{ padding: "10px 22px", borderRadius: 9, border: `1px solid ${BORD}`, background: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", color: BLUE, fontFamily: FONT }}>Import Fuel Card CSV</button>
            <button style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: BLUE, color: WHITE, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Import GPS Mileage</button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: toast.ok ? DARK : RED, color: WHITE, padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 13, fontFamily: FONT, boxShadow: "0 4px 20px rgba(0,0,0,0.25)" }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
