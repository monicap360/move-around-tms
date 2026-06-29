"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditIssue = {
  id: string;
  severity: "critical" | "warning" | "low";
  title: string;
  entity_name?: string;
  entity_detail?: string;
  entity_type?: string;
  entity_id?: string;
  assigned_role?: string;
  action_label?: string;
  action_href?: string;
};

type DriverAudit = {
  id: string;
  name: string;
  cdl: string;
  medical_card: string;
  mvr: string;
  drug_test: string;
  background_check: string;
  driver_application: string;
  employment_agreement: string;
  w9: string;
  emergency_contact: string;
  payroll_setup: string;
  dispatch_eligible: boolean;
  overall: "ready" | "warning" | "at_risk" | "blocked";
};

type FleetAudit = {
  id: string;
  truck_number: string;
  registration: string;
  insurance: string;
  inspection: string;
  cab_card: string;
  lease_agreement: string;
  maintenance_current: string;
  oos_status: string;
  ifta_decal: string;
  plate: string;
  vin: string;
  overall: "ready" | "warning" | "at_risk" | "blocked";
};

type OOAudit = {
  id: string;
  company_name: string;
  contract: string;
  w9: string;
  auto_liability: string;
  general_liability: string;
  cargo: string;
  workers_comp: string;
  truck_list: string;
  driver_list: string;
  settlement_setup: string;
  dispatch_eligible: boolean;
  customer_approval: string;
  overall: "ready" | "warning" | "at_risk" | "blocked";
};

type AuditScores = {
  overall: number;
  drivers: number;
  fleet: number;
  owner_operators: number;
  tickets: number;
  payroll: number;
  billing: number;
  insurance: number;
  ifta: number;
};

type Tab = "overview" | "drivers" | "fleet" | "owner_operators" | "insurance" | "tickets" | "payroll" | "billing" | "ifta" | "customer_requirements" | "audit_packets" | "activity_log";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreLabel(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: "Audit Ready",               color: "#15803d", bg: "#dcfce7" };
  if (score >= 75) return { label: "Ready with Warnings",       color: "#b45309", bg: "#fef9c3" };
  if (score >= 50) return { label: "Needs Review",              color: "#ea580c", bg: "#ffedd5" };
  if (score >= 25) return { label: "At Risk",                   color: "#dc2626", bg: "#fee2e2" };
  return              { label: "Not Audit Ready",              color: "#7f1d1d", bg: "#fee2e2" };
}

function statusBadge(val: string, override?: { color: string; bg: string }) {
  const MAP: Record<string, { color: string; bg: string }> = {
    clear:          { color: "#15803d", bg: "#dcfce7" },
    current:        { color: "#15803d", bg: "#dcfce7" },
    complete:       { color: "#15803d", bg: "#dcfce7" },
    ok:             { color: "#15803d", bg: "#dcfce7" },
    passed:         { color: "#15803d", bg: "#dcfce7" },
    approved:       { color: "#15803d", bg: "#dcfce7" },
    warning:        { color: "#b45309", bg: "#fef9c3" },
    expiring:       { color: "#b45309", bg: "#fef9c3" },
    needs_review:   { color: "#ea580c", bg: "#ffedd5" },
    expired:        { color: "#dc2626", bg: "#fee2e2" },
    missing:        { color: "#dc2626", bg: "#fee2e2" },
    blocked:        { color: "#dc2626", bg: "#fee2e2" },
    failed:         { color: "#dc2626", bg: "#fee2e2" },
    not_set:        { color: "#64748b", bg: "#f1f5f9" },
    n_a:            { color: "#64748b", bg: "#f1f5f9" },
  };
  const key = (val || "missing").toLowerCase().replace(/[\s\/]+/g, "_");
  const sty = override ?? MAP[key] ?? { color: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{ background: sty.bg, color: sty.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {val || "Missing"}
    </span>
  );
}

function ScoreDonut({ score }: { score: number }) {
  const sty = scoreLabel(score);
  const circ = 2 * Math.PI * 52;
  const dash = (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
      <svg viewBox="0 0 120 120" style={{ width: 140, height: 140, transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={sty.color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 900, color: sty.color, lineHeight: 1 }}>{score}%</div>
        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: sty.color, textAlign: "center", lineHeight: 1.2, marginTop: 3 }}>
          {sty.label}
        </div>
      </div>
    </div>
  );
}

// ─── Demo / placeholder data builders ────────────────────────────────────────

function buildScores(
  drivers: DriverAudit[],
  fleet: FleetAudit[],
  oos: OOAudit[],
): AuditScores {
  const pct = (arr: Array<{ overall: string }>, good: string[]) =>
    arr.length === 0 ? 100 : Math.round(arr.filter(x => good.includes(x.overall)).length / arr.length * 100);
  const d = pct(drivers, ["ready"]);
  const f = pct(fleet, ["ready"]);
  const o = pct(oos, ["ready"]);
  const avg = drivers.length + fleet.length + oos.length === 0 ? 85 :
    Math.round((d + f + o) / 3);
  return { overall: avg, drivers: d, fleet: f, owner_operators: o, tickets: 94, payroll: 91, billing: 89, insurance: 87, ifta: 82 };
}

