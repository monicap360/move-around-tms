"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus   = "unpaid" | "partial" | "paid" | "refunded";
type RiskLevel       = "low" | "medium" | "high" | "critical";
type Compliance      = "valid" | "expiring" | "expired";
type AlertSeverity   = "warning" | "high" | "critical" | "blocked";
type ReadinessStatus = "ready" | "needs_review" | "manager_approval" | "blocked";
type RiskBadge       = "on_time" | "at_risk" | "critical" | "late";
type NoteCategory    = "customer" | "driver" | "manager" | "payment" | "delay" | "complaint" | "internal";
type IncidentType    =
  | "customer_no_show" | "driver_late" | "vehicle_issue" | "wrong_address"
  | "payment_issue" | "passenger_complaint" | "damage_report" | "accident"
  | "weather_delay" | "cruise_delay" | "airport_delay" | "other";

type DriverStatus =
  | "available" | "assigned" | "on_trip" | "accepted"
  | "at_pickup" | "loaded" | "at_dropoff"
  | "off_duty" | "blocked" | "no_show";

type DispatchJob = {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  pickup_address?: string;
  pickup_time?: string;
  dropoff_address?: string;
  dropoff_time?: string;
  passenger_count?: number;
  luggage_count?: number;
  special_instructions?: string;
  special_instructions_ack?: boolean;
  missing_bol?: boolean;
  payment_status: PaymentStatus;
  job_status: string;
  risk_level: RiskLevel;
  assigned_driver_id?: string;
  assigned_driver_name?: string;
  assigned_driver_phone?: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_number?: string;
  acceptance_status?: string | null;
  sent_at?: string | null;
  no_response?: boolean;
  dispatch_blocked?: boolean;
  block_reasons?: string[];
  is_late?: boolean;
};

type DispatchDriver = {
  id: string;
  name: string;
  phone?: string | null;
  status: DriverStatus;
  compliance: Compliance;
  dispatch_eligible: boolean;
  block_reasons: string[];
  vehicle?: string | null;
  payroll_eligible: boolean;
  active_job?: { job_number: string; status: string; customer: string } | null;
};

type DispatchAlert = {
  type: string;
  severity: AlertSeverity;
  message: string;
  job_id?: string;
  driver_id?: string;
  vehicle_id?: string;
};

type BlockResult = {
  can_override: boolean;
  hard_blocks: string[];
  soft_blocks: string[];
  soft_block_types: string[];
  driver_name: string;
};

type CommMessage = {
  id: string;
  message_type: string;
  body: string;
  sent_to: string;
  status: string;
  created_at: string;
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

const PIPELINE = [
  { key: "needs_review",      label: "Needs Review",      color: "#94a3b8", bg: "#f8fafc" },
  { key: "ready_to_dispatch", label: "Ready to Dispatch", color: "#f59e0b", bg: "#fef3c7" },
  { key: "assigned",          label: "Assigned",          color: "#3b82f6", bg: "#eff6ff" },
  { key: "driver_accepted",   label: "Driver Accepted",   color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "en_route_pickup",   label: "En Route",          color: "#f97316", bg: "#fff7ed" },
  { key: "arrived_pickup",    label: "At Pickup",         color: "#eab308", bg: "#fefce8" },
  { key: "loaded",            label: "On Board",          color: "#06b6d4", bg: "#ecfeff" },
  { key: "en_route_dropoff",  label: "En Route →",        color: "#6366f1", bg: "#eef2ff" },
  { key: "arrived_dropoff",   label: "At Dropoff",        color: "#14b8a6", bg: "#f0fdfa" },
  { key: "completed",         label: "Completed",         color: "#10b981", bg: "#f0fdf4" },
  { key: "billing_review",    label: "Billing / Payroll", color: "#7c3aed", bg: "#faf5ff" },
] as const;

type PipelineKey = typeof PIPELINE[number]["key"];

const NEXT_STATUS: Partial<Record<string, string>> = {
  needs_review: "ready_to_dispatch", ready_to_dispatch: "assigned",
  assigned: "driver_accepted", driver_accepted: "en_route_pickup",
  en_route_pickup: "arrived_pickup", arrived_pickup: "loaded",
  loaded: "en_route_dropoff", en_route_dropoff: "arrived_dropoff",
  arrived_dropoff: "completed", completed: "billing_review",
};
const NEXT_LABEL: Partial<Record<string, string>> = {
  needs_review: "Mark Ready", ready_to_dispatch: "Send Trip",
  assigned: "Mark Accepted", driver_accepted: "En Route to Pickup",
  en_route_pickup: "Arrived at Pickup", arrived_pickup: "Loaded / Picked Up",
  loaded: "En Route to Dropoff", en_route_dropoff: "Arrived at Dropoff",
  arrived_dropoff: "Complete Trip", completed: "Move to Billing",
};

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "customer_no_show",    label: "Customer No Show" },
  { value: "driver_late",         label: "Driver Late" },
  { value: "vehicle_issue",       label: "Vehicle Issue" },
  { value: "wrong_address",       label: "Wrong Address" },
  { value: "payment_issue",       label: "Payment Issue" },
  { value: "passenger_complaint", label: "Passenger Complaint" },
  { value: "damage_report",       label: "Damage Report" },
  { value: "accident",            label: "Accident" },
  { value: "weather_delay",       label: "Weather Delay" },
  { value: "cruise_delay",        label: "Cruise Delay" },
  { value: "airport_delay",       label: "Airport Delay" },
  { value: "other",               label: "Other" },
];

const NOTE_CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: "internal", label: "Internal" }, { value: "customer", label: "Customer" },
  { value: "driver", label: "Driver" },     { value: "manager", label: "Manager" },
  { value: "payment", label: "Payment" },   { value: "delay", label: "Delay" },
  { value: "complaint", label: "Complaint" },
];

