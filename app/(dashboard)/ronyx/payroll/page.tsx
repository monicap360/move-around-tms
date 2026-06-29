"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useModuleAccess } from "@/app/hooks/useModuleAccess";
import ModuleUpgradeCard from "@/app/components/ronyx/ModuleUpgradeCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type PayrollStatus =
  | "draft"
  | "waiting_for_ticket"
  | "needs_review"
  | "calculated"
  | "approved"
  | "recalculation_required"
  | "payroll_hold"
  | "ready_to_pay"
  | "paid"
  | "locked"
  | "voided"
  | "corrected"
  | "pending";

type DriverType = "W2" | "1099" | "owner_operator" | "Owner Operator";

type PayrollItem = {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_type: DriverType;
  truck_number: string;
  company_name: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  deductions: number;
  reimbursements: number;
  advances: number;
  fuel_deduction: number;
  net_pay: number;
  ticket_count: number;
  missing_tickets: number;
  disputed_tickets: number;
  fast_scan_matched: number;
  status: PayrollStatus;
  hold_reason: string | null;
  validation_flags: Record<string, { passed: boolean; detail: string }>;
  validation_errors: string[];
  calculated_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
};

type PayrollPeriod = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_gross_pay: number;
  total_deductions: number;
  total_reimbursements: number;
  total_net_pay: number;
  driver_count: number;
  ticket_count: number;
  items_ready: number;
  items_needing_review: number;
};

type AuditRow = {
  id: string;
  driver_name: string;
  event_type: string;
  from_status: string;
  to_status: string;
  trigger_source: string;
  performed_by: string;
  notes: string;
  created_at: string;
};

type Tab =
  | "overview"
  | "driver_pay"
  | "oo_settlements"
  | "missing_tickets"
  | "deductions"
  | "reimbursements"
  | "disputes"
  | "driver_invoices"
  | "accounting"
  | "audit_trail"
  | "settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

function fmtPeriod(start: string, end: string) {
  if (!start || !end) return "";
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function money(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function statusColor(s: PayrollStatus | string): string {
  if (s === "ready_to_pay" || s === "paid") return "#16a34a";
  if (s === "approved") return "#2563eb";
  if (s === "calculated") return "#0891b2";
  if (s === "locked") return "#6b7280";
  if (s === "voided") return "#9ca3af";
  if (s === "needs_review" || s === "recalculation_required") return "#d97706";
  if (s === "waiting_for_ticket") return "#7c3aed";
  if (s === "payroll_hold") return "#dc2626";
  if (s === "draft" || s === "pending") return "#64748b";
  if (s === "corrected") return "#0284c7";
  return "#64748b";
}

function statusLabel(s: PayrollStatus | string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    waiting_for_ticket: "Waiting for Ticket",
    needs_review: "Needs Review",
    calculated: "Calculated",
    approved: "Approved",
    recalculation_required: "Recalc Required",
    payroll_hold: "Payroll Hold",
    ready_to_pay: "Ready to Pay",
    paid: "Paid",
    locked: "Locked",
    voided: "Voided",
    corrected: "Corrected",
    pending: "Pending",
  };
  return map[s] || s;
}

function StatusBadge({ status }: { status: PayrollStatus | string }) {
  const color = statusColor(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
      background: color + "18", color, border: `1px solid ${color}40`,
      whiteSpace: "nowrap",
    }}>
      {statusLabel(status)}
    </span>
  );
}

function DriverTypeBadge({ type }: { type: string }) {
  const isOO = type === "owner_operator" || type === "Owner Operator";
  const is1099 = type === "1099";
  const color = isOO ? "#7c3aed" : is1099 ? "#0891b2" : "#0f766e";
  const label = isOO ? "O/O" : is1099 ? "1099" : "W-2";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem",
      fontWeight: 700, background: color + "15", color, border: `1px solid ${color}30`,
    }}>{label}</span>
  );
}

function mapEngineItem(d: any): PayrollItem {
  return {
    id: d.id || "",
    driver_id: d.driver_id || "",
    driver_name: d.driver_name || "Unknown Driver",
    driver_type: d.driver_type || "1099",
    truck_number: d.truck_number || "—",
    company_name: d.company_name || "—",
    period_start: d.period_start || "",
    period_end: d.period_end || "",
    gross_pay: Number(d.gross_pay || 0),
    deductions: Number(d.deductions || 0),
    reimbursements: Number(d.reimbursements || 0),
    advances: Number(d.advances || 0),
    fuel_deduction: Number(d.fuel_deduction || 0),
    net_pay: Number(d.net_pay || 0),
    ticket_count: Number(d.ticket_count || 0),
    missing_tickets: Number(d.missing_tickets || 0),
    disputed_tickets: Number(d.disputed_tickets || 0),
    fast_scan_matched: Number(d.fast_scan_matched || 0),
    status: (d.status || "pending") as PayrollStatus,
    hold_reason: d.hold_reason || null,
    validation_flags: d.validation_flags || {},
    validation_errors: d.validation_errors || [],
    calculated_at: d.calculated_at || null,
    approved_at: d.approved_at || null,
    approved_by: d.approved_by || null,
  };
}

