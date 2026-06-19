"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type RecoveryItem = {
  id: string;
  recovery_type: string;
  description: string;
  ticket_number?: string;
  load_reference?: string;
  vendor_name?: string;
  amount_recovered: number;
  recovered_at: string;
  status: string;
};

type RecoverySummary = {
  totalRecovered: number;
  billingRecovered: number;
  payrollProtected: number;
  duplicatesBlocked: number;
  itemCount: number;
};

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  short_load_billing:        { label: "Short Load — Billing",    color: "#15803d", bg: "#dcfce7", icon: "⚖️" },
  short_load_payroll:        { label: "Short Load — Payroll",    color: "#15803d", bg: "#dcfce7", icon: "⚖️" },
  duplicate_ticket_blocked:  { label: "Duplicate Blocked",       color: "#dc2626", bg: "#fee2e2", icon: "🚫" },
  rate_mismatch_corrected:   { label: "Rate Mismatch Fixed",     color: "#7c3aed", bg: "#ede9fe", icon: "💰" },
  missing_ticket_flagged:    { label: "Missing Ticket Flagged",  color: "#b45309", bg: "#fef9c3", icon: "🔍" },
  accessorial_recovered:     { label: "Accessorial Recovered",   color: "#0891b2", bg: "#e0f2fe", icon: "➕" },
  payroll_overpay_blocked:   { label: "Overpay Blocked",        color: "#dc2626", bg: "#fee2e2", icon: "🛑" },
  variance_adjustment:       { label: "Variance Adjustment",    color: "#64748b", bg: "#f1f5f9", icon: "↕️" },
};

// Demo data matching what migration 181 seeds
const DEMO_ITEMS: RecoveryItem[] = [
  {
    id: "1", recovery_type: "short_load_billing",
    description: "Load ACL-2026-003 delivered 9.1 tons vs 12 expected (24% short). Billing corrected.",
    ticket_number: "TKT-009201", load_reference: "ACL-2026-003", vendor_name: "Ward Stone Tipton",
    amount_recovered: 126.00, recovered_at: "2026-06-14T08:22:00Z", status: "confirmed",
  },
  {
    id: "2", recovery_type: "duplicate_ticket_blocked",
    description: "TKT-009201 submitted twice. Second submission blocked — would have caused double billing of $105.",
    ticket_number: "TKT-009201", load_reference: "ACL-2026-003", vendor_name: "Ward Stone Tipton",
    amount_recovered: 105.00, recovered_at: "2026-06-14T09:05:00Z", status: "confirmed",
  },
  {
    id: "3", recovery_type: "rate_mismatch_corrected",
    description: "Driver pay rate on ACL-2026-005 was $14.00/ton — contract rate is $11.50/ton. Held for review.",
    ticket_number: "TKT-009203", load_reference: "ACL-2026-005", vendor_name: "BAS Equipment & Trucking Services LLC",
    amount_recovered: 32.50, recovered_at: "2026-06-14T10:45:00Z", status: "pending",
  },
  {
    id: "4", recovery_type: "missing_ticket_flagged",
    description: "Load ACL-2026-004 has no scale ticket in system. Billing held until ticket is uploaded.",
    ticket_number: undefined, load_reference: "ACL-2026-004", vendor_name: "Bentz Plant",
    amount_recovered: 0, recovered_at: "2026-06-14T07:55:00Z", status: "pending",
  },
  {
    id: "5", recovery_type: "short_load_payroll",
    description: "Driver payroll on ACL-2026-003 adjusted from 12.0 → 9.1 tons. Payroll protected.",
    ticket_number: "TKT-009201", load_reference: "ACL-2026-003", vendor_name: "Ward Stone Tipton",
    amount_recovered: 40.25, recovered_at: "2026-06-14T08:23:00Z", status: "confirmed",
  },
];

