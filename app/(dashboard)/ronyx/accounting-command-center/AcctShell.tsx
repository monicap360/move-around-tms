"use client";

// Shared shell for the Accounting Command Center workspaces: bright tab-style left nav +
// compact header. Each workspace page renders <AcctShell active="..." ...>{content}</AcctShell>.

import { ReactNode } from "react";

export const NAV = [
  { key: "overview",    label: "Overview",                  icon: "📊", href: "/ronyx/accounting-command-center" },
  { key: "tti",         label: "Ticket-to-Invoice",         icon: "🎫", href: "/ronyx/accounting-command-center/ticket-to-invoice" },
  { key: "ar",          label: "Accounts Receivable",       icon: "💵", href: "/ronyx/accounting-command-center/receivables" },
  { key: "payroll",     label: "Driver Payroll",            icon: "👷", href: "/ronyx/accounting-command-center/payroll" },
  { key: "settlements", label: "Owner Operator Settlements", icon: "🤝", href: "/ronyx/accounting-command-center/settlements" },
  { key: "margin",      label: "Job Costing & Margin",      icon: "📈", href: "/ronyx/accounting-command-center/margin" },
  { key: "fuel",        label: "Fuel & Cost Allocation",    icon: "⛽", href: "/ronyx/accounting-command-center/fuel" },
  { key: "exports",     label: "Accounting Exports",        icon: "🔄", href: "/ronyx/accounting-command-center/exports" },
  { key: "audit",       label: "Financial Audit Trail",     icon: "📜", href: "/ronyx/accounting-command-center/audit" },
  { key: "settings",    label: "Settings",                  icon: "⚙️", href: "/ronyx/accounting-command-center/settings" },
];

export const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const fmtc = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function AcctShell({ active, title, subtitle, controls, children }: {
  active: string; title: string; subtitle: string; controls?: ReactNode; children: ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", color: "#0f172a" }}>
      {/* Horizontal tab bar across the top */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "#ffffff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px 0" }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>MOVEAROUND TMS</div>
          <div style={{ fontWeight: 900, fontSize: "0.9rem", color: "#0f172a", whiteSpace: "nowrap" }}>· Accounting</div>
        </div>
        <nav style={{ display: "flex", gap: 6, padding: "8px 18px 10px", overflowX: "auto", whiteSpace: "nowrap" }}>
          {NAV.map(n => {
            const on = n.key === active;
            return (
              <a key={n.key} href={n.href} style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 9,
                fontSize: "0.8rem", fontWeight: 800, textDecoration: "none", flexShrink: 0,
                color: on ? "#fff" : "#334155",
                background: on ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "#f8fafc",
                border: on ? "1px solid #1d4ed8" : "1px solid #e2e8f0",
                boxShadow: on ? "0 2px 8px rgba(29,78,216,0.28)" : "none",
              }}>
                <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
              </a>
            );
          })}
        </nav>
      </div>

      <main style={{ minWidth: 0, padding: "20px 26px 60px", maxWidth: 1480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>{title}</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>{subtitle}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{controls}</div>
        </div>
        {children}
      </main>
    </div>
  );
}

export const ctrlBtn: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#334155", cursor: "pointer", whiteSpace: "nowrap" };
export const primaryBtn: React.CSSProperties = { background: "#1e40af", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: "0.78rem", fontWeight: 800, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" };
export const th: React.CSSProperties = { textAlign: "left", padding: "9px 11px", fontSize: "0.64rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, background: "#f8fafc" };
export const td: React.CSSProperties = { padding: "9px 11px", color: "#334155", verticalAlign: "middle", whiteSpace: "nowrap" };
export const chip: React.CSSProperties = { display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: "0.66rem", fontWeight: 700, whiteSpace: "nowrap" };
