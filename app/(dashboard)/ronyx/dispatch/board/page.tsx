"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus   = "unpaid" | "partial" | "paid" | "refunded";
type RiskLevel       = "low" | "medium" | "high" | "critical";
type Compliance      = "valid" | "expiring" | "expired";
type AlertSeverity   = "warning" | "high" | "critical" | "blocked";
type ReadinessStatus = "ready" | "needs_review" | "manager_approval" | "blocked";
type TicketStatus    = "not_scanned" | "scanned" | "ocr_review" | "approved" | "mismatch";
type NoteCategory    = "customer" | "driver" | "manager" | "payment" | "delay" | "complaint" | "internal";
type IncidentType    =
  | "driver_no_show" | "driver_late" | "truck_breakdown" | "flat_tire"
  | "overweight_load" | "pit_closed" | "job_site_closed" | "weather_delay"
  | "payment_issue" | "ticket_missing" | "customer_complaint" | "accident" | "other";

type DriverStatus =
  | "available" | "assigned" | "en_route" | "loading" | "loaded"
  | "delivering" | "off_duty" | "blocked" | "no_show";

type DispatchJob = {
  id: string;
  job_number: string;
  customer_name: string;
  project_name?: string;
  pickup_location?: string;
  delivery_location?: string;
  pickup_time?: string;
  material?: string;
  load_pay?: number;
  billing_rate?: number;
  payment_status: PaymentStatus;
  payment_hold?: boolean;
  job_status: string;
  risk_level: RiskLevel;
  assigned_driver_id?: string;
  assigned_driver_name?: string;
  assigned_driver_phone?: string;
  assigned_truck_id?: string;
  assigned_truck_number?: string;
  driver_compliance?: "clear" | "expiring" | "blocked";
  truck_compliance?: "clear" | "expiring" | "blocked";
  oo_compliance?: "clear" | "expiring" | "blocked" | "na";
  driver_block_reason?: string;
  truck_block_reason?: string;
  oo_block_reason?: string;
  ticket_status?: TicketStatus;
  ticket_number?: string;
  dispatch_blocked?: boolean;
  block_reasons?: string[];
  is_late?: boolean;
  missing_rate?: boolean;
  po_number?: string;
  acceptance_status?: string | null;
  sent_at?: string | null;
  no_response?: boolean;
  // legacy compat
  pickup_address?: string;
  dropoff_address?: string;
  customer_phone?: string;
  customer_email?: string;
  special_instructions?: string;
  special_instructions_ack?: boolean;
  assigned_vehicle_number?: string;
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

type GuardStatus = "CLEAR" | "WARNING" | "BLOCKED" | "OVERRIDE_REQUESTED" | "OVERRIDE_APPROVED";
type GuardCheck  = { name: string; status: "pass" | "warn" | "fail"; detail?: string };
type GuardJobResult = { job: DispatchJob; status: GuardStatus; checks: GuardCheck[] };


// ─── Pipeline ─────────────────────────────────────────────────────────────────

const PIPELINE = [
  { key: "needs_review",       label: "Needs Review",       color: "#94a3b8", bg: "#f8fafc" },
  { key: "missing_info",       label: "Missing Info",        color: "#f97316", bg: "#fff7ed" },
  { key: "ready_to_dispatch",  label: "Ready to Dispatch",   color: "#f59e0b", bg: "#fef3c7" },
  { key: "smart_assigned",     label: "Smart Assigned",      color: "#3b82f6", bg: "#eff6ff" },
  { key: "driver_accepted",    label: "Driver Accepted",     color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "en_route",           label: "En Route",            color: "#f97316", bg: "#fff7ed" },
  { key: "loading",            label: "Loading",             color: "#eab308", bg: "#fefce8" },
  { key: "loaded",             label: "Loaded",              color: "#06b6d4", bg: "#ecfeff" },
  { key: "delivered",          label: "Delivered",           color: "#14b8a6", bg: "#f0fdfa" },
  { key: "ticket_needed",      label: "Ticket Needed",       color: "#dc2626", bg: "#fee2e2" },
  { key: "ready_for_payroll",  label: "Ready for Payroll",   color: "#7c3aed", bg: "#faf5ff" },
  { key: "ready_for_billing",  label: "Ready for Billing",   color: "#0891b2", bg: "#ecfeff" },
  { key: "completed",          label: "Completed",           color: "#16a34a", bg: "#f0fdf4" },
  { key: "blocked",            label: "Blocked",             color: "#1e293b", bg: "#f1f5f9" },
] as const;

type PipelineKey = typeof PIPELINE[number]["key"];

const NEXT_STATUS: Partial<Record<string, string>> = {
  needs_review:      "ready_to_dispatch",
  missing_info:      "needs_review",
  ready_to_dispatch: "smart_assigned",
  smart_assigned:    "driver_accepted",
  driver_accepted:   "en_route",
  en_route:          "loading",
  loading:           "loaded",
  loaded:            "delivered",
  delivered:         "ticket_needed",
  ticket_needed:     "ready_for_payroll",
  ready_for_payroll: "ready_for_billing",
  ready_for_billing: "completed",
};
const NEXT_LABEL: Partial<Record<string, string>> = {
  needs_review:      "Mark Ready",
  missing_info:      "Info Added",
  ready_to_dispatch: "Smart Assign",
  smart_assigned:    "Mark Accepted",
  driver_accepted:   "En Route",
  en_route:          "At Pit — Loading",
  loading:           "Loaded",
  loaded:            "Mark Delivered",
  delivered:         "Ticket Needed",
  ticket_needed:     "Ticket Scanned ✓",
  ready_for_payroll: "Move to Billing",
  ready_for_billing: "Complete Job",
};

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: "driver_no_show",    label: "Driver No Show" },
  { value: "driver_late",       label: "Driver Late" },
  { value: "truck_breakdown",   label: "Truck Breakdown" },
  { value: "flat_tire",         label: "Flat Tire" },
  { value: "overweight_load",   label: "Overweight Load" },
  { value: "pit_closed",        label: "Pit / Quarry Closed" },
  { value: "job_site_closed",   label: "Job Site Closed" },
  { value: "weather_delay",     label: "Weather Delay" },
  { value: "payment_issue",     label: "Payment Issue" },
  { value: "ticket_missing",    label: "Ticket Missing" },
  { value: "customer_complaint",label: "Customer Complaint" },
  { value: "accident",          label: "Accident" },
  { value: "other",             label: "Other" },
];

const NOTE_CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: "internal",  label: "Internal" },
  { value: "customer",  label: "Customer" },
  { value: "driver",    label: "Driver" },
  { value: "manager",   label: "Manager" },
  { value: "payment",   label: "Payment" },
  { value: "delay",     label: "Delay" },
  { value: "complaint", label: "Complaint" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function minutesAgo(ts?: string | null) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}
function minsUntil(ts?: string | null) {
  if (!ts) return null;
  return Math.floor((new Date(ts).getTime() - Date.now()) / 60000);
}

function payBadge(s: PaymentStatus, hold?: boolean) {
  if (hold)          return { bg: "#fee2e2", text: "#dc2626" };
  if (s === "paid")  return { bg: "#dcfce7", text: "#15803d" };
  if (s === "partial") return { bg: "#fef9c3", text: "#92400e" };
  return { bg: "#fee2e2", text: "#dc2626" };
}
function complianceDot(c?: string) {
  if (!c || c === "clear" || c === "valid") return "#16a34a";
  if (c === "expiring") return "#d97706";
  return "#dc2626";
}
function ticketBadge(t?: TicketStatus) {
  if (!t || t === "not_scanned") return { bg: "#fee2e2", text: "#dc2626", label: "No Ticket" };
  if (t === "scanned" || t === "approved") return { bg: "#f0fdf4", text: "#15803d", label: "Scanned ✓" };
  if (t === "ocr_review") return { bg: "#fef3c7", text: "#92400e", label: "OCR Review" };
  if (t === "mismatch") return { bg: "#fee2e2", text: "#dc2626", label: "Mismatch" };
  return { bg: "#f1f5f9", text: "#64748b", label: t };
}

function computeReadiness(job: DispatchJob): { status: ReadinessStatus; score: number; reasons: string[] } {
  const hard: string[] = [], soft: string[] = [], review: string[] = [];
  if (job.driver_compliance === "blocked") hard.push(job.driver_block_reason || "Driver compliance blocked");
  if (job.truck_compliance   === "blocked") hard.push(job.truck_block_reason  || "Truck compliance blocked");
  if (job.oo_compliance      === "blocked") hard.push(job.oo_block_reason     || "Owner operator COI missing");
  if (job.payment_hold || job.payment_status === "unpaid") soft.push("Payment hold / unpaid");
  if (job.missing_rate) soft.push("Payroll rate missing");
  if (!job.pickup_location && !job.pickup_address) review.push("No pickup location");
  if (!job.assigned_driver_id) review.push("No driver assigned");
  if (job.dispatch_blocked && job.block_reasons?.length)
    hard.push(...job.block_reasons.filter(r => !hard.includes(r)));

  const score = Math.max(0, 100 - hard.length * 25 - soft.length * 15 - review.length * 10 - (job.is_late ? 20 : 0));
  if (hard.length)   return { status: "blocked",          score, reasons: hard };
  if (soft.length)   return { status: "manager_approval", score, reasons: soft };
  if (review.length) return { status: "needs_review",     score, reasons: review };
  return { status: "ready", score: Math.min(100, score), reasons: [] };
}

