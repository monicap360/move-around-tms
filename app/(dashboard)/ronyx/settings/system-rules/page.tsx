"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

type Settings = Record<string, Record<string, any>>;

const TABS = [
  { id: "dispatch",    label: "Dispatch",    icon: "🚚" },
  { id: "compliance",  label: "Compliance",  icon: "🛡️" },
  { id: "payroll",     label: "Payroll",     icon: "💰" },
  { id: "fast_scan",   label: "Fast Scan",   icon: "📱" },
  { id: "fleet",       label: "Fleet",       icon: "🚛" },
  { id: "billing",     label: "Billing",     icon: "📄" },
  { id: "ai",          label: "AI Office",   icon: "🤖" },
  { id: "security",    label: "Security",    icon: "🔒" },
];

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{
      width: 34, height: 18, borderRadius: 9, border: "none", cursor: "pointer",
      background: on ? "#1d4ed8" : "#e2e8f0", position: "relative", flexShrink: 0, transition: "background 0.2s",
    }}>
      <span style={{
        position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function RuleRow({ label, desc, value, onChange, type = "toggle", options }: {
  label: string; desc?: string; value: any; onChange: (v: any) => void;
  type?: "toggle" | "number" | "select"; options?: string[];
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9", gap: 20 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{label}</div>
        {desc && <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>
        {type === "toggle" && <Toggle on={!!value} onChange={() => onChange(!value)} />}
        {type === "number" && (
          <input type="number" value={value ?? ""} onChange={e => onChange(parseInt(e.target.value))}
            style={{ width: 72, padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12 }} />
        )}
        {type === "select" && options && (
          <select value={value ?? ""} onChange={e => onChange(e.target.value)}
            style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 12 }}>
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: "18px 22px", marginBottom: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>{title}</div>
      {children}
    </div>
  );
}

export default function SystemRulesPage() {
  const [tab, setTab]         = useState("dispatch");
  const [map, setMap]         = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState("");

  useEffect(() => {
    fetch("/api/ronyx/settings/admin").then(r => r.json()).then(d => setMap(d.map ?? {})).finally(() => setLoading(false));
  }, []);

  async function save(group: string, key: string, value: any) {
    setMap(p => ({ ...p, [group]: { ...(p[group] ?? {}), [key]: value } }));
    const res = await fetch("/api/ronyx/settings/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setting_group: group, setting_key: key, setting_value: value }),
    });
    setToast(res.ok ? "Saved." : "Save failed.");
    setTimeout(() => setToast(""), 1500);
  }

  function g(group: string, key: string, fallback?: any) {
    return map[group]?.[key] ?? fallback;
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b", fontFamily: "'Inter','Segoe UI',sans-serif" }}>Loading…</div>;

  const dispatch   = g("system_rules", "dispatch", {});
  const compliance = g("compliance_defaults", "warnings", {});
  const payroll    = g("payroll_rules", "rules", {});
  const ai         = g("ai_settings", "toggles", {});
  const security   = g("security", "page_protection", {});

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1000, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, fontSize: 12 }}>
        <Link href="/ronyx/settings" style={{ color: "#1d4ed8", fontWeight: 600 }}>← Admin Control Center</Link>
        <span style={{ color: "#94a3b8" }}>/</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>System Rules</span>
      </div>

      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>System Rules</div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
        Global rules for dispatch, compliance, payroll, fast scan, fleet, billing, AI assistance, and security.
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: "2px solid #e2e8f0", overflowX: "auto", paddingBottom: 1 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 14px", border: "none", borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#1d4ed8" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #1d4ed8" : "2px solid transparent",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* DISPATCH TAB */}
      {tab === "dispatch" && (
        <>
          <Section title="Block Conditions">
            <RuleRow label="Block if CDL Expired" desc="Prevent dispatch if driver's CDL is expired." value={dispatch.block_if_cdl_expired} onChange={v => save("system_rules", "dispatch", { ...dispatch, block_if_cdl_expired: v })} />
            <RuleRow label="Block if Medical Card Expired" desc="Prevent dispatch if driver's DOT Medical Card is expired." value={dispatch.block_if_medical_expired} onChange={v => save("system_rules", "dispatch", { ...dispatch, block_if_medical_expired: v })} />
            <RuleRow label="Block if COI Missing" desc="Prevent dispatch if owner operator has no Certificate of Insurance on file." value={dispatch.block_if_coi_missing} onChange={v => save("system_rules", "dispatch", { ...dispatch, block_if_coi_missing: v })} />
            <RuleRow label="Block if Drug Test Expired" desc="Prevent dispatch if driver's drug test is expired or missing." value={dispatch.block_if_drug_test_expired} onChange={v => save("system_rules", "dispatch", { ...dispatch, block_if_drug_test_expired: v })} />
          </Section>
          <Section title="Override Policy">
            <RuleRow label="Allow Manager Override" desc="Dispatchers can request a manager to override block conditions." value={dispatch.allow_manager_override} onChange={v => save("system_rules", "dispatch", { ...dispatch, allow_manager_override: v })} />
            <RuleRow label="Max Override Duration (days)" type="number" desc="How many days an override stays active before it expires." value={dispatch.max_override_days ?? 7} onChange={v => save("system_rules", "dispatch", { ...dispatch, max_override_days: v })} />
            <RuleRow label="Require Override Notes" desc="Overrides must include a reason note." value={dispatch.require_override_notes} onChange={v => save("system_rules", "dispatch", { ...dispatch, require_override_notes: v })} />
          </Section>
          <Section title="Dispatch Validation">
            <RuleRow label="Require Ticket Number" desc="Every dispatch job must have a customer ticket number." value={dispatch.require_ticket_number} onChange={v => save("system_rules", "dispatch", { ...dispatch, require_ticket_number: v })} />
            <RuleRow label="Require Customer on Dispatch" desc="A customer name must be assigned before dispatch is confirmed." value={dispatch.require_customer} onChange={v => save("system_rules", "dispatch", { ...dispatch, require_customer: v })} />
          </Section>
        </>
      )}

      {/* COMPLIANCE TAB */}
      {tab === "compliance" && (
        <>
          <Section title="Warning Windows (days before expiration)">
            <RuleRow label="CDL Warning Window" type="number" desc="Days before CDL expiration to show a warning." value={compliance.cdl_warning_days ?? 30} onChange={v => save("compliance_defaults", "warnings", { ...compliance, cdl_warning_days: v })} />
            <RuleRow label="Medical Card Warning Window" type="number" value={compliance.medical_warning_days ?? 14} onChange={v => save("compliance_defaults", "warnings", { ...compliance, medical_warning_days: v })} />
            <RuleRow label="Drug Test Warning Window" type="number" value={compliance.drug_test_warning_days ?? 30} onChange={v => save("compliance_defaults", "warnings", { ...compliance, drug_test_warning_days: v })} />
            <RuleRow label="COI Warning Window" type="number" desc="Days before owner operator COI expires to flag." value={compliance.coi_warning_days ?? 21} onChange={v => save("compliance_defaults", "warnings", { ...compliance, coi_warning_days: v })} />
            <RuleRow label="MVR Warning Window" type="number" value={compliance.mvr_warning_days ?? 30} onChange={v => save("compliance_defaults", "warnings", { ...compliance, mvr_warning_days: v })} />
          </Section>
          <Section title="Auto-Actions">
            <RuleRow label="Auto-Create Task on Expiration" desc="Automatically create a compliance task when a document expires." value={compliance.auto_task_on_expiration} onChange={v => save("compliance_defaults", "warnings", { ...compliance, auto_task_on_expiration: v })} />
            <RuleRow label="Auto-Notify on Expiration" desc="Send an in-app notification to the assigned role." value={compliance.auto_notify_on_expiration} onChange={v => save("compliance_defaults", "warnings", { ...compliance, auto_notify_on_expiration: v })} />
          </Section>
        </>
      )}

      {/* PAYROLL TAB */}
      {tab === "payroll" && (
        <>
          <Section title="Payroll Week">
            <RuleRow label="Payroll Start Day" type="select" options={["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]}
              value={payroll.payroll_start_day ?? "Sunday"} onChange={v => save("payroll_rules", "rules", { ...payroll, payroll_start_day: v })} />
            <RuleRow label="Settlement Cycle" type="select" options={["Weekly","Bi-Weekly","Monthly"]}
              value={payroll.settlement_cycle ?? "Weekly"} onChange={v => save("payroll_rules", "rules", { ...payroll, settlement_cycle: v })} />
          </Section>
          <Section title="Ticket Validation">
            <RuleRow label="Require Ticket Proof for Payroll" desc="Tickets must have proof (Fast Scan or upload) before payroll is approved." value={payroll.require_ticket_proof} onChange={v => save("payroll_rules", "rules", { ...payroll, require_ticket_proof: v })} />
            <RuleRow label="Require POD for Billing" desc="Proof of delivery required before invoicing." value={payroll.require_pod_for_billing} onChange={v => save("payroll_rules", "rules", { ...payroll, require_pod_for_billing: v })} />
            <RuleRow label="Allow Negative Settlements" desc="Allow payroll settlements to result in negative balance (loan deductions)." value={payroll.allow_negative_settlement} onChange={v => save("payroll_rules", "rules", { ...payroll, allow_negative_settlement: v })} />
          </Section>
          <Section title="Deductions">
            <RuleRow label="Auto-Apply Loan Deductions" desc="Automatically deduct active loan balances from weekly settlements." value={payroll.auto_deduct_loans} onChange={v => save("payroll_rules", "rules", { ...payroll, auto_deduct_loans: v })} />
            <RuleRow label="Require Manager Review Before Payroll Export" value={payroll.require_manager_review} onChange={v => save("payroll_rules", "rules", { ...payroll, require_manager_review: v })} />
          </Section>
        </>
      )}

      {/* FAST SCAN TAB */}
      {tab === "fast_scan" && (
        <>
          <Section title="Fast Scan Behavior">
            <RuleRow label="Auto-Match to Dispatch Tickets" desc="When a ticket is scanned, automatically match it to the open dispatch ticket." value={g("system_rules","fast_scan",{}).auto_match_dispatch} onChange={v => save("system_rules","fast_scan",{...g("system_rules","fast_scan",{}),auto_match_dispatch:v})} />
            <RuleRow label="Require Driver Signature" value={g("system_rules","fast_scan",{}).require_signature} onChange={v => save("system_rules","fast_scan",{...g("system_rules","fast_scan",{}),require_signature:v})} />
            <RuleRow label="Allow Back-Scan (Past Dates)" desc="Staff can scan tickets from previous days." value={g("system_rules","fast_scan",{}).allow_back_scan} onChange={v => save("system_rules","fast_scan",{...g("system_rules","fast_scan",{}),allow_back_scan:v})} />
            <RuleRow label="Send to Payroll on Scan" desc="Automatically mark scanned tickets as payroll-ready." value={g("system_rules","fast_scan",{}).send_to_payroll_on_scan} onChange={v => save("system_rules","fast_scan",{...g("system_rules","fast_scan",{}),send_to_payroll_on_scan:v})} />
          </Section>
        </>
      )}

      {/* FLEET TAB */}
      {tab === "fleet" && (
        <>
          <Section title="Truck & Equipment">
            <RuleRow label="Block Dispatch if DOT Inspection Expired" value={g("system_rules","fleet",{}).block_if_dot_expired} onChange={v => save("system_rules","fleet",{...g("system_rules","fleet",{}),block_if_dot_expired:v})} />
            <RuleRow label="Block Dispatch if Truck Insurance Expired" value={g("system_rules","fleet",{}).block_if_insurance_expired} onChange={v => save("system_rules","fleet",{...g("system_rules","fleet",{}),block_if_insurance_expired:v})} />
            <RuleRow label="Auto-Create Maintenance Task at Mileage Threshold" value={g("system_rules","fleet",{}).auto_maintenance_task} onChange={v => save("system_rules","fleet",{...g("system_rules","fleet",{}),auto_maintenance_task:v})} />
            <RuleRow label="DOT Inspection Warning Window (days)" type="number" value={g("system_rules","fleet",{}).dot_warning_days ?? 30} onChange={v => save("system_rules","fleet",{...g("system_rules","fleet",{}),dot_warning_days:v})} />
          </Section>
        </>
      )}

      {/* BILLING TAB */}
      {tab === "billing" && (
        <>
          <Section title="Invoice Rules">
            <RuleRow label="Auto-Generate Invoice on Ticket Scan" value={g("system_rules","billing",{}).auto_invoice_on_scan} onChange={v => save("system_rules","billing",{...g("system_rules","billing",{}),auto_invoice_on_scan:v})} />
            <RuleRow label="Require Manager Approval Before Sending Invoice" value={g("system_rules","billing",{}).require_approval_before_send} onChange={v => save("system_rules","billing",{...g("system_rules","billing",{}),require_approval_before_send:v})} />
            <RuleRow label="Default Invoice Net Days" type="number" value={g("system_rules","billing",{}).net_days ?? 30} onChange={v => save("system_rules","billing",{...g("system_rules","billing",{}),net_days:v})} />
          </Section>
        </>
      )}

      {/* AI OFFICE TAB */}
      {tab === "ai" && (
        <>
          <Section title="AI Office Assistant">
            <RuleRow label="Enable AI-Guided Next Actions" desc="Show AI-recommended next steps on compliance pages, dispatch, and payroll." value={ai.ai_next_actions} onChange={v => save("ai_settings","toggles",{...ai,ai_next_actions:v})} />
            <RuleRow label="Enable AI Auto-Task Creation" desc="AI creates follow-up tasks automatically when issues are detected." value={ai.auto_task_creation} onChange={v => save("ai_settings","toggles",{...ai,auto_task_creation:v})} />
            <RuleRow label="Enable AI Dispatch Suggestions" desc="AI suggests trucks, drivers, and routes based on past jobs." value={ai.dispatch_suggestions} onChange={v => save("ai_settings","toggles",{...ai,dispatch_suggestions:v})} />
            <RuleRow label="Enable AI Compliance Risk Scoring" desc="AI scores each driver and owner operator by compliance risk level." value={ai.compliance_scoring} onChange={v => save("ai_settings","toggles",{...ai,compliance_scoring:v})} />
            <RuleRow label="Enable AI Payroll Anomaly Detection" desc="Flag unusual payroll entries before approval." value={ai.payroll_anomaly} onChange={v => save("ai_settings","toggles",{...ai,payroll_anomaly:v})} />
          </Section>
        </>
      )}

      {/* SECURITY TAB */}
      {tab === "security" && (
        <>
          <Section title="Page Protection">
            <RuleRow label="Disable Right-Click on Sensitive Pages" desc="Block right-click context menu on driver, compliance, and payroll pages." value={security.disable_right_click} onChange={v => save("security","page_protection",{...security,disable_right_click:v})} />
            <RuleRow label="Disable Text Selection" desc="Prevent text from being selected on protected pages." value={security.disable_text_select} onChange={v => save("security","page_protection",{...security,disable_text_select:v})} />
            <RuleRow label="Disable Print" desc="Block browser print (Ctrl+P) on sensitive pages." value={security.disable_print} onChange={v => save("security","page_protection",{...security,disable_print:v})} />
            <RuleRow label="Show Watermark" desc="Add a watermark overlay with the staff member's name on protected pages." value={security.show_watermark} onChange={v => save("security","page_protection",{...security,show_watermark:v})} />
          </Section>
          <Section title="Export Controls">
            <RuleRow label="Restrict CSV Export to Admin Roles" desc="Only Owner/Admin and Payroll Admin can export CSV data." value={security.restrict_csv_export} onChange={v => save("security","page_protection",{...security,restrict_csv_export:v})} />
            <RuleRow label="Log All Export Actions" desc="Record every data export to the audit log." value={security.log_exports} onChange={v => save("security","page_protection",{...security,log_exports:v})} />
          </Section>
        </>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "10px 18px", borderRadius: 10, fontWeight: 700, fontSize: 12 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
