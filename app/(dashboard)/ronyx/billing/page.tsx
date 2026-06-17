"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type TabKey =
  | "mission_control"
  | "lifecycle"
  | "customer_billing"
  | "payroll_queue"
  | "pay_sheet"
  | "oo_payout"
  | "unpaid"
  | "void"
  | "deductions"
  | "exceptions"
  | "staff_todos"
  | "history";

type TicketRow = {
  id: string;
  contractor_name: string | null;
  truck_number: string | null;
  ticket_date: string | null;
  ticket_number: string | null;
  job_name: string | null;
  job_description: string | null;
  qty: number | null;
  haul_rate: number | null;
  full_rate: number | null;
  ticket_value: number | null;
  void_status: string | null;
  job_number: string | null;
  notes: string | null;
  lewis_percent: number | null;
  contractor_percent: number | null;
  c_truck_total: number | null;
  payout_rate: number | null;
  payout: number | null;
  customer_invoice_status: string;
  payroll_invoice_status: string;
  reconciliation_status: string;
};

type CustomerInvoice = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  job_number: string | null;
  invoice_date: string | null;
  invoice_status: string;
  ar_status: string;
  ticket_count: number;
  invoice_total: number;
};

type PayrollInvoice = {
  id: string;
  payroll_invoice_number: string | null;
  contractor_name: string | null;
  truck_number: string | null;
  payroll_week_start: string | null;
  payroll_week_end: string | null;
  status: string;
  ticket_total: number;
  deduction_total: number;
  total_paid: number;
};

type Exception = {
  id: string;
  exception_type: string;
  severity: string;
  issue: string | null;
  dollar_impact: number;
  next_best_action: string | null;
  status: string;
  contractor_name?: string | null;
  truck_number?: string | null;
  ticket_number?: string | null;
};

type KPIs = {
  approved_tickets: number;
  customer_invoices_ready: number;
  payroll_invoices_ready: number;
  unpaid_tickets: number;
  void_tickets: number;
  ticket_value_total: number;
  payout_total: number;
  deductions_total: number;
  total_paid: number;
  invoice_mismatches: number;
  missing_proof: number;
  ready_to_send: number;
};

const EMPTY_KPIS: KPIs = {
  approved_tickets: 0, customer_invoices_ready: 0, payroll_invoices_ready: 0,
  unpaid_tickets: 0, void_tickets: 0, ticket_value_total: 0, payout_total: 0,
  deductions_total: 0, total_paid: 0, invoice_mismatches: 0, missing_proof: 0, ready_to_send: 0,
};

const TABS: { id: TabKey; label: string; icon: string }[] = [
  { id: "mission_control", label: "Mission Control",          icon: "⚡" },
  { id: "lifecycle",       label: "Ticket → Invoice",         icon: "🔄" },
  { id: "customer_billing",label: "Customer Billing",         icon: "💵" },
  { id: "payroll_queue",   label: "Payroll Invoice Queue",    icon: "📋" },
  { id: "pay_sheet",       label: "Contractor Pay Sheet",     icon: "🧾" },
  { id: "oo_payout",       label: "Owner Operator Payouts",   icon: "🚛" },
  { id: "unpaid",          label: "Unpaid Tickets",           icon: "⚠️" },
  { id: "void",            label: "Void / Excluded",          icon: "🚫" },
  { id: "deductions",      label: "Deductions & Adjustments", icon: "➖" },
  { id: "exceptions",      label: "Reconciliation Exceptions",icon: "🔴" },
  { id: "staff_todos",     label: "Staff To-Do List",         icon: "✅" },
  { id: "history",         label: "Invoice History",          icon: "📜" },
];

const LIFECYCLE_STATUSES = [
  { label: "Imported",                color: "#64748b", bg: "#f1f5f9" },
  { label: "Needs Review",            color: "#d97706", bg: "#fef3c7" },
  { label: "Approved",                color: "#15803d", bg: "#f0fdf4" },
  { label: "Customer Invoice Ready",  color: "#1e40af", bg: "#dbeafe" },
  { label: "Payroll Invoice Ready",   color: "#7c3aed", bg: "#ede9fe" },
  { label: "Customer Invoiced",       color: "#0891b2", bg: "#e0f2fe" },
  { label: "Payroll Invoice Generated", color: "#4f46e5", bg: "#eef2ff" },
  { label: "Paid",                    color: "#15803d", bg: "#dcfce7" },
  { label: "Unpaid",                  color: "#dc2626", bg: "#fee2e2" },
  { label: "Void",                    color: "#94a3b8", bg: "#f8fafc" },
  { label: "Mismatch",               color: "#b45309", bg: "#fef3c7" },
];

const DEDUCTION_TYPES = [
  "Insurance","Driver Pay","Truck Payment","Advance","Payment","Balance",
  "Original Loan","Previous Balance","New Balance","Shop","Fuel","Repair",
  "Parts","Loan","Trailer Payment","Admin Fee","Other",
];

