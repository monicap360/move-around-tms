"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HealthData = {
  staffUsers:       number;
  activeRoles:      number;
  companyConfigured: boolean;
  customerRules:    number;
  docRoutingRules:  number;
  notifRules:       number;
  dispatchRulesOn:  boolean;
  overrides:        number;
  auditEvents:      number;
};

const SECTIONS = [
  { id: "company",       label: "Company Profile",                 icon: "🏢", color: "#1e40af", href: "/ronyx/settings/company-profile",     desc: "Company name, DBA, DOT/MC numbers, address, contact, timezone, company type." },
  { id: "users",         label: "Users & Staff",                   icon: "👥", color: "#0891b2", href: "/ronyx/settings/users",                desc: "Add staff, assign roles, set department, manage access and on-shift status." },
  { id: "roles",         label: "Roles & Permissions",             icon: "🔐", color: "#7c3aed", href: "/ronyx/settings/roles",                desc: "Permission matrix for each role — what staff can view, edit, approve, or delete." },
  { id: "rules",         label: "System Rules",                    icon: "⚡", color: "#1e40af", href: "/ronyx/settings/system-rules",         desc: "Dispatch, compliance, fleet, payroll, billing, and Fast Scan rules." },
  { id: "requirements",  label: "Clearance Check™",                 icon: "✅", color: "#0891b2", href: "/ronyx/compliance/customer-dispatch-requirements", desc: "Per-customer rulebook — customer, driver, truck, COI, and document requirements checked before dispatch." },
  { id: "compliance",    label: "Compliance Defaults",             icon: "🛡️", color: "#dc2626", href: "/ronyx/settings/system-rules#compliance", desc: "Expiration warning windows, auto-block rules, auto-notify settings." },
  { id: "payroll",       label: "Payroll / Settlement Rules",       icon: "💰", color: "#16a34a", href: "/ronyx/settings/system-rules#payroll",  desc: "Payroll week, ticket proof requirements, loan deductions, settlement review." },
  { id: "documents",     label: "Document Types & Routing",         icon: "📂", color: "#d97706", href: "/ronyx/settings/document-routing",      desc: "Where each document type routes — CDL, COIs, invoices, ticket proofs, PODs." },
  { id: "notifications", label: "Notification Rules",              icon: "🔔", color: "#d97706", href: "/ronyx/settings/notifications",         desc: "Which events trigger in-app, email, or dashboard alerts, and who gets them." },
  { id: "tasks",         label: "Staff Task Assignment Rules",      icon: "📌", color: "#475569", href: "/ronyx/settings/system-rules#tasks",    desc: "Auto-assign tasks by issue type — CDL missing → Compliance Admin, etc." },
  { id: "ai",            label: "AI Office Assistant",             icon: "🤖", color: "#7c3aed", href: "/ronyx/settings/system-rules#ai",       desc: "Toggle AI-guided next actions, auto-task creation, dispatch suggestions." },
  { id: "security",      label: "Security & Page Protection",       icon: "🔒", color: "#dc2626", href: "/ronyx/settings/system-rules#security", desc: "Right-click/copy/print controls, watermarks, export role permissions." },
  { id: "audit",         label: "Audit Log",                       icon: "📜", color: "#475569", href: "/ronyx/settings/audit-log",             desc: "Full history of role changes, setting updates, override approvals, user actions." },
];

const PERMISSIONS = [
  "view_drivers","edit_drivers","upload_documents","approve_compliance",
  "request_override","approve_override","dispatch_jobs","assign_trucks",
  "approve_payroll","export_reports","access_admin_settings",
];

function HealthBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  return (
    <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ flex: "1 1 120px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: "12px 16px", textAlign: "center", minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function AdminControlCenterPage() {
  const [health, setHealth]   = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ronyx/settings/users").then(r => r.json()),
      fetch("/api/ronyx/settings/roles").then(r => r.json()),
      fetch("/api/ronyx/settings/admin?group=company_profile").then(r => r.json()),
      fetch("/api/ronyx/compliance/customer-dispatch-requirements").then(r => r.json()),
      fetch("/api/ronyx/settings/document-routing").then(r => r.json()),
      fetch("/api/ronyx/settings/notifications").then(r => r.json()),
      fetch("/api/ronyx/settings/admin?group=system_rules").then(r => r.json()),
      fetch("/api/ronyx/compliance/overrides?status=active").then(r => r.json()),
      fetch("/api/ronyx/settings/audit?limit=1").then(r => r.json()),
    ]).then(([u, r, cp, cdr, dr, nr, sr, ov, al]) => {
      const profile = cp.map?.company_profile?.profile ?? {};
      setHealth({
        staffUsers:        (u.users ?? []).length,
        activeRoles:       (r.roles ?? []).length,
        companyConfigured: !!(profile.company_name),
        customerRules:     (cdr.requirements ?? []).length,
        docRoutingRules:   (dr.rules ?? []).length,
        notifRules:        (nr.rules ?? []).filter((x: any) => x.is_active).length,
        dispatchRulesOn:   !!(sr.map?.system_rules?.dispatch?.block_if_cdl_expired),
        overrides:         (ov.overrides ?? []).length,
        auditEvents:       (al.logs ?? []).length > 0 ? 1 : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  const healthScore = health ? Math.round(
    ([
      health.companyConfigured,
      health.staffUsers > 0,
      health.activeRoles >= 3,
      health.customerRules > 0,
      health.docRoutingRules > 5,
      health.notifRules > 3,
      health.dispatchRulesOn,
    ].filter(Boolean).length / 7) * 100
  ) : 0;

  const firstAction = health
    ? !health.companyConfigured
      ? { text: "Add company profile — name, DOT number, and contact info.", href: "/ronyx/settings/company-profile" }
      : health.staffUsers === 0
      ? { text: "Add staff users and assign roles so dispatch and compliance can log in.", href: "/ronyx/settings/users" }
      : health.customerRules === 0
      ? { text: "Configure Clearance Check™ so it knows what to verify before every dispatch.", href: "/ronyx/compliance/customer-dispatch-requirements" }
      : health.docRoutingRules <= 5
      ? { text: "Set up document routing so uploads go to the right place automatically.", href: "/ronyx/settings/document-routing" }
      : health.notifRules <= 3
      ? { text: "Configure notification rules so staff are alerted when documents expire or dispatch is blocked.", href: "/ronyx/settings/notifications" }
      : { text: "Setup is in good shape. Review the audit log and active overrides.", href: "/ronyx/settings/audit-log" }
    : null;

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1320, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.6px" }}>
          RONYX ADMIN CONTROL CENTER
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4, maxWidth: 700 }}>
          Manage company setup, staff users, roles, permissions, customer requirements, compliance defaults, dispatch rules, payroll settings, document routing, notifications, AI guidance, security, and audit history.
        </div>
      </div>

      {/* Admin Mission Control */}
      <div style={{ border: "1px solid #bfdbfe", borderRadius: 14, background: "linear-gradient(135deg,#eff6ff 0%,#f0f9ff 100%)", padding: "18px 22px", marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Admin Mission Control</div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1e3a8a", marginBottom: 6 }}>Today's Admin Focus</div>
        <div style={{ fontSize: 13, color: "#1e40af", marginBottom: firstAction ? 10 : 0 }}>
          Keep staff access, compliance rules, dispatch settings, payroll defaults, and document routing aligned so the office can run without confusion.
        </div>
        {firstAction && !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px 14px", background: "rgba(255,255,255,0.7)", borderRadius: 8, border: "1px solid #bfdbfe" }}>
            <span style={{ fontSize: 14 }}>⚡</span>
            <div style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 600, flex: 1 }}>
              Recommended First Action: {firstAction.text}
            </div>
            <Link href={firstAction.href}>
              <button style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: "#1d4ed8", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                Go →
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Setup Health Score */}
      {!loading && health && (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, background: "#fff", padding: "18px 22px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>System Setup Health</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Based on company profile, staff, roles, rules, routing, and notifications configured.</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: healthScore >= 80 ? "#16a34a" : healthScore >= 50 ? "#d97706" : "#dc2626" }}>{healthScore}%</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Setup Complete</div>
            </div>
          </div>
          <HealthBar pct={healthScore} />
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { label: "Company Profile", ok: health.companyConfigured },
              { label: "Staff Users",     ok: health.staffUsers > 0 },
              { label: "Roles Active",    ok: health.activeRoles >= 3 },
              { label: "Customer Rules",  ok: health.customerRules > 0 },
              { label: "Doc Routing",     ok: health.docRoutingRules > 5 },
              { label: "Notifications",   ok: health.notifRules > 3 },
              { label: "Dispatch Rules",  ok: health.dispatchRulesOn },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
                color: ok ? "#166534" : "#dc2626", background: ok ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${ok ? "#86efac" : "#fca5a5"}`, borderRadius: 6, padding: "3px 10px" }}>
                <span>{ok ? "✓" : "✗"}</span> {label}
              </div>
            ))}
          </div>

          {/* KPI cards */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <KpiCard label="Staff Users"      value={health.staffUsers}       color="#1d4ed8" />
            <KpiCard label="Active Roles"     value={health.activeRoles}      color="#7c3aed" />
            <KpiCard label="Customer Rules"   value={health.customerRules}    color="#0891b2" />
            <KpiCard label="Doc Route Rules"  value={health.docRoutingRules}  color="#d97706" />
            <KpiCard label="Notif Rules"      value={health.notifRules}       color="#d97706" />
            <KpiCard label="Active Overrides" value={health.overrides}        color="#dc2626" />
          </div>
        </div>
      )}

      {/* Section Grid */}
      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 14 }}>All Settings Sections</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {SECTIONS.map((s) => (
          <Link key={s.id} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: "16px 18px",
              cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
              display: "flex", flexDirection: "column", gap: 6, height: "100%",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#bfdbfe"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <div style={{ fontWeight: 800, fontSize: 13, color: s.color }}>{s.label}</div>
              </div>
              <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>Configure →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
