"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type BillingQueueRow = {
  id: string;
  ticket_id: string | null;
  ticket_number: string | null;
  driver_name: string | null;
  truck_number: string | null;
  job_name: string | null;
  ticket_date: string | null;
  amount: number;
  pay_amount: number;
  status: string;
  invoice_id: string | null;
  queued_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  status: string;
  accounting_status?: string;
  accounting_exported_at?: string;
  accounting_reference?: string;
  total_amount: number;
  issued_date?: string;
  due_date?: string;
};

type Integration = {
  id: string;
  name: string;
  category: string;
  status: string;
  enabled: boolean;
};

type Tab = "pipeline" | "invoices" | "ar_aging" | "quickbooks";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "pipeline",   label: "Billing Pipeline",  icon: "⚡" },
  { key: "invoices",   label: "Invoices",           icon: "📄" },
  { key: "ar_aging",   label: "AR Aging",           icon: "📊" },
  { key: "quickbooks", label: "QuickBooks",         icon: "🔗" },
];

function fmt$(n: number) { return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s?: string | null) { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US"); }

// ─── Component ───────────────────────────────────────────────────────────────

export default function RonyxAccountingPage() {
  const [tab, setTab]                     = useState<Tab>("pipeline");
  const [queue, setQueue]                 = useState<BillingQueueRow[]>([]);
  const [invoices, setInvoices]           = useState<Invoice[]>([]);
  const [integrations, setIntegrations]   = useState<Integration[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [groupCustomer, setGroupCustomer] = useState("");
  const [savingId, setSavingId]           = useState<string | null>(null);
  const [creating, setCreating]           = useState(false);
  const [createMsg, setCreateMsg]         = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([loadQueue(), loadInvoices(), loadIntegrations()]);
  }, []);

  async function loadQueue() {
    try {
      const res = await fetch("/api/ronyx/billing-queue");
      const data = await res.json();
      setQueue(data.queue ?? []);
    } catch { setQueue([]); }
    finally { setLoading(false); }
  }

  async function loadInvoices() {
    try {
      const res = await fetch("/api/ronyx/invoices");
      const data = await res.json();
      setInvoices(data.invoices ?? []);
    } catch { setInvoices([]); }
  }

  async function loadIntegrations() {
    try {
      const res = await fetch("/api/ronyx/integrations");
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch { setIntegrations([]); }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const pendingBilling   = queue.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.amount), 0);
    const openInvoices     = invoices.filter(i => i.status === "open").reduce((s, i) => s + Number(i.total_amount), 0);
    const paidInvoices     = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total_amount), 0);
    const pendingPayroll   = queue.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.pay_amount), 0);
    const margin           = pendingBilling > 0 ? ((pendingBilling - pendingPayroll) / pendingBilling) * 100 : 0;
    return { pendingBilling, openInvoices, paidInvoices, pendingPayroll, margin };
  }, [queue, invoices]);

  // ── AR Aging ──────────────────────────────────────────────────────────────

  const aging = useMemo(() => {
    const now = Date.now();
    const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
    for (const inv of invoices) {
      if (inv.status === "paid") continue;
      const due = inv.due_date ? new Date(inv.due_date).getTime() : now;
      const days = Math.floor((now - due) / 86400000);
      const amt = Number(inv.total_amount ?? 0);
      if (days <= 0)       buckets.current += amt;
      else if (days <= 30) buckets.d30 += amt;
      else if (days <= 60) buckets.d60 += amt;
      else                 buckets.d90 += amt;
    }
    return buckets;
  }, [invoices]);

  // ── Billing queue actions ──────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function createInvoiceFromSelected() {
    if (selected.size === 0 || !groupCustomer.trim()) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const selectedRows = queue.filter(r => selected.has(r.id));
      const total = selectedRows.reduce((s, r) => s + Number(r.amount), 0);

      // Create invoice — billing_queue_ids intentionally excluded (not a DB column)
      const res = await fetch("/api/ronyx/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: groupCustomer,
          total_amount:  total,
          ticket_ids:    selectedRows.map(r => r.ticket_id).filter(Boolean),
          issued_date:   new Date().toISOString().slice(0, 10),
          due_date:      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          status:        "open",
          notes:         `Created from ${selectedRows.length} billing queue items`,
        }),
      });
      const data = await res.json();
      if (data.invoice) {
        // Mark billing queue items as invoiced
        await fetch("/api/ronyx/billing-queue", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids:        selectedRows.map(r => r.id),
            invoice_id: data.invoice.id,
            status:     "invoiced",
          }),
        });
        setCreateMsg(`Invoice ${data.invoice.invoice_number} created for ${fmt$(total)}`);
        setSelected(new Set());
        setGroupCustomer("");
        await Promise.all([loadQueue(), loadInvoices()]);
      } else {
        setCreateMsg(data.error ?? "Failed to create invoice");
      }
    } catch (err) {
      setCreateMsg((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function markExported(invoice: Invoice) {
    setSavingId(invoice.id);
    try {
      await fetch("/api/ronyx/invoices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          accounting_status:       "exported",
          accounting_exported_at:  new Date().toISOString(),
          accounting_reference:    invoice.accounting_reference || `QB-${invoice.invoice_number}`,
        }),
      });
      await loadInvoices();
    } finally {
      setSavingId(null); }
  }

  async function connectQBO() {
    await fetch("/api/ronyx/quickbooks/connect", { method: "POST" });
    await loadIntegrations();
  }

  const qb = integrations.find(i => i.name === "QuickBooks");
  const pendingQueue = queue.filter(r => r.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(37,99,235,0.14), transparent 55%), #e8eff8", padding: 32, color: "#0f172a" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#1e3a8a" }}>Accounting Command Center</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#475569" }}>
              Tickets flow automatically into the billing queue once approved. Select tickets → create invoice → export to QuickBooks.
            </p>
          </div>
          {/* Quick-links bar — across the top, no wrap */}
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, marginTop: 14, whiteSpace: "nowrap" }}>
            <Link href="/ronyx/accounting-command-center/settlements" style={{ background: "#059669", border: "1.5px solid #059669", color: "#fff", flexShrink: 0, padding: "8px 16px", borderRadius: 8, fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
              🤝 Owner-Op Settlements →
            </Link>
            <Link href="/ronyx/accounting-command-center" style={{ background: "#1e3a8a", border: "1.5px solid #1e3a8a", color: "#fff", flexShrink: 0, padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              🎯 Command Center →
            </Link>
            <Link href="/ronyx/accounts-receivable" style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", color: "#1d4ed8", flexShrink: 0, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              AR Tracker →
            </Link>
            <Link href="/ronyx/payroll" style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", color: "#1d4ed8", flexShrink: 0, padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
              Payroll →
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Billing Queue",    value: fmt$(kpis.pendingBilling),  sub: `${pendingQueue.length} tickets pending`,  color: "#1d4ed8" },
            { label: "Open Invoices",    value: fmt$(kpis.openInvoices),    sub: `${invoices.filter(i=>i.status==="open").length} invoices`,   color: "#f59e0b" },
            { label: "Collected",        value: fmt$(kpis.paidInvoices),    sub: "paid invoices",                           color: "#16a34a" },
            { label: "Driver Pay Owed",  value: fmt$(kpis.pendingPayroll),  sub: "payroll liability",                       color: "#7c3aed" },
            { label: "Gross Margin",     value: kpis.margin.toFixed(1) + "%", sub: "bill vs pay rate",                       color: kpis.margin >= 20 ? "#16a34a" : "#dc2626" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.14)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{kpi.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid rgba(30,64,175,0.12)", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 18px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: tab === t.key ? "#1d4ed8" : "transparent",
                color: tab === t.key ? "#fff" : "#64748b",
                borderRadius: "8px 8px 0 0",
                borderBottom: tab === t.key ? "2px solid #1d4ed8" : "2px solid transparent",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Billing Pipeline ──────────────────────────────────────── */}
        {tab === "pipeline" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#1e3a8a" }}>Billing Ready Queue</h2>
                <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                  Tickets auto-populate here when approved in Fast Scan or Dispatch. Select tickets → group by customer → create invoice.
                </p>
              </div>
              {selected.size > 0 && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 10, padding: "10px 14px" }}>
                  <input
                    value={groupCustomer}
                    onChange={e => setGroupCustomer(e.target.value)}
                    placeholder="Customer name for invoice"
                    style={{ border: "1px solid #93c5fd", borderRadius: 6, padding: "6px 10px", fontSize: 13, width: 220, color: "#0f172a" }}
                  />
                  <button
                    onClick={createInvoiceFromSelected}
                    disabled={creating || !groupCustomer.trim()}
                    style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    {creating ? "Creating…" : `Create Invoice (${selected.size} tickets)`}
                  </button>
                </div>
              )}
            </div>

            {createMsg && (
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: createMsg.startsWith("Invoice") ? "#dcfce7" : "#fef2f2", border: `1px solid ${createMsg.startsWith("Invoice") ? "#86efac" : "#fca5a5"}`, color: createMsg.startsWith("Invoice") ? "#15803d" : "#dc2626", fontWeight: 600, fontSize: 13 }}>
                {createMsg}
              </div>
            )}

            {/* Pipeline flow visualization */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20, overflowX: "auto", paddingBottom: 8 }}>
              {[
                { label: "Fast Scan / Dispatch", count: null, color: "#64748b" },
                { label: "→" },
                { label: "Approved", count: null, color: "#2563eb" },
                { label: "→" },
                { label: "Billing Queue", count: pendingQueue.length, color: "#1d4ed8", active: true },
                { label: "→" },
                { label: "Invoice Created", count: invoices.filter(i => i.status !== "paid").length, color: "#f59e0b" },
                { label: "→" },
                { label: "Exported to QB", count: invoices.filter(i => i.accounting_status === "exported").length, color: "#9333ea" },
                { label: "→" },
                { label: "Paid / Collected", count: invoices.filter(i => i.status === "paid").length, color: "#16a34a" },
              ].map((step, i) => (
                step.label === "→"
                  ? <span key={i} style={{ fontSize: 18, color: "#cbd5e1", fontWeight: 700 }}>→</span>
                  : <div key={i} style={{
                      padding: "8px 14px", borderRadius: 8, whiteSpace: "nowrap", fontSize: 12, fontWeight: 700,
                      background: step.active ? "#dbeafe" : "#f1f5f9",
                      border: `1.5px solid ${step.active ? "#93c5fd" : "#e2e8f0"}`,
                      color: step.color,
                    }}>
                      {step.label}{step.count != null ? ` (${step.count})` : ""}
                    </div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Loading billing queue…</div>
            ) : pendingQueue.length === 0 ? (
              <div style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.12)", borderRadius: 12, padding: 32, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: 15 }}>Billing queue is empty</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
                  Approve tickets in Fast Scan or Dispatch and they will appear here automatically.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={selected.size === pendingQueue.length && pendingQueue.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(pendingQueue.map(r => r.id)) : new Set())}
                  />
                  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                    {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                  </span>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#eff6ff" }}>
                      {["", "Ticket #", "Date", "Driver", "Truck", "Job", "Bill Amount", "Pay Amount", "Margin"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#1e40af", borderBottom: "2px solid #bfdbfe", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingQueue.map((row, i) => {
                      const margin = row.amount > 0 ? ((row.amount - row.pay_amount) / row.amount) * 100 : 0;
                      return (
                        <tr key={row.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", cursor: "pointer" }}
                          onClick={() => toggleSelect(row.id)}>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                            <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} onClick={e => e.stopPropagation()} />
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e40af", fontSize: 13 }}>{row.ticket_number ?? "—"}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>{fmtDate(row.ticket_date)}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 13 }}>{row.driver_name ?? "—"}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>{row.truck_number ?? "—"}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#334155" }}>{row.job_name ?? "—"}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e3a8a" }}>{fmt$(Number(row.amount))}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#7c3aed", fontWeight: 600 }}>{fmt$(Number(row.pay_amount))}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: margin >= 20 ? "#16a34a" : "#f59e0b" }}>
                            {margin.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#1e293b" }}>
                      <td colSpan={6} style={{ padding: "12px 12px", color: "#94a3b8", fontWeight: 700, fontSize: 12 }}>TOTALS ({pendingQueue.length} tickets)</td>
                      <td style={{ padding: "12px 12px", fontWeight: 800, color: "#60a5fa" }}>{fmt$(kpis.pendingBilling)}</td>
                      <td style={{ padding: "12px 12px", fontWeight: 800, color: "#a78bfa" }}>{fmt$(kpis.pendingPayroll)}</td>
                      <td style={{ padding: "12px 12px", fontWeight: 800, color: kpis.margin >= 20 ? "#4ade80" : "#fbbf24" }}>{kpis.margin.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Invoices ─────────────────────────────────────────────────── */}
        {tab === "invoices" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1e3a8a" }}>Invoice Management</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => window.location.href = "/api/ronyx/quickbooks/export?type=invoices"}
                  style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Export All IIF
                </button>
              </div>
            </div>

            {/* Status counts */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { label: "Open",      count: invoices.filter(i => i.status === "open").length,     color: "#f59e0b" },
                { label: "Paid",      count: invoices.filter(i => i.status === "paid").length,     color: "#16a34a" },
                { label: "Exported",  count: invoices.filter(i => i.accounting_status === "exported").length, color: "#7c3aed" },
                { label: "Total",     count: invoices.length,                                       color: "#1d4ed8" },
              ].map(s => (
                <div key={s.label} style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.14)", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                  <span style={{ color: s.color, fontWeight: 800 }}>{s.count}</span>
                  <span style={{ color: "#64748b", marginLeft: 6 }}>{s.label}</span>
                </div>
              ))}
            </div>

            {invoices.length === 0 ? (
              <div style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.12)", borderRadius: 12, padding: 32, textAlign: "center", color: "#64748b" }}>
                No invoices yet. Create them from the Billing Pipeline tab.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#eff6ff" }}>
                    {["Invoice #", "Customer", "Issued", "Due", "Amount", "Status", "QB Status", ""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#1e40af", borderBottom: "2px solid #bfdbfe" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => {
                    const overdue = inv.due_date && inv.status !== "paid" && new Date(inv.due_date) < new Date();
                    return (
                      <tr key={inv.id} style={{ background: overdue ? "#fef2f2" : i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e40af", fontSize: 13 }}>{inv.invoice_number}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 13 }}>{inv.customer_name}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#475569" }}>{fmtDate(inv.issued_date)}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: overdue ? "#dc2626" : "#475569", fontWeight: overdue ? 700 : 400 }}>
                          {fmtDate(inv.due_date)} {overdue ? "⚠ OVERDUE" : ""}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e3a8a" }}>{fmt$(Number(inv.total_amount))}</td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: inv.status === "paid" ? "#dcfce7" : overdue ? "#fef2f2" : "#fef3c7",
                            color: inv.status === "paid" ? "#15803d" : overdue ? "#dc2626" : "#92400e",
                          }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                            background: inv.accounting_status === "exported" ? "#ede9fe" : "#f1f5f9",
                            color: inv.accounting_status === "exported" ? "#7c3aed" : "#64748b",
                          }}>
                            {inv.accounting_status ?? "not exported"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                          {inv.accounting_status !== "exported" && (
                            <button
                              onClick={() => markExported(inv)}
                              disabled={savingId === inv.id}
                              style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer" }}
                            >
                              {savingId === inv.id ? "…" : "Mark Exported"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab: AR Aging ─────────────────────────────────────────────────── */}
        {tab === "ar_aging" && (
          <div>
            <h2 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#1e3a8a" }}>Accounts Receivable Aging</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#475569" }}>
              Unpaid invoices grouped by age. Current = not yet due. Color-coded risk by bracket.
            </p>

            {/* Aging buckets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { label: "Current",  sub: "Not yet due",     value: aging.current, color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                { label: "1–30 days",sub: "Slightly past due",value: aging.d30,   color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" },
                { label: "31–60 days",sub: "Follow up needed",value: aging.d60,   color: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
                { label: "60+ days", sub: "Collections risk",  value: aging.d90,   color: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
              ].map(b => (
                <div key={b.label} style={{ background: b.bg, border: `1.5px solid ${b.border}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: b.color, textTransform: "uppercase", marginBottom: 6 }}>{b.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: b.color }}>{fmt$(b.value)}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{b.sub}</div>
                </div>
              ))}
            </div>

            {/* Total outstanding */}
            <div style={{ background: "#1e293b", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 700 }}>TOTAL OUTSTANDING AR</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#60a5fa" }}>
                {fmt$(aging.current + aging.d30 + aging.d60 + aging.d90)}
              </div>
            </div>

            {/* Per-customer breakdown */}
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e3a8a", marginBottom: 12 }}>By Customer</h3>
            {(() => {
              const byCustomer: Record<string, { total: number; count: number; oldest: number }> = {};
              for (const inv of invoices) {
                if (inv.status === "paid") continue;
                const c = inv.customer_name || "Unknown";
                const due = inv.due_date ? new Date(inv.due_date).getTime() : Date.now();
                const days = Math.max(0, Math.floor((Date.now() - due) / 86400000));
                if (!byCustomer[c]) byCustomer[c] = { total: 0, count: 0, oldest: 0 };
                byCustomer[c].total  += Number(inv.total_amount ?? 0);
                byCustomer[c].count  += 1;
                byCustomer[c].oldest = Math.max(byCustomer[c].oldest, days);
              }
              const rows = Object.entries(byCustomer).sort((a, b) => b[1].total - a[1].total);
              if (rows.length === 0) return <div style={{ color: "#64748b", fontSize: 13 }}>No open invoices.</div>;
              return (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#eff6ff" }}>
                      {["Customer", "Open Invoices", "Total Owed", "Oldest Invoice", "Risk"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#1e40af", borderBottom: "2px solid #bfdbfe" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([cust, data], i) => {
                      const risk = data.oldest > 60 ? { label: "High", color: "#dc2626" } : data.oldest > 30 ? { label: "Medium", color: "#f59e0b" } : { label: "Low", color: "#16a34a" };
                      return (
                        <tr key={cust} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600, fontSize: 13 }}>{cust}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>{data.count}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 700, color: "#1e3a8a" }}>{fmt$(data.total)}</td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: data.oldest > 30 ? "#dc2626" : "#475569" }}>
                            {data.oldest === 0 ? "Current" : `${data.oldest} days ago`}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ background: risk.color + "22", color: risk.color, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                              {risk.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()}
          </div>
        )}

        {/* ── Tab: QuickBooks ───────────────────────────────────────────────── */}
        {tab === "quickbooks" && (
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "#1e3a8a" }}>QuickBooks Integration</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "#475569" }}>
              Export invoices and payroll to QuickBooks Online or QuickBooks Desktop. IIF files import directly into QBDT with correct account codes for dump truck hauling.
            </p>

            {/* Connection status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {[
                {
                  title: "QuickBooks Online",
                  sub: "Push invoices directly via Intuit API",
                  connected: qb?.enabled ?? false,
                  action: () => connectQBO(),
                  btnLabel: qb?.enabled ? "Reconnect" : "Connect QBO",
                  btnColor: qb?.enabled ? "#16a34a" : "#1d4ed8",
                },
                {
                  title: "QuickBooks Desktop",
                  sub: "Export IIF file — import manually in QBDT",
                  connected: true,
                  action: () => window.location.href = "/api/ronyx/quickbooks/export?type=invoices",
                  btnLabel: "Export Invoice IIF",
                  btnColor: "#7c3aed",
                },
              ].map(card => (
                <div key={card.title} style={{ background: "#f8fafc", border: `1.5px solid ${card.connected ? "#86efac" : "rgba(30,64,175,0.16)"}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1e3a8a" }}>{card.title}</div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>{card.sub}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: card.connected ? "#dcfce7" : "#f1f5f9", color: card.connected ? "#15803d" : "#64748b" }}>
                      {card.connected ? "Ready" : "Not Connected"}
                    </span>
                  </div>
                  <button onClick={card.action} style={{ background: card.btnColor, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {card.btnLabel}
                  </button>
                </div>
              ))}
            </div>

            {/* What gets exported */}
            <div style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.14)", borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#1e3a8a" }}>Export Contents</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Invoice IIF", detail: "AR account → Sales. Customer name, amount, invoice number, date.", btn: "Export", href: "/api/ronyx/quickbooks/export?type=invoices" },
                  { label: "Payroll IIF", detail: "Payroll Expenses → Payroll Liabilities. Per-driver with net pay.", btn: "Export", href: null },
                ].map(item => (
                  <div key={item.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>{item.detail}</div>
                    {item.href ? (
                      <a href={item.href} style={{ background: "#7c3aed", color: "#fff", padding: "6px 14px", borderRadius: 6, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                        {item.btn}
                      </a>
                    ) : (
                      <Link href="/ronyx/payroll" style={{ background: "#7c3aed", color: "#fff", padding: "6px 14px", borderRadius: 6, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
                        Go to Payroll →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* QB account code reference */}
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 18 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: "uppercase" }}>Chart of Accounts — Dump Truck Operations</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { code: "4000", name: "Trucking Revenue", type: "Income" },
                  { code: "5000", name: "Driver Pay / Subcontractor", type: "COGS" },
                  { code: "5100", name: "Owner Operator Settlements", type: "COGS" },
                  { code: "5200", name: "Fuel Expense", type: "Expense" },
                  { code: "5300", name: "Maintenance & Repairs", type: "Expense" },
                  { code: "1200", name: "Accounts Receivable", type: "Asset" },
                ].map(ac => (
                  <div key={ac.code} style={{ background: "#334155", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#93c5fd" }}>{ac.code}</div>
                    <div style={{ fontSize: 11, color: "#e2e8f0" }}>{ac.name}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{ac.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