const COMM_TYPES = [
  { type: "confirmation",       label: "Confirmation" },
  { type: "driver_assigned",    label: "Driver Assigned" },
  { type: "en_route",           label: "En Route" },
  { type: "arrival",            label: "Arrival Notice" },
  { type: "completion",         label: "Completion" },
  { type: "delay",              label: "Delay Notice" },
  { type: "pickup_instructions", label: "Pickup Instructions" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDatetime(ts?: string | null) { return !ts ? "—" : `${fmtDate(ts)} ${fmtTime(ts)}`; }
function minutesAgo(ts?: string | null) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}
function minsUntil(ts?: string | null) {
  if (!ts) return null;
  return Math.floor((new Date(ts).getTime() - Date.now()) / 60000);
}

function payBadge(s: PaymentStatus) {
  if (s === "paid")     return { bg: "#dcfce7", text: "#15803d" };
  if (s === "partial")  return { bg: "#fef9c3", text: "#92400e" };
  if (s === "refunded") return { bg: "#ede9fe", text: "#7c3aed" };
  return { bg: "#fee2e2", text: "#dc2626" };
}
function riskColor(r: RiskLevel) {
  if (r === "critical") return "#1e293b";
  if (r === "high")     return "#dc2626";
  if (r === "medium")   return "#d97706";
  return "#16a34a";
}
function driverStatusStyle(s: DriverStatus) {
  if (s === "available")                                          return { dot: "#16a34a", bg: "#dcfce7", text: "#15803d" };
  if (["assigned","accepted"].includes(s))                       return { dot: "#eab308", bg: "#fefce8", text: "#92400e" };
  if (["on_trip","at_pickup","loaded","at_dropoff"].includes(s)) return { dot: "#3b82f6", bg: "#dbeafe", text: "#1d4ed8" };
  if (s === "off_duty")  return { dot: "#94a3b8", bg: "#f1f5f9", text: "#64748b" };
  if (s === "no_show")   return { dot: "#f97316", bg: "#ffedd5", text: "#c2410c" };
  return { dot: "#1e293b", bg: "#f1f5f9", text: "#1e293b" };
}
function complianceColor(c: Compliance) {
  return c === "valid" ? "#16a34a" : c === "expiring" ? "#d97706" : "#dc2626";
}

function computeReadiness(job: DispatchJob): { status: ReadinessStatus; score: number; reasons: string[]; missing: string[] } {
  const hard: string[] = [], soft: string[] = [], review: string[] = [];
  if (!job.pickup_address)                              hard.push("Missing pickup address");
  if (job.dispatch_blocked && job.block_reasons?.length) hard.push(...job.block_reasons.filter(r => !review.includes(r)));
  if (job.payment_status === "unpaid")                  soft.push("Payment not cleared");
  if (!job.customer_phone)                              soft.push("No customer phone");
  if (job.special_instructions && !job.special_instructions_ack) soft.push("Special instructions not acknowledged");
  if (!job.assigned_driver_id)                          review.push("No driver assigned");
  if (!job.dropoff_address)                             review.push("Missing dropoff address");

  const missing = [...hard, ...soft, ...review];
  // Score: 100 minus penalties
  const score = Math.max(0, 100
    - hard.length * 25
    - soft.length * 15
    - review.length * 10
    - (job.is_late ? 20 : 0)
  );

  if (hard.length)   return { status: "blocked",          score, reasons: hard,   missing };
  if (soft.length)   return { status: "manager_approval", score, reasons: soft,   missing };
  if (review.length) return { status: "needs_review",     score, reasons: review, missing };
  return { status: "ready", score: Math.min(100, score), reasons: [], missing: [] };
}

function computeRiskBadge(job: DispatchJob): RiskBadge | null {
  if (!job.pickup_time) return null;
  const finals = ["completed","billing_review","cancelled"];
  if (finals.includes(job.job_status)) return null;
  const moving = ["en_route_pickup","arrived_pickup","loaded","en_route_dropoff","arrived_dropoff"];
  const mins   = minsUntil(job.pickup_time) ?? 9999;
  if ((minsUntil(job.pickup_time) ?? 0) < 0 && !moving.includes(job.job_status)) return "late";
  if (mins <= 30 && job.job_status === "assigned")       return "critical";
  if (mins <= 60 && !job.assigned_driver_id)             return "at_risk";
  return "on_time";
}

function preDispatchAudit(job: DispatchJob): { pass: boolean; checks: { label: string; ok: boolean }[] } {
  const checks = [
    { label: "Customer name",       ok: !!job.customer_name },
    { label: "Customer phone",      ok: !!job.customer_phone },
    { label: "Pickup address",      ok: !!job.pickup_address },
    { label: "Dropoff address",     ok: !!job.dropoff_address },
    { label: "Pickup time",         ok: !!job.pickup_time },
    { label: "Payment confirmed",   ok: job.payment_status !== "unpaid" },
    { label: "Driver assigned",     ok: !!job.assigned_driver_id },
    { label: "No compliance block", ok: !job.dispatch_blocked },
  ];
  return { pass: checks.every(c => c.ok), checks };
}

const READINESS_CFG: Record<ReadinessStatus, { label: string; bg: string; text: string; border: string }> = {
  ready:            { label: "Ready",            bg: "#f0fdf4", text: "#15803d", border: "#16a34a" },
  needs_review:     { label: "Needs Review",     bg: "#fef9c3", text: "#92400e", border: "#f59e0b" },
  manager_approval: { label: "Manager Approval", bg: "#fff7ed", text: "#c2410c", border: "#ea580c" },
  blocked:          { label: "Blocked",          bg: "#1e293b", text: "#f8fafc", border: "#1e293b" },
};
const RISK_BADGE_CFG: Record<RiskBadge, { label: string; bg: string; text: string }> = {
  on_time:  { label: "ON TIME",  bg: "#dcfce7", text: "#15803d" },
  at_risk:  { label: "AT RISK",  bg: "#fef9c3", text: "#92400e" },
  critical: { label: "CRITICAL", bg: "#fee2e2", text: "#dc2626" },
  late:     { label: "LATE",     bg: "#1e293b", text: "#f8fafc" },
};

// ─── Virtual Dispatcher Types ─────────────────────────────────────────────────

type VDActionButton = { label: string; action: string; href?: string };
type VDAction = {
  urgency: number;
  badge: "critical" | "high" | "warning";
  title: string;
  detail: string;
  job_id?: string;
  job_number?: string;
  driver_id?: string;
  driver_name?: string;
  recommended_driver?: { id: string; name: string; score: number; reasons: string[] };
  action_buttons: VDActionButton[];
};
type VDDriverRec = {
  job_id: string;
  job_number: string;
  customer_name: string;
  pickup_time: string;
  mins_until: number;
  recommended_driver: { id: string; name: string; score: number; reasons: string[] } | null;
  alternatives: { id: string; name: string; score: number }[];
};
type VDEod = { missing_proof: number; pending_payroll: number; open_incidents: number; drivers_expiring_soon: number; total_issues: number };
type VDOwner = { total_trips: number; completed: number; late: number; at_risk: number; pending_payment_count: number; driver_issues: number; vehicle_issues: number; recommended_followups: string[] };
type VDData = { priority_actions: VDAction[]; driver_recommendations: VDDriverRec[]; eod_summary: VDEod; owner_summary: VDOwner; last_updated: string };

// ─── Virtual Dispatcher Panel ─────────────────────────────────────────────────

const VD_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#1e293b", text: "#f8fafc" },
  high:     { bg: "#7c2d12", text: "#fed7aa" },
  warning:  { bg: "#78350f", text: "#fde68a" },
};