export default function RevenueRecoveryPage() {
  const [items, setItems]       = useState<RecoveryItem[]>([]);
  const [summary, setSummary]   = useState<RecoverySummary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "confirmed" | "pending">("all");
  const [typeFilter, setType]   = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/accuriscale?view=recovery");
      if (res.ok) {
        const json = await res.json();
        if (json.items?.length) {
          setItems(json.items);
          setSummary(json.summary);
          setLoading(false);
          return;
        }
      }
    } catch { /* fall through to demo */ }

    // Fall back to demo data
    const confirmed = DEMO_ITEMS.filter(i => i.status === "confirmed");
    setSummary({
      totalRecovered:   DEMO_ITEMS.reduce((s, i) => s + i.amount_recovered, 0),
      billingRecovered: DEMO_ITEMS.filter(i => i.recovery_type.includes("billing") || i.recovery_type.includes("duplicate")).reduce((s,i)=>s+i.amount_recovered,0),
      payrollProtected: DEMO_ITEMS.filter(i => i.recovery_type.includes("payroll")).reduce((s,i)=>s+i.amount_recovered,0),
      duplicatesBlocked: DEMO_ITEMS.filter(i => i.recovery_type === "duplicate_ticket_blocked").length,
      itemCount: DEMO_ITEMS.length,
    });
    setItems(DEMO_ITEMS);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(i => {
    if (filter !== "all" && i.status !== filter) return false;
    if (typeFilter !== "all" && i.recovery_type !== typeFilter) return false;
    return true;
  });

  const uniqueTypes = Array.from(new Set(items.map(i => i.recovery_type)));

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #052e16 0%, #0c1a2e 100%)", padding: "24px 32px" }}>
        <div style={{ marginBottom: 4 }}>
          <Link href="/ronyx/accuriscale" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", textDecoration: "none" }}>← AccuriScale</Link>
        </div>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#fff" }}>💰 Revenue Recovery</h1>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>
          Every dollar AccuriScale protected or recovered from billing errors, duplicates, and overcharges.
        </p>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>

        {/* KPI Strip */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Protected",     value: `$${summary.totalRecovered.toFixed(2)}`,   bg: "#052e16", color: "#86efac", large: true },
              { label: "Billing Recovered",   value: `$${summary.billingRecovered.toFixed(2)}`, bg: "#fff", color: "#15803d", large: false },
              { label: "Payroll Protected",   value: `$${summary.payrollProtected.toFixed(2)}`, bg: "#fff", color: "#7c3aed", large: false },
              { label: "Duplicates Blocked",  value: `${summary.duplicatesBlocked}`,             bg: "#fff", color: "#dc2626", large: false },
              { label: "Recovery Events",     value: `${summary.itemCount}`,                     bg: "#fff", color: "#0891b2", large: false },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.large ? "transparent" : "#e2e8f0"}`,
                borderRadius: 12, padding: "16px 20px", boxShadow: k.large ? "0 4px 20px rgba(0,0,0,0.15)" : "none" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: k.large ? "rgba(255,255,255,0.6)" : "#94a3b8",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: k.large ? "1.6rem" : "1.3rem", fontWeight: 900, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "confirmed", "pending"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${filter === f ? "#22d3ee" : "#e2e8f0"}`,
                  background: filter === f ? "#0c1a2e" : "#fff", color: filter === f ? "#22d3ee" : "#64748b",
                  fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", textTransform: "capitalize" }}>
                {f === "all" ? "All Events" : f === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
              </button>
            ))}
          </div>
          <select value={typeFilter} onChange={e => setType(e.target.value)}
            style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: "0.78rem",
              background: "#fff", color: "#1e293b", cursor: "pointer" }}>
            <option value="all">All Types</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>
            ))}
          </select>
        </div>

        {/* Recovery log */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", fontSize: "0.85rem" }}>
            Loading recovery events...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>💰</div>
            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No recovery events yet</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              AccuriScale will log every dollar it protects here as tickets are matched and validated.
            </div>
            <Link href="/ronyx/accuriscale/upload"
              style={{ display: "inline-block", marginTop: 16, background: "#22d3ee", color: "#000", padding: "10px 20px",
                borderRadius: 8, fontWeight: 800, fontSize: "0.82rem", textDecoration: "none" }}>
              Upload First Ticket →
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(item => {
              const meta = TYPE_META[item.recovery_type] ?? { label: item.recovery_type, color: "#64748b", bg: "#f1f5f9", icon: "•" };
              return (
                <div key={item.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px",
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0 16px", alignItems: "start" }}>

                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                    {meta.icon}
                  </div>

                  {/* Details */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ background: meta.bg, color: meta.color, fontSize: "0.68rem", fontWeight: 800,
                        padding: "2px 10px", borderRadius: 20, letterSpacing: "0.03em" }}>{meta.label}</span>
                      {item.status === "confirmed" && (
                        <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "0.68rem", fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>✓ Confirmed</span>
                      )}
                      {item.status === "pending" && (
                        <span style={{ background: "#fef9c3", color: "#b45309", fontSize: "0.68rem", fontWeight: 800, padding: "2px 10px", borderRadius: 20 }}>⏳ Pending</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#334155", lineHeight: 1.55, marginBottom: 6 }}>
                      {item.description}
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {item.ticket_number && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>🎫 {item.ticket_number}</span>
                      )}
                      {item.load_reference && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>📋 {item.load_reference}</span>
                      )}
                      {item.vendor_name && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>🏗️ {item.vendor_name}</span>
                      )}
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                        {new Date(item.recovered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {item.amount_recovered > 0 ? (
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#15803d" }}>
                        +${item.amount_recovered.toFixed(2)}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Hold</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        <div style={{ marginTop: 24, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px",
          fontSize: "0.75rem", color: "#1d4ed8", lineHeight: 1.6 }}>
          <strong>About Revenue Recovery:</strong> AccuriScale logs every billing hold, payroll correction, and duplicate block here.
          "Confirmed" means the discrepancy was resolved and money was protected. "Pending" means the hold is still active — load or payroll has not been released yet.
        </div>
      </div>
    </div>
  );
}