const READINESS_CFG: Record<ReadinessStatus, { label: string; bg: string; text: string; border: string }> = {
  ready:            { label: "Ready",            bg: "#f0fdf4", text: "#15803d", border: "#16a34a" },
  needs_review:     { label: "Needs Review",     bg: "#fef9c3", text: "#92400e", border: "#f59e0b" },
  manager_approval: { label: "Manager Approval", bg: "#fff7ed", text: "#c2410c", border: "#ea580c" },
  blocked:          { label: "Blocked",          bg: "#1e293b", text: "#f8fafc", border: "#1e293b" },
};

// ─── Dispatch Guard™ ─────────────────────────────────────────────────────────

function runGuardChecks(job: DispatchJob): GuardJobResult {
  const checks: GuardCheck[] = [];

  // 1. Driver compliance
  checks.push({
    name: "Driver Compliance",
    status: job.driver_compliance === "blocked" ? "fail" : job.driver_compliance === "expiring" ? "warn" : "pass",
    detail: job.driver_block_reason || undefined,
  });

  // 2. Truck compliance
  checks.push({
    name: "Truck Compliance",
    status: job.truck_compliance === "blocked" ? "fail" : job.truck_compliance === "expiring" ? "warn" : "pass",
    detail: job.truck_block_reason || undefined,
  });

  // 3. Owner operator COI
  checks.push({
    name: "Owner Operator COI",
    status: job.oo_compliance === "blocked" ? "fail" : job.oo_compliance === "expiring" ? "warn" : "pass",
    detail: job.oo_block_reason || undefined,
  });

  // 4+5. Customer requirements + Payment holds
  const payBlocked = job.payment_hold || job.payment_status === "unpaid";
  checks.push({
    name: "Customer Payment / Hold",
    status: payBlocked ? "fail" : "pass",
    detail: job.payment_hold ? "Payment hold active" : job.payment_status === "unpaid" ? "Balance unpaid" : undefined,
  });

  // 6. Missing job / project fields
  const missing: string[] = [];
  if (!job.pickup_location && !job.pickup_address)   missing.push("pickup location");
  if (!job.delivery_location && !job.dropoff_address) missing.push("delivery location");
  if (!job.material)     missing.push("material");
  if (!job.project_name) missing.push("project name");
  checks.push({
    name: "Job / Project Fields",
    status: missing.length >= 2 ? "fail" : missing.length === 1 ? "warn" : "pass",
    detail: missing.length ? `Missing: ${missing.join(", ")}` : undefined,
  });

  // 7. Payroll rate
  checks.push({
    name: "Payroll Rate",
    status: !job.load_pay || job.missing_rate ? "warn" : "pass",
    detail: !job.load_pay ? "Load pay not set" : undefined,
  });

  // 8. Billing rate
  checks.push({
    name: "Billing Rate",
    status: !job.billing_rate ? "warn" : "pass",
    detail: !job.billing_rate ? "Billing rate not set" : undefined,
  });

  // 9. Ticket requirements (only matters post-delivery)
  const needsTicket = ["delivered","ticket_needed","ready_for_payroll","ready_for_billing","completed"].includes(job.job_status);
  const hasTicket   = !!job.ticket_status && ["scanned","approved"].includes(job.ticket_status);
  checks.push({
    name: "Ticket Requirements",
    status: needsTicket && !hasTicket ? "fail" : "pass",
    detail: needsTicket && !hasTicket ? "Ticket not scanned / approved" : undefined,
  });

  // 10. Maintenance issues
  const maintenanceIssue = !!(job.truck_block_reason && /maintenanc|inspection|out.of.service/i.test(job.truck_block_reason));
  checks.push({
    name: "Maintenance",
    status: maintenanceIssue ? "fail" : "pass",
    detail: maintenanceIssue ? job.truck_block_reason ?? undefined : undefined,
  });

  const fails = checks.filter(c => c.status === "fail").length;
  // Soft amber warnings (expiring-soon) no longer flag a job — only hard fails block.
  const status: GuardStatus = fails > 0 ? "BLOCKED" : "CLEAR";
  return { job, status, checks };
}

const GUARD_CFG: Record<GuardStatus, { bg: string; text: string; border: string; label: string }> = {
  CLEAR:              { bg: "#f0fdf4", text: "#15803d", border: "#16a34a", label: "CLEAR" },
  WARNING:            { bg: "#fef3c7", text: "#92400e", border: "#f59e0b", label: "WARNING" },
  BLOCKED:            { bg: "#1e293b", text: "#f8fafc", border: "#1e293b", label: "BLOCKED" },
  OVERRIDE_REQUESTED: { bg: "#eff6ff", text: "#1d4ed8", border: "#3b82f6", label: "OVERRIDE REQUESTED" },
  OVERRIDE_APPROVED:  { bg: "#f0fdf4", text: "#15803d", border: "#16a34a", label: "OVERRIDE APPROVED" },
};