function VirtualDispatcher({ date, onAssignJob, onViewJob }: {
  date: string;
  onAssignJob: (jobId: string) => void;
  onViewJob:   (jobId: string) => void;
}) {
  const [data,     setData]     = useState<VDData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(true);
  const [tab,      setTab]      = useState<"actions" | "recs" | "eod" | "owner">("actions");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ronyx/virtual-dispatcher?date=${date}`);
      const d = await res.json();
      setData(d);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 2 * 60 * 1000); // refresh every 2 min
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  function handleAction(act: VDAction, btn: VDActionButton) {
    if (btn.href) { window.location.href = btn.href; return; }
    if (btn.action === "assign_driver" && act.job_id) { onAssignJob(act.job_id); return; }
    if (btn.action === "view_job"      && act.job_id) { onViewJob(act.job_id); return; }
    if (btn.action === "call_customer" && act.job_id) {
      const job = document.querySelector(`[data-job-id="${act.job_id}"]`);
      if (job) job.scrollIntoView({ behavior: "smooth" });
    }
  }

  const criticalCount = data?.priority_actions.filter(a => a.badge === "critical").length ?? 0;
  const totalActions  = data?.priority_actions.length ?? 0;
  const eodIssues     = data?.eod_summary.total_issues ?? 0;

  return (
    <div className="vd-panel">
      {/* Header */}
      <div className="vd-header" onClick={() => setOpen(o => !o)}>
        <div className="vd-header-left">
          <span className="vd-icon">⚡</span>
          <div>
            <span className="vd-title">RONYX VIRTUAL DISPATCHER</span>
            <span className="vd-subtitle">
              {loading ? "Loading…" : data ? `Updated ${new Date(data.last_updated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Co-pilot monitoring your board"}
            </span>
          </div>
        </div>
        <div className="vd-header-right">
          {criticalCount > 0 && <span className="vd-badge critical">{criticalCount} CRITICAL</span>}
          {totalActions > criticalCount && <span className="vd-badge high">{totalActions - criticalCount} OTHER</span>}
          {eodIssues > 0 && <span className="vd-badge warning">EOD: {eodIssues}</span>}
          <button type="button" onClick={(e) => { e.stopPropagation(); load(); }} className="vd-refresh">↻</button>
          <span className="vd-toggle">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <>
          {/* Tab bar */}
          <div className="vd-tabs">
            {([
              { key: "actions", label: "Do This First", count: totalActions },
              { key: "recs",    label: "Smart Assign",  count: data?.driver_recommendations.length ?? 0 },
              { key: "eod",     label: "End of Day",    count: eodIssues },
              { key: "owner",   label: "Owner View",    count: 0 },
            ] as const).map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`vd-tab ${tab === t.key ? "active" : ""}`}>
                {t.label}
                {t.count > 0 && <span className="vd-tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Actions tab */}
          {tab === "actions" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Analyzing board…</div>}
              {!loading && (!data || data.priority_actions.length === 0) && (
                <div className="vd-clear">✓ All clear — no immediate action required. Good shift!</div>
              )}
              {!loading && data && data.priority_actions.map((act, i) => {
                const bc = VD_BADGE[act.badge];
                return (
                  <div key={i} className={`vd-action ${act.badge}`}>
                    <div className="vd-action-left">
                      <span className="vd-action-num" style={{ background: bc.bg, color: bc.text }}>{i + 1}</span>
                      <div className="vd-action-body">
                        <p className="vd-action-title">{act.title}</p>
                        <p className="vd-action-detail">{act.detail}</p>
                        {act.recommended_driver && (
                          <div className="vd-rec-pill">
                            <span className="vd-rec-star">⭐</span>
                            <span className="vd-rec-name">{act.recommended_driver.name}</span>
                            <span className="vd-rec-reasons">{act.recommended_driver.reasons.slice(0, 2).join(" · ")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="vd-action-btns">
                      {act.action_buttons.map((btn, j) => (
                        <button key={j} type="button" className={`vd-action-btn ${j === 0 ? "primary" : "ghost"}`} onClick={() => handleAction(act, btn)}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Smart Assign tab */}
          {tab === "recs" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Scoring drivers…</div>}
              {!loading && (!data || data.driver_recommendations.length === 0) && (
                <div className="vd-clear">✓ All trips have drivers assigned</div>
              )}
              {!loading && data && data.driver_recommendations.map((rec, i) => (
                <div key={i} className="vd-rec-row">
                  <div className="vd-rec-trip">
                    <span className="vd-rec-job">#{rec.job_number}</span>
                    <span className="vd-rec-customer">{rec.customer_name}</span>
                    <span className="vd-rec-time">{rec.mins_until > 0 ? `${rec.mins_until} min` : "Pickup passed"}</span>
                  </div>
                  <div className="vd-rec-driver-block">
                    {rec.recommended_driver ? (
                      <>
                        <div className="vd-rec-best">
                          <span className="vd-rec-star">⭐</span>
                          <div>
                            <span className="vd-rec-dname">{rec.recommended_driver.name}</span>
                            <span className="vd-rec-dreason">{rec.recommended_driver.reasons.join(" · ")}</span>
                          </div>
                          <button type="button" onClick={() => onAssignJob(rec.job_id)} className="vd-assign-btn">
                            Assign {rec.recommended_driver.name.split(" ")[0]}
                          </button>
                        </div>
                        {rec.alternatives.length > 0 && (
                          <div className="vd-rec-alts">
                            Also available: {rec.alternatives.map(a => a.name).join(", ")}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="vd-rec-none">No available compliant driver</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EOD tab */}
          {tab === "eod" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Checking end-of-day status…</div>}
              {!loading && data && (
                <>
                  {data.eod_summary.total_issues === 0
                    ? <div className="vd-clear">✓ All end-of-day items are complete</div>
                    : (
                      <div className="vd-eod-grid">
                        {[
                          { label: "Missing Proof of Service", count: data.eod_summary.missing_proof,         ok: data.eod_summary.missing_proof         === 0, action: "Review Proof",     href: "/ronyx/dispatch/billing" },
                          { label: "Payroll Not Set",          count: data.eod_summary.pending_payroll,       ok: data.eod_summary.pending_payroll       === 0, action: "Approve Payroll",  href: "/ronyx/dispatch/billing" },
                          { label: "Open Incidents",           count: data.eod_summary.open_incidents,        ok: data.eod_summary.open_incidents        === 0, action: "Resolve Incidents", href: undefined },
                          { label: "Compliance Expiring Soon", count: data.eod_summary.drivers_expiring_soon, ok: data.eod_summary.drivers_expiring_soon === 0, action: "View HR",          href: "/ronyx/hr-compliance" },
                        ].map(item => (
                          <div key={item.label} className={`vd-eod-item ${item.ok ? "ok" : "pending"}`}>
                            <span className="vd-eod-icon">{item.ok ? "✓" : "✗"}</span>
                            <div className="vd-eod-info">
                              <span className="vd-eod-label">{item.label}</span>
                              {!item.ok && <span className="vd-eod-count">{item.count} remaining</span>}
                            </div>
                            {!item.ok && item.href && (
                              <a href={item.href} className="vd-eod-btn">{item.action}</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  }
                  <div className="vd-eod-export">
                    <button type="button" onClick={() => {
                      if (!data) return;
                      const s = data.eod_summary;
                      const lines = [
                        `End-of-Day Report — ${new Date().toLocaleString()}`, "",
                        `Missing Proof: ${s.missing_proof}`,
                        `Pending Payroll: ${s.pending_payroll}`,
                        `Open Incidents: ${s.open_incidents}`,
                        `Compliance Expiring: ${s.drivers_expiring_soon}`,
                      ];
                      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                      a.download = `eod-${new Date().toISOString().slice(0,10)}.txt`; a.click();
                    }} className="vd-eod-export-btn">Export EOD Report</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Owner Summary tab */}
          {tab === "owner" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Building summary…</div>}
              {!loading && data && (
                <>
                  <div className="vd-owner-grid">
                    {[
                      { label: "Total Trips",     value: data.owner_summary.total_trips,          ok: true },
                      { label: "Completed",       value: data.owner_summary.completed,            ok: true },
                      { label: "Late Trips",      value: data.owner_summary.late,                 ok: data.owner_summary.late              === 0 },
                      { label: "At Risk",         value: data.owner_summary.at_risk,              ok: data.owner_summary.at_risk           === 0 },
                      { label: "Unpaid Trips",    value: data.owner_summary.pending_payment_count, ok: data.owner_summary.pending_payment_count === 0 },
                      { label: "Driver Issues",   value: data.owner_summary.driver_issues,        ok: data.owner_summary.driver_issues     === 0 },
                      { label: "Vehicle Issues",  value: data.owner_summary.vehicle_issues,       ok: data.owner_summary.vehicle_issues    === 0 },
                    ].map(k => (
                      <div key={k.label} className={`vd-owner-kpi ${k.ok ? "ok" : "warn"}`}>
                        <span className="vd-owner-val" style={{ color: k.ok ? "#16a34a" : "#dc2626" }}>{k.value}</span>
                        <span className="vd-owner-label">{k.label}</span>
                      </div>
                    ))}
                  </div>
                  {data.owner_summary.recommended_followups.length > 0 && (
                    <div className="vd-followups">
                      <p className="vd-followups-title">Recommended Follow-Ups</p>
                      {data.owner_summary.recommended_followups.map((f, i) => (
                        <div key={i} className="vd-followup-row">
                          <span className="vd-followup-num">{i + 1}</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Do This First Panel ─────────────────────────────────────────────────────

function PriorityPanel({ jobs, drivers, alerts }: { jobs: DispatchJob[]; drivers: DispatchDriver[]; alerts: DispatchAlert[] }) {
  const [open, setOpen] = useState(true);

  type PriorityItem = { label: string; urgency: number; badge: "critical" | "high" | "warning" };
  const items: PriorityItem[] = [];

  // Jobs with pickup < 30 min and no driver
  for (const j of jobs) {
    const mins = minsUntil(j.pickup_time);
    if (mins != null && mins <= 30 && mins > 0 && !j.assigned_driver_id && !["completed","billing_review"].includes(j.job_status)) {
      items.push({ label: `Trip #${j.job_number} pickup in ${mins} min — no driver assigned`, urgency: 100 - mins, badge: "critical" });
    }
  }
  // No-response drivers
  for (const j of jobs) {
    if (j.no_response && j.assigned_driver_name) {
      items.push({ label: `${j.assigned_driver_name} has not accepted Trip #${j.job_number} (5+ min)`, urgency: 80, badge: "critical" });
    }
  }
  // Blocked drivers
  for (const d of drivers) {
    if (d.status === "blocked") {
      items.push({ label: `${d.name} blocked — ${d.block_reasons[0] || "compliance issue"}`, urgency: 70, badge: "high" });
    }
  }
  // Unpaid near-dispatch jobs
  for (const j of jobs) {
    if (j.payment_status === "unpaid" && j.job_status === "ready_to_dispatch") {
      items.push({ label: `Trip #${j.job_number} payment pending before dispatch`, urgency: 65, badge: "high" });
    }
  }
  // Late trips
  for (const j of jobs) {
    if (j.is_late && !["completed","billing_review"].includes(j.job_status)) {
      items.push({ label: `Trip #${j.job_number} is LATE — pickup time passed`, urgency: 90, badge: "critical" });
    }
  }
  // Jobs at 60-min risk
  for (const j of jobs) {
    const mins = minsUntil(j.pickup_time);
    if (mins != null && mins > 30 && mins <= 60 && !j.assigned_driver_id) {
      items.push({ label: `Trip #${j.job_number} pickup in ${mins} min — assign driver now`, urgency: 50, badge: "high" });
    }
  }
  // Blocked alerts
  for (const a of alerts.filter(al => al.severity === "blocked").slice(0, 3)) {
    items.push({ label: a.message, urgency: 60, badge: "high" });
  }

  const sorted = items.sort((a, b) => b.urgency - a.urgency).slice(0, 7);

  if (sorted.length === 0) return (
    <div className="db-priority-panel clear">
      <span className="db-priority-title">Do This First</span>
      <span className="db-priority-clear">✓ All clear — no immediate action required</span>
    </div>
  );

  return (
    <div className="db-priority-panel">
      <div className="db-priority-header" onClick={() => setOpen(o => !o)}>
        <span className="db-priority-title">Do This First</span>
        <span className="db-priority-count">{sorted.length}</span>
        <span className="db-priority-toggle">{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <ol className="db-priority-list">
          {sorted.map((item, i) => (
            <li key={i} className={`db-priority-item ${item.badge}`}>
              <span className="db-priority-num">{i + 1}</span>
              <span className="db-priority-msg">{item.label}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── Shift Readiness ──────────────────────────────────────────────────────────

function ShiftReadiness({ jobs, drivers, alerts, onRefresh }: {
  jobs: DispatchJob[]; drivers: DispatchDriver[]; alerts: DispatchAlert[]; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);

  const driversReady   = drivers.filter(d => d.dispatch_eligible && d.status !== "blocked").length;
  const driversBlocked = drivers.filter(d => d.status === "blocked").length;
  const unassigned     = jobs.filter(j => !j.assigned_driver_id && !["completed","billing_review","cancelled"].includes(j.job_status)).length;
  const pendingPay     = jobs.filter(j => j.payment_status === "unpaid" && !["completed","billing_review"].includes(j.job_status)).length;
  const lateRisk       = jobs.filter(j => j.is_late).length;
  const missingPhone   = jobs.filter(j => !j.customer_phone && !["completed","billing_review"].includes(j.job_status)).length;
  const missingAddr    = jobs.filter(j => !j.pickup_address && !["completed","billing_review"].includes(j.job_status)).length;
  const openAlerts     = alerts.filter(a => !["warning"].includes(a.severity)).length;

  const rows = [
    { label: "Drivers Ready",    value: driversReady,  ok: driversReady > 0,    note: `${driversBlocked} blocked` },
    { label: "Drivers Blocked",  value: driversBlocked, ok: driversBlocked === 0 },
    { label: "Unassigned Trips", value: unassigned,    ok: unassigned === 0 },
    { label: "Pending Payments", value: pendingPay,    ok: pendingPay === 0 },
    { label: "Late / At Risk",   value: lateRisk,      ok: lateRisk === 0 },
    { label: "Missing Phone",    value: missingPhone,  ok: missingPhone === 0 },
    { label: "Missing Address",  value: missingAddr,   ok: missingAddr === 0 },
    { label: "Open Alerts",      value: openAlerts,    ok: openAlerts === 0 },
  ];

  const allClear = rows.every(r => r.ok);

  function exportReport() {
    const lines = [`Morning Shift Readiness — ${new Date().toLocaleString()}`, ""];
    for (const r of rows) lines.push(`${r.ok ? "✓" : "✗"} ${r.label}: ${r.value}${r.note ? " (" + r.note + ")" : ""}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `shift-readiness-${new Date().toISOString().slice(0,10)}.txt`; a.click();
  }

  return (
    <div className={`db-shift-bar ${allClear ? "clear" : "issues"}`}>
      <div className="db-shift-bar-head" onClick={() => setOpen(o => !o)}>
        <span className="db-shift-bar-label">
          Morning Shift Readiness
          {!allClear && <span className="db-shift-bar-issues">{rows.filter(r => !r.ok).length} issues</span>}
          {allClear  && <span className="db-shift-bar-ok">All Clear ✓</span>}
        </span>
        <div className="db-shift-bar-actions">
          <button type="button" onClick={(e) => { e.stopPropagation(); exportReport(); }} className="db-btn-ghost db-btn-xs">Export Report</button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onRefresh(); }} className="db-btn-ghost db-btn-xs">Refresh</button>
          <span>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className="db-shift-bar-grid">
          {rows.map((r) => (
            <div key={r.label} className={`db-shift-cell ${r.ok ? "ok" : "fail"}`}>
              <span className="db-shift-cell-icon">{r.ok ? "✓" : "✗"}</span>
              <div>
                <span className="db-shift-cell-label">{r.label}</span>
                {r.note && <span className="db-shift-cell-note">{r.note}</span>}
              </div>
              <strong className="db-shift-cell-val" style={{ color: r.ok ? "#16a34a" : "#dc2626" }}>{r.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alert Strip ──────────────────────────────────────────────────────────────

const ALERT_ACTIONS: Partial<Record<string, { label: string; href?: string }[]>> = {
  medical_card_expired:       [{ label: "View HR", href: "/ronyx/hr-compliance" }],
  cdl_expired:                [{ label: "View HR", href: "/ronyx/hr-compliance" }],
  driver_dispatch_blocked:    [{ label: "View HR", href: "/ronyx/hr-compliance" }],
  vehicle_out_of_service:     [{ label: "Maintenance", href: "/ronyx/maintenance" }],
  vehicle_inspection_expired: [{ label: "Maintenance", href: "/ronyx/maintenance" }],
  vehicle_insurance_expired:  [{ label: "Maintenance", href: "/ronyx/maintenance" }],
  job_past_pickup:            [{ label: "Assign Driver" }],
  job_no_driver:              [{ label: "Assign Driver" }],
  job_missing_pickup:         [{ label: "Edit Trip" }],
  job_unpaid_high_risk:       [{ label: "Collect Payment" }],
};

function AlertStrip({ alerts }: { alerts: DispatchAlert[] }) {
  const [collapsed, setCollapsed] = useState(false);
  if (alerts.length === 0) return null;

  const counts = {
    blocked:  alerts.filter(a => a.severity === "blocked").length,
    critical: alerts.filter(a => a.severity === "critical").length,
    high:     alerts.filter(a => a.severity === "high").length,
    warning:  alerts.filter(a => a.severity === "warning").length,
  };

  const sevClass: Record<AlertSeverity, string>  = { blocked: "sev-blocked", critical: "sev-critical", high: "sev-high", warning: "sev-warning" };
  const sevLabel: Record<AlertSeverity, string>  = { blocked: "BLOCKED", critical: "CRITICAL", high: "HIGH", warning: "WARN" };

  return (
    <div className="db-alert-strip">
      <div className="db-alert-header" onClick={() => setCollapsed(c => !c)}>
        <div className="db-alert-header-left">
          <span className="db-alert-title">⚠ DISPATCH ALERTS</span>
          <span className="db-alert-total">{alerts.length} TOTAL</span>
          {counts.blocked  > 0 && <span className="db-alert-pill black">BLOCKED: {counts.blocked}</span>}
          {counts.critical > 0 && <span className="db-alert-pill red">CRITICAL: {counts.critical}</span>}
          {counts.high     > 0 && <span className="db-alert-pill orange">HIGH: {counts.high}</span>}
          {counts.warning  > 0 && <span className="db-alert-pill amber">WARN: {counts.warning}</span>}
        </div>
        <span className="db-alert-toggle">{collapsed ? "Show ▼" : "Hide ▲"}</span>
      </div>
      {!collapsed && (
        <div className="db-alert-rows">
          {alerts.map((a, i) => {
            const actions = ALERT_ACTIONS[a.type] || [];
            return (
              <div key={i} className={`db-alert-row ${sevClass[a.severity]}`}>
                <span className="db-alert-badge">{sevLabel[a.severity]}</span>
                <span className="db-alert-msg">{a.message}</span>
                <div className="db-alert-row-actions">
                  {actions.map((act) =>
                    act.href
                      ? <a key={act.label} href={act.href} className="db-alert-action-btn">{act.label}</a>
                      : <button key={act.label} type="button" className="db-alert-action-btn">{act.label}</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ job, onAdvance, onAssign, onNote, onViewDetails, onIssue, onComm }: {
  job: DispatchJob;
  onAdvance: (job: DispatchJob) => void;
  onAssign:  (job: DispatchJob) => void;
  onNote:    (job: DispatchJob) => void;
  onViewDetails: (job: DispatchJob) => void;
  onIssue:   (job: DispatchJob) => void;
  onComm:    (job: DispatchJob) => void;
}) {
  const readiness = computeReadiness(job);
  const riskBadge = computeRiskBadge(job);
  const pay       = payBadge(job.payment_status);
  const rc        = READINESS_CFG[readiness.status];
  const next      = NEXT_STATUS[job.job_status];
  const nextLabel = NEXT_LABEL[job.job_status];
  const minsAgo   = minutesAgo(job.sent_at);

  return (
    <div className="db-trip-card" style={{ borderLeft: `3px solid ${rc.border}` }}>
      {/* Header */}
      <div className="db-card-head">
        <div className="db-card-head-left">
          <span className="db-card-num">#{job.job_number || job.id.slice(0,6)}</span>
          {riskBadge && (
            <span className="db-risk-badge" style={{ background: RISK_BADGE_CFG[riskBadge].bg, color: RISK_BADGE_CFG[riskBadge].text }}>
              {RISK_BADGE_CFG[riskBadge].label}
            </span>
          )}
        </div>
        <span className="db-card-time">{fmtTime(job.pickup_time)}</span>
      </div>

      {/* Customer */}
      <div className="db-card-customer">{job.customer_name || "Unknown Customer"}</div>

      {/* Route */}
      <div className="db-card-route">
        <div className="db-route-row"><span className="db-route-up">↑</span><span>{job.pickup_address || <em className="db-missing">Missing pickup address</em>}</span></div>
        <div className="db-route-row"><span className="db-route-dn">↓</span><span>{job.dropoff_address || <span className="db-route-dim">No dropoff</span>}</span></div>
      </div>

      {/* Assignment info */}
      <div className="db-card-assignment">
        <div className="db-assign-row">
          <span className="db-assign-label">Driver:</span>
          <span className={job.assigned_driver_name ? "db-assign-val" : "db-assign-missing"}>
            {job.assigned_driver_name || "Not Assigned"}
          </span>
        </div>
        <div className="db-assign-row">
          <span className="db-assign-label">Vehicle:</span>
          <span className={job.assigned_vehicle_number ? "db-assign-val" : "db-assign-missing"}>
            {job.assigned_vehicle_number ? `Unit ${job.assigned_vehicle_number}` : "Not Assigned"}
          </span>
        </div>
        <div className="db-assign-row">
          <span className="db-assign-label">Payment:</span>
          <span className="db-pay-inline" style={{ background: pay.bg, color: pay.text }}>{job.payment_status.toUpperCase()}</span>
        </div>
        <div className="db-assign-row">
          <span className="db-assign-label">Risk:</span>
          <span style={{ color: riskColor(job.risk_level), fontWeight: 700, fontSize: 11 }}>{job.risk_level.toUpperCase()}</span>
        </div>
      </div>

      {/* Acceptance timer */}
      {job.job_status === "assigned" && minsAgo !== null && (
        <div className={`db-accept-timer ${job.no_response ? "no-response" : "waiting"}`}>
          {job.no_response ? (
            <>
              <span className="db-accept-label">⚠ No Response from Driver ({minsAgo}m)</span>
              <div className="db-accept-actions">
                <button type="button" className="db-accept-btn" onClick={() => onAssign(job)}>Reassign</button>
                {job.assigned_driver_phone && <a href={`tel:${job.assigned_driver_phone}`} className="db-accept-btn">Call</a>}
              </div>
            </>
          ) : (
            <span className="db-accept-label">Sent {minsAgo}m ago · Awaiting acceptance</span>
          )}
        </div>
      )}

      {/* Block reasons */}
      {readiness.reasons.length > 0 && (
        <div className="db-card-blocks" style={{ background: rc.bg }}>
          {readiness.reasons.slice(0, 2).map((r, i) => (
            <span key={i} style={{ color: rc.text, fontSize: 10, fontWeight: 600, display: "block" }}>· {r}</span>
          ))}
        </div>
      )}

      {/* Readiness score */}
      <div className="db-readiness-score">
        <div className="db-readiness-bar">
          <div className="db-readiness-fill" style={{ width: `${readiness.score}%`, background: readiness.score === 100 ? "#16a34a" : readiness.score >= 70 ? "#d97706" : "#dc2626" }} />
        </div>
        <span className="db-readiness-pct" style={{ color: readiness.score === 100 ? "#16a34a" : readiness.score >= 70 ? "#d97706" : "#dc2626" }}>
          {readiness.score}%
        </span>
      </div>

      {/* Primary actions */}
      <div className="db-card-actions">
        <button type="button" onClick={() => onAssign(job)} className="db-card-btn assign">
          {job.assigned_driver_name ? "Change Driver" : "Assign Driver"}
        </button>
        {next && nextLabel && (
          <button type="button" onClick={() => onAdvance(job)} className="db-card-btn advance">{nextLabel}</button>
        )}
      </div>

      {/* Secondary actions */}
      <div className="db-card-actions2">
        <button type="button" onClick={() => onViewDetails(job)} className="db-card-btn2">Details</button>
        <button type="button" onClick={() => onNote(job)} className="db-card-btn2">Note</button>
        <button type="button" onClick={() => onComm(job)} className="db-card-btn2">Comms</button>
        <button type="button" onClick={() => onIssue(job)} className="db-card-btn2 db-btn2-issue">Issue</button>
        {job.customer_phone && <a href={`tel:${job.customer_phone}`} className="db-card-btn2">📞</a>}
        {job.pickup_address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(job.pickup_address)}`} target="_blank" rel="noopener noreferrer" className="db-card-btn2">Map</a>
        )}
      </div>
    </div>
  );
}

// ─── Driver Panel ─────────────────────────────────────────────────────────────

function DriverPanel({ drivers, onBlock, onAssignFromPanel }: {
  drivers: DispatchDriver[];
  onBlock: (d: DispatchDriver) => void;
  onAssignFromPanel: (d: DispatchDriver) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : drivers;
  const available = drivers.filter(d => d.status === "available").length;

  return (
    <aside className="db-driver-panel">
      <div className="db-panel-head">
        <strong>Driver Panel</strong>
        <span className="db-panel-avail">{available} available</span>
      </div>
      <div className="db-driver-search-wrap">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search driver…"
          className="db-driver-search"
        />
      </div>
      <div className="db-driver-list">
        {filtered.length === 0 && <div className="db-empty-panel">No drivers found</div>}
        {filtered.map((d) => {
          const sc = driverStatusStyle(d.status);
          return (
            <div key={d.id} className="db-driver-card">
              <div className="db-driver-top">
                <div className="db-driver-dot" style={{ background: sc.dot }} />
                <div className="db-driver-info">
                  <span className="db-driver-name">{d.name}</span>
                  <div className="db-driver-meta">
                    <span className="db-driver-status-badge" style={{ background: sc.bg, color: sc.text }}>
                      {d.status.replace(/_/g," ")}
                    </span>
                    <span style={{ color: complianceColor(d.compliance), fontSize: 10, fontWeight: 700 }}>
                      {d.compliance === "valid" ? "✓" : d.compliance === "expiring" ? "⚠" : "✕"} {d.compliance}
                    </span>
                  </div>
                </div>
              </div>

              <div className="db-driver-detail">
                <span>Vehicle: {d.vehicle ? `Unit ${d.vehicle}` : "None"}</span>
                {d.active_job && <span>Job: <strong className="db-driver-job">#{d.active_job.job_number}</strong></span>}
              </div>

              {d.block_reasons.length > 0 && (
                <div className="db-driver-block-reason">
                  {d.block_reasons.slice(0,2).map((r, i) => <span key={i}>{r}</span>)}
                </div>
              )}

              <div className="db-driver-actions">
                {d.phone && <a href={`tel:${d.phone}`} className="db-driver-btn">Call</a>}
                {d.status === "available" && d.dispatch_eligible && (
                  <button type="button" className="db-driver-btn assign" onClick={() => onAssignFromPanel(d)}>Assign</button>
                )}
                {d.status === "blocked" && (
                  <button type="button" className="db-driver-btn blocked" onClick={() => onBlock(d)}>View Block</button>
                )}
                {d.active_job && (
                  <span className="db-driver-btn neutral">On Trip</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ job, drivers, onAssign, onClose }: {
  job: DispatchJob;
  drivers: DispatchDriver[];
  onAssign: (jobId: string, driverId: string, driverName: string) => Promise<BlockResult | null>;
  onClose: () => void;
}) {
  const [saving, setSaving]         = useState<string | null>(null);
  const [blockResult, setBlockResult] = useState<BlockResult | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideDriverId, setOverrideDriverId] = useState<string | null>(null);
  const [overrideDriverName, setOverrideDriverName] = useState<string>("");
  const [managerName, setManagerName]   = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const eligible   = drivers.filter(d => d.dispatch_eligible && d.status !== "blocked");
  const ineligible = drivers.filter(d => !d.dispatch_eligible || d.status === "blocked");

  async function doAssign(driverId: string, driverName: string) {
    setSaving(driverId);
    const result = await onAssign(job.id, driverId, driverName);
    setSaving(null);
    if (result) {
      setBlockResult(result);
      setOverrideDriverId(driverId);
      setOverrideDriverName(driverName);
      return;
    }
    onClose();
  }

  async function submitOverride() {
    if (!overrideDriverId || !managerName.trim() || !overrideReason.trim()) return;
    setSaving(overrideDriverId);
    // Re-submit with override payload
    const res = await fetch(`/api/ronyx/dispatch/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assigned_driver_id:  overrideDriverId,
        job_status:          "assigned",
        override_approved:   true,
        override_reasons:    blockResult?.soft_block_types || [],
        override_reason:     overrideReason,
        manager_name:        managerName,
      }),
    });
    setSaving(null);
    if (res.ok) {
      onClose();
    }
  }

  if (blockResult && !overrideMode) {
    return (
      <div className="db-modal-backdrop" onClick={onClose}>
        <div className="db-modal" onClick={e => e.stopPropagation()}>
          <div className="db-modal-blocked-icon">{blockResult.can_override ? "⚠️" : "🚫"}</div>
          <h2>{blockResult.can_override ? "Manager Approval Required" : "Dispatch Blocked"}</h2>
          <p className="db-block-driver-name">{blockResult.driver_name} cannot be assigned.</p>

          {blockResult.hard_blocks.length > 0 && (
            <div className="db-block-section hard">
              <span className="db-block-section-label">Hard Blocks — Cannot Override</span>
              {blockResult.hard_blocks.map((r, i) => <div key={i} className="db-block-reason">{r}</div>)}
              <p className="db-block-help">Expired compliance cannot be overridden. Resolve in HR Compliance first.</p>
            </div>
          )}
          {blockResult.soft_blocks.length > 0 && (
            <div className="db-block-section soft">
              <span className="db-block-section-label">
                {blockResult.can_override ? "Soft Blocks — Manager Can Override" : "Additional Issues"}
              </span>
              {blockResult.soft_blocks.map((r, i) => <div key={i} className="db-block-reason soft">{r}</div>)}
            </div>
          )}

          <div className="db-modal-footer">
            <button type="button" onClick={() => setBlockResult(null)} className="db-btn-ghost">Choose Another Driver</button>
            {blockResult.can_override && blockResult.hard_blocks.length === 0 && overrideDriverId && (
              <button type="button" onClick={() => setOverrideMode(true)} className="db-btn-override">Request Manager Override</button>
            )}
            <button type="button" onClick={() => window.location.href = "/ronyx/hr-compliance"} className="db-btn-ghost">View HR Compliance</button>
          </div>
        </div>
      </div>
    );
  }

  if (overrideMode) {
    return (
      <div className="db-modal-backdrop" onClick={onClose}>
        <div className="db-modal" onClick={e => e.stopPropagation()}>
          <p className="db-modal-sub">Manager Override</p>
          <h2>Approve Soft Block — {overrideDriverName}</h2>
          <div className="db-block-section soft">
            <span className="db-block-section-label">Rules Being Overridden</span>
            {(blockResult?.soft_blocks || []).map((r, i) => <div key={i} className="db-block-reason soft">{r}</div>)}
          </div>
          <div className="db-override-form">
            <label className="db-form-label">Approved By (Manager Name) *</label>
            <input value={managerName} onChange={e => setManagerName(e.target.value)} className="db-form-input" placeholder="Full name" />
            <label className="db-form-label">Override Reason *</label>
            <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="db-form-textarea" rows={3} placeholder="e.g. Customer paying cash at pickup. Confirmed by phone." />
            <p className="db-override-warn">This override will be permanently logged with your name, timestamp, and reason.</p>
          </div>
          <div className="db-modal-footer">
            <button type="button" onClick={() => setOverrideMode(false)} className="db-btn-ghost">Back</button>
            <button type="button" onClick={submitOverride} disabled={!managerName.trim() || !overrideReason.trim() || !!saving} className="db-btn-override">
              {saving ? "Approving…" : "Approve & Dispatch"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <p className="db-modal-sub">Assign Driver — #{job.job_number}</p>
            <h2>{job.customer_name}</h2>
            <p className="db-modal-route">{fmtDatetime(job.pickup_time)} · {job.pickup_address} → {job.dropoff_address}</p>
          </div>
        </div>

        <div className="db-driver-options">
          {eligible.length > 0 && (
            <>
              <div className="db-assign-recommended-row">
                <div className="db-assign-driver-info">
                  <span className="db-recommend-star">⭐</span>
                  <div>
                    <span className="db-driver-opt-name">{eligible[0].name}</span>
                    <span className="db-driver-opt-meta">Available · Valid compliance · {eligible[0].vehicle ? `Unit ${eligible[0].vehicle}` : "No vehicle"}</span>
                  </div>
                </div>
                <button type="button" className="db-btn-assign-single" disabled={saving === eligible[0].id} onClick={() => doAssign(eligible[0].id, eligible[0].name)}>
                  {saving === eligible[0].id ? "…" : `Assign ${eligible[0].name.split(" ")[0]}`}
                </button>
              </div>
              {eligible.slice(1).map(d => (
                <div key={d.id} className="db-assign-driver-row">
                  <div className="db-assign-driver-info">
                    <span className="db-driver-opt-name">{d.name}</span>
                    <span className="db-driver-opt-meta">{d.status.replace(/_/g," ")} · {d.compliance} · {d.vehicle ? `Unit ${d.vehicle}` : "No vehicle"}</span>
                  </div>
                  <button type="button" className="db-btn-assign-single ghost" disabled={saving === d.id} onClick={() => doAssign(d.id, d.name)}>
                    {saving === d.id ? "…" : `Assign ${d.name.split(" ")[0]}`}
                  </button>
                </div>
              ))}
            </>
          )}

          {ineligible.length > 0 && (
            <>
              <p className="db-options-label blocked-label">Ineligible Drivers ({ineligible.length})</p>
              {ineligible.map(d => (
                <div key={d.id} className="db-assign-driver-row blocked-row">
                  <div className="db-assign-driver-info">
                    <span className="db-driver-opt-name">{d.name}</span>
                    <span className="db-driver-opt-reason">{d.block_reasons[0] || "Ineligible"}</span>
                  </div>
                  <button type="button" className="db-btn-assign-single blocked" onClick={() => window.location.href = "/ronyx/hr-compliance"}>View Block</button>
                </div>
              ))}
            </>
          )}
          {eligible.length === 0 && ineligible.length === 0 && (
            <p style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>No drivers loaded</p>
          )}
        </div>

        <div className="db-modal-footer">
          <button type="button" onClick={onClose} className="db-btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Comms Modal ─────────────────────────────────────────────────────

function CustomerCommModal({ job, onClose }: { job: DispatchJob; onClose: () => void }) {
  const [history, setHistory]   = useState<CommMessage[]>([]);
  const [sending, setSending]   = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    fetch(`/api/ronyx/dispatch/communications?job_id=${job.id}`)
      .then(r => r.json())
      .then(d => setHistory(d.messages || []));
  }, [job.id]);

  function showToast(m: string) { setToastMsg(m); setTimeout(() => setToastMsg(""), 3000); }

  async function sendComm(type: string) {
    setSending(type);
    const res = await fetch("/api/ronyx/dispatch/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: job.id, message_type: type, channel: "email" }),
    });
    const d = await res.json();
    setSending(null);
    showToast(d.delivery_status === "sent" ? `${type} email sent` : `${type} logged (no email on file)`);
    // Refresh history
    fetch(`/api/ronyx/dispatch/communications?job_id=${job.id}`)
      .then(r => r.json())
      .then(d => setHistory(d.messages || []));
  }

  const sentTypes = new Set(history.map(m => m.message_type));

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal db-modal-wide" onClick={e => e.stopPropagation()}>
        {toastMsg && <div className="db-comm-toast">{toastMsg}</div>}

        <div className="db-modal-header">
          <div>
            <p className="db-modal-sub">Customer Communications — #{job.job_number}</p>
            <h2>{job.customer_name}</h2>
            <p className="db-modal-route">{job.customer_phone || "No phone"} · {job.customer_email || "No email"}</p>
          </div>
          <button type="button" onClick={onClose} className="db-btn-ghost">Close</button>
        </div>

        <div className="db-comm-grid">
          {COMM_TYPES.map(({ type, label }) => {
            const sent = sentTypes.has(type);
            return (
              <div key={type} className={`db-comm-tile ${sent ? "sent" : ""}`}>
                <span className="db-comm-tile-label">{label}</span>
                <span className="db-comm-tile-status">{sent ? "✓ Sent" : "Not Sent"}</span>
                <button
                  type="button"
                  onClick={() => sendComm(type)}
                  disabled={sending === type}
                  className={`db-comm-tile-btn ${sent ? "resend" : "send"}`}
                >
                  {sending === type ? "Sending…" : sent ? "Resend" : "Send"}
                </button>
              </div>
            );
          })}
        </div>

        {history.length > 0 && (
          <div className="db-comm-history">
            <p className="db-comm-history-label">Communication History</p>
            {history.map(m => (
              <div key={m.id} className="db-comm-history-row">
                <span className="db-comm-type-badge">{m.message_type.replace(/_/g," ")}</span>
                <span className="db-comm-to">→ {m.sent_to || "—"}</span>
                <span className={`db-comm-status ${m.status}`}>{m.status}</span>
                <span className="db-comm-time">{fmtDatetime(m.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Report Issue Modal ───────────────────────────────────────────────────────

function ReportIssueModal({ job, onClose, onSaved }: { job: DispatchJob; onClose: () => void; onSaved: () => void }) {
  const [type, setType]       = useState<IncidentType | "">("");
  const [desc, setDesc]       = useState("");
  const [sev, setSev]         = useState<"low"|"medium"|"high"|"critical">("medium");
  const [saving, setSaving]   = useState(false);

  async function submit() {
    if (!type) return;
    setSaving(true);
    await fetch("/api/ronyx/dispatch/incidents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: job.id, incident_type: type, description: desc, severity: sev }),
    });
    setSaving(false); onSaved(); onClose();
  }

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <p className="db-modal-sub">Report Issue — #{job.job_number}</p>
        <h2>{job.customer_name}</h2>
        <div className="db-form-group">
          <label className="db-form-label">Issue Type *</label>
          <div className="db-incident-grid">
            {INCIDENT_TYPES.map(t => (
              <button key={t.value} type="button" onClick={() => setType(t.value)} className={`db-incident-btn ${type === t.value ? "selected" : ""}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="db-form-group">
          <label className="db-form-label">Severity</label>
          <div className="db-severity-row">
            {(["low","medium","high","critical"] as const).map(s => (
              <button key={s} type="button" onClick={() => setSev(s)} className={`db-severity-btn sev-${s} ${sev === s ? "selected" : ""}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="db-form-group">
          <label className="db-form-label">Description</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="db-form-textarea" rows={3} placeholder="Describe the issue…" />
        </div>
        <div className="db-modal-footer">
          <button type="button" onClick={onClose} className="db-btn-ghost">Cancel</button>
          <button type="button" onClick={submit} disabled={!type || saving} className="db-btn-primary">{saving ? "Reporting…" : "Report Issue"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ job, onClose, onSaved }: { job: DispatchJob; onClose: () => void; onSaved: () => void }) {
  const [cat, setCat]     = useState<NoteCategory>("internal");
  const [body, setBody]   = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!body.trim()) return; setSaving(true);
    await fetch("/api/ronyx/dispatch/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.id, category: cat, body }) });
    setSaving(false); onSaved(); onClose();
  }
  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <p className="db-modal-sub">Add Note — #{job.job_number}</p><h2>{job.customer_name}</h2>
        <div className="db-form-group">
          <label className="db-form-label">Category</label>
          <div className="db-note-cat-row">{NOTE_CATEGORIES.map(c => <button key={c.value} type="button" onClick={() => setCat(c.value)} className={`db-note-cat-btn ${cat === c.value ? "selected" : ""}`}>{c.label}</button>)}</div>
        </div>
        <div className="db-form-group">
          <label className="db-form-label">Note *</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} className="db-form-textarea" rows={4} autoFocus placeholder="Enter note…" />
        </div>
        <div className="db-modal-footer">
          <button type="button" onClick={onClose} className="db-btn-ghost">Cancel</button>
          <button type="button" onClick={submit} disabled={!body.trim() || saving} className="db-btn-primary">{saving ? "Saving…" : "Save Note"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose, onStatusChange }: {
  job: DispatchJob; onClose: () => void; onStatusChange: (id: string, status: string) => void;
}) {
  const audit = preDispatchAudit(job);
  const readiness = computeReadiness(job);

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal db-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <p className="db-modal-sub">Trip Details</p>
            <h2>#{job.job_number} — {job.customer_name}</h2>
            <div className="db-detail-readiness" style={{ background: READINESS_CFG[readiness.status].bg, color: READINESS_CFG[readiness.status].text }}>
              {READINESS_CFG[readiness.status].label} · {readiness.score}% Ready
              {readiness.reasons.length > 0 && <span> · {readiness.reasons.join(" · ")}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="db-btn-ghost">Close</button>
        </div>

        <div className="db-detail-grid">
          <div><span>Customer Phone</span><strong>{job.customer_phone || "—"}</strong></div>
          <div><span>Pickup Time</span><strong>{fmtDatetime(job.pickup_time)}</strong></div>
          <div><span>Pickup Address</span><strong>{job.pickup_address || "—"}</strong></div>
          <div><span>Dropoff Address</span><strong>{job.dropoff_address || "—"}</strong></div>
          <div><span>Passengers</span><strong>{job.passenger_count ?? "—"}</strong></div>
          <div><span>Luggage</span><strong>{job.luggage_count ?? "—"}</strong></div>
          <div><span>Payment</span><strong style={{ color: job.payment_status === "paid" ? "#16a34a" : "#dc2626" }}>{job.payment_status}</strong></div>
          <div><span>Risk Level</span><strong style={{ color: riskColor(job.risk_level) }}>{job.risk_level}</strong></div>
          <div><span>Driver</span><strong>{job.assigned_driver_name || "Unassigned"}</strong></div>
          <div><span>Vehicle</span><strong>{job.assigned_vehicle_number ? `Unit ${job.assigned_vehicle_number}` : "Unassigned"}</strong></div>
        </div>

        {/* Pre-dispatch audit */}
        <div className="db-audit-section">
          <p className="db-audit-title">Pre-Dispatch Audit {audit.pass ? <span className="db-audit-pass">✓ PASS</span> : <span className="db-audit-fail">✗ FAIL</span>}</p>
          <div className="db-audit-grid">
            {audit.checks.map(c => (
              <div key={c.label} className={`db-audit-check ${c.ok ? "ok" : "fail"}`}>
                <span>{c.ok ? "✓" : "✗"}</span><span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {job.special_instructions && (
          <div className="db-special-instructions">
            <span>Special Instructions</span>
            <p>{job.special_instructions}</p>
            {!job.special_instructions_ack && <span className="db-ack-warn">⚠ Not acknowledged by driver</span>}
          </div>
        )}

        <div className="db-detail-actions">
          {job.customer_phone && <a href={`tel:${job.customer_phone}`} className="db-btn-ghost">📞 Call Customer</a>}
          {job.pickup_address && <a href={`https://maps.google.com/?q=${encodeURIComponent(job.pickup_address)}`} target="_blank" rel="noopener noreferrer" className="db-btn-ghost">Map Pickup</a>}
          {job.pickup_address && job.dropoff_address && (
            <a href={`https://maps.google.com/dir/${encodeURIComponent(job.pickup_address)}/${encodeURIComponent(job.dropoff_address)}`} target="_blank" rel="noopener noreferrer" className="db-btn-ghost">Full Route</a>
          )}
          {NEXT_STATUS[job.job_status] && (
            <button type="button" onClick={() => { onStatusChange(job.id, NEXT_STATUS[job.job_status]!); onClose(); }} className="db-btn-primary">
              {NEXT_LABEL[job.job_status]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Driver Block Modal ───────────────────────────────────────────────────────

function DriverBlockModal({ driver, onClose }: { driver: DispatchDriver; onClose: () => void }) {
  const [reminded, setReminded] = useState(false);
  async function sendReminder() {
    await fetch(`/api/ronyx/drivers/${driver.id}/send-reminder`, { method: "POST" });
    setReminded(true);
  }
  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-blocked-icon">🚫</div>
        <h2>Driver Block — {driver.name}</h2>
        <div className="db-driver-block-detail">
          <div><span>Status</span><strong>Dispatch Blocked</strong></div>
          <div><span>Compliance</span><strong style={{ color: "#dc2626" }}>{driver.compliance.toUpperCase()}</strong></div>
          <div><span>Dispatch Eligible</span><strong style={{ color: "#dc2626" }}>No</strong></div>
          <div><span>Payroll Eligible</span><strong style={{ color: driver.payroll_eligible ? "#16a34a" : "#dc2626" }}>{driver.payroll_eligible ? "Yes" : "No"}</strong></div>
        </div>
        <div className="db-block-section hard">
          <span className="db-block-section-label">Block Reasons</span>
          {driver.block_reasons.map((r, i) => <div key={i} className="db-block-reason">{r}</div>)}
        </div>
        <p className="db-block-help">Upload and approve the required document in HR Compliance to restore dispatch eligibility.</p>
        <div className="db-modal-footer">
          <button type="button" onClick={() => window.location.href = "/ronyx/hr-compliance"} className="db-btn-ghost">Go to HR Compliance</button>
          <button type="button" onClick={sendReminder} disabled={reminded} className="db-btn-ghost">
            {reminded ? "Reminder Sent ✓" : "Send Reminder"}
          </button>
          <button type="button" onClick={onClose} className="db-btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export default function RonyxDispatchBoard() {
  const [jobs,      setJobs]      = useState<DispatchJob[]>([]);
  const [drivers,   setDrivers]   = useState<DispatchDriver[]>([]);
  const [alerts,    setAlerts]    = useState<DispatchAlert[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState("");
  const [search,    setSearch]    = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [laneFilter, setLaneFilter] = useState<PipelineKey | "all">("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const [assignTarget, setAssignTarget] = useState<DispatchJob | null>(null);
  const [detailTarget, setDetailTarget] = useState<DispatchJob | null>(null);
  const [noteTarget,   setNoteTarget]   = useState<DispatchJob | null>(null);
  const [issueTarget,  setIssueTarget]  = useState<DispatchJob | null>(null);
  const [commTarget,   setCommTarget]   = useState<DispatchJob | null>(null);
  const [blockDriver,  setBlockDriver]  = useState<DispatchDriver | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const loadAll = useCallback(async () => {
    try {
      const [jr, dr, ar] = await Promise.all([
        fetch(`/api/ronyx/dispatch/jobs?date=${dateFilter}`),
        fetch("/api/ronyx/dispatch/drivers"),
        fetch("/api/ronyx/dispatch/alerts"),
      ]);
      const [jd, dd, ad] = await Promise.all([jr.json(), dr.json(), ar.json()]);
      setJobs(jd.jobs || []); setDrivers(dd.drivers || []); setAlerts(ad.alerts || []);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [dateFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function moveJob(jobId: string, newStatus: string) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, job_status: newStatus } : j));
    await fetch(`/api/ronyx/dispatch/jobs/${jobId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_status: newStatus }),
    });
  }

  async function advanceJob(job: DispatchJob) {
    const next = NEXT_STATUS[job.job_status];
    if (!next) return;
    const readiness = computeReadiness(job);
    if (readiness.status === "blocked") { showToast(`Cannot advance: ${readiness.reasons[0]}`); return; }
    await moveJob(job.id, next);
    showToast(`Job #${job.job_number} → ${next.replace(/_/g," ")}`);
  }

  async function assignDriver(jobId: string, driverId: string, driverName: string): Promise<BlockResult | null> {
    const res = await fetch(`/api/ronyx/dispatch/jobs/${jobId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_driver_id: driverId, job_status: "assigned" }),
    });
    if (res.status === 422) return await res.json() as BlockResult;
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, assigned_driver_id: driverId, assigned_driver_name: driverName, job_status: "assigned" } : j));
    showToast(`${driverName} assigned`);
    setTimeout(loadAll, 800);
    return null;
  }

  const visibleJobs = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter(j => {
      const matchSearch = !q || [j.job_number, j.customer_name, j.assigned_driver_name, j.pickup_address].filter(Boolean).some(s => s!.toLowerCase().includes(q));
      const matchLane   = laneFilter === "all" || j.job_status === laneFilter;
      return matchSearch && matchLane;
    });
  }, [jobs, search, laneFilter]);

  const jobsForLane = (key: string) => visibleJobs.filter(j => j.job_status === key);
  const completedToday = jobs.filter(j => j.job_status === "completed" && j.pickup_time?.startsWith(dateFilter)).length;

  // KPI data
  const kpi = {
    total:     jobs.length,
    unassigned: jobs.filter(j => !j.assigned_driver_id && !["completed","billing_review","cancelled"].includes(j.job_status)).length,
    late:       jobs.filter(j => j.is_late).length,
    blocked:    jobs.filter(j => j.dispatch_blocked).length,
    activeDrivers: drivers.filter(d => ["on_trip","assigned","accepted","at_pickup","loaded","at_dropoff"].includes(d.status)).length,
    driversBlocked: drivers.filter(d => d.status === "blocked").length,
    pendingPay: jobs.filter(j => j.payment_status === "unpaid" && !["completed","billing_review"].includes(j.job_status)).length,
    openIssues: alerts.filter(a => ["blocked","critical"].includes(a.severity)).length,
  };

  return (
    <div className="db-root">
      {toast && <div className="db-toast">{toast}</div>}

      {/* ── Header ── */}
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">RONYX DISPATCH BOARD</h1>
          <p className="db-page-subtitle">Control tower for trips, drivers, vehicles, payments, and compliance · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="db-header-actions">
          <button type="button" onClick={loadAll} className="db-btn-ghost db-btn-sm">Refresh</button>
          <button type="button" onClick={() => {
            const rows = jobs.map(j => [j.job_number, j.customer_name, j.pickup_address, j.dropoff_address, fmtTime(j.pickup_time), j.assigned_driver_name||"", j.assigned_vehicle_number||"", j.payment_status, j.job_status].join(","));
            const blob = new Blob([["Job#,Customer,Pickup,Dropoff,Time,Driver,Vehicle,Payment,Status",...rows].join("\n")],{type:"text/csv"});
            const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`dispatch-${dateFilter}.csv`;a.click();
          }} className="db-btn-ghost db-btn-sm">Export</button>
          <button type="button" className="db-btn-primary db-btn-sm">+ New Job</button>
        </div>
      </div>

      {/* ── Command Center — 2 rows × 4 KPIs ── */}
      <div className="db-command-grid">
        {[
          { label: "Total Trips",      value: kpi.total,          dot: "#3b82f6", bg: "#eff6ff" },
          { label: "Unassigned",       value: kpi.unassigned,     dot: kpi.unassigned     ? "#dc2626" : "#16a34a", bg: kpi.unassigned     ? "#fee2e2" : "#f0fdf4" },
          { label: "Late / Risk",      value: kpi.late,           dot: kpi.late           ? "#dc2626" : "#16a34a", bg: kpi.late           ? "#fee2e2" : "#f0fdf4" },
          { label: "Blocked",          value: kpi.blocked,        dot: kpi.blocked        ? "#1e293b" : "#16a34a", bg: kpi.blocked        ? "#f1f5f9" : "#f0fdf4" },
          { label: "Active Drivers",   value: kpi.activeDrivers,  dot: "#8b5cf6", bg: "#faf5ff" },
          { label: "Drivers Blocked",  value: kpi.driversBlocked, dot: kpi.driversBlocked ? "#1e293b" : "#16a34a", bg: kpi.driversBlocked ? "#f1f5f9" : "#f0fdf4" },
          { label: "Pending Payments", value: kpi.pendingPay,     dot: kpi.pendingPay     ? "#d97706" : "#16a34a", bg: kpi.pendingPay     ? "#fef3c7" : "#f0fdf4" },
          { label: "Open Issues",      value: kpi.openIssues,     dot: kpi.openIssues     ? "#dc2626" : "#16a34a", bg: kpi.openIssues     ? "#fee2e2" : "#f0fdf4" },
        ].map(k => (
          <div key={k.label} className="db-kpi" style={{ background: k.bg }}>
            <div className="db-kpi-dot" style={{ background: k.dot }} />
            <div>
              <span className="db-kpi-label">{k.label}</span>
              <strong className="db-kpi-value" style={{ color: k.dot }}>{k.value}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert Strip ── */}
      <AlertStrip alerts={alerts} />

      {/* ── Virtual Dispatcher ── */}
      <VirtualDispatcher
        date={dateFilter}
        onAssignJob={(jobId) => {
          const j = jobs.find(x => x.id === jobId);
          if (j) setAssignTarget(j);
        }}
        onViewJob={(jobId) => {
          const j = jobs.find(x => x.id === jobId);
          if (j) setDetailTarget(j);
        }}
      />

      {/* ── Shift Readiness ── */}
      <ShiftReadiness jobs={jobs} drivers={drivers} alerts={alerts} onRefresh={loadAll} />

      {/* ── Toolbar ── */}
      <div className="db-toolbar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job #, customer, driver…" className="db-search" />
        <input value={dateFilter} type="date" onChange={e => setDateFilter(e.target.value)} className="db-date-input" />
        <select value={laneFilter} onChange={e => setLaneFilter(e.target.value as PipelineKey | "all")} className="db-lane-filter">
          <option value="all">All Stages</option>
          {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <div className="db-completed-badge">{completedToday} completed today</div>
      </div>

      {/* ── Board + Driver Panel ── */}
      <div className="db-layout">
        <div className="db-pipeline-wrap">
          {loading ? <div className="db-loading">Loading jobs…</div> : (
            <div className="db-pipeline">
              {PIPELINE.map(lane => {
                const laneJobs = jobsForLane(lane.key);
                return (
                  <div key={lane.key} className="db-lane"
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (draggedId) { moveJob(draggedId, lane.key); setDraggedId(null); } }}
                  >
                    <div className="db-lane-header" style={{ borderColor: lane.color, background: lane.bg }}>
                      <span className="db-lane-label" style={{ color: lane.color }}>{lane.label}</span>
                      <span className="db-lane-count" style={{ background: lane.color }}>{laneJobs.length}</span>
                    </div>
                    <div className="db-lane-cards">
                      {laneJobs.length === 0
                        ? <div className="db-lane-empty">Drop here</div>
                        : laneJobs.map(job => (
                            <div key={job.id} draggable onDragStart={() => setDraggedId(job.id)}>
                              <TripCard
                                job={job}
                                onAdvance={advanceJob}
                                onAssign={setAssignTarget}
                                onNote={setNoteTarget}
                                onViewDetails={setDetailTarget}
                                onIssue={setIssueTarget}
                                onComm={setCommTarget}
                              />
                            </div>
                          ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DriverPanel
          drivers={drivers}
          onBlock={setBlockDriver}
          onAssignFromPanel={(d) => {
            // If a job is selected or we open the assign workflow
            showToast(`Select a trip to assign ${d.name}`);
          }}
        />
      </div>

      {/* ── Modals ── */}
      {assignTarget  && <AssignModal job={assignTarget} drivers={drivers} onAssign={assignDriver} onClose={() => setAssignTarget(null)} />}
      {detailTarget  && <JobDetailModal job={detailTarget} onClose={() => setDetailTarget(null)} onStatusChange={async (id, s) => { await moveJob(id, s); showToast(`Status → ${s.replace(/_/g," ")}`); }} />}
      {noteTarget    && <NoteModal job={noteTarget} onClose={() => setNoteTarget(null)} onSaved={() => showToast("Note saved")} />}
      {issueTarget   && <ReportIssueModal job={issueTarget} onClose={() => setIssueTarget(null)} onSaved={() => { showToast("Issue reported"); loadAll(); }} />}
      {commTarget    && <CustomerCommModal job={commTarget} onClose={() => setCommTarget(null)} />}
      {blockDriver   && <DriverBlockModal driver={blockDriver} onClose={() => setBlockDriver(null)} />}
    </div>
  );
}
