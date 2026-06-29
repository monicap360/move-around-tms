"use client";

/* Accounting Command Center — Phase 1: Overview (KPI cards + Financial Exceptions Queue)
   Ticket-to-cash control for dump truck, aggregate, and hauling operations.
   Seeded with realistic dump-truck demo data; wires to real tables (aggregate_tickets,
   customer_invoices, ronyx_oo_settlements, driver_pay_runs, fuel_transactions,
   financial_exceptions) as they fill. Build order phases 2–8 follow. */

import { Fragment, useMemo, useState } from "react";

// ─── Left navigation ──────────────────────────────────────────────────────────
const NAV = [
  { key: "overview",    label: "Overview",                 icon: "📊", href: "/ronyx/accounting-command-center" },
  { key: "tti",         label: "Ticket-to-Invoice",        icon: "🎫", href: "/ronyx/accounting-command-center/ticket-to-invoice" },
  { key: "ar",          label: "Accounts Receivable",      icon: "💵", href: "/ronyx/accounting-command-center/receivables" },
  { key: "payroll",     label: "Driver Payroll",           icon: "👷", href: "/ronyx/accounting-command-center/payroll" },
  { key: "settlements", label: "Owner Operator Settlements",icon: "🤝", href: "/ronyx/accounting-command-center/settlements" },
  { key: "margin",      label: "Job Costing & Margin",     icon: "📈", href: "/ronyx/accounting-command-center/margin" },
  { key: "fuel",        label: "Fuel & Cost Allocation",   icon: "⛽", href: "/ronyx/accounting-command-center/fuel" },
  { key: "exports",     label: "Accounting Exports",       icon: "🔄", href: "/ronyx/accounting-command-center/exports" },
  { key: "audit",       label: "Financial Audit Trail",    icon: "📜", href: "/ronyx/accounting-command-center/audit" },
  { key: "settings",    label: "Settings",                 icon: "⚙️", href: "/ronyx/accounting-command-center/settings" },
];

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const fmtc = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Seeded demo data (realistic dump-truck operation) ──────────────────────────
type Priority = "Critical" | "High" | "Normal";
type ExcStatus = "Open" | "In Progress" | "Resolved";
type Exception = {
  id: string; priority: Priority; type: string; customer: string; job: string;
  ref: string; truck: string; party: string; impact: number; impactLabel: string;
  ageDays: number; assignedTo: string | null; action: string; status: ExcStatus;
};