function DispatchGuardPanel({ jobs, onClose }: { jobs: DispatchJob[]; onClose: () => void }) {
  const [overrides, setOverrides] = useState<Record<string, "requested" | "approved">>({});

  const activeJobs = jobs.filter(j => !["completed","ready_for_billing"].includes(j.job_status));
  const results: GuardJobResult[] = activeJobs.map(j => {
    const r = runGuardChecks(j);
    if (overrides[j.id] === "approved")  return { ...r, status: "OVERRIDE_APPROVED"  as GuardStatus };
    if (overrides[j.id] === "requested") return { ...r, status: "OVERRIDE_REQUESTED" as GuardStatus };
    return r;
  });

  const summary = {
    clear:    results.filter(r => r.status === "CLEAR").length,
    warning:  results.filter(r => r.status === "WARNING").length,
    blocked:  results.filter(r => r.status === "BLOCKED").length,
    override: results.filter(r => ["OVERRIDE_REQUESTED","OVERRIDE_APPROVED"].includes(r.status)).length,
  };

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal db-modal-wide" style={{ maxWidth: 680, maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ marginBottom: 14 }}>
          <p className="db-modal-sub">Dispatch Command Center™</p>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>🛡</span> Dispatch Guard™
          </h2>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Pre-dispatch protection that checks every job before it goes out.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { label: "CLEAR",    count: summary.clear,    bg: "#f0fdf4", text: "#15803d" },
            { label: "BLOCKED",  count: summary.blocked,  bg: "#fee2e2", text: "#dc2626" },
            { label: "OVERRIDE", count: summary.override, bg: "#eff6ff", text: "#1d4ed8" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.text }}>{s.count}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: s.text, letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "24px 0" }}>No active jobs to evaluate.</div>
        )}

        {results.map(r => {
          const gc    = GUARD_CFG[r.status];
          const fails = r.checks.filter(c => c.status === "fail");
          return (
            <div key={r.job.id} style={{ border: `1.5px solid ${gc.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
              <div style={{ background: gc.bg, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <span style={{ fontWeight: 800, color: gc.text, fontSize: 12 }}>
                    #{r.job.job_number} · {r.job.customer_name}
                  </span>
                  {r.job.project_name && (
                    <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>{r.job.project_name}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999,
                    background: r.status === "BLOCKED" ? "#dc2626" : r.status === "WARNING" ? "#f59e0b" : r.status === "CLEAR" ? "#16a34a" : "#3b82f6",
                    color: "#fff",
                  }}>{gc.label}</span>
                  {r.status === "BLOCKED" && (
                    <button type="button"
                      onClick={() => setOverrides(p => ({ ...p, [r.job.id]: "requested" }))}
                      style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
                    >Request Override</button>
                  )}
                  {r.status === "OVERRIDE_REQUESTED" && (
                    <button type="button"
                      onClick={() => setOverrides(p => ({ ...p, [r.job.id]: "approved" }))}
                      style={{ fontSize: 10, padding: "3px 10px", borderRadius: 6, background: "#16a34a", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}
                    >Approve Override</button>
                  )}
                </div>
              </div>

              {fails.length > 0 && (
                <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                  {fails.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: 11 }}>
                      <span style={{ color: "#dc2626", fontWeight: 800, flexShrink: 0, minWidth: 70 }}>
                        ✕ BLOCKED
                      </span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>{c.name}</span>
                      {c.detail && <span style={{ color: "#64748b" }}>— {c.detail}</span>}
                    </div>
                  ))}
                </div>
              )}

              {r.status === "CLEAR" && (
                <div style={{ padding: "6px 14px", fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                  ✓ All checks passed — cleared for dispatch
                </div>
              )}
              {r.status === "OVERRIDE_APPROVED" && (
                <div style={{ padding: "6px 14px", fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                  ✓ Override approved by manager — cleared to dispatch
                </div>
              )}
            </div>
          );
        })}

        <div className="db-modal-footer">
          <button type="button" onClick={onClose} className="db-btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Virtual Dispatcher ───────────────────────────────────────────────────────

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
  assigned_role?: string;
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
type VDEod   = { missing_proof: number; pending_payroll: number; open_incidents: number; drivers_expiring_soon: number; total_issues: number };
type VDOwner = { total_trips: number; completed: number; late: number; at_risk: number; pending_payment_count: number; driver_issues: number; vehicle_issues: number; blocked_revenue?: number; recommended_followups: string[] };
type VDData  = { priority_actions: VDAction[]; driver_recommendations: VDDriverRec[]; eod_summary: VDEod; owner_summary: VDOwner; last_updated: string };

const VD_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#1e293b", text: "#f8fafc" },
  high:     { bg: "#7c2d12", text: "#fed7aa" },
  warning:  { bg: "#78350f", text: "#fde68a" },
};

function VirtualDispatcher({ date, defaultTab = "actions", onAssignJob, onViewJob }: {
  date: string;
  defaultTab?: "actions" | "recs" | "eod" | "owner";
  onAssignJob: (jobId: string) => void;
  onViewJob:   (jobId: string) => void;
}) {
  const [data,    setData]    = useState<VDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(true);
  const [tab,     setTab]     = useState<"actions" | "recs" | "eod" | "owner">(defaultTab);
  // Header buttons (⚡ Smart Assign / End of Day Review / Owner View) change defaultTab —
  // re-sync the panel's active tab and expand it so those buttons actually switch the view.
  useEffect(() => { setTab(defaultTab); setOpen(true); }, [defaultTab]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/ronyx/virtual-dispatcher?date=${date}`);
      const d   = await res.json();
      setData(d);
    } catch { /* keep stale */ }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 2 * 60 * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);

  function handleAction(act: VDAction, btn: VDActionButton) {
    if (btn.href)                                   { window.location.href = btn.href; return; }
    if (btn.action === "assign_driver" && act.job_id) { onAssignJob(act.job_id); return; }
    if (btn.action === "view_job"      && act.job_id) { onViewJob(act.job_id);   return; }
  }

  const criticalCount = data?.priority_actions.filter(a => a.badge === "critical").length ?? 0;
  const totalActions  = data?.priority_actions.length ?? 0;
  const eodIssues     = data?.eod_summary.total_issues ?? 0;

  return (
    <div className="vd-panel">
      <div className="vd-header" onClick={() => setOpen(o => !o)}>
        <div className="vd-header-left">
          <span className="vd-icon">⚡</span>
          <div>
            <span className="vd-title">DO THIS FIRST™ — COMMAND CENTER INTELLIGENCE</span>
            <span className="vd-subtitle">
              {loading ? "Analyzing board…" : data ? `Updated ${new Date(data.last_updated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Monitoring dispatch board"}
            </span>
          </div>
        </div>
        <div className="vd-header-right">
          {criticalCount > 0 && <span className="vd-badge critical">{criticalCount} CRITICAL</span>}
          {totalActions > criticalCount && <span className="vd-badge high">{totalActions - criticalCount} HIGH</span>}
          {eodIssues > 0 && <span className="vd-badge warning">EOD: {eodIssues}</span>}
          <button type="button" onClick={e => { e.stopPropagation(); load(); }} className="vd-refresh">↻</button>
          <span className="vd-toggle">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <>
          <div className="vd-tabs">
            {([
              { key: "actions", label: "Do This First™", count: totalActions },
              { key: "recs",    label: "Smart Assign",   count: data?.driver_recommendations.length ?? 0 },
              { key: "eod",     label: "End of Day",     count: eodIssues },
              { key: "owner",   label: "Owner View",     count: 0 },
            ] as const).map(t => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`vd-tab ${tab === t.key ? "active" : ""}`}>
                {t.label}
                {t.count > 0 && <span className="vd-tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* Do This First */}
          {tab === "actions" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Scanning board for blockers…</div>}
              {!loading && (!data || data.priority_actions.length === 0) && (
                <div className="vd-clear">✅ All clear — no blocked dispatches, missing tickets, or payment issues.</div>
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
                        {act.assigned_role && (
                          <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                            Assigned to: <strong style={{ color: "#1e293b" }}>{act.assigned_role}</strong>
                          </div>
                        )}
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

          {/* Smart Assign */}
          {tab === "recs" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Scoring drivers by compliance, location, and availability…</div>}
              {!loading && (!data || data.driver_recommendations.length === 0) && (
                <div className="vd-clear">✓ All jobs have drivers assigned</div>
              )}
              {!loading && data && data.driver_recommendations.map((rec, i) => (
                <div key={i} className="vd-rec-row">
                  <div className="vd-rec-trip">
                    <span className="vd-rec-job">#{rec.job_number}</span>
                    <span className="vd-rec-customer">{rec.customer_name}</span>
                    <span className="vd-rec-time">{rec.mins_until > 0 ? `${rec.mins_until} min` : "Dispatch time passed"}</span>
                  </div>
                  <div className="vd-rec-driver-block">
                    {rec.recommended_driver ? (
                      <>
                        <div className="vd-rec-best">
                          <span className="vd-rec-star">⭐</span>
                          <div>
                            <span className="vd-rec-dname">{rec.recommended_driver.name}</span>
                            <span className="vd-rec-score">{rec.recommended_driver.score}% match</span>
                            <span className="vd-rec-dreason">{rec.recommended_driver.reasons.join(" · ")}</span>
                          </div>
                          <button type="button" onClick={() => onAssignJob(rec.job_id)} className="vd-assign-btn">
                            Assign {rec.recommended_driver.name.split(" ")[0]}
                          </button>
                        </div>
                        {rec.alternatives.length > 0 && (
                          <div className="vd-rec-alts">Also available: {rec.alternatives.map(a => a.name).join(", ")}</div>
                        )}
                      </>
                    ) : (
                      <span className="vd-rec-none">No available compliant driver — check compliance and availability</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* End of Day */}
          {tab === "eod" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Checking end-of-day status…</div>}
              {!loading && data && (
                <>
                  {data.eod_summary.total_issues === 0
                    ? <div className="vd-clear">✓ End of day is clean — all jobs have tickets, payroll, and billing ready</div>
                    : (
                      <div className="vd-eod-grid">
                        {[
                          { label: "Missing Tickets",        count: data.eod_summary.missing_proof,         ok: data.eod_summary.missing_proof         === 0, href: "/ronyx/tickets" },
                          { label: "Payroll Not Ready",      count: data.eod_summary.pending_payroll,       ok: data.eod_summary.pending_payroll       === 0, href: "/ronyx/payroll" },
                          { label: "Open Incidents",         count: data.eod_summary.open_incidents,        ok: data.eod_summary.open_incidents        === 0, href: undefined },
                          { label: "Compliance Expiring",    count: data.eod_summary.drivers_expiring_soon, ok: data.eod_summary.drivers_expiring_soon === 0, href: "/ronyx/hr-compliance" },
                        ].map(item => (
                          <div key={item.label} className={`vd-eod-item ${item.ok ? "ok" : "pending"}`}>
                            <span className="vd-eod-icon">{item.ok ? "✓" : "✗"}</span>
                            <div className="vd-eod-info">
                              <span className="vd-eod-label">{item.label}</span>
                              {!item.ok && <span className="vd-eod-count">{item.count} remaining</span>}
                            </div>
                            {!item.ok && item.href && <a href={item.href} className="vd-eod-btn">Review</a>}
                          </div>
                        ))}
                      </div>
                    )
                  }
                  <div className="vd-eod-export">
                    <button type="button" className="vd-eod-export-btn" onClick={() => {
                      if (!data) return;
                      const s = data.eod_summary;
                      const lines = [
                        `End-of-Day Report — ${new Date().toLocaleString()}`, "",
                        `Missing Tickets: ${s.missing_proof}`,
                        `Payroll Not Ready: ${s.pending_payroll}`,
                        `Open Incidents: ${s.open_incidents}`,
                        `Compliance Expiring: ${s.drivers_expiring_soon}`,
                      ];
                      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                      a.download = `eod-${new Date().toISOString().slice(0,10)}.txt`; a.click();
                    }}>Export EOD Report</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Owner View */}
          {tab === "owner" && (
            <div className="vd-body">
              {loading && <div className="vd-loading">Building owner summary…</div>}
              {!loading && data && (
                <>
                  <div className="vd-owner-grid">
                    {[
                      { label: "Total Jobs",       value: data.owner_summary.total_trips,            ok: true },
                      { label: "Completed",        value: data.owner_summary.completed,              ok: true },
                      { label: "Late Jobs",        value: data.owner_summary.late,                   ok: data.owner_summary.late                   === 0 },
                      { label: "At Risk",          value: data.owner_summary.at_risk,                ok: data.owner_summary.at_risk                === 0 },
                      { label: "Payment Pending",  value: data.owner_summary.pending_payment_count,  ok: data.owner_summary.pending_payment_count  === 0 },
                      { label: "Driver Issues",    value: data.owner_summary.driver_issues,          ok: data.owner_summary.driver_issues          === 0 },
                      { label: "Truck Issues",     value: data.owner_summary.vehicle_issues,         ok: data.owner_summary.vehicle_issues         === 0 },
                    ].map(k => (
                      <div key={k.label} className={`vd-owner-kpi ${k.ok ? "ok" : "warn"}`}>
                        <span className="vd-owner-val" style={{ color: k.ok ? "#16a34a" : "#dc2626" }}>{k.value}</span>
                        <span className="vd-owner-label">{k.label}</span>
                      </div>
                    ))}
                  </div>
                  {data.owner_summary.blocked_revenue != null && data.owner_summary.blocked_revenue > 0 && (
                    <div style={{ margin: "10px 0", padding: "10px 14px", background: "#fee2e2", borderRadius: 8, border: "1px solid #fca5a5" }}>
                      <div style={{ fontWeight: 800, color: "#dc2626", fontSize: 13 }}>
                        Blocked Revenue: ${data.owner_summary.blocked_revenue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: "#7f1d1d", marginTop: 2 }}>
                        Jobs cannot bill until missing tickets are scanned and approved.
                      </div>
                    </div>
                  )}
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

// ─── Do This First™ (local priority panel, supplements VD) ───────────────────

type PriorityAction = {
  badge: "critical" | "high" | "warning";
  title: string;
  role: string;
  actionLabel: string;
  href?: string;
  onAction?: () => void;
};

function DoThisFirst({ jobs, drivers, alerts }: { jobs: DispatchJob[]; drivers: DispatchDriver[]; alerts: DispatchAlert[] }) {
  const [open, setOpen] = useState(true);

  const items: PriorityAction[] = [];

  // Blocked drivers on active jobs
  for (const j of jobs) {
    if (j.driver_compliance === "blocked" && !["completed","ready_for_billing","blocked"].includes(j.job_status)) {
      items.push({ badge: "critical", title: `Driver blocked — ${j.driver_block_reason || "compliance issue"} · Job #${j.job_number}`, role: "Compliance Admin", actionLabel: "Review Driver", href: "/ronyx/hr-compliance" });
    }
    if (j.truck_compliance === "blocked" && !["completed","ready_for_billing","blocked"].includes(j.job_status)) {
      items.push({ badge: "critical", title: `Truck blocked — ${j.truck_block_reason || "inspection/insurance missing"} · Job #${j.job_number}`, role: "Fleet Admin", actionLabel: "Fix Truck", href: "/ronyx/fleet" });
    }
    if (j.oo_compliance === "blocked") {
      items.push({ badge: "critical", title: `Owner operator COI missing · Job #${j.job_number}`, role: "Compliance Admin", actionLabel: "Upload COI", href: "/ronyx/hr-compliance" });
    }
  }

  // Blocked drivers (no active job)
  for (const d of drivers.filter(dr => dr.status === "blocked")) {
    items.push({ badge: "high", title: `${d.name} blocked — ${d.block_reasons[0] || "compliance issue"}`, role: "Compliance Admin", actionLabel: "Review Driver", href: "/ronyx/hr-compliance" });
  }

  // Payment holds on near-dispatch jobs
  for (const j of jobs) {
    if ((j.payment_hold || j.payment_status === "unpaid") && ["ready_to_dispatch","smart_assigned"].includes(j.job_status)) {
      items.push({ badge: "high", title: `Payment hold — cannot dispatch Job #${j.job_number} · ${j.customer_name}`, role: "Billing", actionLabel: "Review Balance", href: "/ronyx/billing" });
    }
  }

  // Missing tickets on delivered jobs
  const missingTickets = jobs.filter(j => ["delivered","ticket_needed"].includes(j.job_status) && (!j.ticket_status || j.ticket_status === "not_scanned"));
  if (missingTickets.length > 0) {
    items.push({ badge: "high", title: `${missingTickets.length} delivered job${missingTickets.length > 1 ? "s" : ""} missing ticket scan`, role: "Office Admin", actionLabel: "Scan Tickets", href: "/ronyx/tickets?tab=fastscan" });
  }

  // OCR review needed
  const ocrReview = jobs.filter(j => j.ticket_status === "ocr_review");
  if (ocrReview.length > 0) {
    items.push({ badge: "warning", title: `${ocrReview.length} ticket${ocrReview.length > 1 ? "s" : ""} need OCR review`, role: "Office Admin", actionLabel: "Review Tickets", href: "/ronyx/tickets" });
  }

  // Missing rates
  for (const j of jobs.filter(j => j.missing_rate && !["completed","blocked"].includes(j.job_status))) {
    items.push({ badge: "warning", title: `Payroll rate missing · Job #${j.job_number}`, role: "Payroll Admin", actionLabel: "Set Rate", href: "/ronyx/payroll" });
  }

  // Unassigned near-dispatch
  for (const j of jobs) {
    if (!j.assigned_driver_id && j.job_status === "ready_to_dispatch") {
      const mins = minsUntil(j.pickup_time);
      if (mins != null && mins <= 60 && mins > 0) {
        items.push({ badge: mins <= 20 ? "critical" : "high", title: `Unassigned job #${j.job_number} dispatches in ${mins} min`, role: "Dispatcher", actionLabel: "Assign Driver" });
      }
    }
  }

  // High-severity alerts
  for (const a of alerts.filter(al => ["blocked","critical"].includes(al.severity)).slice(0, 3)) {
    items.push({ badge: "critical", title: a.message, role: "Dispatcher", actionLabel: "Review" });
  }

  // Soft amber "warning" items (OCR-review nudge, missing-rate) are intentionally
  // dropped — the board shows only blockers and time-critical/high items.
  const sorted = items.filter(it => it.badge !== "warning").sort((a, b) => {
    const o: Record<string, number> = { critical: 3, high: 2, warning: 1 };
    return (o[b.badge] ?? 0) - (o[a.badge] ?? 0);
  }).slice(0, 8);

  const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
    critical: { bg: "#1e293b", text: "#f8fafc" },
    high:     { bg: "#b91c1c", text: "#fef2f2" },
    warning:  { bg: "#d97706", text: "#fefce8" },
  };

  if (sorted.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 18px", marginBottom: 14 }}>
      <span style={{ fontSize: 18 }}>✅</span>
      <span style={{ fontWeight: 700, color: "#15803d", fontSize: 13 }}>All clear — no blocked dispatches, missing tickets, or payment issues.</span>
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "#1e293b", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🚨</span>
          <span style={{ fontWeight: 900, color: "#f8fafc", fontSize: 13, letterSpacing: "0.05em" }}>DO THIS FIRST™</span>
          <span style={{ background: "#dc2626", color: "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800 }}>{sorted.length}</span>
        </div>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </div>
      {open && (
        <ol style={{ margin: 0, padding: "8px 0", listStyle: "none" }}>
          {sorted.map((item, i) => {
            const bs = BADGE_STYLE[item.badge];
            return (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", borderBottom: i < sorted.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: bs.bg, color: bs.text, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 12 }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>Assigned to: <strong>{item.role}</strong></div>
                </div>
                {item.href
                  ? <a href={item.href} style={{ padding: "4px 12px", borderRadius: 6, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 10, textDecoration: "none", whiteSpace: "nowrap" }}>{item.actionLabel}</a>
                  : <button type="button" style={{ padding: "4px 12px", borderRadius: 6, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: 10, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>{item.actionLabel}</button>
                }
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ─── Alert Strip ──────────────────────────────────────────────────────────────

function AlertStrip({ alerts: allAlerts }: { alerts: DispatchAlert[] }) {
  const [collapsed, setCollapsed] = useState(false);
  // Soft amber "warning"-severity alerts are filtered out — only blocked/critical/high
  // (the ones that actually stop or threaten a dispatch) reach the board.
  const alerts = allAlerts.filter(a => a.severity !== "warning");
  if (alerts.length === 0) return null;
  const counts = {
    blocked:  alerts.filter(a => a.severity === "blocked").length,
    critical: alerts.filter(a => a.severity === "critical").length,
    high:     alerts.filter(a => a.severity === "high").length,
    warning:  alerts.filter(a => a.severity === "warning").length,
  };
  const sevClass: Record<AlertSeverity, string> = { blocked: "sev-blocked", critical: "sev-critical", high: "sev-high", warning: "sev-warning" };
  const sevLabel: Record<AlertSeverity, string> = { blocked: "BLOCKED", critical: "CRITICAL", high: "HIGH", warning: "WARN" };

  const ALERT_ACTIONS: Partial<Record<string, { label: string; href?: string }[]>> = {
    medical_card_expired:       [{ label: "View HR",      href: "/ronyx/hr-compliance" }],
    cdl_expired:                [{ label: "View HR",      href: "/ronyx/hr-compliance" }],
    driver_dispatch_blocked:    [{ label: "View HR",      href: "/ronyx/hr-compliance" }],
    vehicle_out_of_service:     [{ label: "Maintenance",  href: "/ronyx/maintenance" }],
    vehicle_inspection_expired: [{ label: "Maintenance",  href: "/ronyx/maintenance" }],
    vehicle_insurance_expired:  [{ label: "Maintenance",  href: "/ronyx/maintenance" }],
    coi_missing:                [{ label: "Upload COI",   href: "/ronyx/hr-compliance" }],
    ticket_missing:             [{ label: "Scan Ticket",  href: "/ronyx/tickets?tab=fastscan" }],
    payment_hold:               [{ label: "Review Billing", href: "/ronyx/billing" }],
  };

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
                  {actions.map(act => act.href
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

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onAdvance, onAssign, onNote, onViewDetails, onIssue, onScanTicket }: {
  job:           DispatchJob;
  onAdvance:     (job: DispatchJob) => void;
  onAssign:      (job: DispatchJob) => void;
  onNote:        (job: DispatchJob) => void;
  onViewDetails: (job: DispatchJob) => void;
  onIssue:       (job: DispatchJob) => void;
  onScanTicket:  (job: DispatchJob) => void;
}) {
  const readiness = computeReadiness(job);
  const rc        = READINESS_CFG[readiness.status];
  const next      = NEXT_STATUS[job.job_status];
  const nextLabel = NEXT_LABEL[job.job_status];
  const pay       = payBadge(job.payment_status, job.payment_hold);
  const tb        = ticketBadge(job.ticket_status);
  const minsAgo   = minutesAgo(job.sent_at);

  const dDot = complianceDot(job.driver_compliance);
  const tDot = complianceDot(job.truck_compliance);
  const oDot = job.oo_compliance && job.oo_compliance !== "na" ? complianceDot(job.oo_compliance) : null;

  return (
    <div className="db-trip-card" style={{ borderLeft: `3px solid ${rc.border}` }}>
      {/* Header */}
      <div className="db-card-head">
        <div className="db-card-head-left">
          <span className="db-card-num">#{job.job_number || job.id.slice(0, 6)}</span>
          {job.is_late && <span style={{ fontSize: 9, fontWeight: 800, background: "#1e293b", color: "#f8fafc", borderRadius: 4, padding: "2px 6px" }}>LATE</span>}
        </div>
        <span className="db-card-time">{fmtDate(job.pickup_time)}</span>
      </div>

      {/* Customer + Project */}
      <div className="db-card-customer">{job.customer_name || "Unknown Customer"}</div>
      {job.project_name && <div style={{ fontSize: 10, color: "#64748b", margin: "-2px 0 4px" }}>{job.project_name}</div>}

      {/* Route */}
      <div className="db-card-route">
        <div className="db-route-row">
          <span className="db-route-up">⛏</span>
          <span>{job.pickup_location || job.pickup_address || <em className="db-missing">No pit / quarry</em>}</span>
        </div>
        <div className="db-route-row">
          <span className="db-route-dn">📍</span>
          <span>{job.delivery_location || job.dropoff_address || <span className="db-route-dim">No job site</span>}</span>
        </div>
      </div>

      {/* Material */}
      {job.material && (
        <div style={{ fontSize: 10, color: "#475569", background: "#f8fafc", borderRadius: 4, padding: "3px 7px", margin: "4px 0", display: "inline-block", fontWeight: 600 }}>
          {job.material}
        </div>
      )}

      {/* Driver + Truck */}
      <div className="db-card-assignment">
        <div className="db-assign-row">
          <span className="db-assign-label">Driver:</span>
          <span className={job.assigned_driver_name ? "db-assign-val" : "db-assign-missing"}>
            {job.assigned_driver_name || "Not Assigned"}
          </span>
        </div>
        <div className="db-assign-row">
          <span className="db-assign-label">Truck:</span>
          <span className={job.assigned_truck_number ? "db-assign-val" : "db-assign-missing"}>
            {job.assigned_truck_number || job.assigned_vehicle_number || "Not Assigned"}
          </span>
        </div>
        {(job.load_pay || job.billing_rate) && (
          <div className="db-assign-row">
            <span className="db-assign-label">Rates:</span>
            <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>
              {job.load_pay ? `Pay $${job.load_pay}/load` : ""}{job.load_pay && job.billing_rate ? " · " : ""}{job.billing_rate ? `Bill $${job.billing_rate}/load` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Compliance strip */}
      <div style={{ display: "flex", gap: 5, margin: "6px 0", flexWrap: "wrap" }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: dDot === "#16a34a" ? "#f0fdf4" : dDot === "#d97706" ? "#fef3c7" : "#fee2e2", color: dDot }}>
          Driver {dDot === "#16a34a" ? "✓ Clear" : dDot === "#d97706" ? "⚠ Expiring" : "✕ Blocked"}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: tDot === "#16a34a" ? "#f0fdf4" : tDot === "#d97706" ? "#fef3c7" : "#fee2e2", color: tDot }}>
          Truck {tDot === "#16a34a" ? "✓ Clear" : tDot === "#d97706" ? "⚠ Expiring" : "✕ Blocked"}
        </span>
        {oDot && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: oDot === "#16a34a" ? "#f0fdf4" : oDot === "#d97706" ? "#fef3c7" : "#fee2e2", color: oDot }}>
            OO {oDot === "#16a34a" ? "✓" : oDot === "#d97706" ? "⚠" : "✕"}
          </span>
        )}
      </div>

      {/* Ticket + Payment */}
      <div style={{ display: "flex", gap: 5, margin: "4px 0" }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: tb.bg, color: tb.text }}>
          {tb.label}
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: pay.bg, color: pay.text }}>
          {job.payment_hold ? "PAYMENT HOLD" : job.payment_status.toUpperCase()}
        </span>
      </div>

      {/* No-response timer */}
      {job.job_status === "smart_assigned" && minsAgo !== null && (
        <div className={`db-accept-timer ${job.no_response ? "no-response" : "waiting"}`}>
          {job.no_response
            ? <><span className="db-accept-label">⚠ No Response ({minsAgo}m)</span><button type="button" className="db-accept-btn" onClick={() => onAssign(job)}>Reassign</button></>
            : <span className="db-accept-label">Sent {minsAgo}m ago · Awaiting acceptance</span>
          }
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

      {/* Readiness bar */}
      <div className="db-readiness-score">
        <div className="db-readiness-bar">
          <div className="db-readiness-fill" style={{ width: `${readiness.score}%`, background: readiness.score === 100 ? "#16a34a" : readiness.score >= 70 ? "#d97706" : "#dc2626" }} />
        </div>
        <span className="db-readiness-pct" style={{ color: readiness.score === 100 ? "#16a34a" : readiness.score >= 70 ? "#d97706" : "#dc2626" }}>{readiness.score}%</span>
      </div>

      {/* Primary actions */}
      <div className="db-card-actions">
        <button type="button" onClick={() => onAssign(job)} className="db-card-btn assign">
          {job.assigned_driver_name ? "Reassign" : "Assign Driver"}
        </button>
        {next && nextLabel && (
          <button type="button" onClick={() => onAdvance(job)} className="db-card-btn advance">{nextLabel}</button>
        )}
      </div>

      {/* Secondary actions */}
      <div className="db-card-actions2">
        <button type="button" onClick={() => onViewDetails(job)} className="db-card-btn2">Details</button>
        <button type="button" onClick={() => onNote(job)} className="db-card-btn2">Note</button>
        <button type="button" onClick={() => onScanTicket(job)} className="db-card-btn2">Scan Ticket</button>
        <button type="button" onClick={() => onIssue(job)} className="db-card-btn2 db-btn2-issue">Issue</button>
      </div>
    </div>
  );
}

// ─── Office Work Queue (Left Panel) ──────────────────────────────────────────

function OfficeWorkQueue({ jobs, drivers, alerts, activeQueue, onSelect }: {
  jobs:         DispatchJob[];
  drivers:      DispatchDriver[];
  alerts:       DispatchAlert[];
  activeQueue:  string;
  onSelect:     (q: string) => void;
}) {
  const counts = {
    dispatch_blockers: jobs.filter(j => j.dispatch_blocked || j.driver_compliance === "blocked" || j.truck_compliance === "blocked").length,
    compliance_needed: drivers.filter(d => d.compliance !== "valid").length + alerts.filter(a => ["cdl_expired","medical_card_expired","coi_missing"].includes(a.type)).length,
    payment_holds:     jobs.filter(j => j.payment_hold || j.payment_status === "unpaid").length,
    missing_tickets:   jobs.filter(j => ["delivered","ticket_needed"].includes(j.job_status) && (!j.ticket_status || j.ticket_status === "not_scanned")).length,
    payroll_holds:     jobs.filter(j => j.missing_rate).length,
    billing_ready:     jobs.filter(j => j.job_status === "ready_for_billing").length,
    late_jobs:         jobs.filter(j => j.is_late).length,
    unassigned:        jobs.filter(j => !j.assigned_driver_id && !["completed","ready_for_billing","blocked"].includes(j.job_status)).length,
  };

  const items = [
    { key: "dispatch_blockers", label: "Dispatch Blockers",  icon: "🚫", count: counts.dispatch_blockers, urgent: true },
    { key: "compliance_needed", label: "Compliance Needed",  icon: "📋", count: counts.compliance_needed, urgent: true },
    { key: "payment_holds",     label: "Payment Holds",      icon: "💳", count: counts.payment_holds,     urgent: true },
    { key: "missing_tickets",   label: "Missing Tickets",    icon: "🎫", count: counts.missing_tickets,   urgent: false },
    { key: "payroll_holds",     label: "Payroll Holds",      icon: "💰", count: counts.payroll_holds,     urgent: false },
    { key: "billing_ready",     label: "Billing Ready",      icon: "📄", count: counts.billing_ready,     urgent: false },
    { key: "late_jobs",         label: "Late Jobs",          icon: "⏰", count: counts.late_jobs,         urgent: true },
    { key: "unassigned",        label: "Unassigned Jobs",    icon: "👷", count: counts.unassigned,        urgent: false },
  ];

  return (
    <aside style={{ width: 210, flexShrink: 0, display: "flex", flexDirection: "column", gap: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
        <div style={{ fontWeight: 900, color: "#f8fafc", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Office Work Queue™</div>
        <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>What needs attention now</div>
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px", border: "none", borderBottom: "1px solid #f1f5f9",
              background: activeQueue === item.key ? "#eff6ff" : "transparent",
              cursor: "pointer", textAlign: "left",
              borderLeft: activeQueue === item.key ? "3px solid #1d4ed8" : "3px solid transparent",
            }}
          >
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#1e293b" }}>{item.label}</span>
            {item.count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: item.urgent && item.count > 0 ? "#dc2626" : "#e2e8f0",
                color: item.urgent && item.count > 0 ? "#fff" : "#475569",
                borderRadius: 999, padding: "1px 7px",
              }}>{item.count}</span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

// ─── Available Resources (Right Panel) ───────────────────────────────────────

function ResourcesPanel({ drivers, onBlock, onAssignFromPanel }: {
  drivers:           DispatchDriver[];
  onBlock:           (d: DispatchDriver) => void;
  onAssignFromPanel: (d: DispatchDriver) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    : drivers;

  const available = drivers.filter(d => d.status === "available" && d.dispatch_eligible);
  const blocked   = drivers.filter(d => d.status === "blocked" || !d.dispatch_eligible);
  const onTrip    = drivers.filter(d => ["en_route","loading","loaded","delivering","assigned"].includes(d.status));

  function dotColor(d: DispatchDriver) {
    if (d.status === "available" && d.dispatch_eligible) return "#16a34a";
    if (["en_route","loading","loaded","delivering","assigned"].includes(d.status)) return "#3b82f6";
    if (d.status === "blocked" || !d.dispatch_eligible) return "#dc2626";
    return "#94a3b8";
  }

  return (
    <aside style={{ width: 230, flexShrink: 0, display: "flex", flexDirection: "column", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
        <div style={{ fontWeight: 900, color: "#f8fafc", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Available Resources</div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#16a34a", color: "#fff" }}>{available.length} Available</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#3b82f6", color: "#fff" }}>{onTrip.length} On Job</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#dc2626", color: "#fff" }}>{blocked.length} Blocked</span>
        </div>
      </div>
      <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search driver…"
          className="db-driver-search"
        />
      </div>
      <div className="db-driver-list">
        {filtered.length === 0 && <div className="db-empty-panel">No drivers found</div>}
        {filtered.map(d => {
          const dc = dotColor(d);
          return (
            <div key={d.id} className="db-driver-card">
              <div className="db-driver-top">
                <div className="db-driver-dot" style={{ background: dc }} />
                <div className="db-driver-info">
                  <span className="db-driver-name">{d.name}</span>
                  <div className="db-driver-meta">
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: dc + "22", color: dc }}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                    <span style={{ color: d.compliance === "valid" ? "#16a34a" : d.compliance === "expiring" ? "#d97706" : "#dc2626", fontSize: 9, fontWeight: 700 }}>
                      {d.compliance === "valid" ? "✓ Clear" : d.compliance === "expiring" ? "⚠ Expiring" : "✕ Blocked"}
                    </span>
                  </div>
                </div>
              </div>
              {d.vehicle && <div style={{ fontSize: 10, color: "#64748b", paddingLeft: 18, marginTop: 2 }}>Truck: T-{d.vehicle}</div>}
              {d.active_job && <div style={{ fontSize: 10, color: "#1d4ed8", paddingLeft: 18 }}>Job #{d.active_job.job_number} · {d.active_job.customer}</div>}
              {d.block_reasons.length > 0 && (
                <div style={{ paddingLeft: 18, marginTop: 3 }}>
                  {d.block_reasons.slice(0, 1).map((r, i) => <div key={i} style={{ fontSize: 9, color: "#dc2626", fontWeight: 600 }}>· {r}</div>)}
                </div>
              )}
              <div className="db-driver-actions">
                {d.phone && <a href={`tel:${d.phone}`} className="db-driver-btn">Call</a>}
                {d.status === "available" && d.dispatch_eligible && (
                  <button type="button" className="db-driver-btn assign" onClick={() => onAssignFromPanel(d)}>Assign</button>
                )}
                {(d.status === "blocked" || !d.dispatch_eligible) && (
                  <button type="button" className="db-driver-btn blocked" onClick={() => onBlock(d)}>View Block</button>
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
  job:      DispatchJob;
  drivers:  DispatchDriver[];
  onAssign: (jobId: string, driverId: string, driverName: string) => Promise<BlockResult | null>;
  onClose:  () => void;
}) {
  const [saving,          setSaving]          = useState<string | null>(null);
  const [blockResult,     setBlockResult]     = useState<BlockResult | null>(null);
  const [overrideMode,    setOverrideMode]    = useState(false);
  const [overrideDriverId,   setOverrideDriverId]   = useState<string | null>(null);
  const [overrideDriverName, setOverrideDriverName] = useState<string>("");
  const [managerName,   setManagerName]   = useState("");
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
    const res = await fetch(`/api/ronyx/dispatch/jobs/${job.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_driver_id: overrideDriverId, job_status: "smart_assigned", override_approved: true, override_reasons: blockResult?.soft_block_types || [], override_reason: overrideReason, manager_name: managerName }),
    });
    setSaving(null);
    if (res.ok) onClose();
  }

  if (blockResult && !overrideMode) return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-blocked-icon">{blockResult.can_override ? "⚠️" : "🚫"}</div>
        <h2>{blockResult.can_override ? "Manager Approval Required" : "Dispatch Blocked"}</h2>
        <p className="db-block-driver-name">{blockResult.driver_name} cannot be assigned.</p>
        {blockResult.hard_blocks.length > 0 && (
          <div className="db-block-section hard">
            <span className="db-block-section-label">Hard Blocks — Cannot Override</span>
            {blockResult.hard_blocks.map((r, i) => <div key={i} className="db-block-reason">{r}</div>)}
            <p className="db-block-help">Expired compliance must be resolved in HR Compliance first.</p>
          </div>
        )}
        {blockResult.soft_blocks.length > 0 && (
          <div className="db-block-section soft">
            <span className="db-block-section-label">{blockResult.can_override ? "Soft Blocks — Manager Can Override" : "Additional Issues"}</span>
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

  if (overrideMode) return (
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
          <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="db-form-textarea" rows={3} placeholder="e.g. Customer needs same-day haul. Manager approved by phone." />
          <p className="db-override-warn">This override is permanently logged with your name, timestamp, and reason.</p>
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

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <p className="db-modal-sub">Assign Driver — #{job.job_number}</p>
            <h2>{job.customer_name}</h2>
            <p className="db-modal-route">{job.pickup_location || job.pickup_address} → {job.delivery_location || job.dropoff_address}</p>
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
                    <span className="db-driver-opt-meta">Available · Compliance clear · {eligible[0].vehicle ? `Truck T-${eligible[0].vehicle}` : "No truck assigned"}</span>
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
                    <span className="db-driver-opt-meta">{d.status.replace(/_/g, " ")} · {d.compliance} · {d.vehicle ? `T-${d.vehicle}` : "No truck"}</span>
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

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ job, onClose, onSaved }: { job: DispatchJob; onClose: () => void; onSaved: () => void }) {
  const [cat,    setCat]    = useState<NoteCategory>("internal");
  const [body,   setBody]   = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!body.trim()) return;
    setSaving(true);
    await fetch("/api/ronyx/dispatch/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.id, category: cat, body }) });
    setSaving(false); onSaved(); onClose();
  }
  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <p className="db-modal-sub">Add Note — #{job.job_number}</p>
        <h2>{job.customer_name}</h2>
        <div className="db-form-group">
          <label className="db-form-label">Category</label>
          <div className="db-note-cat-row">
            {NOTE_CATEGORIES.map(c => (
              <button key={c.value} type="button" onClick={() => setCat(c.value)} className={`db-note-cat-btn ${cat === c.value ? "selected" : ""}`}>{c.label}</button>
            ))}
          </div>
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

// ─── Report Issue Modal ───────────────────────────────────────────────────────

function ReportIssueModal({ job, onClose, onSaved }: { job: DispatchJob; onClose: () => void; onSaved: () => void }) {
  const [type,   setType]   = useState<IncidentType | "">("");
  const [desc,   setDesc]   = useState("");
  const [sev,    setSev]    = useState<"low"|"medium"|"high"|"critical">("medium");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!type) return;
    setSaving(true);
    await fetch("/api/ronyx/dispatch/incidents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ job_id: job.id, incident_type: type, description: desc, severity: sev }) });
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

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobDetailModal({ job, onClose, onStatusChange }: {
  job: DispatchJob; onClose: () => void; onStatusChange: (id: string, status: string) => void;
}) {
  const readiness = computeReadiness(job);
  const tb        = ticketBadge(job.ticket_status);

  return (
    <div className="db-modal-backdrop" onClick={onClose}>
      <div className="db-modal db-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <p className="db-modal-sub">Job Details</p>
            <h2>#{job.job_number} — {job.customer_name}</h2>
            <div className="db-detail-readiness" style={{ background: READINESS_CFG[readiness.status].bg, color: READINESS_CFG[readiness.status].text }}>
              {READINESS_CFG[readiness.status].label} · {readiness.score}% Ready
              {readiness.reasons.length > 0 && <span> · {readiness.reasons.join(" · ")}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="db-btn-ghost">Close</button>
        </div>

        <div className="db-detail-grid">
          <div><span>Customer</span><strong>{job.customer_name || "—"}</strong></div>
          <div><span>Project</span><strong>{job.project_name || "—"}</strong></div>
          <div><span>Pickup / Pit</span><strong>{job.pickup_location || job.pickup_address || "—"}</strong></div>
          <div><span>Job Site</span><strong>{job.delivery_location || job.dropoff_address || "—"}</strong></div>
          <div><span>Date</span><strong>{fmtDate(job.pickup_time)}</strong></div>
          <div><span>Material</span><strong>{job.material || "—"}</strong></div>
          <div><span>Driver</span><strong>{job.assigned_driver_name || "Unassigned"}</strong></div>
          <div><span>Truck</span><strong>{job.assigned_truck_number || job.assigned_vehicle_number || "Unassigned"}</strong></div>
          <div><span>Load Pay</span><strong>{job.load_pay ? `$${job.load_pay}/load` : "—"}</strong></div>
          <div><span>Billing Rate</span><strong>{job.billing_rate ? `$${job.billing_rate}/load` : "—"}</strong></div>
          <div><span>Payment</span><strong style={{ color: job.payment_status === "paid" ? "#16a34a" : "#dc2626" }}>{job.payment_hold ? "HOLD" : job.payment_status}</strong></div>
          <div><span>Ticket</span><strong style={{ color: tb.text }}>{tb.label}{job.ticket_number ? ` #${job.ticket_number}` : ""}</strong></div>
        </div>

        {/* Compliance */}
        <div className="db-audit-section">
          <p className="db-audit-title">Compliance Status</p>
          <div className="db-audit-grid">
            {[
              { label: "Driver CDL / Compliance",  ok: job.driver_compliance !== "blocked" },
              { label: "Truck Inspection / Reg",    ok: job.truck_compliance  !== "blocked" },
              { label: "Owner Operator COI",        ok: !job.oo_compliance || ["clear","na"].includes(job.oo_compliance) },
              { label: "Customer Payment",          ok: !job.payment_hold && job.payment_status !== "unpaid" },
              { label: "Payroll Rate Set",          ok: !job.missing_rate },
              { label: "Ticket Scanned",            ok: !!job.ticket_status && job.ticket_status !== "not_scanned" },
            ].map(c => (
              <div key={c.label} className={`db-audit-check ${c.ok ? "ok" : "fail"}`}>
                <span>{c.ok ? "✓" : "✗"}</span><span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        {readiness.reasons.length > 0 && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginTop: 10 }}>
            <div style={{ fontWeight: 700, color: "#dc2626", fontSize: 12, marginBottom: 4 }}>Block / Review Reasons</div>
            {readiness.reasons.map((r, i) => <div key={i} style={{ fontSize: 11, color: "#7f1d1d" }}>· {r}</div>)}
          </div>
        )}

        <div className="db-detail-actions">
          {NEXT_STATUS[job.job_status] && (
            <button type="button" onClick={() => { onStatusChange(job.id, NEXT_STATUS[job.job_status]!); onClose(); }} className="db-btn-primary">
              {NEXT_LABEL[job.job_status]}
            </button>
          )}
          <a href="/ronyx/tickets?tab=fastscan" className="db-btn-ghost">Scan Ticket</a>
          <a href="/ronyx/hr-compliance" className="db-btn-ghost">Compliance</a>
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
          <button type="button" onClick={sendReminder} disabled={reminded} className="db-btn-ghost">{reminded ? "Reminder Sent ✓" : "Send Reminder"}</button>
          <button type="button" onClick={onClose} className="db-btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export default function RonyxDispatchCommandCenter() {
  const [jobs,       setJobs]       = useState<DispatchJob[]>([]);
  const [drivers,    setDrivers]    = useState<DispatchDriver[]>([]);
  const [alerts,     setAlerts]     = useState<DispatchAlert[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState("");
  const [search,     setSearch]     = useState("");
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [laneFilter, setLaneFilter] = useState<PipelineKey | "all">("all");
  const [draggedId,  setDraggedId]  = useState<string | null>(null);
  const [activeQueue, setActiveQueue] = useState("dispatch_blockers");
  const [vdTab, setVdTab]           = useState<"actions"|"recs"|"eod"|"owner">("actions");

  const [guardOpen,    setGuardOpen]    = useState(false);
  const [assignTarget, setAssignTarget] = useState<DispatchJob | null>(null);
  const [detailTarget, setDetailTarget] = useState<DispatchJob | null>(null);
  const [noteTarget,   setNoteTarget]   = useState<DispatchJob | null>(null);
  const [issueTarget,  setIssueTarget]  = useState<DispatchJob | null>(null);
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
      setJobs(jd.jobs || []);
      setDrivers(dd.drivers || []);
      setAlerts(ad.alerts || []);
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
    showToast(`Job #${job.job_number} → ${next.replace(/_/g, " ")}`);
  }

  async function assignDriver(jobId: string, driverId: string, driverName: string): Promise<BlockResult | null> {
    const res = await fetch(`/api/ronyx/dispatch/jobs/${jobId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_driver_id: driverId, job_status: "smart_assigned" }),
    });
    if (res.status === 422) return await res.json() as BlockResult;
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, assigned_driver_id: driverId, assigned_driver_name: driverName, job_status: "smart_assigned" } : j));
    showToast(`${driverName} assigned`);
    setTimeout(loadAll, 800);
    return null;
  }

  const visibleJobs = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter(j => {
      const matchSearch = !q || [j.job_number, j.customer_name, j.assigned_driver_name, j.pickup_location, j.project_name].filter(Boolean).some(s => s!.toLowerCase().includes(q));
      const matchLane   = laneFilter === "all" || j.job_status === laneFilter;
      return matchSearch && matchLane;
    });
  }, [jobs, search, laneFilter]);

  const jobsForLane = (key: string) => visibleJobs.filter(j => j.job_status === key);

  const kpi = {
    total:          jobs.length,
    unassigned:     jobs.filter(j => !j.assigned_driver_id && !["completed","ready_for_billing","blocked"].includes(j.job_status)).length,
    readyToDispatch: jobs.filter(j => j.job_status === "ready_to_dispatch").length,
    inProgress:     jobs.filter(j => ["smart_assigned","driver_accepted","en_route","loading","loaded"].includes(j.job_status)).length,
    lateAtRisk:     jobs.filter(j => j.is_late).length,
    blocked:        jobs.filter(j => j.job_status === "blocked" || j.dispatch_blocked).length,
    missingTickets: jobs.filter(j => ["delivered","ticket_needed"].includes(j.job_status) && (!j.ticket_status || j.ticket_status === "not_scanned")).length,
    pendingPayroll: jobs.filter(j => j.job_status === "ready_for_payroll").length,
    readyToBill:    jobs.filter(j => j.job_status === "ready_for_billing").length,
    pendingPayments:jobs.filter(j => j.payment_status === "unpaid" && !["completed","blocked"].includes(j.job_status)).length,
    openIssues:     alerts.filter(a => ["blocked","critical"].includes(a.severity)).length,
  };

  const dateDisplay = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function exportCSV() {
    const rows = jobs.map(j => [j.job_number, j.customer_name, j.project_name||"", j.pickup_location||"", j.delivery_location||"", j.assigned_driver_name||"", j.assigned_truck_number||"", j.material||"", j.job_status, j.ticket_status||"", j.payment_status].join(","));
    const blob = new Blob([["Job#,Customer,Project,Pit,JobSite,Driver,Truck,Material,Status,Ticket,Payment",...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `dispatch-${dateFilter}.csv`; a.click();
  }

  const KPI_ROWS = [
    { label: "Total Jobs",       value: kpi.total,           dot: "#3b82f6",  bg: "#eff6ff",  warn: false },
    { label: "Unassigned",       value: kpi.unassigned,      dot: kpi.unassigned      > 0 ? "#dc2626" : "#16a34a", bg: kpi.unassigned      > 0 ? "#fee2e2" : "#f0fdf4", warn: kpi.unassigned > 0 },
    { label: "Ready to Dispatch",value: kpi.readyToDispatch, dot: "#f59e0b",  bg: "#fef3c7",  warn: false },
    { label: "In Progress",      value: kpi.inProgress,      dot: "#3b82f6",  bg: "#eff6ff",  warn: false },
    { label: "Late / At Risk",   value: kpi.lateAtRisk,      dot: kpi.lateAtRisk      > 0 ? "#dc2626" : "#16a34a", bg: kpi.lateAtRisk      > 0 ? "#fee2e2" : "#f0fdf4", warn: kpi.lateAtRisk > 0 },
    { label: "Blocked",          value: kpi.blocked,         dot: kpi.blocked         > 0 ? "#1e293b" : "#16a34a", bg: kpi.blocked         > 0 ? "#f1f5f9" : "#f0fdf4", warn: kpi.blocked > 0 },
    { label: "Missing Tickets",  value: kpi.missingTickets,  dot: kpi.missingTickets  > 0 ? "#dc2626" : "#16a34a", bg: kpi.missingTickets  > 0 ? "#fee2e2" : "#f0fdf4", warn: kpi.missingTickets > 0 },
    { label: "Pending Payroll",  value: kpi.pendingPayroll,  dot: kpi.pendingPayroll  > 0 ? "#7c3aed" : "#16a34a", bg: kpi.pendingPayroll  > 0 ? "#faf5ff" : "#f0fdf4", warn: false },
    { label: "Ready to Bill",    value: kpi.readyToBill,     dot: "#16a34a",  bg: "#f0fdf4",  warn: false },
    { label: "Pending Payments", value: kpi.pendingPayments, dot: kpi.pendingPayments > 0 ? "#d97706" : "#16a34a", bg: kpi.pendingPayments > 0 ? "#fef3c7" : "#f0fdf4", warn: kpi.pendingPayments > 0 },
    { label: "Open Issues",      value: kpi.openIssues,      dot: kpi.openIssues      > 0 ? "#dc2626" : "#16a34a", bg: kpi.openIssues      > 0 ? "#fee2e2" : "#f0fdf4", warn: kpi.openIssues > 0 },
  ];

  return (
    <div className="db-root">
      {toast && <div className="db-toast">{toast}</div>}

      {/* ── Header ── */}
      <div className="db-page-header" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", padding: "18px 28px" }}>
        <div>
          <h1 className="db-page-title" style={{ color: "#f8fafc", fontSize: "1.3rem" }}>Dispatch Command Center™</h1>
          <p className="db-page-subtitle" style={{ color: "#94a3b8", marginTop: 3 }}>
            Control tower for jobs, drivers, trucks, tickets, payroll, billing, and compliance · {dateDisplay}
          </p>
        </div>
        <div className="db-header-actions">
          <button type="button" onClick={loadAll} className="db-btn-ghost db-btn-sm">↻ Refresh</button>
          <button type="button" onClick={exportCSV} className="db-btn-ghost db-btn-sm">Export</button>
          <button type="button" onClick={() => setGuardOpen(true)} className="db-btn-ghost db-btn-sm" style={{ color: "#f8fafc", borderColor: "#3b82f6", background: "#1d4ed8", fontWeight: 800 }}>🛡 Run Dispatch Guard</button>
          <button type="button" onClick={() => { setVdTab("recs"); }} className="db-btn-ghost db-btn-sm" style={{ color: "#4ade80", borderColor: "#4ade80" }}>⚡ Smart Assign</button>
          <button type="button" onClick={() => { setVdTab("eod"); }} className="db-btn-ghost db-btn-sm">End of Day Review</button>
          <button type="button" onClick={() => { setVdTab("owner"); }} className="db-btn-ghost db-btn-sm">Owner View</button>
          <button type="button" className="db-btn-primary db-btn-sm">+ New Job</button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px,1fr))", gap: 8, padding: "12px 28px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        {KPI_ROWS.map(k => (
          <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.dot}22`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.dot }}>{k.value}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Alert Strip ── */}
      <div style={{ padding: "0 28px" }}>
        <AlertStrip alerts={alerts} />
      </div>

      {/* ── Virtual Dispatcher / Do This First (server AI) ── */}
      <div style={{ padding: "0 28px" }}>
        <VirtualDispatcher
          date={dateFilter}
          defaultTab={vdTab}
          onAssignJob={jobId => { const j = jobs.find(x => x.id === jobId); if (j) setAssignTarget(j); }}
          onViewJob={jobId   => { const j = jobs.find(x => x.id === jobId); if (j) setDetailTarget(j); }}
        />
      </div>

      {/* ── Do This First (local, instant) ── */}
      <div style={{ padding: "0 28px" }}>
        <DoThisFirst jobs={jobs} drivers={drivers} alerts={alerts} />
      </div>

      {/* ── Toolbar ── */}
      <div className="db-toolbar" style={{ padding: "8px 28px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search job #, customer, driver, material…" className="db-search" />
        <input value={dateFilter} type="date" onChange={e => setDateFilter(e.target.value)} className="db-date-input" />
        <select value={laneFilter} onChange={e => setLaneFilter(e.target.value as PipelineKey | "all")} className="db-lane-filter">
          <option value="all">All Stages</option>
          {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <div className="db-completed-badge">{jobs.filter(j => j.job_status === "completed" && j.pickup_time?.startsWith(dateFilter)).length} completed today</div>
      </div>

      {/* ── 3-Column Layout: Work Queue | Board | Resources ── */}
      <div style={{ display: "flex", gap: 12, padding: "12px 28px", alignItems: "flex-start" }}>

        {/* Left: Office Work Queue */}
        <OfficeWorkQueue
          jobs={jobs}
          drivers={drivers}
          alerts={alerts}
          activeQueue={activeQueue}
          onSelect={setActiveQueue}
        />

        {/* Center: Kanban Board */}
        <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
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
                      {laneJobs.length === 0 ? (
                        <div style={{ padding: "16px 10px", color: "#94a3b8", fontSize: 10, textAlign: "center", lineHeight: 1.5 }}>
                          No jobs in {lane.label}
                        </div>
                      ) : laneJobs.map(job => (
                        <div key={job.id} draggable onDragStart={() => setDraggedId(job.id)}>
                          <JobCard
                            job={job}
                            onAdvance={advanceJob}
                            onAssign={setAssignTarget}
                            onNote={setNoteTarget}
                            onViewDetails={setDetailTarget}
                            onIssue={setIssueTarget}
                            onScanTicket={() => window.location.href = "/ronyx/tickets?tab=fastscan"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Available Resources */}
        <ResourcesPanel
          drivers={drivers}
          onBlock={setBlockDriver}
          onAssignFromPanel={d => showToast(`Select a job to assign ${d.name}`)}
        />
      </div>

      {/* ── Modals ── */}
      {guardOpen    && <DispatchGuardPanel jobs={jobs} onClose={() => setGuardOpen(false)} />}
      {assignTarget && <AssignModal job={assignTarget} drivers={drivers} onAssign={assignDriver} onClose={() => setAssignTarget(null)} />}
      {detailTarget && <JobDetailModal job={detailTarget} onClose={() => setDetailTarget(null)} onStatusChange={async (id, s) => { await moveJob(id, s); showToast(`Status → ${s.replace(/_/g," ")}`); }} />}
      {noteTarget   && <NoteModal job={noteTarget} onClose={() => setNoteTarget(null)} onSaved={() => showToast("Note saved")} />}
      {issueTarget  && <ReportIssueModal job={issueTarget} onClose={() => setIssueTarget(null)} onSaved={() => { showToast("Issue reported"); loadAll(); }} />}
      {blockDriver  && <DriverBlockModal driver={blockDriver} onClose={() => setBlockDriver(null)} />}
    </div>
  );
}