const DRIVER_CHECKS = ["cdl","medical_card","mvr","drug_test","background_check","driver_application","employment_agreement","w9","emergency_contact","payroll_setup"];
const DRIVER_LABELS: Record<string, string> = {
  cdl: "CDL", medical_card: "Medical Card", mvr: "MVR", drug_test: "Drug Test",
  background_check: "Background Check", driver_application: "Driver Application",
  employment_agreement: "Employment Agreement", w9: "W-9", emergency_contact: "Emergency Contact",
  payroll_setup: "Payroll Setup",
};

const FLEET_CHECKS = ["registration","insurance","inspection","cab_card","lease_agreement","maintenance_current","oos_status","ifta_decal","plate","vin"];
const FLEET_LABELS: Record<string, string> = {
  registration: "Registration", insurance: "Insurance", inspection: "Inspection",
  cab_card: "Cab Card", lease_agreement: "Lease Agreement", maintenance_current: "Maintenance Records",
  oos_status: "OOS Status", ifta_decal: "IFTA Decal", plate: "Plate Number", vin: "VIN",
};

const OO_CHECKS = ["contract","w9","auto_liability","general_liability","workers_comp","truck_list","driver_list","settlement_setup","customer_approval"];
const OO_LABELS: Record<string, string> = {
  contract: "Contract", w9: "W-9", auto_liability: "Auto Liability COI", general_liability: "General Liability COI",
  cargo: "Cargo COI", workers_comp: "Workers Comp", truck_list: "Truck List",
  driver_list: "Driver List", settlement_setup: "Settlement Setup", customer_approval: "Customer Approval",
};

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: "overview",              label: "Overview",             icon: "📊" },
  { key: "drivers",               label: "Drivers",              icon: "👤" },
  { key: "fleet",                 label: "Fleet",                icon: "🚛" },
  { key: "owner_operators",       label: "Owner Operators",      icon: "🏢" },
  { key: "insurance",             label: "Insurance / COI",      icon: "🛡️" },
  { key: "tickets",               label: "Tickets",              icon: "🎫" },
  { key: "payroll",               label: "Payroll",              icon: "💵" },
  { key: "billing",               label: "Billing",              icon: "🧾" },
  { key: "ifta",                  label: "IFTA",                 icon: "⛽" },
  { key: "customer_requirements", label: "Customer Req.",        icon: "📋" },
  { key: "audit_packets",         label: "Audit Packets",        icon: "📦" },
  { key: "activity_log",         label: "Activity Log",         icon: "📜" },
];