const EXCEPTIONS: Exception[] = [
  { id: "E-1041", priority: "Critical", type: "Completed load is not invoiced",        customer: "Holt Paving",        job: "SH-249 Reload",     ref: "TKT-88231", truck: "T-104", party: "Double F Transport", impact: 4820,  impactLabel: "Billing blocked",            ageDays: 6,  assignedTo: null,         action: "Create invoice batch",        status: "Open" },
  { id: "E-1042", priority: "Critical", type: "Invoice total differs from approved ticket total", customer: "Sterling Materials", job: "I-45 Base", ref: "INV-2204", truck: "T-118", party: "Urdaneta Trucking", impact: 1310,  impactLabel: "Customer collection risk",   ageDays: 3,  assignedTo: "Sylvia P",   action: "Open adjustment review",      status: "In Progress" },
  { id: "E-1043", priority: "Critical", type: "Paid ticket was edited and requires adjustment review", customer: "Holt Paving", job: "SH-249 Reload", ref: "TKT-88102", truck: "T-104", party: "Gary Harris (OO)", impact: 640, impactLabel: "Potential duplicate payment", ageDays: 1, assignedTo: null, action: "Create adjustment",         status: "Open" },
  { id: "E-1044", priority: "High",     type: "Missing customer rate",                  customer: "Bayou Aggregates",   job: "Levee Haul",        ref: "TKT-88240", truck: "T-220", party: "Pineda Commodity", impact: 0,     impactLabel: "Margin cannot be calculated", ageDays: 2,  assignedTo: null,         action: "Apply customer rate card",    status: "Open" },
  { id: "E-1045", priority: "High",     type: "Ticket quantity does not match scale ticket", customer: "Sterling Materials", job: "I-45 Base", ref: "TKT-88238", truck: "T-118", party: "Urdaneta Trucking", impact: 285,  impactLabel: "Billing blocked",            ageDays: 2,  assignedTo: "Tabitha L",  action: "Reconcile scale ticket",      status: "In Progress" },
  { id: "E-1046", priority: "High",     type: "Settlement is ready but not approved",    customer: "—",                  job: "Wk 26 Settlement",  ref: "STL-0613", truck: "—",     party: "Indy Dump LLC.",   impact: 7240,  impactLabel: "Payroll blocked",            ageDays: 4,  assignedTo: null,         action: "Approve settlement",          status: "Open" },
  { id: "E-1047", priority: "High",     type: "Customer is on credit hold",             customer: "Delta Earthworks",   job: "Pad 7",             ref: "INV-2188", truck: "—",     party: "—",                impact: 9650,  impactLabel: "Customer collection risk",   ageDays: 38, assignedTo: "Sylvia P",   action: "Escalate to manager",         status: "Open" },
  { id: "E-1048", priority: "Normal",   type: "Driver pay rate missing",                customer: "—",                  job: "Wk 26 Payroll",     ref: "PAY-3310", truck: "T-131", party: "M. Chen (driver)", impact: 0,     impactLabel: "Payroll blocked",            ageDays: 1,  assignedTo: null,         action: "Edit pay rule",               status: "Open" },
  { id: "E-1049", priority: "Normal",   type: "Fuel transaction is unmatched",          customer: "—",                  job: "—",                 ref: "FUEL-7781",truck: "T-220", party: "Pineda Commodity", impact: 412,   impactLabel: "Margin cannot be calculated", ageDays: 5,  assignedTo: null,         action: "Allocate to truck/job",       status: "Open" },
  { id: "E-1050", priority: "Normal",   type: "Customer rate below minimum margin",     customer: "Bayou Aggregates",   job: "Levee Haul",        ref: "TKT-88241", truck: "T-220", party: "Pineda Commodity", impact: 180,   impactLabel: "Margin cannot be calculated", ageDays: 2,  assignedTo: "Tabitha L",  action: "Review rate vs. minimum",     status: "In Progress" },
  { id: "E-1051", priority: "Normal",   type: "Maintenance cost is not assigned to a truck", customer: "—",              job: "—",                 ref: "MNT-5102", truck: "—",     party: "—",                impact: 1240,  impactLabel: "Margin cannot be calculated", ageDays: 9,  assignedTo: null,         action: "Assign to truck",             status: "Open" },
  { id: "E-1052", priority: "Normal",   type: "Duplicate ticket number",                customer: "Holt Paving",        job: "SH-249 Reload",     ref: "TKT-88102", truck: "T-104", party: "Gary Harris (OO)", impact: 640,   impactLabel: "Potential duplicate payment", ageDays: 1,  assignedTo: null,         action: "Merge / void duplicate",      status: "Open" },
  { id: "E-1053", priority: "Normal",   type: "Invoice is overdue",                     customer: "Lone Star Ready Mix",job: "Plant 3",           ref: "INV-2156", truck: "—",     party: "—",                impact: 3120,  impactLabel: "Customer collection risk",   ageDays: 64, assignedTo: "Sylvia P",   action: "Send reminder / statement",   status: "Open" },
  { id: "E-1054", priority: "Normal",   type: "Owner operator deduction exceeds approved limit", customer: "—",         job: "Wk 26 Settlement",  ref: "STL-0611", truck: "T-220", party: "Pineda Commodity", impact: 350,   impactLabel: "Payroll blocked",            ageDays: 4,  assignedTo: null,         action: "Review deduction",            status: "Resolved" },
];

const PRIORITY_STYLE: Record<Priority, { bg: string; fg: string }> = {
  Critical: { bg: "#fee2e2", fg: "#dc2626" },
  High:     { bg: "#ffedd5", fg: "#ea580c" },
  Normal:   { bg: "#e0e7ff", fg: "#4338ca" },
};
const IMPACT_STYLE: Record<string, { bg: string; fg: string }> = {
  "Billing blocked":            { bg: "#fef2f2", fg: "#b91c1c" },
  "Payroll blocked":            { bg: "#fff7ed", fg: "#c2410c" },
  "Potential duplicate payment":{ bg: "#fdf2f8", fg: "#be185d" },
  "Margin cannot be calculated":{ bg: "#f5f3ff", fg: "#6d28d9" },
  "Customer collection risk":   { bg: "#ecfeff", fg: "#0e7490" },
};

const ROW_ACTIONS = ["View Details", "Assign", "Resolve", "Request Info", "Create Adjustment", "Add Note", "Mark N/A"];

