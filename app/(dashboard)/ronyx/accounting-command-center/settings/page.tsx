"use client";

/* Accounting Command Center — Settings: roles, permissions, and financial controls. */

import { AcctShell, chip } from "../AcctShell";

const ROLES = [
  ["Owner", "Full access. Lock/unlock periods, approve write-offs."],
  ["Controller", "Full access. Lock/unlock periods, approve write-offs."],
  ["Accounting Manager", "Approve rate overrides, invoice voids, payment holds."],
  ["Billing Clerk", "Prepare invoices. Cannot override credit holds."],
  ["Payroll Specialist", "Prepare settlements. Cannot approve own adjustments."],
  ["Dispatcher", "Create/correct unapproved tickets only."],
  ["Operations Manager", "Operational visibility; no posting of financials."],
  ["Read Only", "View everything; change nothing."],
];
const RULES = [
  "Dispatchers can create and correct unapproved tickets only.",
  "Billing staff can prepare invoices but cannot override credit holds.",
  "Payroll staff can prepare settlements but cannot approve their own adjustments.",
  "Managers can approve rate overrides, invoice voids, and payment holds.",
  "Only Owners and Controllers can lock/unlock financial periods.",
  "Only Owners and Controllers can approve write-offs.",
  "No role can delete posted financial records.",
];

export default function Settings() {
  return (
    <AcctShell active="settings" title="Settings" subtitle="Roles, permissions, and financial controls for the Accounting Command Center.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontWeight: 800, marginBottom: 12 }}>Roles</div>
          {ROLES.map(([r, d]) => (
            <div key={r} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.88rem" }}>{r}</div>
              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Permission Rules</div>
            {RULES.map(r => <div key={r} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 0", fontSize: "0.82rem", color: "#334155" }}><span>✓</span><span>{r}</span></div>)}
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>Financial Controls</div>
            {[["Minimum gross margin alert", "15%"], ["Customer credit-hold auto-trigger", "90+ days overdue"], ["Approved tickets", "Locked from silent edits — adjustments only"], ["Posted records", "Never deleted"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.83rem" }}><span style={{ color: "#475569" }}>{k}</span><span style={{ ...chip, background: "#eff6ff", color: "#1d4ed8" }}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </AcctShell>
  );
}
