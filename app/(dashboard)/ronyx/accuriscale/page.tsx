"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Summary = {
  totalLoads: number;
  cleanLoads: number;
  billingHolds: number;
  payrollHolds: number;
  openExceptions: number;
  criticalExceptions: number;
  totalTickets: number;
  duplicateTickets: number;
  totalRecoveredDollars: number;
};

type AccuriException = {
  id: string;
  exception_type: string;
  severity: string;
  status: string;
  load_id: string | null;
  scale_ticket_id: string | null;
  issue_title: string;
  issue_description: string;
  assigned_role: string;
  action_label: string | null;
  created_at: string;
};

// ─── Severity styles ──────────────────────────────────────────────────────────

const SEV_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" },
  block:    { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  warning:  { bg: "#fef9c3", color: "#b45309", border: "#fde68a" },
  info:     { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
};

const EXCEPTION_ICON: Record<string, string> = {
  short_load:          "⚖️",
  missing_ticket:      "🔴",
  duplicate_ticket:    "🔄",
  weight_mismatch:     "⚠️",
  driver_mismatch:     "👤",
  truck_mismatch:      "🚛",
  material_mismatch:   "📦",
  rate_mismatch:       "💵",
  manual_override:     "✏️",
  payroll_hold:        "💰",
  billing_hold:        "📄",
  unbilled_ticket:     "🔕",
  scale_edit_detected: "🛡️",
  other:               "❓",
};

const fmt$ = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ─── Exception Card ───────────────────────────────────────────────────────────

function ExceptionCard({ exc, onResolve, onDismiss }: {
  exc: AccuriException;
  onResolve: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const sev = SEV_STYLE[exc.severity] ?? SEV_STYLE.warning;
  const icon = EXCEPTION_ICON[exc.exception_type] ?? "❓";

  return (
    <div style={{ background: "#fff", border: `1px solid ${sev.border}`, borderLeft: `4px solid ${sev.color}`,
      borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14 }}>
      <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
          <span style={{ background: sev.bg, color: sev.color, padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 800, textTransform: "uppercase" }}>
            {exc.severity}
          </span>
          <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#1e293b" }}>{exc.issue_title}</span>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>{exc.issue_description}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {exc.action_label && (
            <button onClick={() => onResolve(exc.id)}
              style={{ padding: "6px 14px", background: "#1e293b", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
              ✓ {exc.action_label}
            </button>
          )}
          <button onClick={() => onDismiss(exc.id)}
            style={{ padding: "6px 12px", background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 600, fontSize: "0.75rem", cursor: "pointer" }}>
            Dismiss
          </button>
          <span style={{ fontSize: "0.68rem", color: "#94a3b8", alignSelf: "center", marginLeft: "auto" }}>
            {new Date(exc.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── ROI Banner ───────────────────────────────────────────────────────────────

function ROIBanner({ recovered }: { recovered: number }) {
  if (recovered <= 0) return null;
  return (
    <div style={{ background: "linear-gradient(135deg, #052e16, #14532d)", borderRadius: 12, padding: "16px 22px",
      display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
      <div>
        <div style={{ color: "#86efac", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Revenue Protected by AccuriScale</div>
        <div style={{ color: "#fff", fontSize: "2rem", fontWeight: 900 }}>{fmt$(recovered)}</div>
      </div>
      <div style={{ flex: 1, fontSize: "0.78rem", color: "#86efac", lineHeight: 1.7 }}>
        Short loads caught · Duplicate tickets blocked · Unbilled tickets recovered · Payroll overpayment prevented
      </div>
      <Link href="/ronyx/accuriscale/recovery"
        style={{ background: "#15803d", color: "#fff", padding: "10px 20px", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", flexShrink: 0 }}>
        View Recovery Log →
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccuriScaleDashboard() {
  const [summary, setSummary]       = useState<Summary | null>(null);
  const [exceptions, setExceptions] = useState<AccuriException[]>([]);
  const [activeTab, setTab]         = useState<"queue" | "loads" | "tickets" | "settings">("queue");
  const [loading, setLoading]       = useState(true);
  const [toast, setToast]           = useState("");
  const [sevFilter, setSevFilter]   = useState("all");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [sumRes, excRes] = await Promise.all([
      fetch("/api/ronyx/accuriscale?view=summary").then(r => r.json()).catch(() => ({})),
      fetch("/api/ronyx/accuriscale?view=exceptions&status=open").then(r => r.json()).catch(() => ({})),
    ]);
    setSummary(sumRes.summary ?? null);
    setExceptions(excRes.exceptions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (id: string) => {
    await fetch("/api/ronyx/accuriscale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve_exception", exception_id: id, resolved_by: "Office" }),
    });
    setExceptions(e => e.filter(x => x.id !== id));
    showToast("✓ Exception resolved");
  };

  const handleDismiss = async (id: string) => {
    await fetch("/api/ronyx/accuriscale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_exception", exception_id: id, resolved_by: "Office" }),
    });
    setExceptions(e => e.filter(x => x.id !== id));
    showToast("Exception dismissed");
  };

  const filtered = exceptions.filter(e => sevFilter === "all" || e.severity === sevFilter);
  const criticalCount = exceptions.filter(e => e.severity === "critical" || e.severity === "block").length;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#1e293b", color: "#fff",
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #020817 0%, #0c1a2e 60%, #052e16 100%)", padding: "28px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <div style={{ background: "rgba(34,211,238,0.15)", borderRadius: 10, padding: "8px 10px", fontSize: "1.2rem" }}>⚖️</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>AccuriScale Intelligence™</h1>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>Ticket matching · Short-load detection · Payroll & billing protection</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/ronyx/accuriscale/upload"
              style={{ background: "#22d3ee", color: "#000", padding: "10px 18px", borderRadius: 8, fontWeight: 800, fontSize: "0.82rem", textDecoration: "none" }}>
              + Upload Ticket
            </Link>
            <Link href="/ronyx/accuriscale/import"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)" }}>
              Import Excel
            </Link>
            <Link href="/products/accuriscale-intelligence"
              style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", textDecoration: "none" }}>
              Product Page ↗
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 1, background: "rgba(255,255,255,0.05)", borderRadius: "10px 10px 0 0", overflow: "hidden" }}>
            {[
              { label: "Total Loads",        val: summary.totalLoads,         color: "#fff" },
              { label: "Clean",              val: summary.cleanLoads,          color: "#86efac" },
              { label: "Billing Holds",      val: summary.billingHolds,        color: "#fbbf24" },
              { label: "Payroll Holds",      val: summary.payrollHolds,        color: "#fbbf24" },
              { label: "Open Exceptions",    val: summary.openExceptions,      color: criticalCount > 0 ? "#f87171" : "#94a3b8" },
              { label: "Critical",           val: summary.criticalExceptions,  color: "#f87171" },
              { label: "Tickets",            val: summary.totalTickets,        color: "#22d3ee" },
              { label: "Duplicates",         val: summary.duplicateTickets,    color: summary.duplicateTickets > 0 ? "#f87171" : "#64748b" },
            ].map(kpi => (
              <div key={kpi.label} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: kpi.color }}>{kpi.val}</div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{kpi.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginTop: 12 }}>
          {([
            ["queue",    `🚨 Exception Queue${criticalCount > 0 ? ` (${criticalCount} critical)` : ""}`],
            ["loads",    "📋 Loads"],
            ["tickets",  "🎫 Scale Tickets"],
            ["settings", "⚙️ Rules & Settings"],
          ] as [typeof activeTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer",
                color: activeTab === key ? "#fff" : "rgba(255,255,255,0.4)",
                fontWeight: activeTab === key ? 700 : 500, fontSize: "0.82rem",
                borderBottom: activeTab === key ? "2px solid #22d3ee" : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* Revenue recovery banner */}
        {summary && summary.totalRecoveredDollars > 0 && (
          <ROIBanner recovered={summary.totalRecoveredDollars} />
        )}

        {/* Exception queue not yet seeded — empty state */}
        {!loading && !summary && (
          <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 14, padding: "56px 32px", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>⚖️</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>AccuriScale not yet active</div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>
              Run migrations 177–181 in Supabase to activate AccuriScale. Once active, upload your first ticket to begin matching.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link href="/ronyx/accuriscale/upload" style={{ background: "#22d3ee", color: "#000", padding: "12px 24px", borderRadius: 9, fontWeight: 800, fontSize: "0.88rem", textDecoration: "none" }}>
                Upload First Ticket
              </Link>
              <Link href="/products/accuriscale-intelligence/walkthrough" style={{ background: "#f1f5f9", color: "#475569", padding: "12px 24px", borderRadius: 9, fontWeight: 700, fontSize: "0.88rem", textDecoration: "none" }}>
                Walk Through AccuriScale
              </Link>
            </div>
          </div>
        )}

        {/* ── EXCEPTION QUEUE ─────────────────────────────────────────── */}
        {activeTab === "queue" && summary && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                Exception Review Queue ({filtered.length})
              </h2>
              <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                {(["all","critical","warning","info"] as const).map(s => (
                  <button key={s} onClick={() => setSevFilter(s)}
                    style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700,
                      background: sevFilter === s ? "#1e293b" : "#fff", color: sevFilter === s ? "#fff" : "#64748b" }}>
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    {s === "critical" && criticalCount > 0 && (
                      <span style={{ marginLeft: 5, background: "#dc2626", color: "#fff", padding: "1px 6px", borderRadius: 10, fontSize: "0.62rem" }}>{criticalCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 && (
              <div style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 12, padding: "36px", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 700, color: "#15803d" }}>No open exceptions</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 6 }}>All loads are matched and clean. Good work.</div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(exc => (
                <ExceptionCard
                  key={exc.id}
                  exc={exc}
                  onResolve={handleResolve}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>

            {filtered.length > 0 && (
              <div style={{ marginTop: 20, padding: "14px 18px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.78rem", color: "#64748b" }}>
                <strong style={{ color: "#1e293b" }}>How exceptions work:</strong> Loads and tickets with unresolved exceptions are held. Once resolved, clean loads are automatically released to payroll and billing.
                <Link href="/products/accuriscale-intelligence/walkthrough" style={{ color: "#0891b2", marginLeft: 6 }}>Walk Through AccuriScale →</Link>
              </div>
            )}
          </>
        )}

        {/* ── LOADS TAB ────────────────────────────────────────────────── */}
        {activeTab === "loads" && summary && (
          <LoadsTab />
        )}

        {/* ── TICKETS TAB ──────────────────────────────────────────────── */}
        {activeTab === "tickets" && summary && (
          <TicketsTab />
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
        {activeTab === "settings" && summary && (
          <SettingsTab />
        )}

      </div>
    </div>
  );
}

// ─── Loads Tab ────────────────────────────────────────────────────────────────

function LoadsTab() {
  const [loads, setLoads] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ronyx/accuriscale?view=loads")
      .then(r => r.json())
      .then(d => setLoads(d.loads ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const billing_colors: Record<string, string> = {
    ready_to_bill: "#15803d", billing_hold: "#dc2626", invoiced: "#0891b2", paid: "#64748b", not_billed: "#94a3b8",
  };

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading loads...</div>;

  return (
    <>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>Loads ({loads.length})</h2>
        <Link href="/ronyx/tickets" style={{ fontSize: "0.78rem", color: "#0891b2" }}>View All Tickets →</Link>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>{["Date","Material","Expected Tons","Actual Tons","Rate","Billing","Payroll"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loads.map((l, i) => (
              <tr key={String(l.id)} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "10px 14px", color: "#1e293b" }}>{String(l.load_date ?? "—")}</td>
                <td style={{ padding: "10px 14px", color: "#1e293b", fontWeight: 600 }}>{String(l.material ?? "—")}</td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{l.expected_tons ? `${l.expected_tons}t` : "—"}</td>
                <td style={{ padding: "10px 14px", color: l.actual_tons && l.expected_tons && Number(l.actual_tons) < Number(l.expected_tons) * 0.9 ? "#dc2626" : "#1e293b", fontWeight: 700 }}>
                  {l.actual_tons ? `${l.actual_tons}t` : "—"}
                </td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{l.customer_rate ? `$${l.customer_rate}/t` : "—"}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: billing_colors[String(l.billing_status)] ?? "#94a3b8", fontWeight: 700, fontSize: "0.72rem" }}>
                    {String(l.billing_status ?? "").replace(/_/g, " ").toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: String(l.payroll_status) === "ready_for_payroll" ? "#15803d" : String(l.payroll_status) === "payroll_hold" ? "#dc2626" : "#94a3b8", fontWeight: 700, fontSize: "0.72rem" }}>
                    {String(l.payroll_status ?? "").replace(/_/g, " ").toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loads.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No loads yet. Upload a ticket to create your first load.</div>
        )}
      </div>
    </>
  );
}

// ─── Tickets Tab ──────────────────────────────────────────────────────────────

function TicketsTab() {
  const [tickets, setTickets] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ronyx/accuriscale?view=tickets")
      .then(r => r.json())
      .then(d => setTickets(d.tickets ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading tickets...</div>;

  return (
    <>
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>Scale Tickets ({tickets.length})</h2>
        <Link href="/ronyx/accuriscale/upload" style={{ background: "#22d3ee", color: "#000", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", textDecoration: "none" }}>
          + Upload Ticket
        </Link>
      </div>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>{["Ticket #","Date","Driver","Truck","Material","Tons","OCR","Source","Dupe?"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {tickets.map((t, i) => (
              <tr key={String(t.id)} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{String(t.ticket_number ?? "—")}</td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{String(t.ticket_date ?? "—")}</td>
                <td style={{ padding: "10px 14px", color: "#1e293b" }}>{String(t.driver_name ?? "—")}</td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{String(t.truck_number ?? "—")}</td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{String(t.material ?? "—")}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{t.tons ? `${t.tons}t` : "—"}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ color: String(t.ocr_status) === "complete" ? "#15803d" : String(t.ocr_status) === "failed" ? "#dc2626" : "#b45309", fontWeight: 700, fontSize: "0.7rem" }}>
                    {String(t.ocr_status ?? "pending").toUpperCase()}
                    {t.ocr_confidence ? ` ${t.ocr_confidence}%` : ""}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.7rem" }}>{String(t.source_type ?? "—").replace(/_/g, " ")}</td>
                <td style={{ padding: "10px 14px" }}>
                  {t.is_duplicate ? <span style={{ color: "#dc2626", fontWeight: 800 }}>⚠ DUPE</span> : <span style={{ color: "#15803d" }}>✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
            No tickets yet.{" "}
            <Link href="/ronyx/accuriscale/upload" style={{ color: "#22d3ee" }}>Upload your first ticket →</Link>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const GLOBAL_RULES = [
    { key: "rule_short_load",          name: "Short Load", desc: "Flag loads below 90% of expected tons", sev: "critical" },
    { key: "rule_duplicate_ticket",    name: "Duplicate Ticket", desc: "Same ticket number submitted twice within 30 days", sev: "critical" },
    { key: "rule_missing_ticket",      name: "Missing Ticket", desc: "Load exists but no ticket uploaded or matched", sev: "critical" },
    { key: "rule_rate_mismatch",       name: "Rate Mismatch", desc: "Invoiced rate differs from contracted rate", sev: "critical" },
    { key: "rule_tons_variance",       name: "Tons Variance", desc: "Actual tons differ from expected beyond tolerance", sev: "warning" },
    { key: "rule_driver_mismatch",     name: "Driver Mismatch", desc: "Scale ticket driver differs from dispatch driver", sev: "warning" },
    { key: "rule_material_mismatch",   name: "Material Mismatch", desc: "Scale ticket material differs from dispatch", sev: "warning" },
    { key: "rule_manual_override",     name: "Manual Override", desc: "Scale weight was manually overridden", sev: "warning" },
    { key: "rule_unbilled_ticket",     name: "Ticket Paid, Not Billed", desc: "Driver paid but no invoice sent to customer", sev: "critical" },
    { key: "rule_driver_pay_mismatch", name: "Pay Rate Mismatch", desc: "Payroll rate differs from driver contract", sev: "warning" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>Active Validation Rules</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GLOBAL_RULES.map(rule => (
            <div key={rule.key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: "0.75rem" }}>✅</span>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{rule.name}</span>
                  <span style={{ background: rule.sev === "critical" ? "#fee2e2" : "#fef9c3", color: rule.sev === "critical" ? "#dc2626" : "#b45309", padding: "1px 8px", borderRadius: 10, fontSize: "0.62rem", fontWeight: 800 }}>
                    {rule.sev.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{rule.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>Tolerance Settings</h2>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px" }}>
          {[
            ["Weight variance %", "3.0%", "Loads within ±3% are auto-matched"],
            ["Weight variance (tons)", "1.0t", "Absolute ton tolerance"],
            ["Short load threshold", "90%", "Below 90% of expected = short load flag"],
            ["Duplicate window", "30 days", "Same ticket # within 30 days = duplicate"],
            ["Auto-match min score", "80%", "Tickets above 80% confidence auto-match"],
            ["Require override reason", "Yes", "Manual scale overrides need a reason"],
          ].map(([label, val, desc]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f1f5f9", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1e293b" }}>{label}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{desc}</div>
              </div>
              <span style={{ fontWeight: 900, fontSize: "0.88rem", color: "#0891b2" }}>{val}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, fontSize: "0.75rem", color: "#94a3b8" }}>
            Contact MoveAround to adjust tolerance thresholds for your operation.
          </div>
        </div>

        <h2 style={{ margin: "20px 0 14px", fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>Pit-to-Pay Workflow</h2>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px" }}>
          {[
            ["1. Upload or OCR ticket", "TicketFlash reads every field automatically"],
            ["2. Auto-match to load", "AccuriScale matches ticket to dispatch load"],
            ["3. Run validation rules", "12 rules check for exceptions instantly"],
            ["4. Exception queue", "Flagged loads wait for office review"],
            ["5. Resolve exceptions", "Office approves or corrects each flag"],
            ["6. Release to payroll", "Clean loads released to payroll automatically"],
            ["7. Release to billing", "Clean loads released to billing automatically"],
          ].map(([step, desc]) => (
            <div key={step} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: "0.75rem", color: "#22d3ee", flexShrink: 0, paddingTop: 2 }}>{step.slice(0, 2)}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#1e293b" }}>{step.slice(3)}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