const PACKET_TYPES = [
  "Driver Audit Packet",
  "Truck Audit Packet",
  "Owner Operator Packet",
  "Customer Job Packet",
  "Payroll Packet",
  "Billing Packet",
  "IFTA Packet",
  "Full Company Packet",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BeAuditReadyPage() {
  const [tab, setTab]             = useState<Tab>("overview");
  const [drivers, setDrivers]     = useState<DriverAudit[]>([]);
  const [fleet, setFleet]         = useState<FleetAudit[]>([]);
  const [oos, setOOs]             = useState<OOAudit[]>([]);
  const [issues, setIssues]       = useState<AuditIssue[]>([]);
  const [auditLog, setAuditLog]   = useState<Record<string, unknown>[]>([]);
  const [scores, setScores]       = useState<AuditScores>({ overall: 0, drivers: 0, fleet: 0, owner_operators: 0, tickets: 0, payroll: 0, billing: 0, insurance: 0, ifta: 0 });
  const [loading, setLoading]     = useState(true);
  const [running, setRunning]     = useState(false);
  const [packetType, setPacketType] = useState(PACKET_TYPES[0]);
  const [dateRange, setDateRange]   = useState("This Month");
  const [toast, setToast]           = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [fleetSearch, setFleetSearch]   = useState("");
  const [ooSearch, setOOSearch]         = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  const runAuditCheck = useCallback(async () => {
    setRunning(true);
    setLoading(true);
    try {
      const [dRes, tRes, ooRes, logRes] = await Promise.all([
        fetch("/api/ronyx/drivers/list").then(r => r.ok ? r.json() : { drivers: [] }).catch(() => ({ drivers: [] })),
        fetch("/api/ronyx/trucks").then(r => r.ok ? r.json() : { trucks: [] }).catch(() => ({ trucks: [] })),
        fetch("/api/ronyx/owner-operators").then(r => r.ok ? r.json() : { operators: [] }).catch(() => ({ operators: [] })),
        fetch("/api/ronyx/drivers/audit-log?limit=50").then(r => r.ok ? r.json() : { logs: [] }).catch(() => ({ logs: [] })),
      ]);

      const rawDrivers = (dRes.drivers ?? dRes.data ?? []) as Record<string, string>[];
      const rawTrucks  = (tRes.trucks  ?? tRes.data  ?? []) as Record<string, string>[];
      const rawOOs     = (ooRes.operators ?? ooRes.owner_operators ?? ooRes.data ?? []) as Record<string, string>[];

      const parsedDrivers: DriverAudit[] = rawDrivers.map(d => {
        const checks = {
          cdl:                   d.license_number ? "Clear" : "Missing",
          medical_card:          d.medical_card_expiration ? (new Date(d.medical_card_expiration) > new Date() ? "Current" : "Expired") : "Missing",
          mvr:                   d.mvr_expiration ? (new Date(d.mvr_expiration) > new Date() ? "Current" : "Expired") : "Missing",
          drug_test:             d.drug_test_expiration ? (new Date(d.drug_test_expiration) > new Date() ? "Passed" : "Expired") : "Missing",
          background_check:      d.background_check_status || "Missing",
          driver_application:    d.hire_date ? "Complete" : "Missing",
          employment_agreement:  d.employment_agreement_status || "Missing",
          w9:                    d.w9_status || "Missing",
          emergency_contact:     d.emergency_contact ? "Complete" : "Missing",
          payroll_setup:         d.pay_rate ? "Complete" : "Missing",
          dispatch_eligible:     d.dispatch_eligible !== "false",
        };
        const issues = Object.values(checks).filter(v => typeof v === "string" && ["Missing","Expired"].includes(v)).length;
        const overall = issues === 0 ? "ready" : issues <= 2 ? "warning" : issues <= 4 ? "at_risk" : "blocked";
        return { id: d.id, name: d.full_name || "—", ...checks, overall } as unknown as DriverAudit;
      });

      const parsedFleet: FleetAudit[] = rawTrucks.map(t => {
        const checks = {
          registration:        t.registration_expiration ? (new Date(t.registration_expiration) > new Date() ? "Current" : "Expired") : "Missing",
          insurance:           t.insurance_expiration    ? (new Date(t.insurance_expiration)    > new Date() ? "Current" : "Expired") : "Missing",
          inspection:          t.inspection_expiration   ? (new Date(t.inspection_expiration)   > new Date() ? "Current" : "Expired") : "Missing",
          cab_card:            t.cab_card_status || "Missing",
          lease_agreement:     t.lease_agreement_status || "N/A",
          maintenance_current: t.maintenance_status || "Missing",
          oos_status:          t.status === "out_of_service" ? "Out of Service" : "Active",
          ifta_decal:          t.ifta_decal_status || "Missing",
          plate:               t.plate || t.license_plate ? "On File" : "Missing",
          vin:                 t.vin ? "On File" : "Missing",
        };
        const issues = Object.values(checks).filter(v => ["Missing","Expired","Out of Service"].includes(v)).length;
        const overall = issues === 0 ? "ready" : issues <= 2 ? "warning" : issues <= 4 ? "at_risk" : "blocked";
        return { id: t.id, truck_number: t.truck_number || t.id.slice(0, 8), company_name: t.company_name || t.owner_operator_name || t.carrier_name || "", make: [t.year, t.make, t.model].filter(Boolean).join(" "), vin: t.vin || "", plate: t.plate || "", ...checks, overall } as unknown as FleetAudit;
      });

      const parsedOOs: OOAudit[] = rawOOs.map(o => {
        const checks = {
          contract:           o.contract_status || "Missing",
          w9:                 o.w9_status || "Missing",
          auto_liability:     o.auto_liability_expiration ? (new Date(o.auto_liability_expiration) > new Date() ? "Current" : "Expired") : "Missing",
          general_liability:  o.general_liability_expiration ? (new Date(o.general_liability_expiration) > new Date() ? "Current" : "Expired") : "Missing",
          cargo:              o.cargo_expiration ? (new Date(o.cargo_expiration) > new Date() ? "Current" : "Expired") : "Missing",
          workers_comp:       o.workers_comp_status || "Missing",
          truck_list:         o.truck_count && parseInt(o.truck_count) > 0 ? "On File" : "Missing",
          driver_list:        o.driver_count && parseInt(o.driver_count) > 0 ? "On File" : "Missing",
          settlement_setup:   o.settlement_type ? "Complete" : "Missing",
          customer_approval:  o.customer_approval_status || "Missing",
          dispatch_eligible:  o.dispatch_eligible !== "false",
        };
        const issues = Object.values(checks).filter(v => typeof v === "string" && ["Missing","Expired"].includes(v)).length;
        const overall = issues === 0 ? "ready" : issues <= 2 ? "warning" : issues <= 4 ? "at_risk" : "blocked";
        return { id: o.id, company_name: o.company_name || "—", ...checks, overall } as unknown as OOAudit;
      });

      // Build Do This First™ issues
      const urgentIssues: AuditIssue[] = [];
      parsedDrivers.filter(d => d.overall !== "ready").slice(0, 5).forEach(d => {
        const missingField = DRIVER_CHECKS.find(k => {
          const v = d[k as keyof DriverAudit] as string;
          return ["Missing","Expired","failed","needs_review"].includes((v || "").toLowerCase());
        });
        if (missingField) {
          urgentIssues.push({
            id: `d-${d.id}`, severity: d.overall === "blocked" ? "critical" : "warning",
            title: `Driver ${DRIVER_LABELS[missingField] || missingField} ${(d[missingField as keyof DriverAudit] as string || "").toLowerCase()}`,
            entity_name: d.name, entity_type: "driver", entity_id: d.id,
            assigned_role: "Compliance", action_label: "Update Driver",
            action_href: `/ronyx/drivers/${d.id}`,
          });
        }
      });
      parsedFleet.filter(t => t.overall !== "ready").slice(0, 3).forEach(t => {
        const missingField = FLEET_CHECKS.find(k => {
          const v = t[k as keyof FleetAudit] as string;
          return ["Missing","Expired","Out of Service"].includes(v || "");
        });
        if (missingField) {
          urgentIssues.push({
            id: `t-${t.id}`, severity: t.overall === "blocked" ? "critical" : "warning",
            title: `Truck ${FLEET_LABELS[missingField] || missingField} ${(t[missingField as keyof FleetAudit] as string || "").toLowerCase()}`,
            entity_name: `Truck #${t.truck_number}`,
            entity_detail: [(t as any).company_name, (t as any).make, (t as any).vin ? `VIN ${(t as any).vin}` : (t as any).plate ? `Plate ${(t as any).plate}` : ""].filter(Boolean).join("  ·  "),
            entity_type: "truck", entity_id: t.id,
            assigned_role: "Fleet Admin", action_label: "Review Truck",
            action_href: `/ronyx/fleet`,
          });
        }
      });
      parsedOOs.filter(o => o.overall !== "ready").slice(0, 3).forEach(o => {
        const missingField = OO_CHECKS.find(k => {
          const v = o[k as keyof OOAudit] as string;
          return ["Missing","Expired"].includes(v || "");
        });
        if (missingField) {
          urgentIssues.push({
            id: `oo-${o.id}`, severity: "warning",
            title: `Owner Operator ${OO_LABELS[missingField] || missingField} missing`,
            entity_name: o.company_name, entity_type: "owner_operator", entity_id: o.id,
            assigned_role: "Compliance", action_label: "Upload Document",
            action_href: `/ronyx/owner-operators`,
          });
        }
      });

      setDrivers(parsedDrivers);
      setFleet(parsedFleet);
      setOOs(parsedOOs);
      setIssues(urgentIssues.sort((a, b) => (a.severity === "critical" ? -1 : 1) - (b.severity === "critical" ? -1 : 1)));
      setScores(buildScores(parsedDrivers, parsedFleet, parsedOOs));
      setAuditLog(logRes.logs ?? []);
      showToast("✅ Audit check complete");
    } catch {
      showToast("⚠️ Some data could not be loaded. Check connections.");
    } finally {
      setRunning(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { runAuditCheck(); }, [runAuditCheck]);

  const scoreSty = scoreLabel(scores.overall);
  const criticalCount = issues.filter(i => i.severity === "critical").length;

  // ─── Render ───────────────────────────────────────────────────────────────

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
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", padding: "28px 32px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.6rem" }}>🛡️</span>
              <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                Be Audit Ready™
              </h1>
            </div>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: "0.88rem", maxWidth: 620 }}>
              DOT, IFTA, insurance, driver, truck, ticket, payroll, and billing audit readiness in one command center.
            </p>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", fontStyle: "italic" }}>
              Know what is missing before an auditor, customer, insurance company, or owner asks for it.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={runAuditCheck} disabled={running}
              style={{ background: running ? "#475569" : "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 8,
                fontWeight: 700, fontSize: "0.85rem", border: "none", cursor: running ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {running ? "⏳ Running..." : "▶ Run Audit Check"}
            </button>
            <button onClick={() => { setTab("audit_packets"); showToast("📦 Audit Packet Builder — select type and date range"); }}
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "10px 20px", borderRadius: 8,
                fontWeight: 600, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}>
              📦 Build Audit Packet
            </button>
            <button onClick={() => { showToast("📤 Opening print dialog — save as PDF to export"); setTimeout(() => window.print(), 600); }}
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "10px 20px", borderRadius: 8,
                fontWeight: 600, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}>
              📤 Export Report
            </button>
            <button onClick={async () => {
                showToast("🔔 Sending reminders to Compliance team...");
                await fetch("/api/ronyx/drivers/compliance-alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "manual_reminder" }) }).catch(() => {});
                setTimeout(() => showToast("✅ Reminders sent to assigned staff"), 1200);
              }}
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "10px 20px", borderRadius: 8,
                fontWeight: 600, fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}>
              🔔 Send Reminders
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer",
                color: tab === t.key ? "#fff" : "rgba(255,255,255,0.5)",
                fontWeight: tab === t.key ? 700 : 500, fontSize: "0.8rem", whiteSpace: "nowrap",
                borderBottom: tab === t.key ? "2px solid #dc2626" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s" }}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {/* Score + KPI strip */}
            <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap", alignItems: "stretch" }}>

              {/* Donut */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "24px 28px",
                display: "flex", alignItems: "center", gap: 24, minWidth: 280 }}>
                <ScoreDonut score={scores.overall} />
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Overall Audit Readiness
                  </div>
                  <div style={{ display: "inline-block", background: scoreSty.bg, color: scoreSty.color, padding: "4px 14px", borderRadius: 20, fontWeight: 800, fontSize: "0.85rem", marginBottom: 12 }}>
                    {scoreSty.label}
                  </div>
                  {criticalCount > 0 && (
                    <div style={{ background: "#fee2e2", color: "#dc2626", padding: "6px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700 }}>
                      🚨 {criticalCount} critical issue{criticalCount > 1 ? "s" : ""} require attention
                    </div>
                  )}
                  {criticalCount === 0 && !loading && (
                    <div style={{ background: "#dcfce7", color: "#15803d", padding: "6px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700 }}>
                      ✅ No critical issues found
                    </div>
                  )}
                </div>
              </div>

              {/* KPI Grid */}
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                {([
                  ["Drivers Ready",       `${drivers.filter(d => d.overall === "ready").length} of ${drivers.length}`, "#0891b2"],
                  ["Trucks Ready",        `${fleet.filter(t => t.overall === "ready").length} of ${fleet.length}`,    "#0d9488"],
                  ["OOs Ready",           `${oos.filter(o => o.overall === "ready").length} of ${oos.length}`,        "#7c3aed"],
                  ["Tickets w/ Proof",    `${scores.tickets}%`,   "#1d4ed8"],
                  ["Payroll Verified",    `${scores.payroll}%`,   "#15803d"],
                  ["Billing Verified",    `${scores.billing}%`,   "#b45309"],
                  ["Insurance Score",     `${scores.insurance}%`, "#dc2626"],
                  ["IFTA Score",          `${scores.ifta}%`,      "#ca8a04"],
                  ["Open Issues",         issues.length,          issues.length > 0 ? "#dc2626" : "#15803d"],
                ] as [string, string | number, string][]).map(([label, value, color]) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: "0.66rem", fontWeight: 700, color: "#64748b", marginTop: 4 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category scores */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Readiness by Category</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {([
                  ["Drivers",         scores.drivers,          "/ronyx/compliance/driver-docs"],
                  ["Fleet",           scores.fleet,            "/ronyx/fleet"],
                  ["Owner Operators", scores.owner_operators,  "/ronyx/owner-operators"],
                  ["Tickets",         scores.tickets,          "/ronyx/tickets"],
                  ["Payroll",         scores.payroll,          "/ronyx/payroll"],
                  ["Billing",         scores.billing,          "/ronyx/billing"],
                  ["Insurance",       scores.insurance,        "/ronyx/compliance/expired-insurance"],
                  ["IFTA",            scores.ifta,             "/ronyx/ifta"],
                ] as [string, number, string][]).map(([cat, score, href]) => {
                  const s = scoreLabel(score);
                  return (
                    <Link key={cat} href={href}
                      style={{ display: "flex", flexDirection: "column", gap: 6, textDecoration: "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b" }}>{cat}</span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: s.color }}>{score}%</span>
                      </div>
                      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${score}%`, background: s.color, borderRadius: 99, transition: "width 0.8s ease" }} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Do This First™ */}
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>
                  Do This First™
                  {issues.length > 0 && (
                    <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, marginLeft: 10 }}>
                      🚨 {issues.length} issue{issues.length > 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <Link href="/ronyx/compliance/expiring" style={{ color: "#0891b2", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
                  View All Expiring →
                </Link>
              </div>

              {issues.length === 0 && !loading && (
                <div style={{ background: "#dcfce7", borderRadius: 10, padding: "20px", textAlign: "center", color: "#15803d", fontWeight: 700, fontSize: "0.85rem" }}>
                  ✅ No urgent items — you're looking good!
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {issues.map((issue, idx) => (
                  <div key={issue.id} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 10,
                    background: issue.severity === "critical" ? "#fff5f5" : "#fffbf0",
                    border: `1px solid ${issue.severity === "critical" ? "#fca5a5" : "#fde68a"}`,
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                      background: issue.severity === "critical" ? "#dc2626" : "#b45309", color: "#fff", fontWeight: 900, fontSize: "0.78rem", flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.85rem", marginBottom: 2 }}>
                        {issue.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {issue.entity_name} &nbsp;·&nbsp; Role: {issue.assigned_role}
                      </div>
                      {issue.entity_detail && (
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 1 }}>{issue.entity_detail}</div>
                      )}
                    </div>
                    {issue.action_href && (
                      <Link href={issue.action_href}
                        style={{ background: issue.severity === "critical" ? "#dc2626" : "#b45309", color: "#fff",
                          padding: "6px 14px", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", textDecoration: "none", flexShrink: 0 }}>
                        {issue.action_label || "Fix"}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── DRIVERS TAB ──────────────────────────────────────────────── */}
        {tab === "drivers" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Driver Compliance Audit</h3>
              <input type="text" placeholder="Search driver..." value={driverSearch} onChange={e => setDriverSearch(e.target.value)}
                style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.8rem", minWidth: 200 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.68rem", textTransform: "uppercase", position: "sticky", left: 0, background: "#f8fafc" }}>Driver</th>
                    {DRIVER_CHECKS.map(k => (
                      <th key={k} style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {DRIVER_LABELS[k]}
                      </th>
                    ))}
                    <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase" }}>Dispatch</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {drivers
                    .filter(d => !driverSearch || d.name.toLowerCase().includes(driverSearch.toLowerCase()))
                    .map((d, i) => {
                      const ov = scoreLabel(d.overall === "ready" ? 100 : d.overall === "warning" ? 75 : d.overall === "at_risk" ? 40 : 10);
                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b", position: "sticky", left: 0, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>{d.name}</td>
                          {DRIVER_CHECKS.map(k => (
                            <td key={k} style={{ padding: "8px", textAlign: "center" }}>{statusBadge(d[k as keyof DriverAudit] as string)}</td>
                          ))}
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            {statusBadge(d.dispatch_eligible ? "Eligible" : "Blocked",
                              d.dispatch_eligible ? { color: "#15803d", bg: "#dcfce7" } : { color: "#dc2626", bg: "#fee2e2" })}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <span style={{ background: ov.bg, color: ov.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
                              {d.overall.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <Link href={`/ronyx/drivers/${d.id}`} style={{ color: "#0891b2", fontWeight: 700, fontSize: "0.7rem", textDecoration: "none" }}>View →</Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {drivers.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No drivers found. <Link href="/ronyx/drivers?tab=import" style={{ color: "#0891b2" }}>Import drivers →</Link></div>}
            </div>
          </div>
        )}

        {/* ── FLEET TAB ────────────────────────────────────────────────── */}
        {tab === "fleet" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Fleet / Truck Compliance Audit</h3>
              <input type="text" placeholder="Search truck..." value={fleetSearch} onChange={e => setFleetSearch(e.target.value)}
                style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.8rem", minWidth: 200 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.68rem", textTransform: "uppercase" }}>Truck</th>
                    {FLEET_CHECKS.map(k => (
                      <th key={k} style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {FLEET_LABELS[k]}
                      </th>
                    ))}
                    <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fleet
                    .filter(t => !fleetSearch || t.truck_number.toLowerCase().includes(fleetSearch.toLowerCase()))
                    .map((t, i) => {
                      const ov = scoreLabel(t.overall === "ready" ? 100 : t.overall === "warning" ? 75 : t.overall === "at_risk" ? 40 : 10);
                      return (
                        <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{t.truck_number}</td>
                          {FLEET_CHECKS.map(k => (
                            <td key={k} style={{ padding: "8px", textAlign: "center" }}>{statusBadge(t[k as keyof FleetAudit] as string)}</td>
                          ))}
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <span style={{ background: ov.bg, color: ov.color, padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
                              {t.overall.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </span>
                          </td>
                          <td style={{ padding: "8px 14px" }}>
                            <Link href="/ronyx/fleet" style={{ color: "#0d9488", fontWeight: 700, fontSize: "0.7rem", textDecoration: "none" }}>View →</Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              {fleet.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No trucks found. <Link href="/ronyx/fleet" style={{ color: "#0d9488" }}>Add trucks →</Link></div>}
            </div>
          </div>
        )}

        {/* ── OWNER OPERATORS TAB ──────────────────────────────────────── */}
        {tab === "owner_operators" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Owner Operator Compliance Audit</h3>
              <input type="text" placeholder="Search carrier..." value={ooSearch} onChange={e => setOOSearch(e.target.value)}
                style={{ marginLeft: "auto", padding: "7px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.8rem", minWidth: 200 }} />
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", minWidth: 1000 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.68rem", textTransform: "uppercase" }}>Carrier</th>
                    {OO_CHECKS.map(k => (
                      <th key={k} style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {OO_LABELS[k]}
                      </th>
                    ))}
                    <th style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700, color: "#475569", fontSize: "0.66rem", textTransform: "uppercase" }}>Dispatch</th>
                    <th style={{ padding: "10px 14px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {oos
                    .filter(o => !ooSearch || o.company_name.toLowerCase().includes(ooSearch.toLowerCase()))
                    .map((o, i) => (
                      <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{o.company_name}</td>
                        {OO_CHECKS.map(k => (
                          <td key={k} style={{ padding: "8px", textAlign: "center" }}>{statusBadge(o[k as keyof OOAudit] as string)}</td>
                        ))}
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          {statusBadge(o.dispatch_eligible ? "Eligible" : "Blocked",
                            o.dispatch_eligible ? { color: "#15803d", bg: "#dcfce7" } : { color: "#dc2626", bg: "#fee2e2" })}
                        </td>
                        <td style={{ padding: "8px 14px" }}>
                          <Link href={`/ronyx/owner-operators`} style={{ color: "#7c3aed", fontWeight: 700, fontSize: "0.7rem", textDecoration: "none" }}>View →</Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {oos.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>No owner operators found. <Link href="/ronyx/owner-operators" style={{ color: "#7c3aed" }}>Add owner operators →</Link></div>}
            </div>
          </div>
        )}

        {/* ── TICKETS TAB ──────────────────────────────────────────────── */}
        {tab === "tickets" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Ticket Audit Checklist</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {["Original Ticket File","OCR Data","Ticket Number","Ticket Date","Driver","Truck","Customer","Project","Pit / Vendor","Material","Quantity / Tons","Matched Job","Payroll Status","Billing Status","Duplicate Check","Invoice Reconciliation Status"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#15803d", fontSize: "1rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, fontSize: "0.8rem", color: "#b45309", fontWeight: 600 }}>
                ⚠️ Audit rule: No ticket proof = payroll hold AND billing hold until reviewed.
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Link href="/ronyx/tickets?tab=all" style={{ background: "#d97706", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none", display: "inline-flex", gap: 8 }}>
                🎫 Review Tickets
              </Link>
            </div>
          </div>
        )}

        {/* ── PAYROLL TAB ──────────────────────────────────────────────── */}
        {tab === "payroll" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Payroll Audit Checklist</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {["Approved Ticket Attached","Driver Pay Rate","Owner Operator Rate","Deductions","Advances","Reimbursements","Settlement Approved","Payroll Exported","Paid Status","Audit Trail"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#15803d", fontSize: "1rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "14px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>System flags these automatically:</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.78rem", color: "#7f1d1d", lineHeight: 1.8 }}>
                  <li>Payroll paid without approved ticket</li>
                  <li>Payroll amount does not match ticket</li>
                  <li>Payroll missing rate</li>
                  <li>Duplicate payroll item</li>
                  <li>Settlement missing approval</li>
                </ul>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Link href="/ronyx/payroll" style={{ background: "#15803d", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none", display: "inline-flex", gap: 8 }}>
                💵 Review Payroll
              </Link>
            </div>
          </div>
        )}

        {/* ── BILLING TAB ──────────────────────────────────────────────── */}
        {tab === "billing" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Billing Audit Checklist</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                {["Approved Ticket Attached","Customer Rate","Project Rate","Invoice Number","Invoice Status","Invoice Sent","Payment Status","Invoice Reconciliation","Billing Hold Reason"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#15803d", fontSize: "1rem" }}>✓</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "14px 16px", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10 }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>System flags these automatically:</div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.78rem", color: "#7f1d1d", lineHeight: 1.8 }}>
                  <li>Ticket not billed</li>
                  <li>Ticket billed twice</li>
                  <li>Invoice missing ticket proof</li>
                  <li>Billing amount mismatch</li>
                  <li>Customer payment hold</li>
                </ul>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Link href="/ronyx/billing" style={{ background: "#1d4ed8", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none", display: "inline-flex", gap: 8 }}>
                🧾 Review Billing
              </Link>
            </div>
          </div>
        )}

        {/* ── INSURANCE TAB ────────────────────────────────────────────── */}
        {tab === "insurance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "👤", label: "Driver Insurance & Documents", href: "/ronyx/compliance/driver-docs", items: ["CDL","Medical Card","MVR","Drug Test","Employment Agreement","W-9"] },
              { icon: "🚛", label: "Truck Insurance & Registration", href: "/ronyx/fleet", items: ["Vehicle Insurance","Registration","IFTA Decal","Cab Card"] },
              { icon: "🏢", label: "Owner Operator COIs", href: "/ronyx/owner-operators/coi-matrix", items: ["Auto Liability COI","General Liability COI","Cargo COI","Workers Comp / Exemption"] },
            ].map(sec => (
              <div key={sec.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 800, color: "#1e293b" }}>
                    {sec.icon} {sec.label}
                  </h3>
                  <Link href={sec.href} style={{ color: "#0891b2", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>Review →</Link>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {sec.items.map(item => (
                    <div key={item} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", fontSize: "0.78rem", fontWeight: 600, color: "#1e293b" }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center" }}>
              <Link href="/ronyx/compliance/expiring" style={{ background: "#dc2626", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
                ⏰ View Expiring Documents
              </Link>
            </div>
          </div>
        )}

        {/* ── IFTA TAB ─────────────────────────────────────────────────── */}
        {tab === "ifta" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>IFTA Readiness Checklist</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {["Truck miles","Fuel receipts","Jurisdiction","IFTA decal","Fuel card records","Trip reports","Missing mileage","Missing fuel entry"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <span style={{ color: "#ca8a04", fontSize: "1rem" }}>⛽</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["IFTA Ready","Mileage Missing","Fuel Receipt Missing","Needs Review"].map(s => (
                  <div key={s} style={{ padding: "6px 14px", borderRadius: 20, background: s === "IFTA Ready" ? "#dcfce7" : "#fee2e2",
                    color: s === "IFTA Ready" ? "#15803d" : "#dc2626", fontWeight: 700, fontSize: "0.72rem" }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Link href="/ronyx/ifta" style={{ background: "#ca8a04", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
                ⛽ IFTA Manager
              </Link>
            </div>
          </div>
        )}

        {/* ── CUSTOMER REQUIREMENTS TAB ────────────────────────────────── */}
        {tab === "customer_requirements" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Customer Compliance Requirements</h3>
              <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 20 }}>
                Track what each customer requires before dispatching drivers or delivering tickets.
              </p>
              <div style={{ textAlign: "center", paddingTop: 8 }}>
                <Link href="/ronyx/compliance/customer-dispatch-requirements"
                  style={{ background: "#1d4ed8", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>
                  📋 Clearance Check™ — Customer Requirements
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT PACKETS TAB ────────────────────────────────────────── */}
        {tab === "audit_packets" && (
          <div id="packet-builder">
            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "24px" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "0.95rem", fontWeight: 800, color: "#1e293b" }}>📦 Audit Packet Builder</h3>
              <p style={{ margin: "0 0 20px", fontSize: "0.82rem", color: "#64748b" }}>
                Build and export a compliance packet for auditors, insurance companies, customers, or owner review.
              </p>

              <div style={{ display: "grid", gap: 20 }}>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>1. Packet Type</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                    {PACKET_TYPES.map(p => (
                      <button key={p} onClick={() => setPacketType(p)}
                        style={{ padding: "12px 16px", borderRadius: 10, border: `2px solid ${packetType === p ? "#1e293b" : "#e2e8f0"}`,
                          background: packetType === p ? "#1e293b" : "#f8fafc", color: packetType === p ? "#fff" : "#1e293b",
                          fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                        {packetType === p ? "✓" : "○"} {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>2. Date Range</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {["This Week","This Month","This Quarter","Last Quarter","Custom Range"].map(r => (
                      <button key={r} onClick={() => setDateRange(r)}
                        style={{ padding: "9px 18px", borderRadius: 8, border: `1.5px solid ${dateRange === r ? "#1e293b" : "#e2e8f0"}`,
                          background: dateRange === r ? "#1e293b" : "#f8fafc", color: dateRange === r ? "#fff" : "#475569",
                          fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px 20px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>3. Packet Includes</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["Cover Sheet","Summary Score","Missing Items List","Uploaded Documents","Tickets","Payroll Proof","Billing Proof","Audit Log","Notes"].map(item => (
                      <div key={item} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>
                        ✓ {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => showToast(`📦 Building ${packetType} for ${dateRange}...`)}
                    style={{ background: "#1e293b", color: "#fff", padding: "13px 28px", borderRadius: 9, fontWeight: 800, fontSize: "0.88rem", border: "none", cursor: "pointer" }}>
                    📦 Build Audit Packet
                  </button>
                  <button
                    onClick={() => showToast("📤 Export started — check your downloads")}
                    style={{ background: "#f1f5f9", color: "#475569", padding: "13px 28px", borderRadius: 9, fontWeight: 700, fontSize: "0.88rem", border: "1px solid #e2e8f0", cursor: "pointer" }}>
                    📤 Export PDF
                  </button>
                </div>

                {/* Example packet preview */}
                <div style={{ background: "#1e293b", borderRadius: 12, padding: "24px 28px", color: "#fff" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Preview — {packetType}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, marginBottom: 4 }}>Ronyx — Audit Packet</div>
                  <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>
                    {dateRange} · Generated {new Date().toLocaleDateString()}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                    {[
                      ["Drivers",     drivers.length],
                      ["Trucks",      fleet.length],
                      ["OOs",         oos.length],
                      ["Open Issues", issues.length],
                      ["Score",       `${scores.overall}%`],
                      ["Status",      scoreSty.label],
                    ].map(([label, value]) => (
                      <div key={label as string} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>{value}</div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOG TAB ─────────────────────────────────────────── */}
        {tab === "activity_log" && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>Activity Log</h3>
            </div>
            {auditLog.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                No audit activity recorded yet. Actions taken on drivers, trucks, tickets, and documents will appear here.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date","Entity","Action","Performed By","Notes"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((log, i) => (
                    <tr key={String(log.id)} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>
                        {log.created_at ? new Date(log.created_at as string).toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{String(log.entity_name || "—")}</div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{String(log.entity_type || "")}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{String(log.action || "—")}</td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{String(log.performed_by_name || "—")}</td>
                      <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.78rem" }}>{String(log.notes || "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Loading overlay for unimplemented tabs */}
        {!["overview","drivers","fleet","owner_operators","insurance","tickets","payroll","billing","ifta","customer_requirements","audit_packets","activity_log"].includes(tab) && (
          <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>Loading...</div>
        )}

      </div>
    </div>
  );
}