const UNPAID_REASONS = [
  "Not Invoiced","Not Paid","Missing Customer Invoice","Missing Payroll Invoice",
  "Missing Proof","Void Review","Rate Missing","Job # Missing","Contractor Missing","Duplicate",
];

const PAYROLL_HOLD_REASONS = [
  "Missing Ticket","Missing Proof","Void Ticket","Rate Mismatch","Qty Mismatch",
  "Duplicate Ticket","Missing Contractor","Missing Truck","Missing CCB Approval",
  "Deduction Needs Approval","Loan Agreement Missing",
];

function fmt$(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtN(n: number | null) { return n === null ? "—" : n.toLocaleString(); }
function fmtPct(n: number | null) { return n === null ? "—" : n.toFixed(1) + "%"; }

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: "2px 9px", fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SeverityBadge({ s }: { s: string }) {
  const m: Record<string, { color: string; bg: string }> = {
    critical: { color: "#dc2626", bg: "#fee2e2" },
    high:     { color: "#c2410c", bg: "#fff7ed" },
    medium:   { color: "#b45309", bg: "#fef3c7" },
    low:      { color: "#15803d", bg: "#f0fdf4" },
  };
  const c = m[s.toLowerCase()] || m.medium;
  return <span style={{ ...c, borderRadius: 5, padding: "1px 7px", fontSize: "0.65rem", fontWeight: 800, textTransform: "capitalize" }}>{s}</span>;
}

export default function InvoiceCommandCenter() {
  const [tab, setTab]                     = useState<TabKey>("mission_control");
  const [kpis, setKpis]                   = useState<KPIs>(EMPTY_KPIS);
  const [ticketRows, setTicketRows]        = useState<TicketRow[]>([]);
  const [custInvoices, setCustInvoices]   = useState<CustomerInvoice[]>([]);
  const [payrollInvoices, setPayrollInvoices] = useState<PayrollInvoice[]>([]);
  const [exceptions, setExceptions]       = useState<Exception[]>([]);
  const [loading, setLoading]             = useState(true);
  const [toast, setToast]                 = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterContractor, setFilterContractor] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const payrollImportRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, tRes, cRes, pRes, eRes] = await Promise.all([
        fetch("/api/ronyx/invoice-command/kpis"),
        fetch("/api/ronyx/invoice-command/ticket-rows"),
        fetch("/api/ronyx/invoice-command/customer-invoices"),
        fetch("/api/ronyx/invoice-command/payroll-invoices"),
        fetch("/api/ronyx/invoice-command/exceptions"),
      ]);
      if (kRes.ok) { const d = await kRes.json(); setKpis(d.kpis || EMPTY_KPIS); }
      if (tRes.ok) { const d = await tRes.json(); setTicketRows(d.rows || []); }
      if (cRes.ok) { const d = await cRes.json(); setCustInvoices(d.invoices || []); }
      if (pRes.ok) { const d = await pRes.json(); setPayrollInvoices(d.invoices || []); }
      if (eRes.ok) { const d = await eRes.json(); setExceptions(d.exceptions || []); }
    } catch { /* tables may not exist yet — pages show empty state */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generateCustomerInvoices() {
    showToast("Generating customer invoices from approved tickets…");
    const res = await fetch("/api/ronyx/invoice-command/generate-customer", { method: "POST" });
    const d = await res.json();
    showToast(d.message || "Customer invoices generated.");
    load();
  }

  async function generatePayrollInvoices() {
    showToast("Generating payroll invoices…");
    const res = await fetch("/api/ronyx/invoice-command/generate-payroll", { method: "POST" });
    const d = await res.json();
    showToast(d.message || "Payroll invoices generated.");
    load();
  }

  function handleImport(file: File, source: "erocks" | "payroll") {
    const form = new FormData();
    form.append("file", file);
    form.append("source_type", source);
    showToast(`Importing ${source === "erocks" ? "eRocks / Pit" : "Payroll Invoice"} sheet…`);
    fetch("/api/ronyx/invoice-command/import", { method: "POST", body: form })
      .then(r => r.json())
      .then(d => { showToast(d.message || "Import complete."); load(); })
      .catch(() => showToast("Import failed — check file format."));
  }

  // ── Style helpers ────────────────────────────────────────────────────────
  const th: React.CSSProperties = { padding: "7px 10px", fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap", background: "#f8fafc" };
  const td: React.CSSProperties = { padding: "8px 10px", fontSize: "0.76rem", borderBottom: "1px solid #f8fafc", verticalAlign: "middle" };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" };
  const darkPanel: React.CSSProperties = { background: "#0f172a", borderRadius: 12, padding: "18px 22px" };

  const invoiceStatColor = (s: string) => {
    if (s === "paid") return "#15803d"; if (s === "sent") return "#0891b2";
    if (s === "draft") return "#94a3b8"; if (s === "overdue") return "#dc2626";
    return "#d97706";
  };

  const unpaidRows  = ticketRows.filter(r => r.void_status !== "void" && r.payroll_invoice_status === "not_ready" && r.customer_invoice_status === "not_ready");
  const voidRows    = ticketRows.filter(r => r.void_status === "void" || r.void_status === "excluded");
  const custReady   = ticketRows.filter(r => r.customer_invoice_status === "ready");
  const payrollReady = ticketRows.filter(r => r.payroll_invoice_status === "ready");

  const contractors = [...new Set(ticketRows.map(r => r.contractor_name).filter(Boolean))].sort() as string[];

  const paySheetRows = ticketRows.filter(r =>
    (!filterContractor || r.contractor_name === filterContractor) &&
    r.void_status !== "void"
  );

  const paySheetTotal        = paySheetRows.reduce((a, r) => a + (r.ticket_value || 0), 0);
  const paySheetPayoutTotal  = paySheetRows.reduce((a, r) => a + (r.payout || 0), 0);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background: "#0f172a", padding: "24px 32px 0" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>Ronyx TMS</div>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#f8fafc" }}>Invoice Command Center</h1>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 14 }}>Customer Billing &nbsp;•&nbsp; Payroll Invoices &nbsp;•&nbsp; Contractor Payouts</div>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 18, maxWidth: 760, lineHeight: 1.6 }}>
            Generate customer invoices from approved tickets, create payroll invoices for contractors and owner operators, calculate payouts, track deductions, and flag unpaid or mismatched tickets.
          </div>

          {/* Primary action buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Generate Customer Invoices", action: generateCustomerInvoices, bg: "#1e40af" },
              { label: "Generate Payroll Invoices",  action: generatePayrollInvoices,  bg: "#7c3aed" },
              { label: "Import eRocks / Pit Tickets",action: () => importRef.current?.click(), bg: "#0f766e" },
              { label: "Import Payroll Invoice Sheet",action: () => payrollImportRef.current?.click(), bg: "#0f766e" },
              { label: "Review Unpaid Tickets",      action: () => setTab("unpaid"), bg: "#dc2626" },
            ].map(b => (
              <button key={b.label} onClick={b.action} style={{ padding: "8px 16px", borderRadius: 8, background: b.bg, color: "#fff", border: "none", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                {b.label}
              </button>
            ))}
            <a href="/ronyx" style={{ padding: "8px 16px", borderRadius: 8, background: "#1e293b", color: "#94a3b8", textDecoration: "none", fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
              ← Dashboard
            </a>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 0, overflowX: "auto", paddingBottom: 0 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap",
                color: tab === t.id ? "#fff" : "#64748b",
                borderBottom: tab === t.id ? "2px solid #4ade80" : "2px solid transparent",
                marginBottom: -1,
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { handleImport(f, "erocks"); e.target.value = ""; } }} />
      <input ref={payrollImportRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) { handleImport(f, "payroll"); e.target.value = ""; } }} />

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 32px" }}>

        {/* ── 1. MISSION CONTROL ──────────────────────────────────────── */}
        {tab === "mission_control" && (
          <div>
            <div style={{ ...darkPanel, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: "#4ade80", fontSize: "0.82rem", marginBottom: 8 }}>Today&apos;s Invoice Focus</div>
              <div style={{ fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.7, marginBottom: 12 }}>
                Approved tickets are ready to become either <strong style={{ color: "#fde68a" }}>Customer Billing Invoices</strong> or <strong style={{ color: "#a5b4fc" }}>Payroll Invoices / Contractor Pay Sheets</strong>.
              </div>
              <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", fontSize: "0.76rem", color: "#fde68a", fontWeight: 700 }}>
                AI Recommended First Action: Review unpaid tickets, void tickets, and payroll invoice mismatches before generating final invoices.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Approved Tickets",        value: kpis.approved_tickets,        color: "#0f172a" },
                { label: "Customer Invoices Ready",  value: kpis.customer_invoices_ready, color: "#1e40af" },
                { label: "Payroll Invoices Ready",   value: kpis.payroll_invoices_ready,  color: "#7c3aed" },
                { label: "Unpaid Tickets",           value: kpis.unpaid_tickets,          color: "#dc2626" },
              ].map(k => (
                <div key={k.label} style={{ ...card, padding: "18px 20px" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 900, color: k.color }}>{fmtN(k.value)}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Ticket Value Total", value: fmt$(kpis.ticket_value_total), color: "#0f172a",  sub: "gross billing value" },
                { label: "Payout Total",        value: fmt$(kpis.payout_total),        color: "#7c3aed", sub: "contractor payouts" },
                { label: "Deductions Total",    value: fmt$(kpis.deductions_total),    color: "#dc2626", sub: "ins, loans, shop, advances" },
                { label: "Total Paid",          value: fmt$(kpis.total_paid),          color: "#15803d", sub: "net after deductions" },
              ].map(k => (
                <div key={k.label} style={{ ...card, padding: "18px 20px" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 2 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {[
                { label: "Invoice Mismatches", value: kpis.invoice_mismatches, bad: kpis.invoice_mismatches > 0 },
                { label: "Missing Proof",       value: kpis.missing_proof,       bad: kpis.missing_proof > 0 },
                { label: "Void Tickets",        value: kpis.void_tickets,        bad: false },
                { label: "Ready to Send",       value: kpis.ready_to_send,       bad: false },
              ].map(k => (
                <div key={k.label} style={{ ...card, padding: "16px 20px" }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: k.bad ? "#dc2626" : "#0f172a" }}>{fmtN(k.value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. LIFECYCLE ───────────────────────────────────────────── */}
        {tab === "lifecycle" && (
          <div>
            <div style={{ ...card, padding: "24px 28px", marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 900, color: "#0f172a" }}>Ticket → Invoice Lifecycle</h2>
              <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
                Approved tickets are converted into <strong>customer invoices</strong> and <strong>payroll invoices</strong>.<br />
                Customer invoices track money <em>owed by the customer</em>.<br />
                Payroll invoices calculate money <em>owed to contractors, drivers, and owner operators</em> after rates, percentages, deductions, advances, truck payments, insurance, shop charges, and balances are applied.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LIFECYCLE_STATUSES.map(s => <StatusBadge key={s.label} {...s} />)}
              </div>
            </div>

            <div style={{ ...darkPanel, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: "#4ade80", fontSize: "0.82rem", marginBottom: 14 }}>Ticket → Invoice Flow</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: "0.78rem", color: "#cbd5e1" }}>
                {[
                  "Fast Scan / eRocks Import",
                  "Ticket Review",
                  "Approved Ticket",
                  "Customer Billing Invoice  ↕  Payroll Invoice / Contractor Pay Sheet",
                  "Reconcile Both Sides",
                  "Flag Mismatch / Unpaid / Void / Missing Proof / Deduction Issue",
                ].map((step, i, arr) => (
                  <div key={step} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: "#1e293b", borderRadius: 8, padding: "8px 12px", fontWeight: 700, color: step.includes("↕") ? "#fde68a" : "#f8fafc", fontSize: "0.74rem" }}>
                      {step}
                    </div>
                    {i < arr.length - 1 && <span style={{ color: "#4ade80", fontWeight: 900 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: "20px 24px" }}>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem", marginBottom: 14 }}>Two Invoice Lanes — Both Required</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ background: "#eff6ff", borderRadius: 10, padding: "16px 18px", border: "1px solid #bfdbfe" }}>
                  <div style={{ fontWeight: 900, color: "#1e40af", marginBottom: 8 }}>💵 Customer Billing Invoice</div>
                  <div style={{ fontSize: "0.76rem", color: "#1e40af", lineHeight: 1.7 }}>
                    Money owed <strong>to Ronyx / company</strong> from customer tickets.<br />
                    Ticket → Customer Invoice → AR → Paid
                  </div>
                </div>
                <div style={{ background: "#f5f3ff", borderRadius: 10, padding: "16px 18px", border: "1px solid #ddd6fe" }}>
                  <div style={{ fontWeight: 900, color: "#7c3aed", marginBottom: 8 }}>🧾 Payroll Invoice / Contractor Pay Sheet</div>
                  <div style={{ fontSize: "0.76rem", color: "#6d28d9", lineHeight: 1.7 }}>
                    Money owed <strong>out to drivers, owner operators, contractors, trucks</strong>.<br />
                    Ticket → Payout Calc → Deductions → Total Paid
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. CUSTOMER BILLING QUEUE ────────────────────────────── */}
        {tab === "customer_billing" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Customer Billing Queue</h2>
                <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>Money coming in — invoices owed by customers</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={generateCustomerInvoices} style={{ padding: "8px 16px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  Generate Customer Invoices
                </button>
              </div>
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Customer","Job #","Invoice #","Invoice Date","Tickets","Invoice Total","Status","AR Status","Action"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {custInvoices.length === 0 && (
                    <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                      No customer invoices yet — generate from approved tickets or import eRocks data
                    </td></tr>
                  )}
                  {custInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ ...td, fontWeight: 700 }}>{inv.customer_name || "—"}</td>
                      <td style={td}>{inv.job_number || "—"}</td>
                      <td style={td}><code style={{ fontSize: "0.7rem" }}>{inv.invoice_number || "—"}</code></td>
                      <td style={td}>{inv.invoice_date || "—"}</td>
                      <td style={td}>{inv.ticket_count}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmt$(inv.invoice_total)}</td>
                      <td style={td}><span style={{ background: "#f1f5f9", color: invoiceStatColor(inv.invoice_status), borderRadius: 5, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>{inv.invoice_status}</span></td>
                      <td style={td}><span style={{ background: inv.ar_status === "paid" ? "#f0fdf4" : "#fef9c3", color: inv.ar_status === "paid" ? "#15803d" : "#854d0e", borderRadius: 5, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>{inv.ar_status}</span></td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={{ padding: "3px 8px", background: "#eff6ff", color: "#1e40af", border: "none", borderRadius: 5, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>View</button>
                          <button style={{ padding: "3px 8px", background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 5, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Mark Sent</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {custReady.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 10 }}>
                  Tickets Ready to Invoice ({custReady.length})
                </div>
                <div style={card}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Contractor","Truck #","Ticket Date","Ticket #","Job Name","Qty","Haul Rate","Full Rate","Ticket Value","Action"].map(h => <th key={h} style={th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {custReady.map(r => (
                        <tr key={r.id}>
                          <td style={td}>{r.contractor_name || "—"}</td>
                          <td style={td}>{r.truck_number || "—"}</td>
                          <td style={td}>{r.ticket_date || "—"}</td>
                          <td style={td}><code style={{ fontSize: "0.7rem" }}>{r.ticket_number || "—"}</code></td>
                          <td style={td}>{r.job_name || "—"}</td>
                          <td style={td}>{fmtN(r.qty)}</td>
                          <td style={td}>{r.haul_rate ? fmt$(r.haul_rate) : "—"}</td>
                          <td style={td}>{r.full_rate ? fmt$(r.full_rate) : "—"}</td>
                          <td style={{ ...td, fontWeight: 700 }}>{r.ticket_value ? fmt$(r.ticket_value) : "—"}</td>
                          <td style={td}><button style={{ padding: "3px 8px", background: "#dbeafe", color: "#1e40af", border: "none", borderRadius: 5, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Add to Invoice</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. PAYROLL INVOICE QUEUE ─────────────────────────────── */}
        {tab === "payroll_queue" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2 style={{ margin: 0, fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Payroll Invoice Queue</h2>
                <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 2 }}>Money going out — payouts owed to contractors and owner operators</div>
              </div>
              <button onClick={generatePayrollInvoices} style={{ padding: "8px 16px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                Generate Payroll Invoices
              </button>
            </div>

            <div style={{ ...card, marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Contractor","Truck #","Payroll Week","Ticket Total","Deductions","Total Paid","Status","Action"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {payrollInvoices.length === 0 && (
                    <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                      No payroll invoices yet — generate from approved ticket rows or import payroll sheet
                    </td></tr>
                  )}
                  {payrollInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ ...td, fontWeight: 700 }}>{inv.contractor_name || "—"}</td>
                      <td style={td}>{inv.truck_number || "—"}</td>
                      <td style={td}>{inv.payroll_week_start ? `${inv.payroll_week_start} – ${inv.payroll_week_end || ""}` : "—"}</td>
                      <td style={td}>{fmt$(inv.ticket_total)}</td>
                      <td style={{ ...td, color: "#dc2626" }}>{fmt$(inv.deduction_total)}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#15803d" }}>{fmt$(inv.total_paid)}</td>
                      <td style={td}><span style={{ background: "#ede9fe", color: "#7c3aed", borderRadius: 5, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700 }}>{inv.status}</span></td>
                      <td style={td}><button style={{ padding: "3px 8px", background: "#f5f3ff", color: "#7c3aed", border: "none", borderRadius: 5, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>View Pay Sheet</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ ...card, padding: "18px 22px" }}>
              <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 10 }}>Payroll Calculation Rules</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontSize: "0.74rem", color: "#475569" }}>
                {[
                  { formula: "Ticket Value = Qty × Full Rate",                     color: "#dbeafe" },
                  { formula: "C Truck Total = Ticket Value × C %",                  color: "#ede9fe" },
                  { formula: "Payout = Qty × Rate  (fixed rate rule)",               color: "#dcfce7" },
                  { formula: "Payout = C Truck Total  (percentage rule)",            color: "#fef3c7" },
                  { formula: "Total Paid = Ticket Total − Deductions",               color: "#fee2e2" },
                  { formula: "Deductions: Insurance + Driver Pay + Truck Payment + Advance + Shop + Loans", color: "#f1f5f9" },
                ].map(f => (
                  <div key={f.formula} style={{ background: f.color, borderRadius: 8, padding: "10px 12px", fontWeight: 600, lineHeight: 1.5 }}>
                    {f.formula}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 5. CONTRACTOR PAY SHEET ──────────────────────────────── */}
        {tab === "pay_sheet" && (
          <div>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Contractor Pay Sheet Builder</h2>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Select a contractor to build their pay sheet</div>
              </div>
              <select value={filterContractor} onChange={e => setFilterContractor(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#fff", marginLeft: "auto" }}>
                <option value="">— All Contractors —</option>
                {contractors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {filterContractor && (
              <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: "0.78rem" }}>
                  <div><span style={{ color: "#94a3b8", fontWeight: 700 }}>Contractor:</span> <span style={{ fontWeight: 900, color: "#0f172a" }}>{filterContractor}</span></div>
                  <div><span style={{ color: "#94a3b8", fontWeight: 700 }}>Tickets:</span> <span style={{ fontWeight: 700 }}>{paySheetRows.length}</span></div>
                  <div><span style={{ color: "#94a3b8", fontWeight: 700 }}>Ticket Total:</span> <span style={{ fontWeight: 700, color: "#1e40af" }}>{fmt$(paySheetTotal)}</span></div>
                  <div><span style={{ color: "#94a3b8", fontWeight: 700 }}>Payout Total:</span> <span style={{ fontWeight: 900, color: "#7c3aed" }}>{fmt$(paySheetPayoutTotal)}</span></div>
                </div>
              </div>
            )}

            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#","Truck #","Ticket Date","Ticket #","Job Description","Qty","Full Rate","Ticket Value","C %","C Truck Total","Rate","Payout"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {paySheetRows.length === 0 && (
                    <tr><td colSpan={12} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                      {filterContractor ? "No ticket rows for this contractor" : "Select a contractor above to build their pay sheet"}
                    </td></tr>
                  )}
                  {paySheetRows.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ ...td, color: "#94a3b8" }}>{i + 1}</td>
                      <td style={td}>{r.truck_number || "—"}</td>
                      <td style={td}>{r.ticket_date || "—"}</td>
                      <td style={td}><code style={{ fontSize: "0.7rem" }}>{r.ticket_number || "—"}</code></td>
                      <td style={td}>{r.job_description || r.job_name || "—"}</td>
                      <td style={td}>{fmtN(r.qty)}</td>
                      <td style={td}>{r.full_rate ? fmt$(r.full_rate) : "—"}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{r.ticket_value ? fmt$(r.ticket_value) : "—"}</td>
                      <td style={td}>{fmtPct(r.contractor_percent)}</td>
                      <td style={td}>{r.c_truck_total ? fmt$(r.c_truck_total) : "—"}</td>
                      <td style={td}>{r.payout_rate ? fmt$(r.payout_rate) : "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#7c3aed" }}>{r.payout ? fmt$(r.payout) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filterContractor && (
              <div style={{ ...card, padding: "18px 22px", marginTop: 16 }}>
                <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 12 }}>Pay Sheet Summary — {filterContractor}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { label: "Ticket Total",     value: fmt$(paySheetTotal),        color: "#1e40af" },
                    { label: "Insurance",         value: "—",                         color: "#dc2626" },
                    { label: "Driver Pay",        value: "—",                         color: "#dc2626" },
                    { label: "Truck Payment",     value: "—",                         color: "#dc2626" },
                    { label: "Advance",           value: "—",                         color: "#d97706" },
                    { label: "Payment",           value: "—",                         color: "#d97706" },
                    { label: "Balance",           value: "—",                         color: "#d97706" },
                    { label: "Original Loan",     value: "—",                         color: "#64748b" },
                    { label: "Previous Balance",  value: "—",                         color: "#64748b" },
                    { label: "New Balance",       value: "—",                         color: "#64748b" },
                    { label: "Shop",              value: "—",                         color: "#dc2626" },
                    { label: "Total Paid",        value: fmt$(paySheetPayoutTotal),   color: "#15803d" },
                  ].map(k => (
                    <div key={k.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{k.label}</div>
                      <div style={{ fontWeight: 900, color: k.color, fontSize: "0.95rem" }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 6. OWNER OPERATOR PAYOUT REVIEW ──────────────────────── */}
        {tab === "oo_payout" && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Owner Operator Payout Review</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["All","Draft","Needs Review","Ready to Pay","Payroll Hold","Paid","Disputed","Void"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s.toLowerCase().replace(/ /g, "_"))} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: filterStatus === s.toLowerCase().replace(/ /g, "_") || (s === "All" && filterStatus === "all") ? "#0f172a" : "#fff", color: filterStatus === s.toLowerCase().replace(/ /g, "_") || (s === "All" && filterStatus === "all") ? "#fff" : "#475569", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ ...card, padding: "24px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🚛</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>No owner operator payout records yet</div>
              <div style={{ fontSize: "0.76rem" }}>Generate payroll invoices from approved ticket rows, then review here.</div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#475569", marginBottom: 8 }}>Payroll Hold Reasons</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  {PAYROLL_HOLD_REASONS.map(r => (
                    <span key={r} style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 8px", fontSize: "0.66rem", fontWeight: 700 }}>{r}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. UNPAID TICKETS ───────────────────────────────────── */}
        {tab === "unpaid" && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Unpaid Tickets</h2>
            <div style={{ fontSize: "0.76rem", color: "#475569", marginBottom: 16, lineHeight: 1.6 }}>
              Tickets imported from eRocks, pit portals, or payroll sheets that have not been matched to a customer invoice, payroll invoice, or payment record.
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Source","Contractor","Truck #","Ticket Date","Ticket #","Job Name","Qty","Rate","Ticket Value","Job #","Reason Unpaid","Next Action"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {unpaidRows.length === 0 && (
                    <tr><td colSpan={12} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>No unpaid tickets</div>
                      <div style={{ fontSize: "0.72rem" }}>Import eRocks or payroll sheets to populate this queue</div>
                    </td></tr>
                  )}
                  {unpaidRows.map(r => (
                    <tr key={r.id} style={{ background: "#fffbeb" }}>
                      <td style={td}><code style={{ fontSize: "0.65rem", color: "#64748b" }}>eRocks</code></td>
                      <td style={{ ...td, fontWeight: 700 }}>{r.contractor_name || <span style={{ color: "#dc2626" }}>MISSING</span>}</td>
                      <td style={td}>{r.truck_number || "—"}</td>
                      <td style={td}>{r.ticket_date || "—"}</td>
                      <td style={td}><code style={{ fontSize: "0.7rem" }}>{r.ticket_number || "—"}</code></td>
                      <td style={td}>{r.job_name || "—"}</td>
                      <td style={td}>{fmtN(r.qty)}</td>
                      <td style={td}>{r.payout_rate ? fmt$(r.payout_rate) : "—"}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{r.ticket_value ? fmt$(r.ticket_value) : "—"}</td>
                      <td style={td}>{r.job_number || "—"}</td>
                      <td style={td}><span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 5, padding: "2px 7px", fontSize: "0.65rem", fontWeight: 700 }}>Not Invoiced</span></td>
                      <td style={td}><button style={{ padding: "3px 8px", background: "#fef3c7", color: "#92400e", border: "none", borderRadius: 5, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Review</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569" }}>Unpaid Reasons:</span>
              {UNPAID_REASONS.map(r => <span key={r} style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 5, padding: "2px 8px", fontSize: "0.65rem" }}>{r}</span>)}
            </div>
          </div>
        )}

        {/* ── 8. VOID / EXCLUDED ──────────────────────────────────── */}
        {tab === "void" && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Void / Excluded Tickets</h2>
            <div style={{ ...card, padding: "14px 18px", marginBottom: 16, background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 6, fontSize: "0.82rem" }}>Void Rules</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.76rem", color: "#7f1d1d" }}>
                {[
                  "Void tickets do NOT go to customer invoice.",
                  "Void tickets do NOT go to payroll invoice.",
                  "Void tickets stay in the audit trail permanently.",
                  "Void tickets require a reason and a reviewer.",
                ].map(r => <div key={r}>• {r}</div>)}
              </div>
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Contractor","Truck #","Ticket Date","Ticket #","Job Name","Qty","Ticket Value","Void Status","Notes"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {voidRows.length === 0 && (
                    <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>No void or excluded tickets</td></tr>
                  )}
                  {voidRows.map(r => (
                    <tr key={r.id} style={{ background: "#f8fafc", opacity: 0.8 }}>
                      <td style={td}>{r.contractor_name || "—"}</td>
                      <td style={td}>{r.truck_number || "—"}</td>
                      <td style={td}>{r.ticket_date || "—"}</td>
                      <td style={td}><code style={{ fontSize: "0.7rem" }}>{r.ticket_number || "—"}</code></td>
                      <td style={td}>{r.job_name || "—"}</td>
                      <td style={td}>{fmtN(r.qty)}</td>
                      <td style={td}>{r.ticket_value ? fmt$(r.ticket_value) : "—"}</td>
                      <td style={td}><span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 5, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 700, textDecoration: "line-through" }}>VOID</span></td>
                      <td style={td}>{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 9. DEDUCTIONS & ADJUSTMENTS ─────────────────────────── */}
        {tab === "deductions" && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Deductions & Adjustments</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div style={{ ...card, padding: "18px 20px" }}>
                <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a", marginBottom: 10 }}>Deduction Types</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {DEDUCTION_TYPES.map(d => (
                    <span key={d} style={{ background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "3px 9px", fontSize: "0.7rem", fontWeight: 600 }}>{d}</span>
                  ))}
                </div>
              </div>
              <div style={{ ...darkPanel }}>
                <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#fde68a", marginBottom: 10 }}>Each Deduction Requires</div>
                {["Contractor","Driver","Truck","Deduction Type","Amount","Payroll Week","Reason","Agreement Required","Approved By","Status"].map(f => (
                  <div key={f} style={{ fontSize: "0.72rem", color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #1e293b" }}>• {f}</div>
                ))}
              </div>
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Contractor","Driver","Truck #","Deduction Type","Amount","Payroll Week","Reason","Agreement","Approved By","Status"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>No deductions recorded yet</div>
                    <div style={{ fontSize: "0.72rem" }}>Deductions are added when generating payroll invoices or imported from payroll sheets</div>
                  </td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 10. RECONCILIATION EXCEPTIONS ───────────────────────── */}
        {tab === "exceptions" && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Reconciliation Exceptions</h2>
            <div style={{ fontSize: "0.76rem", color: "#475569", marginBottom: 16 }}>
              Automatically detected mismatches — each exception creates a staff task
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                "Ticket in eRocks but not payroll invoice",
                "Ticket in payroll invoice but not eRocks",
                "Ticket value mismatch",
                "Qty mismatch",
                "Rate mismatch",
                "Payout mismatch",
                "Duplicate ticket number",
                "Void ticket included in payout",
                "Unpaid ticket in customer billing",
                "Missing job number",
                "Missing contractor",
                "Missing truck number",
                "Missing CCB approval",
                "Deduction without signed agreement",
                "Total Paid ≠ Ticket Total − Deductions",
              ].map(r => (
                <div key={r} style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: "0.72rem", fontWeight: 600, color: "#854d0e" }}>
                  ⚠ {r}
                </div>
              ))}
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Severity","Exception","Ticket #","Contractor","Truck #","$ Impact","Next Action","Status"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {exceptions.length === 0 && (
                    <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>No exceptions detected</div>
                      <div style={{ fontSize: "0.72rem" }}>Import eRocks and payroll data to run reconciliation checks</div>
                    </td></tr>
                  )}
                  {exceptions.map(ex => (
                    <tr key={ex.id}>
                      <td style={td}><SeverityBadge s={ex.severity} /></td>
                      <td style={td}>{ex.exception_type.replace(/_/g, " ")}</td>
                      <td style={td}><code style={{ fontSize: "0.68rem" }}>{ex.ticket_number || "—"}</code></td>
                      <td style={td}>{ex.contractor_name || "—"}</td>
                      <td style={td}>{ex.truck_number || "—"}</td>
                      <td style={{ ...td, fontWeight: 700, color: "#dc2626" }}>{fmt$(ex.dollar_impact)}</td>
                      <td style={td}>{ex.next_best_action || "—"}</td>
                      <td style={td}><span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 5, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 700 }}>{ex.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 11. STAFF TO-DO LIST ─────────────────────────────────── */}
        {tab === "staff_todos" && (
          <div>
            <h2 style={{ margin: "0 0 6px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Invoice Staff Work Queue</h2>
            <div style={{ fontSize: "0.76rem", color: "#475569", marginBottom: 16 }}>
              Auto-generated tasks from reconciliation exceptions and missing invoice actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { task: "Review unpaid ticket",               priority: "🔴 Critical", dollar: "$0" },
                { task: "Fix missing contractor",             priority: "🔴 Critical", dollar: "$0" },
                { task: "Fix missing truck number",           priority: "🟡 High",     dollar: "$0" },
                { task: "Review void ticket",                 priority: "🟡 High",     dollar: "$0" },
                { task: "Approve payroll deduction",          priority: "🟡 High",     dollar: "$0" },
                { task: "Verify insurance deduction",         priority: "🟠 Medium",   dollar: "$0" },
                { task: "Match payroll invoice to eRocks",   priority: "🟡 High",     dollar: "$0" },
                { task: "Review payout mismatch",             priority: "🔴 Critical", dollar: "$0" },
                { task: "Generate customer invoice",          priority: "🟢 Normal",   dollar: "$0" },
                { task: "Generate payroll invoice",           priority: "🟢 Normal",   dollar: "$0" },
                { task: "Send invoice packet",                priority: "🟢 Normal",   dollar: "$0" },
              ].map(t => (
                <div key={t.task} style={{ ...card, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{t.task}</div>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 2 }}>{t.priority}</div>
                  </div>
                  <button style={{ padding: "4px 10px", background: "#f1f5f9", color: "#0f172a", border: "none", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>Assign</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 12. INVOICE HISTORY ─────────────────────────────────── */}
        {tab === "history" && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontWeight: 900, color: "#0f172a", fontSize: "1rem" }}>Invoice History</h2>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <input placeholder="Search customer, contractor, ticket #…" style={{ flex: 1, minWidth: 220, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem" }} />
              <select style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.82rem", background: "#fff" }}>
                <option>All Types</option>
                <option>Customer Invoice</option>
                <option>Payroll Invoice</option>
                <option>Contractor Pay Sheet</option>
              </select>
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Type","Invoice #","Party","Period","Total","Status","Created"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: 40 }}>No invoice history yet</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 22px", borderRadius: 12, fontWeight: 700, fontSize: "0.82rem", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