export default function AccountingCommandCenter() {
  const [priFilter, setPriFilter] = useState<"All" | Priority | "Assigned to Me" | "Unassigned" | "Resolved">("All");
  const [kpiFilter, setKpiFilter] = useState<string | null>(null);
  const [openRow, setOpenRow]     = useState<string | null>(null);
  const ME = "Sylvia P";

  const visible = useMemo(() => {
    return EXCEPTIONS.filter(e => {
      if (priFilter === "Resolved")        return e.status === "Resolved";
      if (e.status === "Resolved")         return false; // hide resolved from active views
      if (priFilter === "Assigned to Me")  return e.assignedTo === ME;
      if (priFilter === "Unassigned")      return !e.assignedTo;
      if (priFilter === "All")             return true;
      return e.priority === priFilter;
    });
  }, [priFilter]);

  // KPI values (seeded; each card filters the queue)
  const openExc = EXCEPTIONS.filter(e => e.status !== "Resolved");
  const kpis = [
    { key: "revenue",  label: "Revenue This Period",      value: fmt(248300), sub: "+12.4% vs prior period",          tone: "#16a34a" },
    { key: "unbilled", label: "Unbilled Load Value",      value: fmt(38940),  sub: "27 approved loads not invoiced",   tone: "#b45309", filter: "Completed load is not invoiced" },
    { key: "ar",       label: "A/R Outstanding",          value: fmt(96120),  sub: `${fmt(15890)} overdue`,            tone: "#dc2626", filter: "Invoice is overdue" },
    { key: "payable",  label: "Driver / OO Payable",      value: fmt(41730),  sub: "Approved, awaiting payment",        tone: "#1d4ed8", filter: "Settlement is ready but not approved" },
    { key: "margin",   label: "Gross Margin",             value: fmt(71240),  sub: "28.7% this period",                tone: "#15803d" },
    { key: "atrisk",   label: "Margin at Risk",           value: fmt(8460),   sub: "Missing cost / disputed rate",      tone: "#ea580c", filter: "Margin cannot be calculated" },
    { key: "exc",      label: "Financial Exceptions",     value: String(openExc.length), sub: "Need staff action",      tone: "#7c3aed", filter: "__all" },
    { key: "cash",     label: "Cash Collected",           value: fmt(132540), sub: "Payments received this period",     tone: "#0e7490" },
  ];

  function onKpi(k: any) {
    if (!k.filter) { setKpiFilter(null); return; }
    setKpiFilter(k.filter === "__all" ? null : k.filter);
    setPriFilter("All");
    document.getElementById("exceptions")?.scrollIntoView({ behavior: "smooth" });
  }

  const queue = kpiFilter ? visible.filter(e => e.type === kpiFilter) : visible;

  const FILTERS: typeof priFilter[] = ["Critical", "High", "Normal", "All", "Assigned to Me", "Unassigned", "Resolved"];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f1f5f9", color: "#0f172a" }}>
      {/* Left nav — bright, each item a distinct tab card */}
      <aside style={{ width: 248, background: "#f1f5f9", borderRight: "1px solid #e2e8f0", color: "#334155", flexShrink: 0, padding: "18px 0", position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "0 16px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em" }}>MOVEAROUND TMS</div>
          <div style={{ fontWeight: 900, fontSize: "1.02rem", marginTop: 2, color: "#0f172a" }}>Accounting</div>
        </div>
        <nav style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
          {NAV.map(n => {
            const active = n.key === "overview";
            return (
              <a key={n.key} href={n.href} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 10,
                fontSize: "0.82rem", fontWeight: 800, textDecoration: "none",
                color: active ? "#fff" : "#334155",
                background: active ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "#fff",
                border: active ? "1px solid #1d4ed8" : "1px solid #e2e8f0",
                boxShadow: active ? "0 2px 8px rgba(29,78,216,0.28)" : "0 1px 2px rgba(15,23,42,0.05)",
              }}>
                <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, padding: "20px 26px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>Accounting Command Center</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>Live financial control across tickets, invoicing, settlements, receivables, and job margin.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {["This Period ▾", "All Companies ▾", "All Customers ▾", "All Jobs ▾"].map(c => (
              <button key={c} style={ctrlBtn}>{c}</button>
            ))}
            <button style={{ ...ctrlBtn, background: "#fff" }}>⬇ Export</button>
            <button style={primaryBtn}>+ Create Invoice</button>
            <button style={{ ...primaryBtn, background: "#0e7490" }}>Run Settlement</button>
            <button style={{ ...primaryBtn, background: "#1e293b" }}>🔒 Lock Period</button>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 24 }}>
          {kpis.map(k => (
            <button key={k.key} onClick={() => onKpi(k)} style={{ textAlign: "left", background: "#fff", border: `1px solid ${kpiFilter && k.filter === kpiFilter ? k.tone : "#e2e8f0"}`, borderRadius: 12, padding: "14px 16px", cursor: k.filter ? "pointer" : "default", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.tone, marginTop: 6, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 5 }}>{k.sub}</div>
            </button>
          ))}
        </div>

        {/* Financial Exceptions Queue */}
        <section id="exceptions" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>Financial Exceptions Requiring Action</h2>
                <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: "0.8rem" }}>Every record here is blocking billing, payroll, a payment, or a margin calculation.{kpiFilter && <> · filtered by <strong>{kpiFilter}</strong> <button onClick={() => setKpiFilter(null)} style={{ ...chip, marginLeft: 6, cursor: "pointer" }}>clear ✕</button></>}</p>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FILTERS.map(f => {
                  const active = priFilter === f;
                  return <button key={f} onClick={() => setPriFilter(f)} style={{ ...chip, cursor: "pointer", background: active ? "#0f172a" : "#f1f5f9", color: active ? "#fff" : "#475569", fontWeight: 800 }}>{f}</button>;
                })}
              </div>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: 1100 }}>
              <thead>
                <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                  {["Priority", "Exception Type", "Customer", "Job", "Ref #", "Truck", "Driver / OO", "Impact", "Age", "Assigned", "Recommended Action", "Status", ""].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queue.map(e => {
                  const ps = PRIORITY_STYLE[e.priority];
                  const is = IMPACT_STYLE[e.impactLabel] || { bg: "#f1f5f9", fg: "#475569" };
                  return (
                    <Fragment key={e.id}>
                      <tr style={{ borderBottom: "1px solid #f1f5f9", background: openRow === e.id ? "#f8fafc" : "transparent" }}>
                        <td style={td}><span style={{ ...chip, background: ps.bg, color: ps.fg, fontWeight: 800 }}>{e.priority}</span></td>
                        <td style={{ ...td, fontWeight: 700, maxWidth: 230 }}>{e.type}
                          <div><span style={{ ...chip, background: is.bg, color: is.fg, marginTop: 4, fontSize: "0.62rem" }}>{e.impactLabel}</span></div>
                        </td>
                        <td style={td}>{e.customer}</td>
                        <td style={td}>{e.job}</td>
                        <td style={{ ...td, color: "#4338ca", fontWeight: 700, whiteSpace: "nowrap" }}>{e.ref}</td>
                        <td style={td}>{e.truck}</td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{e.party}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 800, color: e.impact > 0 ? "#0f172a" : "#94a3b8" }}>{e.impact > 0 ? fmtc(e.impact) : "—"}</td>
                        <td style={{ ...td, color: e.ageDays > 30 ? "#dc2626" : "#64748b", fontWeight: e.ageDays > 30 ? 800 : 600, whiteSpace: "nowrap" }}>{e.ageDays}d</td>
                        <td style={td}>{e.assignedTo || <span style={{ color: "#cbd5e1" }}>Unassigned</span>}</td>
                        <td style={{ ...td, color: "#1d4ed8", fontWeight: 700, maxWidth: 180 }}>{e.action}</td>
                        <td style={td}><span style={{ ...chip, background: e.status === "Open" ? "#fef2f2" : e.status === "In Progress" ? "#eff6ff" : "#f0fdf4", color: e.status === "Open" ? "#dc2626" : e.status === "In Progress" ? "#1d4ed8" : "#15803d" }}>{e.status}</span></td>
                        <td style={td}><button onClick={() => setOpenRow(openRow === e.id ? null : e.id)} style={{ ...chip, cursor: "pointer", background: "#0f172a", color: "#fff" }}>{openRow === e.id ? "Close" : "Open ▾"}</button></td>
                      </tr>
                      {openRow === e.id && (
                        <tr>
                          <td colSpan={13} style={{ padding: "12px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#475569", marginRight: 4 }}>{e.id} actions:</span>
                              {ROW_ACTIONS.map(a => (
                                <button key={a} style={{ ...chip, cursor: "pointer", background: a === "Resolve" ? "#16a34a" : a === "Mark N/A" ? "#fef2f2" : "#fff", color: a === "Resolve" ? "#fff" : a === "Mark N/A" ? "#dc2626" : "#1e293b", border: "1px solid #e2e8f0", fontWeight: 700 }}>{a}</button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {queue.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>No exceptions in this view. Cleared queues mean billing, payroll, and margin are all unblocked.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 18px", borderTop: "1px solid #f1f5f9", fontSize: "0.72rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>Showing {queue.length} of {openExc.length} open exceptions · {fmtc(queue.reduce((s, e) => s + e.impact, 0))} financial impact in view</span>
            <span>Phase 1 of 8 · seeded demo data — wires to financial_exceptions as the generator fills it</span>
          </div>
        </section>
      </main>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const ctrlBtn: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", cursor: "pointer", whiteSpace: "nowrap" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: "0.78rem", fontWeight: 800, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" };
const th: React.CSSProperties = { textAlign: "left", padding: "9px 12px", fontSize: "0.66rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "10px 12px", color: "#334155", verticalAlign: "top" };
const chip: React.CSSProperties = { display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" };