function mapCalcFallback(d: any, period_start: string, period_end: string): PayrollItem {
  const gross = Number(d.gross_pay || d.total_pay || 0);
  const ded = Number(d.deductions || d.total_deductions || 0);
  const reimb = Number(d.reimbursements || 0);
  const fuel = Number(d.fuel_deduction || 0);
  const net = Math.max(0, gross - ded + reimb);
  const missing = Number(d.missing_tickets || 0);
  const disputed = Number(d.disputed_tickets || 0);

  let status: PayrollStatus = "calculated";
  if (d.status && d.status !== "pending") status = d.status as PayrollStatus;
  else if (disputed > 0) status = "needs_review";
  else if (missing > 0) status = "waiting_for_ticket";
  else if (gross > 0) status = "ready_to_pay";

  return {
    id: d.id || `fallback-${d.driver_id}`,
    driver_id: d.driver_id || d.id || "",
    driver_name: d.driver_name || d.name || "Unknown Driver",
    driver_type: d.driver_type || "1099",
    truck_number: d.truck_number || d.unit_number || "—",
    company_name: d.company_name || "—",
    period_start,
    period_end,
    gross_pay: gross,
    deductions: ded,
    reimbursements: reimb,
    advances: Number(d.advances || 0),
    fuel_deduction: fuel,
    net_pay: net,
    ticket_count: Number(d.ticket_count || d.tickets || 0),
    missing_tickets: missing,
    disputed_tickets: disputed,
    fast_scan_matched: 0,
    status,
    hold_reason: null,
    validation_flags: {},
    validation_errors: [],
    calculated_at: d.calculated_at || null,
    approved_at: null,
    approved_by: null,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PayrollCommandCenter() {
  const { blocked: moduleBlocked, loading: moduleLoading } = useModuleAccess("payroll");

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodStatus, setPeriodStatus] = useState("open");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  // Load from engine (reads DB) — fast path
  const loadFromEngine = useCallback(async (start: string, end: string) => {
    if (!start || !end) return;
    setLoading(true);
    try {
      // Primary source: aggregate_tickets ("the agg portion") grouped by driver —
      // includes truck and per-load amounts. (The legacy engine reads a missing table.)
      const rT = await fetch(`/api/ronyx/payroll/from-tickets?period_start=${start}&period_end=${end}`);
      const dataT = await rT.json().catch(() => ({}));
      if (Array.isArray(dataT.drivers) && dataT.drivers.length > 0) {
        setItems(dataT.drivers.map((d: any) => mapCalcFallback(d, start, end)));
        return;
      }
      // Fallback to legacy calc endpoint
      const r2 = await fetch("/api/ronyx/payroll/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_date: start, end_date: end }),
      });
      const data2 = await r2.json();
      const raw = data2.drivers || data2.results || [];
      if (raw.length > 0) {
        setItems(raw.map((d: any) => mapCalcFallback(d, start, end)));
      } else {
        setItems([]);
      }
    } catch {
      showToast("Could not load payroll data");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Trigger full recalculation via engine
  const runRecalculation = useCallback(async () => {
    if (!periodStart || !periodEnd) return;
    setRecalcLoading(true);
    showToast("Running payroll calculation engine…");
    try {
      const r = await fetch("/api/ronyx/payroll/engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          recalculate_period: true,
          trigger_source: "manual",
        }),
      });
      const data = await r.json();
      if (data.ok) {
        showToast(`Calculated ${data.processed} driver(s) — refreshing…`);
        await loadFromEngine(periodStart, periodEnd);
      } else {
        showToast(data.error || "Calculation failed");
      }
    } catch {
      showToast("Engine error — check connection");
    } finally {
      setRecalcLoading(false);
    }
  }, [periodStart, periodEnd, loadFromEngine, showToast]);

  const handleApprove = useCallback(async (item: PayrollItem) => {
    try {
      const r = await fetch("/api/ronyx/payroll/engine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", item_id: item.id }),
      });
      const data = await r.json();
      if (data.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: "approved" } : i));
        showToast(`${item.driver_name} pay approved`);
      } else {
        showToast(data.error || "Approve failed");
      }
    } catch {
      showToast("Approve failed — please retry");
    }
  }, [showToast]);

  const handleLockPeriod = useCallback(async () => {
    if (!period?.id) {
      showToast("Run calculation first to create the pay period");
      return;
    }
    try {
      const r = await fetch("/api/ronyx/payroll/engine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock", period_id: period.id }),
      });
      const data = await r.json();
      if (data.ok) {
        setPeriodStatus("locked");
        setItems(prev => prev.map(i => i.status === "approved" ? { ...i, status: "locked" } : i));
        showToast("Pay period locked — no further changes allowed");
      } else {
        showToast(data.error || "Lock failed");
      }
    } catch {
      showToast("Lock failed — please retry");
    }
  }, [period, showToast]);

  const handleHold = useCallback(async (item: PayrollItem, reason: string) => {
    try {
      await fetch("/api/ronyx/payroll/engine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hold", item_id: item.id, reason }),
      });
      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, status: "payroll_hold", hold_reason: reason }
        : i
      ));
      showToast(`${item.driver_name} placed on payroll hold`);
    } catch {
      showToast("Hold action failed");
    }
  }, [showToast]);

  const loadAuditTrail = useCallback(async () => {
    if (!period?.id) return;
    await fetch(`/api/ronyx/payroll/engine?period_start=${periodStart}&period_end=${periodEnd}`);
    setAuditRows([]); // ronyx_payroll_audit populated by engine on each run
  }, [period, periodStart, periodEnd]);

  const handleExport = useCallback(() => {
    if (items.length === 0) { showToast("No records to export"); return; }
    const headers = ["Driver","Type","Truck","Gross","Deductions","Reimbursements","Net Pay","Tickets","Status"];
    const rows = items.map(r => [
      r.driver_name, r.driver_type, r.truck_number,
      r.gross_pay.toFixed(2), r.deductions.toFixed(2), r.reimbursements.toFixed(2),
      r.net_pay.toFixed(2), r.ticket_count, statusLabel(r.status),
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${periodStart}-to-${periodEnd}.csv`;
    a.click();
    showToast("Payroll exported to CSV");
  }, [items, periodStart, periodEnd, showToast]);

  useEffect(() => {
    const { start, end } = getWeekBounds();
    setPeriodStart(start);
    setPeriodEnd(end);
  }, []);

  useEffect(() => {
    if (periodStart && periodEnd) loadFromEngine(periodStart, periodEnd);
  }, [periodStart, periodEnd, loadFromEngine]);

  useEffect(() => {
    if (activeTab === "audit_trail") loadAuditTrail();
  }, [activeTab, loadAuditTrail]);

  // ─── Derived KPIs ───────────────────────────────────────────────────────────
  const totalGross = items.reduce((t, r) => t + r.gross_pay, 0);
  const totalDed = items.reduce((t, r) => t + r.deductions, 0);
  const totalReimb = items.reduce((t, r) => t + r.reimbursements, 0);
  const totalNet = items.reduce((t, r) => t + r.net_pay, 0);
  const readyCount = items.filter(r => r.status === "ready_to_pay").length;
  const approvedCount = items.filter(r => r.status === "approved").length;
  const reviewCount = items.filter(r => ["needs_review", "recalculation_required"].includes(r.status)).length;
  const holdCount = items.filter(r => r.status === "payroll_hold").length;
  const waitingCount = items.filter(r => r.status === "waiting_for_ticket").length;
  const missingTicketTotal = items.reduce((t, r) => t + r.missing_tickets, 0);
  const disputedTotal = items.reduce((t, r) => t + r.disputed_tickets, 0);
  const ooItems = items.filter(r => r.driver_type === "owner_operator" || r.driver_type === "Owner Operator");

  // "Do This First" queue
  const doThisFirst = useMemo(() => {
    const q: { priority: "critical" | "high" | "medium"; label: string; detail: string; action: string }[] = [];
    if (holdCount > 0) q.push({ priority: "critical", label: "Payroll Hold", detail: `${holdCount} driver(s) on payroll hold`, action: "payroll_hold" });
    if (disputedTotal > 0) q.push({ priority: "critical", label: "Disputed Tickets", detail: `${disputedTotal} disputed ticket(s) blocking pay`, action: "disputes" });
    if (waitingCount > 0) q.push({ priority: "high", label: "Missing Tickets", detail: `${waitingCount} driver(s) waiting for ticket scan`, action: "missing_tickets" });
    if (reviewCount > 0) q.push({ priority: "high", label: "Needs Review", detail: `${reviewCount} driver(s) need review before approval`, action: "needs_review" });
    if (readyCount > 0 && periodStatus !== "locked") q.push({ priority: "medium", label: "Ready to Approve", detail: `${readyCount} driver(s) ready for pay approval`, action: "ready_to_pay" });
    return q;
  }, [holdCount, disputedTotal, waitingCount, reviewCount, readyCount, periodStatus]);

  // Filtered list for Driver Pay tab
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(r => {
      const matchSearch = !q || r.driver_name.toLowerCase().includes(q) || r.truck_number.toLowerCase().includes(q) || r.company_name.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || r.status === statusFilter || (statusFilter === "needs_review" && ["needs_review","recalculation_required"].includes(r.status));
      const matchType = typeFilter === "All" || r.driver_type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [items, search, statusFilter, typeFilter]);

  if (moduleLoading) return null;
  if (moduleBlocked) return <ModuleUpgradeCard moduleSlug="payroll" />;

  const periodLocked = periodStatus === "locked";

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={{ padding: "0 0 48px", background: "#f8fafc", minHeight: "100vh" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 20, zIndex: 9999,
          background: "#0f172a", color: "#fff", padding: "12px 20px",
          borderRadius: 10, fontWeight: 600, fontSize: "0.85rem",
          boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
        }}>{toast}</div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "20px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ color: "#64748b", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>MoveAround TMS / Payroll</span>
              {periodLocked && (
                <span style={{ padding: "2px 10px", borderRadius: 20, background: "#374151", color: "#9ca3af", fontSize: "0.68rem", fontWeight: 700 }}>🔒 LOCKED</span>
              )}
              {!periodLocked && items.length > 0 && (
                <span style={{ padding: "2px 10px", borderRadius: 20, background: "#064e3b22", color: "#10b981", fontSize: "0.68rem", fontWeight: 700, border: "1px solid #10b98140" }}>OPEN</span>
              )}
            </div>
            <h1 style={{ color: "#f1f5f9", fontSize: "1.6rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
              Payroll Command Center™
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.82rem", margin: "4px 0 0" }}>
              One-source-of-truth payroll engine — all ticket, dispatch, and rate changes auto-recalculate
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={runRecalculation}
              disabled={recalcLoading || periodLocked}
              style={{
                padding: "9px 16px", borderRadius: 8, background: recalcLoading ? "#374151" : "#1d4ed8",
                color: "#fff", fontWeight: 700, fontSize: "0.8rem", border: "none", cursor: periodLocked ? "not-allowed" : "pointer",
                opacity: periodLocked ? 0.5 : 1,
              }}
            >
              {recalcLoading ? "Calculating…" : "⟳ Run Engine"}
            </button>
            <button onClick={handleExport} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", border: "1px solid #334155", cursor: "pointer" }}>
              Export CSV
            </button>
            <button
              onClick={handleLockPeriod}
              disabled={periodLocked || items.filter(i => i.status === "approved").length === 0}
              style={{
                padding: "9px 16px", borderRadius: 8,
                background: periodLocked ? "#374151" : "#7c3aed",
                color: "#fff", fontWeight: 700, fontSize: "0.8rem", border: "none",
                cursor: periodLocked ? "not-allowed" : "pointer",
                opacity: periodLocked ? 0.6 : 1,
              }}
            >
              {periodLocked ? "🔒 Locked" : "Lock Period"}
            </button>
          </div>
        </div>

        {/* Pay Period Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <span style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 600 }}>PAY PERIOD</span>
          <input
            type="date" value={periodStart}
            onChange={e => { setPeriodStart(e.target.value); setItems([]); }}
            disabled={periodLocked}
            style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: "0.8rem" }}
          />
          <span style={{ color: "#475569", fontSize: "0.75rem" }}>to</span>
          <input
            type="date" value={periodEnd}
            onChange={e => { setPeriodEnd(e.target.value); setItems([]); }}
            disabled={periodLocked}
            style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", fontSize: "0.8rem" }}
          />
          {periodStart && periodEnd && (
            <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{fmtPeriod(periodStart, periodEnd)}</span>
          )}
          <button
            onClick={() => loadFromEngine(periodStart, periodEnd)}
            style={{ padding: "6px 14px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", fontSize: "0.78rem", cursor: "pointer" }}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          {/* Week navigation */}
          <button
            onClick={() => {
              const d = new Date(periodStart + "T12:00:00");
              d.setDate(d.getDate() - 7);
              const start = d.toISOString().slice(0, 10);
              const end2 = new Date(d); end2.setDate(d.getDate() + 6);
              setPeriodStart(start); setPeriodEnd(end2.toISOString().slice(0, 10)); setItems([]);
            }}
            style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#64748b", fontSize: "0.78rem", cursor: "pointer" }}
          >← Prev</button>
          <button
            onClick={() => { const { start, end } = getWeekBounds(); setPeriodStart(start); setPeriodEnd(end); setItems([]); }}
            style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#64748b", fontSize: "0.78rem", cursor: "pointer" }}
          >This Week</button>
          <button
            onClick={() => {
              const d = new Date(periodStart + "T12:00:00");
              d.setDate(d.getDate() + 7);
              const start = d.toISOString().slice(0, 10);
              const end2 = new Date(d); end2.setDate(d.getDate() + 6);
              setPeriodStart(start); setPeriodEnd(end2.toISOString().slice(0, 10)); setItems([]);
            }}
            style={{ padding: "6px 10px", borderRadius: 6, background: "#1e293b", border: "1px solid #334155", color: "#64748b", fontSize: "0.78rem", cursor: "pointer" }}
          >Next →</button>
        </div>
      </div>

      {/* ── Payroll Status Strip ───────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 28px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>Status:</span>
        {[
          { status: "waiting_for_ticket", count: waitingCount },
          { status: "needs_review", count: reviewCount },
          { status: "calculated", count: items.filter(i => i.status === "calculated").length },
          { status: "ready_to_pay", count: readyCount },
          { status: "approved", count: approvedCount },
          { status: "payroll_hold", count: holdCount },
          { status: "locked", count: items.filter(i => i.status === "locked").length },
          { status: "paid", count: items.filter(i => i.status === "paid").length },
        ].filter(s => s.count > 0).map(s => (
          <button
            key={s.status}
            onClick={() => { setStatusFilter(s.status); setActiveTab("driver_pay"); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
              background: statusColor(s.status as PayrollStatus) + "18",
              color: statusColor(s.status as PayrollStatus),
              border: `1px solid ${statusColor(s.status as PayrollStatus)}35`,
              cursor: "pointer",
            }}
          >
            {statusLabel(s.status)} <span style={{ background: statusColor(s.status as PayrollStatus) + "28", borderRadius: 10, padding: "0 5px", fontSize: "0.68rem" }}>{s.count}</span>
          </button>
        ))}
        {items.length === 0 && !loading && (
          <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>No data — run the engine to populate</span>
        )}
      </div>

      <div style={{ padding: "20px 28px 0" }}>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Gross Payroll", value: money(totalGross), sub: `${items.length} drivers`, color: "#0f172a" },
            { label: "Deductions", value: money(totalDed), sub: "All deduction types", color: "#dc2626" },
            { label: "Reimbursements", value: money(totalReimb), sub: "Approved", color: "#16a34a" },
            { label: "Net Pay", value: money(totalNet), sub: "Estimated payout", color: "#1d4ed8" },
            { label: "Ready to Pay", value: readyCount.toString(), sub: "Awaiting approval", color: "#0891b2" },
            { label: "Needs Review", value: (reviewCount + holdCount + waitingCount).toString(), sub: `${missingTicketTotal} missing tickets`, color: "#d97706" },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
              padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Do This First ─────────────────────────────────────────────── */}
        {doThisFirst.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
              ⚡ Do This First
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>— resolve before approving payroll</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {doThisFirst.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 8,
                  background: item.priority === "critical" ? "#fef2f2" : item.priority === "high" ? "#fffbeb" : "#eff6ff",
                  border: `1px solid ${item.priority === "critical" ? "#fecaca" : item.priority === "high" ? "#fde68a" : "#bfdbfe"}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1rem" }}>
                      {item.priority === "critical" ? "🚨" : item.priority === "high" ? "⚠️" : "✅"}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.8rem", color: item.priority === "critical" ? "#dc2626" : item.priority === "high" ? "#92400e" : "#1e40af" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.detail}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (item.action === "disputes") setActiveTab("disputes");
                      else if (item.action === "missing_tickets") setActiveTab("missing_tickets");
                      else { setStatusFilter(item.action); setActiveTab("driver_pay"); }
                    }}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                      background: item.priority === "critical" ? "#dc2626" : item.priority === "high" ? "#d97706" : "#1d4ed8",
                      color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Resolve →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {/* Tab Bar */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e2e8f0", overflowX: "auto", padding: "0 16px" }}>
            {([
              ["overview", "Overview"],
              ["driver_pay", "Driver Pay Records"],
              ["oo_settlements", "OO Settlements"],
              ["missing_tickets", "Missing Tickets"],
              ["deductions", "Deductions"],
              ["reimbursements", "Reimbursements"],
              ["disputes", "Disputes"],
              ["driver_invoices", "Driver Invoices"],
              ["accounting", "Accounting Export"],
              ["audit_trail", "Audit Trail"],
              ["settings", "Settings"],
            ] as [Tab, string][]).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "12px 14px", borderBottom: activeTab === tab ? "2px solid #1d4ed8" : "2px solid transparent",
                  color: activeTab === tab ? "#1d4ed8" : "#64748b", fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: "0.78rem", background: "transparent", border: "none", cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >
                {label}
                {tab === "missing_tickets" && missingTicketTotal > 0 && (
                  <span style={{ marginLeft: 4, background: "#dc2626", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: "0.65rem", fontWeight: 800 }}>{missingTicketTotal}</span>
                )}
                {tab === "disputes" && disputedTotal > 0 && (
                  <span style={{ marginLeft: 4, background: "#d97706", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: "0.65rem", fontWeight: 800 }}>{disputedTotal}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Content ─────────────────────────────────────────────── */}
          <div style={{ padding: "20px 24px" }}>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {/* Period summary */}
                  <div style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>Pay Period Summary</div>
                    {loading ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>Loading…</div>
                    ) : items.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "20px 0" }}>
                        No data for this period.<br />
                        <button onClick={runRecalculation} style={{ marginTop: 10, padding: "8px 16px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem" }}>
                          Run Payroll Engine
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          ["Period", fmtPeriod(periodStart, periodEnd)],
                          ["Status", periodLocked ? "🔒 Locked" : "Open"],
                          ["Drivers", items.length.toString()],
                          ["Total Tickets", items.reduce((t, r) => t + r.ticket_count, 0).toString()],
                          ["Gross Pay", money(totalGross)],
                          ["Total Deductions", money(totalDed)],
                          ["Net Payout", money(totalNet)],
                        ].map(([label, val]) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{label}</span>
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status breakdown */}
                  <div style={{ background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>Status Breakdown</div>
                    {items.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>Run the engine to see status breakdown</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {Object.entries(
                          items.reduce((acc: Record<string, number>, r) => {
                            acc[r.status] = (acc[r.status] || 0) + 1;
                            return acc;
                          }, {})
                        ).sort(([, a], [, b]) => b - a).map(([status, count]) => (
                          <div key={status} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 4, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: `${(count / items.length) * 100}%`, height: "100%", background: statusColor(status as PayrollStatus), borderRadius: 4 }} />
                            </div>
                            <StatusBadge status={status} />
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", minWidth: 20, textAlign: "right" }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent exceptions */}
                {doThisFirst.length > 0 && (
                  <div style={{ marginTop: 20, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", padding: 20 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 10 }}>Active Exceptions ({doThisFirst.length})</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {doThisFirst.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: item.priority === "critical" ? "#fef2f2" : "#fffbeb" }}>
                          <span>{item.priority === "critical" ? "🚨" : "⚠️"}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.78rem" }}>{item.label}</span>
                            <span style={{ color: "#64748b", fontSize: "0.72rem", marginLeft: 6 }}>{item.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DRIVER PAY RECORDS */}
            {activeTab === "driver_pay" && (
              <div>
                {/* Filters */}
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search driver, truck, company…"
                    style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem" }}
                  />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                    <option value="All">All Statuses</option>
                    <option value="waiting_for_ticket">Waiting for Ticket</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="calculated">Calculated</option>
                    <option value="ready_to_pay">Ready to Pay</option>
                    <option value="approved">Approved</option>
                    <option value="payroll_hold">Payroll Hold</option>
                    <option value="locked">Locked</option>
                    <option value="paid">Paid</option>
                    <option value="voided">Voided</option>
                  </select>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                    <option value="All">All Types</option>
                    <option value="W2">W-2</option>
                    <option value="1099">1099</option>
                    <option value="owner_operator">Owner Operator</option>
                  </select>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{filteredItems.length} driver{filteredItems.length !== 1 ? "s" : ""}</span>
                </div>

                {loading ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Calculating payroll…</div>
                ) : filteredItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    {items.length === 0 ? (
                      <div>
                        <div style={{ fontSize: "2rem", marginBottom: 8 }}>💰</div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>No payroll data for this period</div>
                        <div style={{ fontSize: "0.8rem", marginBottom: 16 }}>Run the engine to calculate driver pay from tickets</div>
                        <button onClick={runRecalculation} style={{ padding: "10px 20px", borderRadius: 8, background: "#1d4ed8", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 }}>
                          Run Payroll Engine
                        </button>
                      </div>
                    ) : "No drivers match your filters."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredItems.map(item => {
                      const expanded = expandedItem === item.id;
                      const isBlocked = ["payroll_hold", "waiting_for_ticket", "needs_review", "recalculation_required"].includes(item.status);
                      const isReady = item.status === "ready_to_pay";

                      return (
                        <div key={item.id} style={{
                          border: `1px solid ${isBlocked ? "#fde68a" : item.status === "payroll_hold" ? "#fecaca" : "#e2e8f0"}`,
                          borderRadius: 12, background: "#fff", overflow: "hidden",
                        }}>
                          {/* Card Header */}
                          <div
                            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }}
                            onClick={() => setExpandedItem(expanded ? null : item.id)}
                          >
                            {/* Avatar */}
                            <div style={{
                              width: 40, height: 40, borderRadius: "50%",
                              background: isBlocked ? "#fef3c7" : item.status === "payroll_hold" ? "#fef2f2" : "#eff6ff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: 800, fontSize: "0.9rem",
                              color: isBlocked ? "#92400e" : item.status === "payroll_hold" ? "#dc2626" : "#1d4ed8",
                              flexShrink: 0,
                            }}>
                              {item.driver_name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                            </div>

                            {/* Name + meta */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{item.driver_name}</span>
                                <DriverTypeBadge type={item.driver_type} />
                                <StatusBadge status={item.status} />
                              </div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
                                Truck {item.truck_number} · {item.ticket_count} ticket{item.ticket_count !== 1 ? "s" : ""} · {item.company_name !== "—" ? item.company_name : ""}
                                {item.hold_reason && <span style={{ color: "#dc2626" }}> · {item.hold_reason}</span>}
                              </div>
                            </div>

                            {/* Pay numbers */}
                            <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase" }}>Gross</div>
                                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>{money(item.gross_pay)}</div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase" }}>Net Pay</div>
                                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#16a34a" }}>{money(item.net_pay)}</div>
                              </div>
                            </div>

                            {/* Action button */}
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              {isReady && !periodLocked && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleApprove(item); }}
                                  style={{ padding: "6px 14px", borderRadius: 8, background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: "0.75rem", border: "none", cursor: "pointer" }}
                                >
                                  Approve Pay
                                </button>
                              )}
                              {item.status === "approved" && (
                                <span style={{ padding: "6px 12px", borderRadius: 8, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.75rem" }}>
                                  ✓ Approved
                                </span>
                              )}
                              <span style={{ color: "#94a3b8", fontSize: "1.1rem" }}>{expanded ? "▲" : "▼"}</span>
                            </div>
                          </div>

                          {/* Expanded Detail */}
                          {expanded && (
                            <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 18px", background: "#fafbfc" }}>
                              {/* Money breakdown */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
                                {[
                                  ["Gross Pay", money(item.gross_pay), "#0f172a"],
                                  ["Deductions", money(item.deductions), "#dc2626"],
                                  ["Fuel Deduction", money(item.fuel_deduction), "#dc2626"],
                                  ["Reimbursements", money(item.reimbursements), "#16a34a"],
                                  ["Advances", money(item.advances), "#d97706"],
                                  ["Net Pay", money(item.net_pay), "#16a34a"],
                                  ["Tickets", item.ticket_count.toString(), "#1d4ed8"],
                                  ["Missing", item.missing_tickets.toString(), item.missing_tickets > 0 ? "#dc2626" : "#64748b"],
                                  ["Disputed", item.disputed_tickets.toString(), item.disputed_tickets > 0 ? "#d97706" : "#64748b"],
                                  ["Fast Scan Match", item.fast_scan_matched.toString(), "#0891b2"],
                                ].map(([label, val, color]) => (
                                  <div key={label} style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: "8px 10px" }}>
                                    <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: color as string }}>{val}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Validation flags */}
                              {Object.keys(item.validation_flags).length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                                    Validation Checks
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                    {Object.entries(item.validation_flags).map(([check, result]) => (
                                      <div key={check} style={{
                                        display: "flex", alignItems: "flex-start", gap: 6,
                                        padding: "5px 8px", borderRadius: 6,
                                        background: result.passed ? "#f0fdf4" : "#fef2f2",
                                        border: `1px solid ${result.passed ? "#bbf7d0" : "#fecaca"}`,
                                        fontSize: "0.7rem",
                                      }}>
                                        <span>{result.passed ? "✓" : "✗"}</span>
                                        <span style={{ color: result.passed ? "#15803d" : "#dc2626" }}>{result.detail}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action row */}
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                <button
                                  onClick={() => { window.location.href = `/ronyx/tickets?driver=${item.driver_id}&period_start=${periodStart}&period_end=${periodEnd}`; }}
                                  style={{ padding: "6px 12px", borderRadius: 6, background: "#eff6ff", color: "#1d4ed8", fontWeight: 600, fontSize: "0.72rem", border: "1px solid #bfdbfe", cursor: "pointer" }}
                                >View Tickets</button>
                                <Link
                                  href={`/ronyx/drivers?highlight=${item.driver_id}`}
                                  style={{ padding: "6px 12px", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontWeight: 600, fontSize: "0.72rem", border: "1px solid #bbf7d0", textDecoration: "none" }}
                                >Driver Profile</Link>
                                {!periodLocked && item.status !== "payroll_hold" && (
                                  <button
                                    onClick={() => handleHold(item, "Manual payroll hold")}
                                    style={{ padding: "6px 12px", borderRadius: 6, background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: "0.72rem", border: "1px solid #fecaca", cursor: "pointer" }}
                                  >Place on Hold</button>
                                )}
                                {item.calculated_at && (
                                  <span style={{ fontSize: "0.68rem", color: "#94a3b8", padding: "6px 0" }}>
                                    Calculated {new Date(item.calculated_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* OO SETTLEMENTS */}
            {activeTab === "oo_settlements" && (
              <div>
                {ooItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏢</div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>No Owner Operator settlements this period</div>
                    <div style={{ fontSize: "0.8rem" }}>OO drivers are identified by driver type = "owner_operator"</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>
                      Owner Operator Settlements — {fmtPeriod(periodStart, periodEnd)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ooItems.map(item => (
                        <div key={item.id} style={{ border: "1px solid #ede9fe", borderRadius: 10, padding: "14px 18px", background: "#faf5ff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 800, color: "#7c3aed" }}>{item.driver_name}</div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.company_name} · Truck {item.truck_number} · {item.ticket_count} tickets</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#7c3aed" }}>{money(item.net_pay)}</div>
                              <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Net Settlement</div>
                              <StatusBadge status={item.status} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 14, padding: "12px 16px", background: "#ede9fe", borderRadius: 8, fontWeight: 700, color: "#7c3aed", fontSize: "0.82rem", display: "flex", justifyContent: "space-between" }}>
                      <span>Total OO Settlements</span>
                      <span>{money(ooItems.reduce((t, i) => t + i.net_pay, 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MISSING TICKETS */}
            {activeTab === "missing_tickets" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 12 }}>
                  Drivers with Missing Tickets
                </div>
                {items.filter(i => i.missing_tickets > 0 || i.status === "waiting_for_ticket").length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#16a34a", fontWeight: 700 }}>
                    ✓ No missing tickets this pay period
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.filter(i => i.missing_tickets > 0 || i.status === "waiting_for_ticket").map(item => (
                      <div key={item.id} style={{ border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", background: "#fef2f2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "#dc2626" }}>{item.driver_name}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>Truck {item.truck_number} · {item.missing_tickets} missing ticket(s)</div>
                            {item.hold_reason && <div style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: 2 }}>{item.hold_reason}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Link href={`/ronyx/fast-scan`} style={{ padding: "6px 12px", borderRadius: 6, background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none" }}>
                              Fast Scan →
                            </Link>
                            <Link href={`/ronyx/tickets`} style={{ padding: "6px 12px", borderRadius: 6, background: "#fff", color: "#dc2626", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none", border: "1px solid #fecaca" }}>
                              View Tickets
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 20, padding: "14px 18px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#64748b", marginBottom: 6 }}>How missing tickets are detected</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.6 }}>
                    Fast Scan™ documents are matched to payroll ticket records by ticket number and driver.
                    A ticket is "missing" when a Fast Scan document exists for a driver in this pay period but
                    no matching approved ticket record is found. Resolve by scanning the ticket or manually
                    entering the ticket number in Fast Scan.
                  </div>
                </div>
              </div>
            )}

            {/* DEDUCTIONS */}
            {activeTab === "deductions" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a" }}>Deductions — {fmtPeriod(periodStart, periodEnd)}</div>
                  <Link href="/ronyx/payroll/deductions" style={{ padding: "7px 14px", borderRadius: 7, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: "0.75rem", textDecoration: "none" }}>
                    Manage Deductions
                  </Link>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.filter(i => i.deductions > 0).map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "#fff", border: "1px solid #e2e8f0" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{item.driver_name}</div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Truck {item.truck_number} · Fuel: {money(item.fuel_deduction)} · Other: {money(item.deductions - item.fuel_deduction)}</div>
                      </div>
                      <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "0.9rem" }}>{money(item.deductions)}</div>
                    </div>
                  ))}
                  {items.filter(i => i.deductions > 0).length === 0 && (
                    <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>No deductions this period</div>
                  )}
                </div>
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", borderRadius: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#dc2626" }}>
                  <span>Total Deductions</span>
                  <span>{money(totalDed)}</span>
                </div>
              </div>
            )}

            {/* REIMBURSEMENTS */}
            {activeTab === "reimbursements" && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>💳</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Reimbursements</div>
                <div style={{ fontSize: "0.8rem", marginBottom: 16 }}>
                  Total this period: <strong style={{ color: "#16a34a" }}>{money(totalReimb)}</strong>
                </div>
                <Link href="/ronyx/payroll/reimbursements" style={{ padding: "8px 18px", borderRadius: 8, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none" }}>
                  Manage Reimbursements
                </Link>
              </div>
            )}

            {/* DISPUTES */}
            {activeTab === "disputes" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 12 }}>Disputed Tickets</div>
                {items.filter(i => i.disputed_tickets > 0).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#16a34a", fontWeight: 700 }}>
                    ✓ No disputed tickets this pay period
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.filter(i => i.disputed_tickets > 0).map(item => (
                      <div key={item.id} style={{ border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", background: "#fffbeb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 800, color: "#92400e" }}>{item.driver_name}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{item.disputed_tickets} disputed ticket(s) · Gross: {money(item.gross_pay)}</div>
                          </div>
                          <Link href={`/ronyx/tickets`} style={{ padding: "6px 12px", borderRadius: 6, background: "#d97706", color: "#fff", fontWeight: 700, fontSize: "0.72rem", textDecoration: "none" }}>
                            Resolve Dispute
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DRIVER INVOICES */}
            {activeTab === "driver_invoices" && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Driver Invoices</div>
                <div style={{ fontSize: "0.8rem", marginBottom: 16 }}>
                  Weekly invoice PDFs are generated after payroll is approved and locked.
                  Drivers can view their own invoices from the Driver Portal.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/ronyx/driver-portal" style={{ padding: "8px 18px", borderRadius: 8, background: "#1d4ed8", color: "#fff", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none" }}>
                    Open Driver Portal
                  </Link>
                </div>
              </div>
            )}

            {/* ACCOUNTING EXPORT */}
            {activeTab === "accounting" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>Accounting Export</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Export to CSV", desc: "Download payroll register for manual import", icon: "📊", action: handleExport },
                    { label: "QuickBooks Export", desc: "Coming soon — QuickBooks integration via Accounting module", icon: "🔗", disabled: true },
                  ].map(card => (
                    <div key={card.label} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, background: "#fff", opacity: card.disabled ? 0.5 : 1 }}>
                      <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{card.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 12 }}>{card.desc}</div>
                      <button
                        onClick={card.action}
                        disabled={card.disabled}
                        style={{ padding: "7px 14px", borderRadius: 7, background: card.disabled ? "#e2e8f0" : "#1d4ed8", color: card.disabled ? "#94a3b8" : "#fff", fontWeight: 700, fontSize: "0.75rem", border: "none", cursor: card.disabled ? "not-allowed" : "pointer" }}
                      >
                        {card.disabled ? "Coming Soon" : card.label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUDIT TRAIL */}
            {activeTab === "audit_trail" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 12 }}>Payroll Audit Trail</div>
                {auditRows.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                    <div style={{ fontSize: "0.82rem", marginBottom: 8 }}>
                      Audit events are written to <code>ronyx_payroll_audit</code> by the payroll engine.
                    </div>
                    <div style={{ fontSize: "0.75rem" }}>Run the engine and approve pay to see audit events here.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {auditRows.map(row => (
                      <div key={row.id} style={{ display: "flex", gap: 12, padding: "10px 14px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{new Date(row.created_at).toLocaleString()}</div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.78rem", color: "#0f172a" }}>{row.driver_name || "System"}</span>
                          {" — "}
                          <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{row.event_type}</span>
                          {row.from_status && row.to_status && (
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}> · {row.from_status} → {row.to_status}</span>
                          )}
                          {row.notes && <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>{row.notes}</div>}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>by {row.performed_by}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {activeTab === "settings" && (
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>Payroll Settings</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Rate Rules", desc: "Configure per-driver pay rates, types, and effective dates", href: "/ronyx/payroll/rules", icon: "💲" },
                    { label: "Deduction Rules", desc: "Set up recurring deductions: fuel, advances, garnishments", href: "/ronyx/payroll/deductions", icon: "➖" },
                    { label: "Pay Period Schedule", desc: "Configure weekly, bi-weekly, or semi-monthly pay cycles", href: "/ronyx/payroll/schedule", icon: "📅" },
                    { label: "Validation Rules", desc: "Customize which validation checks block payroll approval", href: "/ronyx/payroll/validation-rules", icon: "✅" },
                  ].map(card => (
                    <Link key={card.label} href={card.href} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 20, background: "#fff", textDecoration: "none", display: "block", transition: "box-shadow 0.15s" }}>
                      <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>{card.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{card.desc}</div>
                    </Link>
                  ))}
                </div>

                {/* Architecture note */}
                <div style={{ marginTop: 20, padding: "16px 20px", background: "#0f172a", borderRadius: 10, color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.7 }}>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: 6 }}>One-Source-of-Truth Architecture</div>
                  Any update from Dispatch, Drivers, Fleet, Fast Scan, Tickets, Owner Operators, Rates, or Deductions triggers the Payroll Calculation Engine
                  (<code style={{ color: "#818cf8" }}>/api/ronyx/payroll/engine</code>). The engine recalculates the affected driver's pay,
                  runs 11 validation checks, updates status, and writes an immutable audit event.
                  Payroll records are never duplicated — only the master item is updated.
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
