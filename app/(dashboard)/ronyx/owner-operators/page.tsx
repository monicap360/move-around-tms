"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeSync, useLiveBadgeProps } from "../hooks/useRealtimeSync";
import { useModuleAccess } from "@/app/hooks/useModuleAccess";
import ModuleUpgradeCard from "@/app/components/ronyx/ModuleUpgradeCard";
import IntelVerifyPanel from "@/app/components/ronyx/IntelVerifyPanel";

/* ─── Types ─────────────────────────────────────────── */
type OODriver = {
  id: string;
  name: string;
  cdl_number: string;
  cdl_state: string;
  cdl_class?: string;
  cdl_expiration: string;
  med_card_expiration: string;
  phone: string;
  truck_number?: string;
};
type TruckStatus = "active" | "assigned" | "in_use" | "out_of_service" | "in_maintenance" | "inspection_due" | "insurance_expired" | "registration_expired" | "needs_review";
type OOTruck = {
  id: string;
  truck_number: string;
  year: string;
  make: string;
  model: string;
  type?: string;
  vin: string;
  last_inspection?: string;
  inspection_result?: "Pass" | "Pass w/ Defects" | "Fail";
  status?: TruckStatus;
  approved_driver_ids?: string[];
};
type OOTruckAssignment = {
  id: string;
  driver_id: string;
  truck_id: string;
  priority: 1 | 2 | 3 | 4;
  assignment_type: "primary" | "backup";
  requires_manager_approval: boolean;
  notes?: string;
};
type OODoc = {
  type: string;
  uploaded_at: string;
  file_name: string;
  expires_on?: string;
  issued_on?: string;
  file_url?: string;
};
type OOSubDriver = {
  id: string;
  name: string;
  phone: string;
  cdl_number: string;
  cdl_expiration: string;
};
type OOSubcontractor = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  mc_number: string;
  dot_number: string;
  drivers: OOSubDriver[];
};
type OOJob = {
  id: string;
  project_name: string;
  project_number: string;
  load_date: string;
  truck_number: string;
  driver_name: string;
  origin: string;
  destination: string;
  material: string;
  tons: number;
  gross_revenue: number;
  oo_rate: number;
  margin: number;
  ticket_status?: "Verified" | "Needs Review" | "Missing" | "Duplicate";
  settlement_status: "Pending" | "Approved" | "Processing" | "Paid" | "Hold";
};
type ReminderEntry = { doc_type: string; sent_at: string; method: string };
type HistoryEntry  = { date: string; event: string; type: "info"|"warning"|"critical" };
type ChangeEntry   = { date: string; type: string; detail: string };

type COIDoc = {
  id: string;
  coi_group: string;
  document_type: string;
  insurance_provider?: string;
  policy_number?: string;
  effective_date?: string;
  expiration_date?: string;
  file_name?: string;
  file_url?: string;
  status: "complete" | "missing" | "expired" | "expiring_soon" | "needs_review" | "not_required" | "rejected";
  review_status: string;
  dispatch_blocked: boolean;
  settlement_hold: boolean;
  last_reminder_sent_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
};

type OOCompany = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  business_address: string;
  // Structured address (migration 160)
  company_address_line1?: string;
  company_address_line2?: string;
  company_city?: string;
  company_state?: string;
  company_zip?: string;
  mailing_same_as_company?: boolean;
  mailing_address_line1?: string;
  mailing_address_line2?: string;
  mailing_city?: string;
  mailing_state?: string;
  mailing_zip?: string;
  mc_number: string;
  dot_number: string;
  ein: string;
  insurance_agent_name: string;
  insurance_agent_email: string;
  insurance_agent_phone: string;
  drivers: OODriver[];
  trucks: OOTruck[];
  documents: OODoc[];
  jobs: OOJob[];
  subcontractors: OOSubcontractor[];
  driver_truck_assignments?: OOTruckAssignment[];
  coi_documents?: COIDoc[];
  notes?: string;
  last_contact_date?: string;
  reminder_log?: ReminderEntry[];
  compliance_history?: HistoryEntry[];
  changes_log?: ChangeEntry[];
  logo_url?: string;
  start_date?: string;
  website?: string;
  dispatch_blocked_override?: boolean;
  settlement_hold_override?: boolean;
  status?: string; // 'active' | 'inactive' | 'suspended' — set 'inactive' when an OO quits Ronyx
};

/* ─── helpers ────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 10); }

async function apiPost(path: string, body: unknown) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function apiPut(path: string, body: unknown) {
  const r = await fetch(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function apiDelete(path: string) {
  return fetch(path, { method: "DELETE" });
}

/* ─── COI type constants ─────────────────────────────── */
const COI_TYPES_CONST = [
  { value:"auto_liability_coi",                       label:"Auto Liability COI",                   group:"ronyx_ma_mortenson", shortLabel:"Auto Liab"   },
  { value:"general_liability_coi",                    label:"General Liability COI",                group:"ronyx_ma_mortenson", shortLabel:"Gen Liab"    },
  { value:"cargo_coi",                                label:"Cargo / Motor Truck Cargo COI",        group:"ronyx_ma_mortenson", shortLabel:"Cargo"       },
  { value:"ronyx_contractor_auto_liability_coi",      label:"Ronyx Auto Liability COI",             group:"ronyx_ma_mortenson", shortLabel:"Ronyx Auto"  },
  { value:"ronyx_contractor_general_liability_coi",   label:"Ronyx General Liability COI",          group:"ronyx_ma_mortenson", shortLabel:"Ronyx Gen"   },
  { value:"ronyx_contractor_cargo_coi",               label:"Ronyx Cargo COI",                      group:"ronyx_ma_mortenson", shortLabel:"Ronyx Cargo" },
  { value:"ma_morrison_auto_liability_coi",           label:"MA Morrison Auto Liability COI",       group:"ronyx_ma_mortenson", shortLabel:"MAM Auto"    },
  { value:"ma_morrison_general_liability_coi",        label:"MA Morrison General Liability COI",    group:"ronyx_ma_mortenson", shortLabel:"MAM Gen"     },
  { value:"ma_morrison_cargo_coi",                    label:"MA Morrison Cargo COI",                group:"ronyx_ma_mortenson", shortLabel:"MAM Cargo"   },
  { value:"bass_equipment_auto_liability_coi",        label:"Bass Equipment Auto Liability COI",    group:"bass_equipment",     shortLabel:"Bass Auto"   },
  { value:"bass_equipment_general_liability_coi",     label:"Bass Equipment General Liability COI", group:"bass_equipment",     shortLabel:"Bass Gen"    },
  { value:"bass_equipment_cargo_coi",                 label:"Bass Equipment Cargo / Motor Truck COI", group:"bass_equipment",   shortLabel:"Bass Cargo"  },
] as const;

/* ─── Customer COI company packages ─────────────────── */
const COI_COMPANIES = [
  { key:"ronyx_ma_mortenson", label:"Ronyx, MA. Mortenson COI", color:"#1e40af", bg:"#eff6ff", desc:"Required for Ronyx & MA Morrison jobs" },
  { key:"bass_equipment",     label:"Bass Equipment COI",        color:"#0891b2", bg:"#f0f9ff", desc:"Required for Bass Equipment jobs"       },
] as const;
type CoiCompanyKey = typeof COI_COMPANIES[number]["key"];

const COI_GROUPS_DEF = {
  ronyx_ma_mortenson: { label:"Ronyx, MA. Mortenson COI", desc:"Required for Ronyx & MA Morrison jobs", color:"#1e40af", bg:"#eff6ff" },
  bass_equipment:     { label:"Bass Equipment COI",        desc:"Required for Bass Equipment jobs",      color:"#0891b2", bg:"#f0f9ff" },
} as const;

const COI_STATUS_COLORS: Record<string, [string,string]> = {
  complete:      ["#f0fdf4","#15803d"],
  missing:       ["#fff1f2","#dc2626"],
  expired:       ["#fff1f2","#dc2626"],
  expiring_soon: ["#fefce8","#ca8a04"],
  needs_review:  ["#fff7ed","#ea580c"],
  not_required:  ["#f1f5f9","#64748b"],
  rejected:      ["#fff1f2","#dc2626"],
};

/* ─── Truck status helpers ───────────────────────────── */
function truckStatusLabel(s?: string) {
  const map: Record<string, string> = {
    active: "Available", assigned: "Assigned", in_use: "In Use",
    out_of_service: "Out of Service", in_maintenance: "In Maintenance",
    inspection_due: "Inspection Due", insurance_expired: "Insurance Expired",
    registration_expired: "Reg. Expired", needs_review: "Needs Review",
  };
  return map[s || "active"] || "Available";
}
function truckStatusColors(s?: string): [string, string] {
  if (!s || s === "active")                return ["#f0fdf4", "#15803d"];
  if (s === "assigned" || s === "in_use")  return ["#eff6ff", "#1d4ed8"];
  if (s === "out_of_service")              return ["#fff1f2", "#dc2626"];
  if (s === "in_maintenance")              return ["#fff7ed", "#ea580c"];
  if (s === "inspection_due")              return ["#fefce8", "#ca8a04"];
  return ["#f1f5f9", "#64748b"];
}
function isTruckAvailable(s?: string) {
  return !s || s === "active" || s === "assigned";
}
const PRIORITY_LABELS: Record<number, string> = { 1: "Primary", 2: "Backup 1", 3: "Backup 2", 4: "Backup 3" };

/* ─── Date / calc helpers ─────────────────────────────── */
function daysUntil(d?: string) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function expColor(days: number | null) {
  if (days === null) return "#94a3b8";
  if (days < 0)   return "#dc2626";
  if (days <= 14) return "#dc2626";
  if (days <= 30) return "#d97706";
  if (days <= 90) return "#f59e0b";
  return "#15803d";
}
function expBg(days: number | null) {
  if (days === null) return "#f1f5f9";
  if (days < 0)   return "#fff1f2";
  if (days <= 14) return "#fff1f2";
  if (days <= 30) return "#fff7ed";
  if (days <= 90) return "#fefce8";
  return "#f0fdf4";
}
function expLabel(days: number | null, date?: string) {
  if (!date) return "—";
  const base = fmtDate(date);
  if (days === null) return base;
  if (days < 0) return `${base} (EXPIRED ${Math.abs(days)}d ago)`;
  if (days === 0) return `${base} (expires TODAY)`;
  if (days <= 90) return `${base} (${days}d)`;
  return base;
}

/* ─── Per-OO analytics ───────────────────────────────── */
function ooHealthScore(oo: OOCompany): number {
  const insDoc = oo.documents.find(d => ["Insurance Certificate","Auto Liability Insurance","General Liability Insurance","Insurance Certificate (COI)","Cargo Insurance"].includes(d.type));
  const insExpDays = insDoc?.expires_on ? daysUntil(insDoc.expires_on) : null;
  const checks = [
    !!oo.mc_number,
    !!oo.dot_number,
    !!oo.ein,
    !!insDoc,
    insExpDays !== null && insExpDays > 0,
    insExpDays !== null && insExpDays > 30,
    oo.documents.some(d => d.type === "Contract"),
    oo.trucks.length > 0,
    oo.drivers.length > 0,
    oo.drivers.length > 0 && oo.drivers.every(d => { const days = daysUntil(d.cdl_expiration); return days !== null && days > 0; }),
    oo.drivers.length > 0 && oo.drivers.every(d => { const days = daysUntil(d.med_card_expiration); return days !== null && days > 0; }),
    !oo.jobs.some(j => j.settlement_status === "Hold"),
    oo.jobs.filter(j => !["Paid","Hold"].includes(j.settlement_status)).every(j => (j.ticket_status || "Verified") === "Verified"),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function ooDispatchEligible(oo: OOCompany): [boolean, string[]] {
  const blocks: string[] = [];
  const insDoc = oo.documents.find(d => ["Insurance Certificate","Auto Liability Insurance","General Liability Insurance","Insurance Certificate (COI)","Cargo Insurance"].includes(d.type));
  const insExpDays = insDoc?.expires_on ? daysUntil(insDoc.expires_on) : null;
  if (!insDoc)                                         blocks.push("No insurance on file");
  else if (insExpDays !== null && insExpDays <= 0)     blocks.push("Insurance expired");
  const expCDL = oo.drivers.filter(d => { const x = daysUntil(d.cdl_expiration); return x !== null && x <= 0; });
  const expMed = oo.drivers.filter(d => { const x = daysUntil(d.med_card_expiration); return x !== null && x <= 0; });
  if (expCDL.length > 0) blocks.push(`${expCDL.length} CDL expired`);
  if (expMed.length > 0) blocks.push(`${expMed.length} med card expired`);
  return [blocks.length === 0, blocks];
}

function ooSettlementReady(oo: OOCompany): number {
  return oo.jobs.filter(j => j.settlement_status === "Approved").reduce((s,j) => s + j.oo_rate, 0);
}

function ooTicketHealth(oo: OOCompany) {
  const jobs = oo.jobs;
  return {
    verified:     jobs.filter(j => !j.ticket_status || j.ticket_status === "Verified").length,
    needsReview:  jobs.filter(j => j.ticket_status === "Needs Review").length,
    missing:      jobs.filter(j => j.ticket_status === "Missing").length,
    duplicate:    jobs.filter(j => j.ticket_status === "Duplicate").length,
  };
}

function ooRevenueMTD(oo: OOCompany): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  return oo.jobs.filter(j => j.load_date >= start).reduce((s,j) => s + j.gross_revenue, 0);
}
function ooMarginMTD(oo: OOCompany): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  return oo.jobs.filter(j => j.load_date >= start).reduce((s,j) => s + j.margin, 0);
}

function ooActionRequired(oo: OOCompany): string[] {
  const actions: string[] = [];
  const insDoc = oo.documents.find(d => ["Insurance Certificate","Auto Liability Insurance","General Liability Insurance","Insurance Certificate (COI)","Cargo Insurance"].includes(d.type));
  const insExpDays = insDoc?.expires_on ? daysUntil(insDoc.expires_on) : null;
  if (!insDoc)                                               actions.push("Upload insurance certificate");
  else if (insExpDays !== null && insExpDays <= 30)          actions.push(`Insurance expires in ${insExpDays < 0 ? "EXPIRED" : insExpDays + "d"} — request COI`);
  if (!oo.documents.some(d => d.type === "Contract"))        actions.push("Upload contract");
  const expCDL = oo.drivers.filter(d => { const x = daysUntil(d.cdl_expiration); return x !== null && x <= 30; });
  const expMed = oo.drivers.filter(d => { const x = daysUntil(d.med_card_expiration); return x !== null && x <= 30; });
  if (expCDL.length > 0) actions.push(`${expCDL.length} driver CDL expiring soon`);
  if (expMed.length > 0) actions.push(`${expMed.length} driver med card expiring soon`);
  const holds = oo.jobs.filter(j => j.settlement_status === "Hold").length;
  if (holds > 0) actions.push(`${holds} settlement hold${holds>1?"s":""}`);
  const missing = oo.jobs.filter(j => j.ticket_status === "Missing").length;
  if (missing > 0) actions.push(`${missing} missing ticket${missing>1?"s":""}`);
  if (!oo.mc_number)  actions.push("Add MC number");
  if (!oo.dot_number) actions.push("Add DOT number");
  return actions;
}

function performanceScore(oo: OOCompany): number {
  if (oo.jobs.length === 0) return 100;
  const ticketScore = oo.jobs.length > 0 ? (oo.jobs.filter(j => !j.ticket_status || j.ticket_status === "Verified").length / oo.jobs.length) * 40 : 40;
  const settleScore = oo.jobs.length > 0 ? (oo.jobs.filter(j => !["Hold"].includes(j.settlement_status)).length / oo.jobs.length) * 30 : 30;
  const complianceScore = ooHealthScore(oo) * 0.30;
  return Math.round(ticketScore + settleScore + complianceScore);
}

/* ─── Style constants ────────────────────────────────── */
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties  = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };
const eyebrow: React.CSSProperties   = { fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const lbl: React.CSSProperties       = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };

/* ─── Empty templates ────────────────────────────────── */
const EMPTY_COMPANY: Omit<OOCompany, "id"> = {
  company_name: "", contact_name: "", contact_phone: "", contact_email: "",
  business_address: "", mc_number: "", dot_number: "", ein: "",
  insurance_agent_name: "", insurance_agent_email: "", insurance_agent_phone: "",
  drivers: [], trucks: [], documents: [], jobs: [], subcontractors: [], driver_truck_assignments: [], coi_documents: [], logo_url: undefined,
  start_date: "", website: "",
};

const DEMO: OOCompany[] = [];

/* ─── Sub-components ─────────────────────────────────── */
function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${accent || "#e2e8f0"}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #f1f5f9", background: accent ? `${accent}11` : "#f8fafc" }}>
        <h3 style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</h3>
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value?: string | React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: "#0f172a" }}>{value ?? <span style={{ color: "#cbd5e1" }}>—</span>}</div>
    </div>
  );
}
function KPI({ label, value, color, bg, onClick }: { label: string; value: string | number; color?: string; bg?: string; onClick?: () => void }) {
  const c = color || "#1e40af";
  const b = bg || "#eff6ff";
  return (
    <div onClick={onClick} style={{ background: b, border: `1.5px solid ${c}30`, borderRadius: 10, padding: "7px 10px", cursor: onClick ? "pointer" : undefined }}>
      <div style={{ display:"inline-block", background: `${c}18`, color: c, borderRadius: 20, padding: "1px 7px", fontSize: "0.55rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: "0.92rem", fontWeight: 900, color: c, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 85 ? "#15803d" : score >= 70 ? "#d97706" : "#dc2626";
  const bg    = score >= 85 ? "#f0fdf4"  : score >= 70 ? "#fefce8"  : "#fff1f2";
  return (
    <span style={{ background: bg, color, padding: size === "lg" ? "6px 16px" : "3px 10px", borderRadius: 20, fontWeight: 900, fontSize: size === "lg" ? "1.2rem" : "0.75rem" }}>
      {score}%
    </span>
  );
}

/* ─── FMCSA Verify Button ─────────────────────────────
   Calls /api/ronyx/fmcsa/lookup (key stored in DB, never exposed to browser).
   Shows a result card in-line; guides admin to Settings if key not configured. */
type FmcsaResult = {
  found: boolean; legal_name?: string | null; operating_status?: string | null;
  allowed_to_operate?: boolean; safety_rating?: string | null;
  bipd_insurance_on_file?: string | null; cargo_insurance_on_file?: string | null;
  address?: string | null; telephone?: string | null;
  total_drivers?: string | number | null; total_power_units?: string | number | null;
  data_note?: string; verified_at?: string; error?: string; needsSetup?: boolean;
};

function FmcsaVerifyButton({ dotNumber, mcNumber, ooId, ooName, onVerified }: {
  dotNumber?: string | null; mcNumber?: string | null;
  ooId: string; ooName: string;
  onVerified: (r: FmcsaResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<FmcsaResult | null>(null);

  async function verify() {
    if (!dotNumber && !mcNumber) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ronyx/fmcsa/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dot_number: dotNumber || undefined, mc_number: mcNumber || undefined, oo_id: ooId }),
      });
      const data: FmcsaResult = await res.json();
      setResult(data);
      if (!data.error) onVerified(data);
    } catch {
      setResult({ found: false, error: "Request failed — check your connection" });
    } finally {
      setLoading(false);
    }
  }

  const statusColor = result?.allowed_to_operate === false ? "#dc2626"
    : result?.found ? "#15803d" : "#6b7280";

  return (
    <div>
      <button
        onClick={verify}
        disabled={loading || (!dotNumber && !mcNumber)}
        style={{
          padding: "6px 14px", borderRadius: 8, border: "1.5px solid #1e3a8a",
          background: loading ? "#f3f4f6" : "#1e3a8a", color: loading ? "#6b7280" : "#fff",
          fontWeight: 700, fontSize: "0.75rem", cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Verifying…" : "🔍 CCB™ FMCSA Verify"}
      </button>

      {result && (
        <div style={{
          marginTop: 10, padding: "12px 14px", borderRadius: 10,
          background: result.error ? "#fef2f2" : result.found ? "#f0fdf4" : "#fefce8",
          border: `1px solid ${result.error ? "#fecaca" : result.found ? "#bbf7d0" : "#fde68a"}`,
          fontSize: "0.78rem", lineHeight: 1.6,
        }}>
          {result.needsSetup ? (
            <div>
              <strong style={{ color: "#c2410c" }}>FMCSA key not configured.</strong>{" "}
              <a href="/ronyx/settings/integrations" style={{ color: "#1e40af" }}>Go to Settings → Integrations</a> to add your FMCSA web key.
            </div>
          ) : result.error ? (
            <div style={{ color: "#dc2626" }}>⚠️ {result.error}</div>
          ) : result.found ? (
            <>
              <div style={{ fontWeight: 800, color: statusColor, marginBottom: 4 }}>
                {result.allowed_to_operate ? "✅ Active — Allowed to Operate" : "⛔ NOT Allowed to Operate"}
              </div>
              {result.legal_name && <div><strong>Legal Name:</strong> {result.legal_name}</div>}
              {result.safety_rating && <div><strong>Safety Rating:</strong> {result.safety_rating}</div>}
              {result.bipd_insurance_on_file && <div><strong>BIPD Insurance on File:</strong> {result.bipd_insurance_on_file}</div>}
              {result.cargo_insurance_on_file && <div><strong>Cargo Insurance on File:</strong> {result.cargo_insurance_on_file}</div>}
              {result.address && <div><strong>Address:</strong> {result.address}</div>}
              {result.total_drivers && <div><strong>Drivers:</strong> {result.total_drivers} &nbsp;|&nbsp; <strong>Power Units:</strong> {result.total_power_units}</div>}
              <div style={{ marginTop: 6, fontSize: "0.68rem", color: "#6b7280" }}>
                ℹ️ {result.data_note}
              </div>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>
                Verified {new Date(result.verified_at!).toLocaleString()} · Source: FMCSA QCMobile
              </div>
            </>
          ) : (
            <div style={{ color: "#92400e" }}>⚠️ {result.data_note ?? "Carrier not found in FMCSA database."}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Settlement status helpers ──────────────────────── */
function settlementColors(s: string): [string, string] {
  if (s === "Paid")       return ["#f0fdf4", "#15803d"];
  if (s === "Approved")   return ["#eff6ff", "#1e40af"];
  if (s === "Processing") return ["#fefce8", "#92400e"];
  if (s === "Hold")       return ["#fff1f2", "#dc2626"];
  return ["#f1f5f9", "#475569"];
}
function ticketStatusColors(s?: string): [string, string] {
  if (!s || s === "Verified") return ["#f0fdf4", "#15803d"];
  if (s === "Needs Review")   return ["#fefce8", "#92400e"];
  if (s === "Missing")        return ["#fff1f2", "#dc2626"];
  if (s === "Duplicate")      return ["#f5f3ff", "#7c3aed"];
  return ["#f1f5f9", "#475569"];
}

/* ─── Main page ──────────────────────────────────────── */
export default function OwnerOperatorsPage() {
  const { blocked: moduleBlocked, loading: moduleLoading } = useModuleAccess("owner_operator_hub");
  const [companies, setCompanies]   = useState<OOCompany[]>([]);
  const [ooLoading, setOoLoading]   = useState(true);
  const [ooError, setOoError]       = useState<string | null>(null);
  const [view, setView]             = useState<"list" | "detail">("list");
  const [selected, setSelected]     = useState<OOCompany | null>(null);
  const [activeTab, setActiveTab]   = useState<"overview" | "drivers" | "fleet" | "documents" | "jobs" | "settlement" | "compliance" | "subs" | "coi">("overview");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [toast, setToast]           = useState("");
  const [docViewer, setDocViewer]   = useState<{ url: string; filename?: string } | null>(null);
  const [docEmailModal, setDocEmailModal] = useState<{ docType: string; fileUrl: string; fileName: string; to: string; subject: string; message: string; sending: boolean } | null>(null);
  const [ooEditModal, setOoEditModal] = useState<{ id: string; form: Partial<OOCompany>; saving: boolean } | null>(null);
  const [driverEditModal, setDriverEditModal] = useState<{ driver: OODriver; form: Partial<OODriver>; saving: boolean } | null>(null);
  const [verifyDrawerOO, setVerifyDrawerOO] = useState<{ id: string; name: string } | null>(null);

  // Add company form
  const [newCompanyForm, setNewCompanyForm] = useState({ ...EMPTY_COMPANY });
  const [newOODrivers, setNewOODrivers]     = useState<{ name: string; phone: string; cdl_number: string; cdl_state: string; cdl_class?: string; cdl_expiration: string; med_card_expiration: string }[]>([]);
  const BLANK_OO_DRIVER = { name: "", phone: "", cdl_number: "", cdl_state: "TX", cdl_class: "", cdl_expiration: "", med_card_expiration: "" };

  // Add driver/truck/job forms
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddTruck,  setShowAddTruck]  = useState(false);
  const [showAddJob,    setShowAddJob]    = useState(false);
  const [addDriverForm, setAddDriverForm] = useState<Omit<OODriver,"id">>({ name:"", cdl_number:"", cdl_state:"TX", cdl_class:"", cdl_expiration:"", med_card_expiration:"", phone:"" });
  const [pickDriverId,  setPickDriverId]  = useState("");

  // Subcontractors tab state
  const [showAddSub,   setShowAddSub]   = useState(false);
  const [addSubForm,   setAddSubForm]   = useState({ company_name:"", contact_name:"", contact_phone:"", contact_email:"", mc_number:"", dot_number:"" });
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [subDriverForms, setSubDriverForms] = useState<Record<string, { name:string; phone:string; cdl_number:string; cdl_expiration:string }>>({});
  const [addTruckForm,  setAddTruckForm]  = useState<Omit<OOTruck,"id">>({ truck_number:"", year:"", make:"", model:"", vin:"", last_inspection:"", inspection_result:"Pass" });
  const [addJobForm,    setAddJobForm]    = useState<Omit<OOJob,"id">>({ project_name:"Domino Project", project_number:"", load_date:"", truck_number:"", driver_name:"", origin:"", destination:"", material:"", tons:0, gross_revenue:0, oo_rate:0, margin:0, ticket_status:"Verified", settlement_status:"Pending" });

  // COI upload state
  const [coiUploadForm, setCoiUploadForm] = useState({ document_type:"", coi_group:"ronyx_ma_mortenson", insurance_provider:"", policy_number:"", effective_date:"", expiration_date:"", notes:"" });
  const [showCoiUpload, setShowCoiUpload] = useState<string>(""); // document_type being uploaded
  const [activeCoiCompanies, setActiveCoiCompanies] = useState<CoiCompanyKey[]>(["ronyx_ma_mortenson"]);
  const [showCoiDropdown, setShowCoiDropdown] = useState(false);
  const coiFileRef = useRef<HTMLInputElement>(null);
  const pendingCoiTypeRef = useRef<string>("");

  // Truck pool / maintenance state
  const [expandedDriverPool, setExpandedDriverPool] = useState<Set<string>>(new Set());
  const [assignTruckForm,   setAssignTruckForm]   = useState<{ driver_id:string; truck_id:string; priority:number; requires_manager_approval:boolean; notes:string }>({ driver_id:"", truck_id:"", priority:2, requires_manager_approval:false, notes:"" });
  const [showAssignTruck,   setShowAssignTruck]   = useState<string>(""); // driver id
  const [maintenanceModal,  setMaintenanceModal]  = useState<{ truckId:string; truckNumber:string } | null>(null);
  const [maintForm, setMaintForm] = useState({ event_type:"breakdown", severity:"high", issue_title:"", issue_description:"", estimated_return_at:"", reported_by:"" });

  // Company list search
  const [ooListSearch, setOoListSearch] = useState("");
  // Active/inactive filter — quit OOs (status='inactive') hidden by default
  const [ooStatusFilter, setOoStatusFilter] = useState<"active" | "inactive" | "all">("active");
  // Driver tab search (within selected OO)
  const [driverSearch, setDriverSearch] = useState("");
  const ooIsActive = (oo: OOCompany) => (oo.status ?? "active").toLowerCase() === "active";
  const filteredCompanies = React.useMemo(() => {
    let list = companies;
    if (ooStatusFilter === "active") list = list.filter(ooIsActive);
    else if (ooStatusFilter === "inactive") list = list.filter(oo => !ooIsActive(oo));
    const q = ooListSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(oo =>
      oo.company_name.toLowerCase().includes(q) ||
      (oo.contact_name  || "").toLowerCase().includes(q) ||
      (oo.mc_number     || "").toLowerCase().includes(q) ||
      (oo.dot_number    || "").toLowerCase().includes(q) ||
      (oo.ein           || "").toLowerCase().includes(q) ||
      (oo.business_address || "").toLowerCase().includes(q) ||
      oo.drivers.some(d => d.name.toLowerCase().includes(q))
    );
  }, [companies, ooListSearch, ooStatusFilter]);

  // Jobs filters
  const [jobFilter,        setJobFilter]        = useState("All Projects");
  const [settlementFilter, setSettlementFilter] = useState("All");
  const [editingNotes, setEditingNotes]         = useState(false);
  const [notesValue,   setNotesValue]           = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<string>("");

  const loadCompanies = useCallback(() => {
    setOoLoading(true);
    setOoError(null);
    fetch("/api/ronyx/owner-operators")
      .then(r => r.json())
      .then((res) => {
        if (res.error) { setOoError(res.error); setCompanies([]); }
        else { setCompanies(res.companies || []); }
      })
      .catch((e) => { setOoError(e?.message || "Network error — could not load owner operators"); setCompanies([]); })
      .finally(() => setOoLoading(false));
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  // ── Live multi-user sync ──────────────────────────────
  const { status: syncStatus, lastSync } = useRealtimeSync(
    ["ronyx_owner_operators", "ronyx_oo_documents", "ronyx_oo_trucks", "ronyx_oo_drivers", "ronyx_oo_jobs"],
    loadCompanies,
    { channelName: "oo-page-sync" }
  );
  const liveBadge = useLiveBadgeProps(syncStatus, lastSync);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }
  function persist(updated: OOCompany[]) { setCompanies(updated); }
  function updateLocalState(oo: OOCompany) { setSelected(oo); setCompanies(prev => prev.map(c => c.id === oo.id ? oo : c)); }
  // Mark an owner-operator active/inactive (e.g. when a company quits Ronyx).
  async function setOOActive(oo: OOCompany, active: boolean) {
    const status = active ? "active" : "inactive";
    // Audit trail: record the status change in the OO's changes_log.
    const change: ChangeEntry = {
      date: new Date().toISOString().slice(0, 10),
      type: active ? "Reactivated" : "Deactivated",
      detail: active ? "Marked Active" : "Marked Not Active — no longer working for Ronyx",
    };
    const changes_log = [change, ...(oo.changes_log || [])];
    updateLocalState({ ...oo, status, changes_log });
    const res = await apiPut(`/api/ronyx/owner-operators/${oo.id}`, { status, changes_log });
    setToast(res?.error ? `Could not update status: ${res.error}` : (active ? "Company reactivated" : "Company marked Not Active"));
    loadCompanies();
  }
  async function updateSelected(oo: OOCompany) {
    updateLocalState(oo);
    const res = await apiPut(`/api/ronyx/owner-operators/${oo.id}`, {
      notes: oo.notes, last_contact_date: oo.last_contact_date,
      mc_number: oo.mc_number, dot_number: oo.dot_number, ein: oo.ein,
      contact_name: oo.contact_name, contact_phone: oo.contact_phone, contact_email: oo.contact_email,
      business_address: oo.business_address,
      insurance_agent_name: oo.insurance_agent_name, insurance_agent_email: oo.insurance_agent_email, insurance_agent_phone: oo.insurance_agent_phone,
      reminder_log: oo.reminder_log, compliance_history: oo.compliance_history, changes_log: oo.changes_log,
      start_date: oo.start_date || null, website: oo.website || null,
    });
    if (res?.error) flash(`Save error: ${res.error}`);
  }
  function openOO(oo: OOCompany) { setSelected(oo); setView("detail"); setActiveTab("overview"); }

  // Track the last auto-created agreement ID so we can show a link
  const [lastAgreementToken, setLastAgreementToken] = useState<string | null>(null);

  // Add company (+ optional inline drivers) → auto-create draft subhauler agreement
  async function addCompany() {
    if (!newCompanyForm.company_name.trim()) { flash("Company name is required."); return; }
    const { company, error } = await apiPost("/api/ronyx/owner-operators", newCompanyForm);
    if (error) { flash(`Error: ${error}`); return; }

    // Save any drivers entered inline
    const savedDrivers: OODriver[] = [];
    const filledDrivers = newOODrivers.filter((d) => d.name.trim());
    for (const d of filledDrivers) {
      const { driver } = await apiPost(`/api/ronyx/owner-operators/${company.id}/drivers`, d);
      if (driver) savedDrivers.push({ id: driver.id, name: driver.name, cdl_number: driver.cdl_number||"", cdl_state: driver.cdl_state||"TX", cdl_expiration: driver.cdl_expiration||"", med_card_expiration: driver.med_card_expiration||"", phone: driver.phone||"" });
    }

    // Auto-create a draft subhauler agreement pre-filled with this OO's info
    const { agreement } = await apiPost("/api/ronyx/subhauler-agreements", {
      subhauler_company: company.company_name,
      subhauler_address: company.business_address || "",
      subhauler_attn:    company.contact_name    || "",
      subhauler_phone:   company.contact_phone   || "",
      subhauler_email:   company.contact_email   || "",
      status:            "draft",
    });
    if (agreement?.sign_token) setLastAgreementToken(agreement.sign_token);

    persist([{ ...company, drivers: savedDrivers }, ...companies]);
    setShowAddCompany(false);
    setNewCompanyForm({ ...EMPTY_COMPANY });
    setNewOODrivers([]);
    flash(`${company.company_name} added${savedDrivers.length ? ` with ${savedDrivers.length} driver(s)` : ""}. Contract package draft created.`);
  }

  // Delete OO company
  async function deleteOO(oo: OOCompany) {
    if (!confirm(`Delete "${oo.company_name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/ronyx/owner-operators/${oo.id}`, { method: "DELETE" });
    if (!res.ok) { flash("Delete failed."); return; }
    persist(companies.filter((c) => c.id !== oo.id));
    flash(`${oo.company_name} deleted.`);
  }

  // Driver CRUD
  async function addDriver() {
    if (!selected || !addDriverForm.name.trim()) { flash("Driver name required."); return; }
    const { driver, error } = await apiPost(`/api/ronyx/owner-operators/${selected.id}/drivers`, addDriverForm);
    if (error) { flash(`Error: ${error}`); return; }
    const d: OODriver = { id: driver.id, name: driver.name, cdl_number: driver.cdl_number||"", cdl_state: driver.cdl_state||"TX", cdl_expiration: driver.cdl_expiration||"", med_card_expiration: driver.med_card_expiration||"", phone: driver.phone||"" };
    updateLocalState({ ...selected, drivers: [...selected.drivers, d] });
    setAddDriverForm({ name:"", cdl_number:"", cdl_state:"TX", cdl_class:"", cdl_expiration:"", med_card_expiration:"", phone:"" });
    setShowAddDriver(false); flash("Driver added.");
  }
  async function removeDriver(driverId: string) {
    if (!selected || !confirm("Remove driver?")) return;
    await apiDelete(`/api/ronyx/owner-operators/${selected.id}/drivers/${driverId}`);
    updateLocalState({ ...selected, drivers: selected.drivers.filter(d => d.id !== driverId) });
  }

  // Truck CRUD
  async function addTruck() {
    if (!selected || !addTruckForm.truck_number.trim()) { flash("Truck # required."); return; }
    const { truck, error } = await apiPost(`/api/ronyx/owner-operators/${selected.id}/trucks`, addTruckForm);
    if (error) { flash(`Error: ${error}`); return; }
    const t: OOTruck = { id: truck.id, truck_number: truck.truck_number, year: truck.year||"", make: truck.make||"", model: truck.model||"", vin: truck.vin||"", last_inspection: truck.last_inspection||"", inspection_result: truck.inspection_result };
    updateLocalState({ ...selected, trucks: [...selected.trucks, t] });
    setAddTruckForm({ truck_number:"", year:"", make:"", model:"", vin:"", last_inspection:"", inspection_result:"Pass" });
    setShowAddTruck(false); flash("Truck added.");
  }
  async function removeTruck(truckId: string) {
    if (!selected || !confirm("Remove truck?")) return;
    await apiDelete(`/api/ronyx/owner-operators/${selected.id}/trucks/${truckId}`);
    updateLocalState({ ...selected, trucks: selected.trucks.filter(t => t.id !== truckId) });
  }

  // Truck Pool CRUD
  async function assignTruckToDriver() {
    if (!selected || !assignTruckForm.driver_id || !assignTruckForm.truck_id) {
      flash("Select a driver and truck."); return;
    }
    const res = await apiPost(`/api/ronyx/owner-operators/${selected.id}/driver-truck-assignments`, assignTruckForm);
    if (res.error) { flash(`Error: ${res.error}`); return; }
    const newDta: OOTruckAssignment = {
      id: res.assignment.id,
      driver_id: assignTruckForm.driver_id,
      truck_id: assignTruckForm.truck_id,
      priority: assignTruckForm.priority as 1|2|3|4,
      assignment_type: assignTruckForm.priority === 1 ? "primary" : "backup",
      requires_manager_approval: assignTruckForm.requires_manager_approval,
      notes: assignTruckForm.notes || undefined,
    };
    updateLocalState({
      ...selected,
      driver_truck_assignments: [...(selected.driver_truck_assignments || []).filter(a => !(a.driver_id === assignTruckForm.driver_id && a.truck_id === assignTruckForm.truck_id)), newDta],
    });
    setShowAssignTruck(""); setAssignTruckForm({ driver_id:"", truck_id:"", priority:2, requires_manager_approval:false, notes:"" });
    flash("Truck assigned to driver's approved pool.");
  }

  async function removeTruckAssignment(assignmentId: string, driverName: string, truckNum: string) {
    if (!selected || !confirm(`Remove truck ${truckNum} from ${driverName}'s approved pool?`)) return;
    await fetch(`/api/ronyx/owner-operators/${selected.id}/driver-truck-assignments/${assignmentId}`, { method: "DELETE" });
    updateLocalState({
      ...selected,
      driver_truck_assignments: (selected.driver_truck_assignments || []).filter(a => a.id !== assignmentId),
    });
    flash(`Truck ${truckNum} removed from ${driverName}'s pool.`);
  }

  async function markTruckOutOfService() {
    if (!selected || !maintenanceModal || !maintForm.issue_title.trim()) { flash("Issue title required."); return; }
    const res = await fetch("/api/ronyx/maintenance-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oo_id: selected.id,
        truck_id: maintenanceModal.truckId,
        truck_number: maintenanceModal.truckNumber,
        oo_company_name: selected.company_name,
        ...maintForm,
      }),
    });
    if (!res.ok) { flash("Failed to create maintenance event."); return; }
    // Update truck status locally
    updateLocalState({
      ...selected,
      trucks: selected.trucks.map(t =>
        t.id === maintenanceModal.truckId
          ? { ...t, status: maintForm.event_type === "breakdown" ? "out_of_service" as TruckStatus : "in_maintenance" as TruckStatus }
          : t
      ),
    });
    setMaintenanceModal(null); setMaintForm({ event_type:"breakdown", severity:"high", issue_title:"", issue_description:"", estimated_return_at:"", reported_by:"" });
    flash(`Truck ${maintenanceModal.truckNumber} marked out of service — maintenance event created.`);
  }

  // COI upload handler
  async function handleCOIUpload(docType: string, file: File) {
    if (!selected) return;
    const form = new FormData();
    form.append("file", file);
    form.append("bucket", "ronyx-imports");
    form.append("path", `oo-coi/${selected.id}/${docType}/${file.name}`);
    const upRes = await fetch("/api/ronyx/upload-file", { method:"POST", body:form });
    const upData = await upRes.json();
    const fileUrl = upData.url || null;

    const coiType = COI_TYPES_CONST.find(t => t.value === docType);
    const body = {
      ...coiUploadForm,
      document_type: docType,
      coi_group: coiType?.group || "standard",
      file_name: file.name,
      file_url: fileUrl,
    };
    const r = await fetch(`/api/ronyx/owner-operators/${selected.id}/coi`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
    const data = await r.json();
    if (data.error) { flash(`Error: ${data.error}`); return; }
    const newDoc: COIDoc = { id: data.coi.id, coi_group: data.coi.coi_group, document_type: data.coi.document_type, insurance_provider: body.insurance_provider||undefined, policy_number: body.policy_number||undefined, effective_date: body.effective_date||undefined, expiration_date: body.expiration_date||undefined, file_name: file.name, file_url: fileUrl||undefined, status: data.coi.status, review_status: data.coi.review_status, dispatch_blocked: false, settlement_hold: false };
    updateLocalState({ ...selected, coi_documents: [...(selected.coi_documents||[]).filter(d => d.document_type !== docType), newDoc] });
    setShowCoiUpload(""); setCoiUploadForm({ document_type:"", coi_group:"standard", insurance_provider:"", policy_number:"", effective_date:"", expiration_date:"", notes:"" });
    flash(`COI uploaded: ${coiType?.label || docType}`);
  }

  async function updateCOIStatus(docId: string, patch: Partial<COIDoc>) {
    if (!selected) return;
    const r = await fetch(`/api/ronyx/owner-operators/${selected.id}/coi/${docId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(patch) });
    const data = await r.json();
    if (data.error) { flash(`Error: ${data.error}`); return; }
    updateLocalState({ ...selected, coi_documents: (selected.coi_documents||[]).map(d => d.id === docId ? { ...d, ...patch, status: data.coi.status } : d) });
    flash("COI updated.");
  }

  // Job CRUD
  async function addJob() {
    if (!selected || !addJobForm.project_number.trim() || !addJobForm.load_date) { flash("Project # and date required."); return; }
    const margin = (addJobForm.gross_revenue || 0) - (addJobForm.oo_rate || 0);
    const { job, error } = await apiPost(`/api/ronyx/owner-operators/${selected.id}/jobs`, { ...addJobForm, margin });
    if (error) { flash(`Error: ${error}`); return; }
    updateLocalState({ ...selected, jobs: [...selected.jobs, job] });
    setAddJobForm({ project_name:"Domino Project", project_number:"", load_date:"", truck_number:"", driver_name:"", origin:"", destination:"", material:"", tons:0, gross_revenue:0, oo_rate:0, margin:0, ticket_status:"Verified", settlement_status:"Pending" });
    setShowAddJob(false); flash("Load added.");
  }
  function setSettlement(ooId: string, jobId: string, status: OOJob["settlement_status"]) {
    const oo = companies.find(c => c.id === ooId);
    if (!oo) return;
    const updated = { ...oo, jobs: oo.jobs.map(j => j.id === jobId ? { ...j, settlement_status: status } : j) };
    if (selected?.id === ooId) setSelected(updated);
    persist(companies.map(c => c.id === ooId ? updated : c));
    apiPut(`/api/ronyx/owner-operators/${ooId}/jobs`, { job_id: jobId, settlement_status: status });
    flash(`Settlement: ${status}.`);
  }
  function setTicketStatus(ooId: string, jobId: string, status: OOJob["ticket_status"]) {
    const oo = companies.find(c => c.id === ooId);
    if (!oo) return;
    const updated = { ...oo, jobs: oo.jobs.map(j => j.id === jobId ? { ...j, ticket_status: status } : j) };
    if (selected?.id === ooId) setSelected(updated);
    persist(companies.map(c => c.id === ooId ? updated : c));
    apiPut(`/api/ronyx/owner-operators/${ooId}/jobs`, { job_id: jobId, ticket_status: status });
  }

  // Doc upload — stores original file in Supabase Storage first, then records the document
  async function handleDocUpload(docType: string, file: File) {
    if (!selected) return;
    flash(`Uploading ${docType}…`);

    // 1. Store original file (preserved forever — original_uploads)
    let fileUrl: string | null = null;
    let originalUploadId: string | null = null;
    try {
      const fd = new FormData();
      fd.append("file",   file);
      fd.append("module", "compliance");
      const upRes  = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
      const upData = await upRes.json();
      fileUrl          = upData.url       || null;
      originalUploadId = upData.upload_id || null;
    } catch { /* storage not configured — still record the doc name */ }

    // 2. Dates (expiry / contract start) are set AFTER upload via the date pickers
    // in the Documents tab. Browser prompt() is NOT supported in this environment —
    // it was throwing here and silently breaking every document upload.
    const issuedOnInput: string | undefined = undefined;
    const expiresInput: string | undefined = undefined;

    // 3. Record in DB with file URL
    await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`, {
      doc_type:   docType,
      file_name:  file.name,
      file_url:   fileUrl,
      expires_on: expiresInput  || null,
      issued_on:  issuedOnInput || null,
    });

    const doc: OODoc = { type: docType, uploaded_at: new Date().toISOString(), file_name: file.name, expires_on: expiresInput, issued_on: issuedOnInput, file_url: fileUrl || undefined };
    updateLocalState({ ...selected, documents: [doc, ...selected.documents.filter(d => d.type !== docType)] });
    flash(`${docType} uploaded${fileUrl ? " & stored in Backup Center" : ""}.`);
  }

  // Open a document — fetches a short-lived signed URL, then shows in-app viewer
  async function openDoc(fileUrl: string, print = false, filename?: string) {
    try {
      const res  = await fetch(`/api/ronyx/view-doc?url=${encodeURIComponent(fileUrl)}`);
      const data = await res.json();
      const url  = data.signed_url || fileUrl;
      if (print) {
        const w = window.open(url);
        if (w) { w.onload = () => w.print(); }
      } else {
        setDocViewer({ url, filename });
      }
    } catch {
      setDocViewer({ url: fileUrl, filename });
    }
  }

  // ── List-level aggregates ──────────────────────────
  const totalRevenueMTD     = companies.reduce((s,c) => s + ooRevenueMTD(c), 0);
  const totalMarginMTD      = companies.reduce((s,c) => s + ooMarginMTD(c), 0);
  // totalPending removed — loadsInProgress covers same concept in KPI grid
  const totalSettlementReady= companies.reduce((s,c) => s + ooSettlementReady(c), 0);
  const insExpiring         = companies.filter(c => { const d = c.documents.find(x => x.type==="Insurance Certificate"); const days = d?.expires_on ? daysUntil(d.expires_on) : null; return days !== null && days <= 30; }).length;
  const contractExpiring    = companies.filter(c => { const d = c.documents.find(x => x.type==="Contract"); const days = d?.expires_on ? daysUntil(d.expires_on) : null; return days !== null && days <= 60; }).length;
  const complianceIssues    = companies.filter(c => ooHealthScore(c) < 80).length;
  const eligibleCount       = companies.filter(c => ooDispatchEligible(c)[0]).length;
  const activeProjects      = new Set(companies.flatMap(c => c.jobs.map(j => j.project_number))).size;
  const loadsInProgress     = companies.reduce((s,c) => s + c.jobs.filter(j => j.settlement_status === "Pending").length, 0);

  // ── Jobs for detail view ───────────────────────────
  const projectNumbers = selected ? [...new Set(selected.jobs.map(j => j.project_number))] : [];
  const filteredJobs   = selected ? selected.jobs.filter(j =>
    (jobFilter === "All Projects" || j.project_number === jobFilter) &&
    (settlementFilter === "All"   || j.settlement_status === settlementFilter)
  ) : [];
  const totalRevenue = filteredJobs.reduce((s,j) => s + j.gross_revenue, 0);
  const totalOOPay   = filteredJobs.reduce((s,j) => s + j.oo_rate, 0);
  const totalMargin  = filteredJobs.reduce((s,j) => s + j.margin, 0);
  const pendingCount = filteredJobs.filter(j => j.settlement_status === "Pending").length;
  const pendingAmount= filteredJobs.filter(j => j.settlement_status === "Pending").reduce((s,j) => s + j.oo_rate, 0);

  // ── LIST VIEW ──────────────────────────────────────
  if (view === "list") {
    return (
      <div style={{ maxWidth: 1100 }}>
        {toast && <Toast msg={toast} />}
        {lastAgreementToken && (
          <div style={{ position: "fixed", top: 20, right: 20, zIndex: 10000, padding: "12px 20px", borderRadius: 10, background: "#1e3a8a", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 12 }}>
            <span>📄 Contract package draft created</span>
            <a href="/ronyx/subhauler-agreement" style={{ color: "#93c5fd", fontWeight: 700, textDecoration: "underline" }}>Review & Send →</a>
            <button onClick={() => setLastAgreementToken(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(pendingDocRef.current, f); e.target.value = ""; }} />

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div style={eyebrow}>MoveAround TMS / Fleet</div>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Owner Operator Command Center</h1>
            <span title={liveBadge.title} style={{ fontSize:11, fontWeight:700, color: liveBadge.color, background: liveBadge.color + "15", padding:"3px 9px", borderRadius:20, letterSpacing:"0.02em", cursor:"default" }}>
              {liveBadge.label}
            </span>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>Manage OO companies as businesses — fleet, compliance, settlements, and profitability in one place.</p>
        </div>

        {/* Cross-OO Action Required banner */}
        {(() => {
          const allActions = companies.flatMap(c => ooActionRequired(c).map(a => ({ oo: c.company_name, action: a })));
          if (allActions.length === 0) return null;
          return (
            <div style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 10, fontSize: "0.85rem" }}>⚠ ACTION REQUIRED ({allActions.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allActions.slice(0,8).map((a,i) => (
                  <span key={i} style={{ background: "#fff", border: "1px solid #fda4af", borderRadius: 8, padding: "5px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#dc2626" }}>
                    <strong>{a.oo}:</strong> {a.action}
                  </span>
                ))}
                {allActions.length > 8 && <span style={{ fontSize: "0.75rem", color: "#94a3b8", alignSelf: "center" }}>+{allActions.length - 8} more</span>}
              </div>
            </div>
          );
        })()}

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 20 }}>
          <KPI label="OO Companies"       value={companies.length} />
          <KPI label="Dispatch Eligible"  value={`${eligibleCount}/${companies.length}`}  color={eligibleCount<companies.length?"#dc2626":"#15803d"} bg={eligibleCount<companies.length?"#fff1f2":"#f0fdf4"} />
          <KPI label="Settlement Ready"   value={`$${totalSettlementReady.toLocaleString()}`} color="#1e40af" bg="#eff6ff" />
          <KPI label="Revenue MTD"        value={`$${totalRevenueMTD.toLocaleString()}`}      color="#15803d" bg="#f0fdf4" />
          <KPI label="Margin MTD"         value={`$${totalMarginMTD.toLocaleString()}`}       color="#7c3aed" bg="#f5f3ff" />
          <KPI label="Active Projects"    value={activeProjects} />
          <KPI label="Loads In Progress"  value={loadsInProgress} />
          <KPI label="Insurance Expiring" value={insExpiring}     color={insExpiring>0?"#dc2626":"#15803d"} bg={insExpiring>0?"#fff1f2":"#f8fafc"} />
          <KPI label="Contract Expiring"  value={contractExpiring} color={contractExpiring>0?"#d97706":"#15803d"} bg={contractExpiring>0?"#fefce8":"#f8fafc"} />
          <KPI label="Compliance Issues"  value={complianceIssues} color={complianceIssues>0?"#d97706":"#15803d"} bg={complianceIssues>0?"#fff7ed":"#f8fafc"} />
        </div>

        {/* Company list search */}
        <div style={{ marginBottom: 16, padding: "14px 16px", background: "#eff6ff", borderRadius: 14, border: "2px solid #3b82f6", boxShadow: "0 4px 16px rgba(30,64,175,0.13)" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>🔍 Search Owner Operators</div>
          <div style={{ position: "relative" }}>
            <input
              value={ooListSearch}
              onChange={e => setOoListSearch(e.target.value)}
              placeholder="Company name, contact, driver name, MC#, DOT#…"
              style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10, border: "2px solid #1e40af", fontSize: "0.95rem", outline: "none", background: "#fff", boxSizing: "border-box" as const, color: "#0f172a", fontWeight: 600, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)" }}
            />
            {ooListSearch ? (
              <button onClick={() => setOoListSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#1e40af", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem", color: "#fff", fontWeight: 900 }}>✕</button>
            ) : (
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", opacity: 0.35, pointerEvents: "none" }}>🔍</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {(["active", "inactive", "all"] as const).map(s => (
              <button key={s} onClick={() => setOoStatusFilter(s)}
                style={{ padding: "5px 12px", borderRadius: 8, border: "1.5px solid #1e40af", background: ooStatusFilter === s ? "#1e40af" : "#fff", color: ooStatusFilter === s ? "#fff" : "#1e40af", fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                {s === "all" ? "All" : s === "inactive" ? "Not Active" : "Active"}
              </button>
            ))}
          </div>
        </div>
        {ooListSearch.trim() && (
          <div style={{ marginBottom: 10, fontSize: "0.78rem", color: filteredCompanies.length > 0 ? "#1e40af" : "#dc2626", fontWeight: 600 }}>
            {filteredCompanies.length > 0 ? `${filteredCompanies.length} result${filteredCompanies.length !== 1 ? "s" : ""} for "${ooListSearch.trim()}"` : `No companies match "${ooListSearch.trim()}"`}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/ronyx/owner-operators/import" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>📋 Bulk Import</a>
            <button onClick={() => setShowAddCompany(s=>!s)} style={primaryBtn}>+ Add Owner Operator</button>
          </div>
        </div>

        {showAddCompany && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontWeight: 800 }}>New Owner Operator Company</h3>
            {/* Duplicate check warning */}
            {newCompanyForm.company_name.trim().length > 1 && companies.filter(c =>
              c.company_name.toLowerCase().includes(newCompanyForm.company_name.trim().toLowerCase()) ||
              newCompanyForm.company_name.trim().toLowerCase().includes(c.company_name.toLowerCase().slice(0,5))
            ).length > 0 && (
              <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "#fef3c7", border: "1px solid #f59e0b", fontSize: "0.8rem", fontWeight: 700, color: "#92400e" }}>
                ⚠️ Possible duplicate detected — these companies already exist:&nbsp;
                {companies.filter(c =>
                  c.company_name.toLowerCase().includes(newCompanyForm.company_name.trim().toLowerCase()) ||
                  newCompanyForm.company_name.trim().toLowerCase().includes(c.company_name.toLowerCase().slice(0,5))
                ).map(c => c.company_name).join(", ")}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
              {([["Company Name *","company_name","Smith Trucking LLC"],["Contact Name","contact_name","John Smith"],["Contact Phone","contact_phone","(555) 000-0000"],["Contact Email","contact_email","dispatch@co.com"],["MC Number","mc_number","MC-123456"],["DOT Number","dot_number","DOT-1234567"],["EIN / Tax ID","ein","XX-XXXXXXX"]] as [string, keyof typeof EMPTY_COMPANY, string][]).map(([l,f,ph]) => (
                <div key={f}><label style={lbl}>{l}</label><input value={newCompanyForm[f] as string} onChange={e => setNewCompanyForm(x=>({...x,[f]:e.target.value}))} style={inp} placeholder={ph} /></div>
              ))}
              <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Business Address</label><input value={newCompanyForm.business_address} onChange={e=>setNewCompanyForm(x=>({...x,business_address:e.target.value}))} style={inp} placeholder="Street, City, State ZIP" /></div>
            </div>
            {/* Inline drivers */}
            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 16, paddingTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>Drivers (optional)</div>
                <button
                  onClick={() => setNewOODrivers((prev) => [...prev, { ...BLANK_OO_DRIVER }])}
                  style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  + Add Driver
                </button>
              </div>
              {newOODrivers.length === 0 && (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>No drivers yet — click "+ Add Driver" to add drivers for this company.</div>
              )}
              {newOODrivers.map((d, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8, padding: 10, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div><label style={lbl}>Driver Name *</label><input value={d.name} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} style={inp} placeholder="Full name" /></div>
                  <div><label style={lbl}>Phone</label><input value={d.phone} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, phone: e.target.value } : x))} style={inp} /></div>
                  <div><label style={lbl}>CDL #</label><input value={d.cdl_number} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, cdl_number: e.target.value } : x))} style={inp} /></div>
                  <div><label style={lbl}>CDL State</label><input value={d.cdl_state} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, cdl_state: e.target.value } : x))} style={{ ...inp, width: "100%" }} /></div>
                  <div>
                    <label style={lbl}>CDL Class</label>
                    <select value={d.cdl_class || ""} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, cdl_class: e.target.value } : x))} style={inp}>
                      <option value="">—</option>
                      <option value="A">A</option>
                      <option value="AM1">AM1</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                  <div><label style={lbl}>CDL Exp</label><input type="date" value={d.cdl_expiration} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, cdl_expiration: e.target.value } : x))} style={inp} /></div>
                  <div><label style={lbl}>Med Exp</label><input type="date" value={d.med_card_expiration} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, med_card_expiration: e.target.value } : x))} style={inp} /></div>
                  <button onClick={() => setNewOODrivers((prev) => prev.filter((_, i) => i !== idx))} style={{ padding: "0 8px", height: 32, borderRadius: 6, border: "1px solid #fca5a5", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 700, alignSelf: "end" }}>✕</button>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={addCompany} style={primaryBtn}>Save Company</button>
              <button onClick={() => { setShowAddCompany(false); setNewOODrivers([]); }} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}

        {/* Color legend */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, fontSize: "0.72rem", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.65rem" }}>Card color:</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#dcfce7", border:"1px solid #86efac", borderRadius:20, padding:"3px 10px", color:"#15803d", fontWeight:700 }}>🟢 Dispatch Eligible — all compliance passed</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#fefce8", border:"1px solid #fde68a", borderRadius:20, padding:"3px 10px", color:"#92400e", fontWeight:700 }}>🟡 Needs Attention — docs expiring or incomplete</span>
          <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:20, padding:"3px 10px", color:"#dc2626", fontWeight:700 }}>🔴 Dispatch Blocked — missing insurance, contract, or compliance</span>
        </div>

        {/* Company cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredCompanies.length === 0 && ooListSearch.trim() ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>No companies found</div>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Try a different name, contact, driver, MC#, or DOT#</div>
              <button onClick={() => setOoListSearch("")} style={{ marginTop: 14, padding: "6px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Clear Search</button>
            </div>
          ) : null}
          {filteredCompanies.map(oo => {
            const health      = ooHealthScore(oo);
            const perf        = performanceScore(oo);
            const [eligible, blocks] = ooDispatchEligible(oo);
            const settlementReady    = ooSettlementReady(oo);
            const revMTD      = ooRevenueMTD(oo);
            const marMTD      = ooMarginMTD(oo);
            const tick        = ooTicketHealth(oo);
            const actions     = ooActionRequired(oo);
            const pendingJobs = oo.jobs.filter(j => j.settlement_status === "Pending").length;
            const holdJobs    = oo.jobs.filter(j => j.settlement_status === "Hold").length;
            const projects    = [...new Set(oo.jobs.map(j => j.project_number))];
            const insDoc      = oo.documents.find(d => ["Insurance Certificate","Auto Liability Insurance","General Liability Insurance","Insurance Certificate (COI)","Cargo Insurance"].includes(d.type));
            const insExpDays  = insDoc?.expires_on ? daysUntil(insDoc.expires_on) : null;

            const cardBg    = eligible ? (health>=85?"#f0fdf4":"#f0fdf4") : (health>=70?"#fefce8":"#fff1f2");
            const stripBorder = eligible ? "#86efac" : (health>=70?"#fde68a":"#fda4af");
            return (
              <div key={oo.id} style={{ background: "#fff", border: `1px solid ${stripBorder}`, borderRadius: 16, overflow: "hidden", cursor: "pointer" }} onClick={() => openOO(oo)}>
                {/* Header strip — green=eligible, yellow=needs attention, red=blocked */}
                <div style={{ background: cardBg, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderBottom: `1px solid ${stripBorder}` }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: oo.logo_url ? "#fff" : "#1e40af", border: oo.logo_url ? "1px solid #e2e8f0" : "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0, overflow: "hidden" }}>
                    {oo.logo_url ? <img src={oo.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : oo.company_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontWeight: 900, color: "#0f172a", fontSize: "1.05rem" }}>{oo.company_name}</h3>
                      <span style={{ background: eligible?"#dcfce7":"#fee2e2", color: eligible?"#15803d":"#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800, border: `1px solid ${eligible?"#86efac":"#fca5a5"}` }}>
                        {eligible ? "🟢 Dispatch Eligible" : "🔴 Dispatch Blocked"}
                      </span>
                      {holdJobs > 0 && <span style={{ background: "#fff1f2", color: "#dc2626", padding: "3px 8px", borderRadius: 12, fontSize: "0.7rem", fontWeight: 700 }}>{holdJobs} settlement hold{holdJobs>1?"s":""}</span>}
                    </div>
                    {!eligible && <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 3 }}>{blocks.join(" · ")}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Health</div>
                      <ScoreBadge score={health} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Performance</div>
                      <ScoreBadge score={perf} />
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 0, padding: "12px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  {[
                    { label: "Settlement Ready", value: `$${settlementReady.toLocaleString()}`, color: settlementReady>0?"#1e40af":undefined },
                    { label: "Revenue MTD",   value: `$${revMTD.toLocaleString()}`,   color: "#15803d" },
                    { label: "Margin MTD",    value: `$${marMTD.toLocaleString()}`,   color: "#7c3aed" },
                    { label: "Trucks",        value: String(oo.trucks.length) },
                    { label: "Drivers",       value: String(oo.drivers.length) },
                    { label: "Active Projects",value: String(projects.length) },
                    { label: "Open Loads",    value: String(pendingJobs) },
                    { label: "Verified Tix",  value: String(tick.verified), color: "#15803d" },
                    { label: "Missing Tix",   value: String(tick.missing), color: tick.missing>0?"#dc2626":undefined },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: "8px 12px" }}>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontWeight: 800, color: color || "#0f172a", fontSize: "1rem" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Bottom row: projects + insurance + actions */}
                <div style={{ padding: "10px 20px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {projects.slice(0,3).map(p => (
                    <span key={p} style={{ background: "#eff6ff", color: "#1e40af", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>{p}</span>
                  ))}
                  {projects.length > 3 && <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>+{projects.length-3} more</span>}

                  {/* Insurance quick-upload badges */}
                  {[
                    { key: "auto",    docType: "Auto Liability Insurance",    short: "Auto Liability" },
                    { key: "general", docType: "General Liability Insurance", short: "General Liability" },
                    { key: "cargo",   docType: "Cargo Insurance",             short: "Cargo" },
                    { key: "coi",     docType: "Insurance Certificate (COI)", short: "COI" },
                  ].map(({ key, docType, short }) => {
                    const doc = oo.documents.find(d => d.type === docType);
                    const expDays = doc?.expires_on ? daysUntil(doc.expires_on) : null;
                    return doc ? (
                      <span key={key} style={{ background: expBg(expDays), color: expColor(expDays), padding: "3px 10px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700 }}>
                        🛡️ {short}: {expLabel(expDays, doc.expires_on)}
                      </span>
                    ) : (
                      <label key={key} onClick={e => e.stopPropagation()} style={{ background: "#fff1f2", color: "#dc2626", padding: "3px 10px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", border: "1px solid #fca5a5" }}>
                        + Upload {short}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={async e => {
                          e.stopPropagation();
                          const f = e.target.files?.[0];
                          if (!f) return;
                          flash(`Uploading ${short} for ${oo.company_name}…`);
                          try {
                            const fd = new FormData();
                            fd.append("file", f);
                            fd.append("module", "compliance");
                            fd.append("oo_id", oo.id);
                            const upRes = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
                            const upData = await upRes.json();
                            const fileUrl = upData.url || null;
                            const originalUploadId = upData.upload_id || null;
                            const exp = prompt(`${docType} expiration date (YYYY-MM-DD):`) || undefined;
                            await apiPost(`/api/ronyx/owner-operators/${oo.id}/documents`, {
                              doc_type: docType, file_name: f.name, expires_on: exp || null,
                              file_url: fileUrl, original_upload_id: originalUploadId,
                            });
                            loadCompanies();
                            flash(`✅ ${short} uploaded for ${oo.company_name}.`);
                          } catch { flash(`Upload failed — check storage config`); }
                          e.target.value = "";
                        }} />
                      </label>
                    );
                  })}

                  {actions.length > 0 && (
                    <span style={{ background: "#fff1f2", color: "#dc2626", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>
                      ⚠ {actions.length} action{actions.length>1?"s":""} required
                    </span>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setVerifyDrawerOO({ id: oo.id, name: oo.company_name }); }}
                      title="Open Intel Verify to verify a document for this owner operator"
                      style={{ background: "#faf5ff", border: "1px solid #ddd6fe", color: "#7c3aed", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      🔍 Verify Doc
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOoEditModal({ id: oo.id, form: { company_name: oo.company_name, contact_name: oo.contact_name, contact_phone: oo.contact_phone, contact_email: oo.contact_email, business_address: oo.business_address, mc_number: oo.mc_number, dot_number: oo.dot_number, ein: oo.ein, website: oo.website || "", notes: oo.notes || "", insurance_agent_name: oo.insurance_agent_name || "", insurance_agent_phone: oo.insurance_agent_phone || "", insurance_agent_email: oo.insurance_agent_email || "" }, saving: false });
                      }}
                      title="Edit profile"
                      style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      ✏ Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteOO(oo); }}
                      title="Delete owner operator"
                      style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {ooLoading && companies.length === 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
              Loading owner operators…
            </div>
          )}
          {!ooLoading && ooError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "24px 28px", color: "#dc2626" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>⚠️ Could not load owner operators</div>
              <div style={{ fontSize: "0.82rem", marginBottom: 12, fontFamily: "monospace", color: "#991b1b" }}>{ooError}</div>
              <button onClick={loadCompanies} style={{ padding: "7px 18px", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                Retry
              </button>
            </div>
          )}
          {!ooLoading && !ooError && companies.length === 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
              No owner operators yet. Click <strong>+ Add Owner Operator</strong>.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────
  if (!selected) return null;
  const health  = ooHealthScore(selected);
  const perf    = performanceScore(selected);
  const [eligible, blocks] = ooDispatchEligible(selected);
  const settlementReady    = ooSettlementReady(selected);
  const revMTD  = ooRevenueMTD(selected);
  const marMTD  = ooMarginMTD(selected);
  const tick    = ooTicketHealth(selected);
  const actions = ooActionRequired(selected);

  const coiDocs  = selected?.coi_documents || [];
  const coiIssues = coiDocs.filter(d => d.status === "expired" || d.status === "missing").length;

  const DETAIL_TABS = [
    { key:"overview",   label:"Overview"    },
    { key:"drivers",    label:"Drivers"     },
    { key:"fleet",      label:"Fleet"       },
    { key:"coi",        label:`Insurance${coiIssues > 0 ? ` ⚠ ${coiIssues}` : ""}` },
    { key:"documents",  label:"Documents"   },
    { key:"jobs",       label:"Jobs & Tickets" },
    { key:"settlement", label:"Settlement"  },
    { key:"compliance", label:"Compliance History" },
    { key:"subs",       label:`Subs${selected?.subcontractors?.length ? ` (${selected.subcontractors.length})` : ""}` },
  ] as const;

  if (moduleLoading) return null;
  if (moduleBlocked) return <ModuleUpgradeCard moduleSlug="owner-operators" />;

  return (
    <div style={{ maxWidth: 1100 }}>
      {toast && <Toast msg={toast} />}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(pendingDocRef.current, f); e.target.value = ""; }} />

      {/* Breadcrumb */}
      <button onClick={() => setView("list")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:"0.83rem", padding:0, marginBottom:14 }}>← Owner Operators</button>

      {/* Company header — redesigned */}
      <div style={{ borderRadius: 14, marginBottom: 12, overflow: "hidden", border: "1px solid #1e293b" }}>
        {/* Dark top band */}
        <div style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e2d45 100%)", padding: "20px 24px", display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          {/* Logo */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: 16, background: selected.logo_url ? "#fff" : "#1e40af", border: "3px solid rgba(255,255,255,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "2.1rem", overflow: "hidden" }}>
              {selected.logo_url
                ? <img src={selected.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : selected.company_name.charAt(0)}
            </div>
            <label title="Upload logo" style={{ position: "absolute", bottom: -5, right: -5, width: 24, height: 24, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", cursor: "pointer", border: "2px solid #0f172a" }}>
              📷
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData(); fd.append("file", f);
                const res = await fetch(`/api/ronyx/owner-operators/${selected.id}/logo`, { method: "POST", body: fd });
                const { logo_url, error } = await res.json();
                if (error) { flash(`Logo upload failed: ${error}`); return; }
                updateLocalState({ ...selected, logo_url });
                flash("Logo updated.");
                e.target.value = "";
              }} />
            </label>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 5 }}>
              <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{selected.company_name}</h1>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: 1, minWidth: 220 }}>
                <span style={{ fontSize: "0.9rem" }}>📍</span>
                <input
                  key={selected.id + "addr"}
                  defaultValue={selected.business_address || ""}
                  placeholder="Add company address…"
                  title="Click to edit address — saves automatically"
                  onBlur={e => { const v = e.target.value.trim(); if (v !== (selected.business_address || "")) { updateSelected({ ...selected, business_address: v }); flash("Address saved."); } }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ flex: 1, minWidth: 180, border: "none", borderBottom: "1px dashed rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.06)", color: "#e2e8f0", fontSize: "0.8rem", fontWeight: 600, outline: "none", padding: "4px 10px", borderRadius: 6 }}
                />
              </span>
              <button
                onClick={() => setOOActive(selected, !ooIsActive(selected))}
                title={ooIsActive(selected) ? "Mark this owner-operator as no longer working for Ronyx" : "Reactivate this owner-operator"}
                style={{ padding: "5px 14px", borderRadius: 8, border: "1px solid " + (ooIsActive(selected) ? "rgba(239,68,68,0.45)" : "rgba(34,197,94,0.45)"), background: ooIsActive(selected) ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", color: ooIsActive(selected) ? "#fca5a5" : "#86efac", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                {ooIsActive(selected) ? "● Mark Not Active" : "○ Reactivate"}
              </button>
              {!ooIsActive(selected) && (
                <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(239,68,68,0.18)", color: "#fca5a5", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.04em" }}>NOT ACTIVE</span>
              )}
              {selected.logo_url && (
                <button onClick={async () => { await fetch(`/api/ronyx/owner-operators/${selected.id}/logo`, { method: "DELETE" }); updateLocalState({ ...selected, logo_url: undefined }); flash("Logo removed."); }} style={{ background: "none", border: "none", color: "#475569", fontSize: "0.68rem", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Remove logo</button>
              )}
            </div>
            {selected.contact_name && (
              <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: 3 }}>Contact: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{selected.contact_name}</span></div>
            )}
            <div style={{ color: "#cbd5e1", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {selected.start_date ? (
                <span>Since <strong style={{ color: "#f1f5f9" }}>{new Date(selected.start_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong></span>
              ) : (
                <span style={{ color: "#ef4444" }}>⚠ Start date not set</span>
              )}
              <input
                key={selected.id + "start"}
                type="date"
                defaultValue={selected.start_date || ""}
                title="Set or change start date"
                onBlur={e => {
                  const v = e.target.value.trim();
                  if (v !== (selected.start_date || "")) { updateSelected({ ...selected, start_date: v || undefined }); flash("Start date saved."); }
                }}
                style={{ border: "none", borderBottom: "1px dashed #64748b", background: "transparent", color: "#cbd5e1", fontSize: "0.72rem", outline: "none", cursor: "pointer", padding: "1px 2px", width: 110 }}
              />
            </div>
          </div>

          {/* Score cards */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexShrink: 0, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>OO HEALTH</div>
              <ScoreBadge score={health} size="lg" />
            </div>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 80 }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>PERFORMANCE</div>
              <ScoreBadge score={perf} size="lg" />
            </div>
            <div style={{ background: eligible ? "rgba(21,128,61,0.18)" : "rgba(220,38,38,0.18)", border: `1px solid ${eligible ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`, borderRadius: 12, padding: "10px 18px", textAlign: "center", minWidth: 100 }}>
              <div style={{ fontSize: "0.58rem", fontWeight: 800, color: eligible ? "#4ade80" : "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>DISPATCH</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 900, color: eligible ? "#4ade80" : "#f87171", letterSpacing: "0.01em" }}>{eligible ? "✓ ELIGIBLE" : "✗ BLOCKED"}</div>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div style={{ background: "#1e293b", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 24px", display: "flex", gap: 0, flexWrap: "wrap", alignItems: "center" }}>
          {(["mc_number","dot_number","ein"] as const).map((field, i) => {
            const labels: Record<string,string> = { mc_number:"MC#", dot_number:"DOT#", ein:"EIN" };
            const val = selected[field]?.trim();
            return (
              <span key={field} style={{ display:"inline-flex", alignItems:"center", gap:4, paddingRight: 16, marginRight: 16, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
                <span style={{ color:"#cbd5e1", fontSize:"0.74rem", fontWeight:800, textTransform:"uppercase" }}>{labels[field]}</span>
                <input
                  key={selected.id+field}
                  defaultValue={val||""}
                  placeholder="—"
                  onBlur={e => {
                    const v = e.target.value.trim();
                    if (v !== (selected[field]||"")) { updateSelected({ ...selected, [field]: v || "" }); flash(`${labels[field]} saved.`); }
                  }}
                  onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  style={{ border:"none", borderBottom:`1px dashed ${val?"#334155":"#7f1d1d"}`, background:"transparent", fontSize:"0.82rem", color:val?"#e2e8f0":"#ef4444", fontWeight:600, width:field==="ein"?95:80, outline:"none", padding:"1px 2px" }}
                />
              </span>
            );
          })}
          <span style={{ color:"#94a3b8", fontSize:"0.82rem", marginRight:16, display:"inline-flex", alignItems:"center", gap:4 }}>📞 <input key={selected.id+"ph"} defaultValue={selected.contact_phone||""} placeholder="add phone" title="Click to edit — saves automatically" onBlur={e=>{const v=e.target.value.trim(); if(v!==(selected.contact_phone||"")){updateSelected({...selected,contact_phone:v}); flash("Phone saved.");}}} onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();}} style={{ border:"none", borderBottom:"1px dashed #64748b", background:"transparent", color:"#cbd5e1", fontSize:"0.82rem", outline:"none", padding:"1px 2px", width:130 }} /></span>
          <span style={{ color:"#94a3b8", fontSize:"0.82rem", marginRight:16, display:"inline-flex", alignItems:"center", gap:4 }}>✉ <input key={selected.id+"em"} defaultValue={selected.contact_email||""} placeholder="add email" title="Click to edit — saves automatically" onBlur={e=>{const v=e.target.value.trim(); if(v!==(selected.contact_email||"")){updateSelected({...selected,contact_email:v}); flash("Email saved.");}}} onKeyDown={e=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();}} style={{ border:"none", borderBottom:"1px dashed #64748b", background:"transparent", color:"#cbd5e1", fontSize:"0.82rem", outline:"none", padding:"1px 2px", width:180 }} /></span>
          {(() => {
            const addr = [selected.company_address_line1, [selected.company_city, selected.company_state].filter(Boolean).join(", "), selected.company_zip].filter(Boolean).join(" · ") || selected.business_address;
            if (!addr) return null;
            return (
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, color:"#94a3b8", fontSize:"0.82rem", marginRight:16 }}>
                📍 <span style={{ color:"#cbd5e1" }}>{addr}</span>
                <button onClick={() => { navigator.clipboard.writeText(addr); flash("Address copied."); }} title="Copy" style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.7rem", color:"#475569", padding:"0 2px" }}>⎘</button>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer" title="Google Maps" style={{ color:"#1d4ed8", fontSize:"0.7rem", textDecoration:"none" }}>🗺</a>
              </span>
            );
          })()}
          {selected.website?.trim() && (
            <span style={{ color:"#94a3b8", fontSize:"0.82rem" }}>🌐 <a href={selected.website.startsWith("http")?selected.website:`https://${selected.website}`} target="_blank" rel="noreferrer" style={{ color:"#3b82f6" }}>{selected.website}</a></span>
          )}
        </div>

        {/* Blocked reason banner */}
        {!eligible && (
          <div style={{ background: "#450a0a", borderTop: "1px solid #7f1d1d", padding: "8px 24px", fontSize: "0.78rem", color: "#fca5a5" }}>
            <strong style={{ color: "#f87171" }}>Dispatch Blocked: </strong>{blocks.join(" · ")}
          </div>
        )}
      </div>

      {/* Quick KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
        <KPI label="Settlement Ready" value={`$${settlementReady.toLocaleString()}`} color="#1e40af" bg="#eff6ff" />
        <KPI label="Revenue MTD"      value={`$${revMTD.toLocaleString()}`}          color="#15803d" bg="#f0fdf4" />
        <KPI label="Margin MTD"       value={`$${marMTD.toLocaleString()}`}          color="#7c3aed" bg="#f5f3ff" />
        <KPI label="Verified Tickets" value={tick.verified}  color="#15803d" bg="#f0fdf4" />
        <KPI label="Needs Review"     value={tick.needsReview} color={tick.needsReview>0?"#d97706":"#64748b"} bg={tick.needsReview>0?"#fffbeb":"#f8fafc"} />
        <KPI label="Missing Tickets"  value={tick.missing}   color={tick.missing>0?"#dc2626":"#64748b"} bg={tick.missing>0?"#fff1f2":"#f8fafc"} />
        <KPI label="Drivers"          value={selected.drivers.length} color="#0891b2" bg="#f0f9ff" />
        <KPI label="Trucks"           value={selected.trucks.length}  color="#0891b2" bg="#f0f9ff" />
      </div>

      {/* Quick Upload Actions */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>Quick Upload</span>
        {[
          { label: "🛡️ Auto Liability",    type: "Auto Liability Insurance",    altTypes: ["Auto Liability","Automobile Liability Insurance"],         hasExpiry: true  },
          { label: "🛡️ General Liability",  type: "General Liability Insurance", altTypes: ["General Liability","GL Insurance"],                        hasExpiry: true  },
          { label: "📦 Cargo Insurance",    type: "Cargo Insurance",             altTypes: ["Cargo","Cargo Ins"],                                       hasExpiry: true  },
          { label: "📄 COI",               type: "Insurance Certificate (COI)", altTypes: ["Insurance Certificate","COI","Certificate of Insurance"],   hasExpiry: true  },
          { label: "📝 Contract",          type: "Contract",                    altTypes: ["Subhauler Agreement","Carrier Agreement","Service Contract"],hasExpiry: true  },
          { label: "🧾 W-9",               type: "W-9 / Tax Form",              altTypes: ["W-9","W9","Tax Form"],                                     hasExpiry: false },
          { label: "💳 Voided Check",      type: "Voided Check",                altTypes: ["Voided check","Void Check","Bank Void Check","Direct Deposit"],hasExpiry: false },
          { label: "🏛️ MC Auth Letter",     type: "MC Authority Letter",         altTypes: ["MC Auth Letter","MC Letter","Authority Letter"],            hasExpiry: false },
        ].map(({ label, type, altTypes }) => {
          const onFile = selected.documents.find(d => d.type === type || (altTypes || []).includes(d.type));
          return (
            <div key={type} style={{ display: "inline-flex", alignItems: "center", gap: 0, borderRadius: 8, border: `1px solid ${onFile ? "#86efac" : "#e2e8f0"}`, background: onFile ? "#f0fdf4" : "#f8fafc", overflow: "hidden" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: "0.75rem", fontWeight: 700, color: onFile ? "#15803d" : "#475569", cursor: "pointer", whiteSpace: "nowrap" }}>
                {onFile ? "✓ " : ""}{label}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleDocUpload(type, f);
                  e.target.value = "";
                }} />
              </label>
              {onFile && (<>
                <button
                  onClick={() => onFile.file_url ? openDoc(onFile.file_url, false, onFile.file_name) : flash("No file stored — click the document name to re-upload.")}
                  title={onFile.file_url ? "View document" : "No file stored — click to re-upload"}
                  style={{ padding: "5px 7px", background: onFile.file_url ? "#dbeafe" : "#f1f5f9", color: onFile.file_url ? "#1e40af" : "#94a3b8", fontSize: "0.7rem", fontWeight: 700, border: "none", borderLeft: "1px solid #e2e8f0", cursor: "pointer" }}>
                  👁
                </button>
                <button
                  title={onFile.file_url ? "Email document" : "No file stored"}
                  disabled={!onFile.file_url}
                  onClick={() => onFile.file_url && setDocEmailModal({
                    docType:  type,
                    fileUrl:  onFile.file_url,
                    fileName: onFile.file_name || `${type}.pdf`,
                    to:       selected.contact_email || "",
                    subject:  `${type} — ${selected.company_name}`,
                    message:  `Please find the attached ${type} for ${selected.company_name}.\n\nIf you have any questions, contact us at dispatch@ronyxlogistics.com.\n\n— Ronyx Logistics / MoveAround TMS`,
                    sending:  false,
                  })}
                  style={{ padding: "5px 7px", background: onFile.file_url ? "#fef3c7" : "#f1f5f9", color: onFile.file_url ? "#92400e" : "#94a3b8", fontSize: "0.7rem", fontWeight: 700, border: "none", borderLeft: "1px solid #e2e8f0", cursor: onFile.file_url ? "pointer" : "default" }}>
                  ✉
                </button>
                <button
                  title={onFile.file_url ? "Print document" : "No file stored"}
                  disabled={!onFile.file_url}
                  onClick={() => onFile.file_url && openDoc(onFile.file_url, true, onFile.file_name)}
                  style={{ padding: "5px 7px", background: onFile.file_url ? "#f0fdf4" : "#f1f5f9", color: onFile.file_url ? "#15803d" : "#94a3b8", fontSize: "0.7rem", fontWeight: 700, border: "none", borderLeft: "1px solid #e2e8f0", cursor: onFile.file_url ? "pointer" : "default" }}>
                  🖨
                </button>
              </>)}
            </div>
          );
        })}
        <button onClick={() => setActiveTab("documents")} style={{ ...ghostBtn, fontSize: "0.72rem", marginLeft: "auto" }}>All Documents →</button>
      </div>

      {/* Action Required panel */}
      {actions.length > 0 && (
        <div style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 12, padding: "12px 18px", marginBottom: 14 }}>
          <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 8, fontSize: "0.82rem" }}>⚠ ACTION REQUIRED ({actions.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {actions.map((a, i) => (
              <span key={i} style={{ background: "#fff", border: "1px solid #fda4af", borderRadius: 8, padding: "5px 12px", fontSize: "0.75rem", fontWeight: 600, color: "#dc2626" }}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20, overflowX: "auto" }}>
        {DETAIL_TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: "9px 16px", border: "none", background: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: activeTab===t.key?700:500, color: activeTab===t.key?"#1e40af":"#64748b", borderBottom: activeTab===t.key?"2px solid #1e40af":"2px solid transparent", marginBottom: -2, whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === "overview" && (() => {
        // ── insurance doc lookups ──
        const autoIns   = selected.documents.find(d => d.type==="Auto Liability Insurance" || d.type==="Insurance Certificate" || d.type==="Insurance Certificate (COI)")
          || (selected.coi_documents || []).find(d => d.document_type.includes("auto_liability") && d.status !== "missing") as any;
        const glIns     = selected.documents.find(d => d.type==="General Liability Insurance")
          || (selected.coi_documents || []).find(d => d.document_type.includes("general_liability") && d.status !== "missing") as any;
        const cargoIns  = selected.documents.find(d => d.type==="Cargo Insurance" || d.type==="Cargo / Motor Truck Cargo COI")
          || (selected.coi_documents || []).find(d => d.document_type.includes("cargo") && d.status !== "missing") as any;
        const wcIns     = selected.documents.find(d => d.type==="Workers Comp Insurance");
        const contract  = selected.documents.find(d => d.type==="Contract");
        const w9        = selected.documents.find(d => d.type==="W-9 / Tax Form");

        // ── compliance score breakdown ──
        const insTotal = 3;
        const insOK    = [autoIns, glIns, cargoIns].filter(d => d && (!d.expires_on || (daysUntil(d.expires_on)||0) > 0)).length;
        const insScore = Math.round((insOK / insTotal) * 100);

        const driversTotal = selected.drivers.length;
        const driversOK    = selected.drivers.filter(d => {
          const c = daysUntil(d.cdl_expiration); const m = daysUntil(d.med_card_expiration);
          return (c===null||c>0) && (m===null||m>0);
        }).length;
        const driversScore = driversTotal > 0 ? Math.round((driversOK/driversTotal)*100) : 100;

        const trucksTotal  = selected.trucks.length;
        const trucksOK     = selected.trucks.filter(t => !t.inspection_result || t.inspection_result==="Pass").length;
        const fleetScore   = trucksTotal > 0 ? Math.round((trucksOK/trucksTotal)*100) : 100;

        const contractsOK  = (contract ? 1 : 0) + (w9 ? 1 : 0);
        const contractsScore = Math.round((contractsOK / 2) * 100);

        // ── missing items ──
        const missingItems: Array<{label: string; docType?: string; hasExpiry?: boolean}> = [];
        if (!autoIns)  missingItems.push({ label:"Auto Liability Insurance", docType:"Auto Liability Insurance", hasExpiry:true });
        if (!glIns)    missingItems.push({ label:"General Liability Insurance", docType:"General Liability Insurance", hasExpiry:true });
        if (!cargoIns) missingItems.push({ label:"Cargo Insurance", docType:"Cargo Insurance", hasExpiry:true });
        if (!contract) missingItems.push({ label:"Contract", docType:"Contract", hasExpiry:true });
        if (!w9)       missingItems.push({ label:"W-9 / Tax Form", docType:"W-9 / Tax Form", hasExpiry:false });
        selected.drivers.forEach(d => {
          const c = daysUntil(d.cdl_expiration); const m = daysUntil(d.med_card_expiration);
          if (c!==null && c<=0) missingItems.push({ label:`CDL Expired — ${d.name}` });
          if (m!==null && m<=0) missingItems.push({ label:`Medical Card Expired — ${d.name}` });
          const cdlDoc = selected.documents.find(doc=>doc.type===`[${d.name}] CDL License`);
          if (!cdlDoc) missingItems.push({ label:`CDL Upload Missing — ${d.name}` });
        });

        // ── upcoming expirations for reminder center ──
        const upcoming: Array<{label: string; days: number; docType: string}> = [];
        [
          { label:"Auto Liability Insurance", doc: autoIns },
          { label:"General Liability Insurance", doc: glIns },
          { label:"Cargo Insurance", doc: cargoIns },
          { label:"Contract", doc: contract },
        ].forEach(({ label, doc }) => {
          const d = doc?.expires_on ? daysUntil(doc.expires_on) : null;
          if (d !== null && d >= 0 && d <= 90) upcoming.push({ label, days: d, docType: label });
        });
        selected.drivers.forEach(d => {
          const c = daysUntil(d.cdl_expiration); const m = daysUntil(d.med_card_expiration);
          if (c!==null && c>=0 && c<=90) upcoming.push({ label:`CDL — ${d.name}`, days:c, docType:`CDL_${d.id}` });
          if (m!==null && m>=0 && m<=90) upcoming.push({ label:`Med Card — ${d.name}`, days:m, docType:`MED_${d.id}` });
        });
        upcoming.sort((a,b)=>a.days-b.days);

        // ── settlement state ──
        const holdCount  = selected.jobs.filter(j=>j.settlement_status==="Hold").length;
        const holdAmount = selected.jobs.filter(j=>j.settlement_status==="Hold").reduce((s,j)=>s+j.oo_rate,0);
        const holdReasons = selected.jobs.filter(j=>j.settlement_status==="Hold" && j.ticket_status==="Missing").map(j=>`Missing Ticket ${j.project_number}`).slice(0,2);

        // ── changes since yesterday ──
        const yesterday  = new Date(Date.now()-86400000).toISOString().slice(0,10);
        const todayChanges = (selected.changes_log||[]).filter(c=>c.date>=yesterday);

        // ── recommended office actions ──
        const recommendedActions: string[] = [];
        cargoIns && daysUntil(cargoIns.expires_on)!==null && (daysUntil(cargoIns.expires_on)||0)<=30 && recommendedActions.push(`Request Cargo Insurance renewal from ${selected.insurance_agent_name||"insurance agent"} — expires ${expLabel(daysUntil(cargoIns.expires_on),cargoIns.expires_on)}`);
        autoIns && daysUntil(autoIns.expires_on)!==null && (daysUntil(autoIns.expires_on)||0)<=30 && recommendedActions.push(`Request Auto Liability renewal — expires ${expLabel(daysUntil(autoIns.expires_on),autoIns.expires_on)}`);
        !cargoIns && recommendedActions.push("Upload Cargo Insurance — required for dispatch");
        !autoIns  && recommendedActions.push("Upload Auto Liability Insurance — required for dispatch");
        !glIns    && recommendedActions.push("Upload General Liability Insurance");
        !contract && recommendedActions.push("Upload signed Contract");
        !w9       && recommendedActions.push("Upload W-9 / Tax Form");
        selected.drivers.forEach(d => {
          const c=daysUntil(d.cdl_expiration); const m=daysUntil(d.med_card_expiration);
          if (c!==null&&c<=14) recommendedActions.push(`${d.name} CDL ${c<0?"EXPIRED":c+"d"} — contact driver immediately`);
          if (m!==null&&m<=14) recommendedActions.push(`${d.name} Medical Card ${m<0?"EXPIRED":m+"d"} — driver cannot legally operate`);
        });
        if (holdCount>0) recommendedActions.push(`${holdCount} settlement${holdCount>1?"s":""} on hold totaling $${holdAmount.toLocaleString()} — review missing tickets`);
        if (settlementReady>0) recommendedActions.push(`$${settlementReady.toLocaleString()} ready to settle — release payment to ${selected.company_name}`);

        function sendReminder(docType: string, label: string) {
          if (!selected) return;
          const sel = selected;
          const sub = encodeURIComponent(`Document Renewal Required — ${sel.company_name} — ${label}`);
          const body = encodeURIComponent(`Dear ${sel.contact_name||sel.company_name},\n\nThis is a reminder that the following document requires renewal:\n\n${label}\n\nPlease provide an updated document at your earliest convenience.\n\nMC#: ${sel.mc_number||"—"}\n\nThank you,\nRonyx Logistics Operations`);
          window.location.href = `mailto:${sel.contact_email||sel.insurance_agent_email||""}?subject=${sub}&body=${body}`;
          const log: ReminderEntry = { doc_type:docType, sent_at:new Date().toISOString(), method:"email" };
          const change: ChangeEntry = { date:new Date().toISOString().slice(0,10), type:"Reminder Sent", detail:`${label} reminder emailed` };
          updateSelected({ ...sel, reminder_log:[log,...(sel.reminder_log||[])], changes_log:[change,...(sel.changes_log||[])] });
          flash(`Reminder sent for ${label}.`);
        }

        return (
          <div>
            {/* ── #1 Dispatch + Settlement Eligibility Row ── */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              {/* Dispatch Eligibility Engine */}
              <div style={{ background:eligible?"#f0fdf4":"#0f172a", border:`2px solid ${eligible?"#86efac":"#dc2626"}`, borderRadius:14, padding:"20px 22px" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, color:eligible?"#15803d":"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Dispatch Eligibility</div>
                <div style={{ fontSize:"2rem", fontWeight:900, color:eligible?"#15803d":"#ef4444", marginBottom:6 }}>
                  {eligible ? "🟢 ELIGIBLE" : "🔴 BLOCKED"}
                </div>
                {!eligible && blocks.length > 0 && (
                  <div>
                    <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#94a3b8", marginBottom:6 }}>REASON{blocks.length>1?"S":""}:</div>
                    {blocks.map((b,i)=>(
                      <div key={i} style={{ color:"#fca5a5", fontSize:"0.82rem", fontWeight:600, marginBottom:3 }}>• {b}</div>
                    ))}
                  </div>
                )}
                {eligible && <div style={{ fontSize:"0.78rem", color:"#15803d", fontWeight:600 }}>All compliance checks passed. Ready to dispatch.</div>}
              </div>

              {/* Settlement Eligibility */}
              <div style={{ background:holdCount>0?"#fffbeb":"#f0fdf4", border:`2px solid ${holdCount>0?"#f59e0b":"#86efac"}`, borderRadius:14, padding:"20px 22px" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, color:holdCount>0?"#92400e":"#15803d", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Settlement Status</div>
                <div style={{ fontSize:"2rem", fontWeight:900, color:holdCount>0?"#d97706":"#15803d", marginBottom:6 }}>
                  {holdCount>0 ? "🟡 ON HOLD" : settlementReady>0 ? "🟢 READY" : "🟢 CLEAR"}
                </div>
                {holdCount>0 ? (
                  <div>
                    <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#92400e", marginBottom:4 }}>REASON:</div>
                    {holdReasons.length>0
                      ? holdReasons.map((r,i)=><div key={i} style={{ color:"#d97706", fontSize:"0.82rem", fontWeight:600 }}>• {r}</div>)
                      : <div style={{ color:"#d97706", fontSize:"0.82rem" }}>• {holdCount} load{holdCount>1?"s":""} pending review</div>}
                    <button onClick={()=>setActiveTab("settlement")} style={{ ...primaryBtn, fontSize:"0.72rem", marginTop:10, background:"#d97706" }}>Review Holds →</button>
                  </div>
                ) : settlementReady>0 ? (
                  <div>
                    <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#15803d", marginBottom:4 }}>AMOUNT READY:</div>
                    <div style={{ fontSize:"1.3rem", fontWeight:900, color:"#1e40af" }}>${settlementReady.toLocaleString()}</div>
                    <button onClick={()=>setActiveTab("settlement")} style={{ ...primaryBtn, fontSize:"0.72rem", marginTop:10, background:"#15803d" }}>Release Payment →</button>
                  </div>
                ) : (
                  <div style={{ fontSize:"0.78rem", color:"#15803d", fontWeight:600 }}>No pending settlements.</div>
                )}
              </div>
            </div>

            {/* ── #10 Missing Items Dashboard ── */}
            {missingItems.length > 0 && (
              <div style={{ background:"#fff", border:"1px solid #fda4af", borderRadius:14, padding:"16px 20px", marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontWeight:800, color:"#dc2626", fontSize:"0.9rem" }}>🔴 Missing Items ({missingItems.length})</div>
                  <button onClick={()=>setActiveTab("documents")} style={{ ...ghostBtn, fontSize:"0.72rem" }}>Go to Documents →</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:8 }}>
                  {missingItems.slice(0,8).map((item,i) => (
                    <div key={i} style={{ background:"#fff1f2", border:"1px solid #fca5a5", borderRadius:10, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:"0.78rem", fontWeight:600, color:"#dc2626" }}>{item.label}</span>
                      {item.docType && (
                        <label style={{ background:"#dc2626", color:"#fff", padding:"3px 8px", borderRadius:6, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", flexShrink:0, marginLeft:8 }}>
                          Upload
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleDocUpload(item.docType!,f); e.target.value=""; }} />
                        </label>
                      )}
                    </div>
                  ))}
                  {missingItems.length > 8 && <div style={{ fontSize:"0.75rem", color:"#94a3b8", padding:"8px 12px" }}>+{missingItems.length-8} more — see Documents tab</div>}
                </div>
              </div>
            )}

            {/* ── Main 2-column grid ── */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* ── #12 Revenue & Settlement Snapshot ── */}
                <Card title="Revenue & Settlement Snapshot">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      { label:"Revenue MTD",       value:`$${revMTD.toLocaleString()}`,          color:"#15803d" },
                      { label:"Pending Settlement", value:settlementReady>0?`$${settlementReady.toLocaleString()}`:"—", color:settlementReady>0?"#1e40af":"#94a3b8" },
                      { label:"Loads This Month",   value:String(selected.jobs.filter(j=>{ const m=new Date().getMonth(); return new Date(j.load_date).getMonth()===m; }).length) },
                      { label:"Open Tickets",       value:String(tick.needsReview+tick.missing),  color:tick.needsReview+tick.missing>0?"#d97706":"#15803d" },
                      { label:"Margin MTD",         value:`$${marMTD.toLocaleString()}`,          color:"#7c3aed" },
                      { label:"Total Revenue",      value:`$${selected.jobs.reduce((s,j)=>s+j.gross_revenue,0).toLocaleString()}`, color:"#15803d" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign:"center", padding:"10px", background:"#f8fafc", borderRadius:10 }}>
                        <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
                        <div style={{ fontWeight:900, fontSize:"1.05rem", color: color||"#0f172a" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* ── #4 Insurance Expiration Timeline ── */}
                <Card title="Insurance Expiration Timeline">
                  {[
                    { label:"Auto Liability",    doc: autoIns },
                    { label:"General Liability", doc: glIns },
                    { label:"Cargo",             doc: cargoIns },
                    { label:"Workers Comp",      doc: wcIns },
                  ].map(({ label, doc }) => {
                    const d = doc?.expires_on ? daysUntil(doc.expires_on) : null;
                    const pct = d===null ? 0 : Math.max(0, Math.min(100, Math.round((d/365)*100)));
                    return (
                      <div key={label} style={{ marginBottom:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                          <span style={{ fontWeight:600, color:"#0f172a", fontSize:"0.85rem" }}>{label}</span>
                          {doc ? (
                            <span style={{ background:expBg(d), color:expColor(d), padding:"3px 10px", borderRadius:8, fontWeight:800, fontSize:"0.75rem" }}>
                              {d===null?"On File":d<0?"EXPIRED":d<=14?d+"d ⚠":d+"d"}
                            </span>
                          ) : (
                            <label style={{ background:"#dc2626", color:"#fff", padding:"3px 10px", borderRadius:8, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
                              Upload
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ const insLabel=label+" Insurance"; const exp=prompt(`${insLabel} expiration (YYYY-MM-DD):`)||undefined; const doc2:OODoc={type:insLabel,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; updateSelected({...selected,documents:[doc2,...selected.documents.filter(x=>x.type!==insLabel)]}); flash(`${insLabel} uploaded.`); } e.target.value=""; }} />
                            </label>
                          )}
                        </div>
                        {doc?.expires_on && (
                          <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:expColor(d), borderRadius:3, transition:"width 0.3s" }} />
                          </div>
                        )}
                        {!doc && <div style={{ height:6, background:"#fff1f2", borderRadius:3, border:"1px solid #fca5a5" }} />}
                      </div>
                    );
                  })}
                </Card>

                {/* ── #9 Compliance Score ── */}
                <Card title="Compliance Score">
                  {[
                    { label:"Insurance",  score:insScore,       detail:`${insOK}/${insTotal} policies valid` },
                    { label:"Drivers",    score:driversScore,   detail:driversTotal>0?`${driversOK}/${driversTotal} drivers compliant`:"No drivers added yet" },
                    { label:"Fleet",      score:trucksTotal>0?fleetScore:0, detail:trucksTotal>0?`${trucksOK}/${trucksTotal} trucks passing inspection`:"No trucks added yet" },
                    { label:"Contracts",  score:contractsScore, detail:`Contract: ${contract?"✓ On file":"✗ Missing"} · W-9: ${w9?"✓ On file":"✗ Missing"}` },
                  ].map(({ label, score, detail }) => (
                    <div key={label} style={{ marginBottom:12, paddingBottom:12, borderBottom:"1px solid #f1f5f9" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <div>
                          <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.85rem" }}>{label}</div>
                          <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>{detail}</div>
                        </div>
                        <span style={{ fontWeight:900, fontSize:"1rem", color:score>=100?"#15803d":score>=70?"#d97706":"#dc2626" }}>{score}%</span>
                      </div>
                      <div style={{ height:6, background:"#f1f5f9", borderRadius:3 }}>
                        <div style={{ height:"100%", width:`${score}%`, background:score>=100?"#15803d":score>=70?"#d97706":"#dc2626", borderRadius:3 }} />
                      </div>
                    </div>
                  ))}
                </Card>

                {/* ── #5 Driver Roster Preview ── */}
                <Card title={`Drivers (${selected.drivers.length})`}>
                  {selected.drivers.length === 0 ? (
                    <div style={{ color:"#94a3b8", textAlign:"center", padding:"10px 0" }}>
                      No drivers. <button onClick={()=>setActiveTab("drivers")} style={{ background:"none", border:"none", color:"#1e40af", cursor:"pointer", fontWeight:700 }}>+ Add</button>
                    </div>
                  ) : selected.drivers.map(d => {
                    const c=daysUntil(d.cdl_expiration); const m=daysUntil(d.med_card_expiration);
                    const warn=(c!==null&&c>=0&&c<=30)||(m!==null&&m>=0&&m<=30);
                    const compliant=(c===null||c>0)&&(m===null||m>0);
                    const cdlFrontKey = `[${d.name}] CDL Front`;
                    const cdlBackKey  = `[${d.name}] CDL Back`;
                    const cdlFront = selected.documents.find(doc => doc.type === cdlFrontKey);
                    const cdlBack  = selected.documents.find(doc => doc.type === cdlBackKey);
                    const docActionBtns = (doc: OODoc | undefined, key: string) => doc ? (
                      <div style={{ display:"inline-flex", borderRadius:6, border:"1px solid #e2e8f0", overflow:"hidden" }}>
                        <button onClick={() => doc.file_url ? openDoc(doc.file_url, false, doc.file_name) : flash("No file stored — re-upload to view.")} title={doc.file_url ? "View" : "No file"} style={{ padding:"2px 7px", background:doc.file_url?"#dbeafe":"#f1f5f9", color:doc.file_url?"#1e40af":"#94a3b8", border:"none", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>👁</button>
                        <button disabled={!doc.file_url} onClick={() => doc.file_url && setDocEmailModal({ docType:key, fileUrl:doc.file_url, fileName:doc.file_name||`${key}.pdf`, to:selected.contact_email||"", subject:`${key} — ${selected.company_name}`, message:`Please find the attached ${key} for ${selected.company_name}.\n\n— Ronyx Logistics`, sending:false })} title={doc.file_url ? "Email" : "No file"} style={{ padding:"2px 7px", background:doc.file_url?"#fef3c7":"#f1f5f9", color:doc.file_url?"#92400e":"#94a3b8", border:"none", borderLeft:"1px solid #e2e8f0", fontSize:"0.65rem", fontWeight:700, cursor:doc.file_url?"pointer":"default" }}>✉</button>
                        <button disabled={!doc.file_url} onClick={() => doc.file_url && openDoc(doc.file_url, true, doc.file_name)} title={doc.file_url ? "Print" : "No file"} style={{ padding:"2px 7px", background:doc.file_url?"#f0fdf4":"#f1f5f9", color:doc.file_url?"#15803d":"#94a3b8", border:"none", borderLeft:"1px solid #e2e8f0", fontSize:"0.65rem", fontWeight:700, cursor:doc.file_url?"pointer":"default" }}>🖨</button>
                      </div>
                    ) : (
                      <label style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 8px", borderRadius:6, border:"1px dashed #cbd5e1", background:"#f8fafc", color:"#64748b", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
                        📎 Upload
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e => { const f=e.target.files?.[0]; if(f) handleDocUpload(key,f); e.target.value=""; }} />
                      </label>
                    );
                    return (
                      <div key={d.id} style={{ padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                        {/* Status row */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:"1rem" }}>{compliant&&!warn?"✓":warn?"⚠":"✗"}</span>
                            <div>
                              <div style={{ fontWeight:700, color:"#0f172a" }}>{d.name}</div>
                              {!compliant && <div style={{ fontSize:"0.7rem", color:"#dc2626", fontWeight:600 }}>
                                {c!==null&&c<=0&&"CDL expired "}{m!==null&&m<=0&&"Med card expired"}
                              </div>}
                              {compliant&&warn && <div style={{ fontSize:"0.7rem", color:"#d97706", fontWeight:600 }}>
                                {c!==null&&c<=30&&c>0?`CDL in ${c}d `:""}{m!==null&&m<=30&&m>0?`Med card in ${m}d`:""}
                              </div>}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            <span style={{ background:expBg(c), color:expColor(c), padding:"2px 6px", borderRadius:5, fontSize:"0.65rem", fontWeight:700 }}>CDL {c===null?"—":c<0?"EXP":c+"d"}</span>
                            <span style={{ background:expBg(m), color:expColor(m), padding:"2px 6px", borderRadius:5, fontSize:"0.65rem", fontWeight:700 }}>Med {m===null?"—":m<0?"EXP":m+"d"}</span>
                          </div>
                        </div>
                        {/* CDL front / back */}
                        <div style={{ display:"flex", flexDirection:"column", gap:5, paddingLeft:28 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", width:60, flexShrink:0 }}>CDL Front</span>
                            {cdlFront && <span style={{ fontSize:"0.65rem", color:"#15803d", fontWeight:600 }}>✓ {cdlFront.file_name}</span>}
                            {docActionBtns(cdlFront, cdlFrontKey)}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", width:60, flexShrink:0 }}>CDL Back</span>
                            {cdlBack && <span style={{ fontSize:"0.65rem", color:"#15803d", fontWeight:600 }}>✓ {cdlBack.file_name}</span>}
                            {docActionBtns(cdlBack, cdlBackKey)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>setActiveTab("drivers")} style={{ ...ghostBtn, fontSize:"0.72rem", marginTop:8 }}>Manage Drivers →</button>
                </Card>

                {/* ── #6 Fleet Roster Preview ── */}
                <Card title={`Fleet (${selected.trucks.length} Trucks)`}>
                  {selected.trucks.length === 0 ? (
                    <div style={{ color:"#94a3b8", textAlign:"center", padding:"10px 0" }}>
                      No trucks. <button onClick={()=>setActiveTab("fleet")} style={{ background:"none", border:"none", color:"#1e40af", cursor:"pointer", fontWeight:700 }}>+ Add</button>
                    </div>
                  ) : selected.trucks.map(t => {
                    const inspOK = !t.inspection_result || t.inspection_result==="Pass";
                    const inspWarn = t.inspection_result==="Pass w/ Defects";
                    return (
                      <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:"1rem" }}>🚛</span>
                          <div>
                            <div style={{ fontWeight:700, color:"#0f172a" }}>{t.truck_number} {t.year&&`· ${t.year}`} {t.make}</div>
                            {inspWarn && <div style={{ fontSize:"0.7rem", color:"#d97706", fontWeight:600 }}>⚠ Inspection — Pass w/ Defects</div>}
                            {!inspOK  && <div style={{ fontSize:"0.7rem", color:"#dc2626", fontWeight:600 }}>✗ Inspection FAILED — not eligible</div>}
                          </div>
                        </div>
                        <span style={{ background:inspOK&&!inspWarn?"#f0fdf4":inspWarn?"#fefce8":"#fff1f2", color:inspOK&&!inspWarn?"#15803d":inspWarn?"#d97706":"#dc2626", padding:"3px 8px", borderRadius:8, fontSize:"0.72rem", fontWeight:800 }}>
                          {inspOK&&!inspWarn?"✓ OK":inspWarn?"⚠ Defects":"✗ Fail"}
                        </span>
                      </div>
                    );
                  })}
                  <button onClick={()=>setActiveTab("fleet")} style={{ ...ghostBtn, fontSize:"0.72rem", marginTop:8 }}>Manage Fleet →</button>
                </Card>

                {/* ── #13 Compliance History Timeline ── */}
                {(selected.compliance_history||[]).length > 0 && (
                  <Card title="Compliance History">
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {(selected.compliance_history||[]).slice(0,6).map((h,i) => {
                        const isCrit = h.type==="critical";
                        const isWarn = h.type==="warning";
                        const bg    = isCrit?"#fff1f2":isWarn?"#fffbeb":"#eff6ff";
                        const border= isCrit?"#fda4af":isWarn?"#fde68a":"#bfdbfe";
                        const color = isCrit?"#dc2626":isWarn?"#b45309":"#1d4ed8";
                        const icon  = isCrit?"🔴":isWarn?"🟡":"🔵";
                        return (
                          <div key={i} style={{ background:bg, border:`1.5px solid ${border}`, borderRadius:12, padding:"12px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <span style={{ fontSize:"1rem" }}>{icon}</span>
                              <span style={{ fontSize:"0.62rem", fontWeight:700, color:color, textTransform:"uppercase", letterSpacing:"0.06em", background:`${border}66`, borderRadius:20, padding:"2px 8px" }}>
                                {h.type || "info"}
                              </span>
                              <span style={{ fontSize:"0.7rem", color:"#94a3b8", marginLeft:"auto" }}>{h.date}</span>
                            </div>
                            <div style={{ fontSize:"0.9rem", fontWeight:800, color:color, lineHeight:1.3 }}>{h.event}</div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </div>

              {/* ── Right column ── */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* ── Office Assistant Panel (recommended actions) ── */}
                <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"16px 20px" }}>
                  <div style={{ fontWeight:800, color:"#f8fafc", marginBottom:4 }}>🤖 Office Assistant</div>
                  <div style={{ fontSize:"0.68rem", color:"#64748b", marginBottom:12, textTransform:"uppercase", letterSpacing:"0.08em" }}>Recommended Actions</div>
                  {recommendedActions.length === 0 ? (
                    <div style={{ color:"#86efac", fontWeight:700, textAlign:"center", padding:"16px 0" }}>✅ All clear — no actions needed.</div>
                  ) : recommendedActions.map((a,i) => (
                    <div key={i} style={{ color:"#e2e8f0", fontSize:"0.78rem", marginBottom:10, display:"flex", gap:8, alignItems:"flex-start" }}>
                      <span style={{ background:a.includes("EXPIRED")||a.includes("required")?"#dc2626":"#d97706", color:"#fff", borderRadius:"50%", minWidth:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.62rem", fontWeight:900, flexShrink:0 }}>{i+1}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", gap:6, marginTop:12, flexWrap:"wrap" }}>
                    {selected.insurance_agent_email && <a href={`mailto:${selected.insurance_agent_email}?subject=Insurance Documents Required — ${selected.company_name}`} style={{ background:"#7c3aed", color:"#fff", padding:"6px 12px", borderRadius:8, fontSize:"0.72rem", fontWeight:700, textDecoration:"none", display:"inline-block" }}>✉ Email Insurance Agent</a>}
                    {selected.contact_email && <a href={`mailto:${selected.contact_email}?subject=Document Update Required — ${selected.company_name}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Email sent to carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ background:"#1e40af", color:"#fff", padding:"6px 12px", borderRadius:8, fontSize:"0.72rem", fontWeight:700, textDecoration:"none", display:"inline-block" }}>✉ Contact Carrier</a>}
                  </div>
                </div>

                {/* ── #11 Reminder Center ── */}
                <Card title="Reminder Center">
                  <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:10 }}>Upcoming Expirations</div>
                  {upcoming.length === 0 ? (
                    <div style={{ color:"#15803d", fontSize:"0.82rem", textAlign:"center", padding:"10px 0" }}>✓ No expirations in the next 90 days.</div>
                  ) : upcoming.slice(0,5).map((u,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:"0.82rem", color:"#0f172a" }}>{u.label}</div>
                        <div style={{ fontSize:"0.7rem", color:expColor(u.days), fontWeight:700 }}>{u.days===0?"Today":u.days+"d"}</div>
                      </div>
                      <button onClick={()=>sendReminder(u.docType, u.label)} style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:8, padding:"4px 10px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>Send Reminder</button>
                    </div>
                  ))}
                  {(selected.reminder_log||[]).length > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #f1f5f9" }}>
                      <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:6 }}>Recently Sent</div>
                      {(selected.reminder_log||[]).slice(0,3).map((r,i) => (
                        <div key={i} style={{ fontSize:"0.72rem", color:"#64748b", marginBottom:3 }}>✓ {r.doc_type} — {new Date(r.sent_at).toLocaleDateString()}</div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* ── #7 Office Notes ── */}
                <Card title="Office Notes">
                  {editingNotes ? (
                    <div>
                      <textarea value={notesValue} onChange={e=>setNotesValue(e.target.value)} style={{ width:"100%", minHeight:100, padding:"8px", border:"1px solid #e2e8f0", borderRadius:8, fontSize:"0.82rem", resize:"vertical", boxSizing:"border-box" }} placeholder="Add notes for staff — e.g. 'Carrier says new COI coming Friday. Do not dispatch after 6/30 if not received.'" />
                      <div style={{ display:"flex", gap:8, marginTop:8 }}>
                        <button onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Notes Updated",detail:"Office notes edited"}; updateSelected({...selected,notes:notesValue,changes_log:[change,...(selected.changes_log||[])]}); setEditingNotes(false); flash("Notes saved."); }} style={{ ...primaryBtn, fontSize:"0.75rem" }}>Save</button>
                        <button onClick={()=>setEditingNotes(false)} style={{ ...ghostBtn, fontSize:"0.75rem" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selected.notes ? (
                        <p style={{ fontSize:"0.82rem", color:"#475569", margin:"0 0 10px", whiteSpace:"pre-wrap", lineHeight:1.6 }}>{selected.notes}</p>
                      ) : (
                        <p style={{ fontSize:"0.82rem", color:"#94a3b8", margin:"0 0 10px", fontStyle:"italic" }}>No notes yet. Click Edit to add staff notes about this carrier.</p>
                      )}
                      <button onClick={()=>{ setNotesValue(selected.notes||""); setEditingNotes(true); }} style={{ ...ghostBtn, fontSize:"0.72rem" }}>✏ Edit Notes</button>
                    </div>
                  )}
                </Card>

                {/* ── Carrier Details ── */}
                <Card title="Carrier Details">
                  {/* Legal identifiers */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:12 }}>
                    {([
                      ["Legal Name",  selected.company_name],
                      ["MC #",        selected.mc_number  || "Not on file"],
                      ["DOT #",       selected.dot_number || "Not on file"],
                      ["EIN / Tax ID",selected.ein        || "Not on file"],
                    ] as [string,string][]).map(([k,v]) => (
                      <div key={k} style={{ background:"#f8fafc", borderRadius:7, padding:"6px 10px", border:"1px solid #f1f5f9" }}>
                        <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:1 }}>{k}</div>
                        <div style={{ fontWeight:700, fontSize:"0.8rem", color: v==="Not on file"?"#dc2626":"#0f172a" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Company address */}
                  <div style={{ marginBottom:12, paddingBottom:12, borderBottom:"1px solid #f1f5f9" }}>
                    <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:6 }}>Company Address</div>
                    {(selected.company_address_line1 || selected.business_address) ? (
                      <div style={{ fontSize:"0.82rem", color:"#0f172a", lineHeight:1.6 }}>
                        {selected.company_address_line1 && <div>{selected.company_address_line1}</div>}
                        {selected.company_address_line2 && <div>{selected.company_address_line2}</div>}
                        {(selected.company_city||selected.company_state||selected.company_zip) && (
                          <div>{[selected.company_city, selected.company_state].filter(Boolean).join(", ")} {selected.company_zip}</div>
                        )}
                        {!selected.company_address_line1 && selected.business_address && <div>{selected.business_address}</div>}
                      </div>
                    ) : (
                      <div style={{ color:"#dc2626", fontSize:"0.8rem", fontStyle:"italic" }}>Not entered</div>
                    )}
                    {/* Mailing address */}
                    <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", margin:"10px 0 4px" }}>Mailing Address</div>
                    {selected.mailing_same_as_company !== false ? (
                      <div style={{ fontSize:"0.75rem", color:"#64748b" }}>Same as company address</div>
                    ) : (selected.mailing_address_line1 ? (
                      <div style={{ fontSize:"0.82rem", color:"#0f172a", lineHeight:1.6 }}>
                        <div>{selected.mailing_address_line1}</div>
                        {selected.mailing_address_line2 && <div>{selected.mailing_address_line2}</div>}
                        {(selected.mailing_city||selected.mailing_state||selected.mailing_zip) && (
                          <div>{[selected.mailing_city, selected.mailing_state].filter(Boolean).join(", ")} {selected.mailing_zip}</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color:"#dc2626", fontSize:"0.8rem", fontStyle:"italic" }}>Not entered</div>
                    ))}
                  </div>
                  {/* Address action buttons */}
                  {(() => {
                    const addr = selected.company_address_line1
                      ? [selected.company_address_line1, selected.company_address_line2, [selected.company_city,selected.company_state].filter(Boolean).join(", "), selected.company_zip].filter(Boolean).join(" ")
                      : selected.business_address || "";
                    return addr ? (
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(addr)}`} target="_blank" rel="noreferrer"
                          style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.72rem" }}>🗺 Open Map</a>
                        <button onClick={() => { navigator.clipboard.writeText(addr); flash("Address copied."); }}
                          style={{ ...ghostBtn, fontSize:"0.72rem" }}>⎘ Copy Address</button>
                      </div>
                    ) : null;
                  })()}
                  {/* Website */}
                  {selected.website?.trim() && (
                    <div style={{ marginTop:10, fontSize:"0.78rem" }}>
                      <strong style={{ color:"#94a3b8", fontSize:"0.65rem", textTransform:"uppercase" }}>Website </strong>
                      <a href={selected.website.startsWith("http")?selected.website:`https://${selected.website}`} target="_blank" rel="noreferrer"
                        style={{ color:"#1e40af" }}>{selected.website}</a>
                    </div>
                  )}
                  {/* Started */}
                  {selected.start_date && (
                    <div style={{ marginTop:8, fontSize:"0.75rem", color:"#64748b" }}>
                      <strong style={{ color:"#94a3b8", fontSize:"0.65rem", textTransform:"uppercase" }}>Carrier Since </strong>
                      {new Date(selected.start_date+"T00:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
                    </div>
                  )}
                </Card>

                {/* ── #8 Contact Center ── */}
                <Card title="Contact Center">
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontWeight:700, color:"#0f172a", marginBottom:2 }}>{selected.contact_name||"—"}</div>
                    <div style={{ fontSize:"0.72rem", color:"#64748b" }}>Primary Contact</div>
                    {selected.business_address && (
                      <div style={{ fontSize:"0.72rem", color:"#475569", marginTop:4, display:"flex", alignItems:"flex-start", gap:4 }}>
                        <span>📍</span><span>{selected.business_address}</span>
                      </div>
                    )}
                    {selected.last_contact_date && (
                      <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:4 }}>
                        Last contact: {Math.floor((Date.now()-new Date(selected.last_contact_date).getTime())/86400000)} day{Math.floor((Date.now()-new Date(selected.last_contact_date).getTime())/86400000)!==1?"s":""} ago
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                    {selected.contact_phone && <a href={`tel:${selected.contact_phone}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Called carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ ...primaryBtn, textDecoration:"none", fontSize:"0.75rem" }}>📞 Call</a>}
                    {selected.contact_email && <a href={`mailto:${selected.contact_email}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Emailed carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.75rem" }}>✉ Email</a>}
                    {selected.contact_phone && <a href={`sms:${selected.contact_phone}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Texted carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.75rem" }}>💬 Text</a>}
                    <button onClick={()=>{
                      const note=prompt("Log call notes (optional):")||"Called carrier";
                      const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Call Logged",detail:note};
                      updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]});
                      flash("Call logged.");
                    }} style={{ ...ghostBtn, fontSize:"0.75rem" }}>📋 Log Call</button>
                  </div>
                  {/* Office action buttons */}
                  <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:2 }}>Quick Actions</div>
                    {!w9 && selected.contact_email && (
                      <a href={`mailto:${selected.contact_email}?subject=${encodeURIComponent("W-9 Required — "+selected.company_name)}&body=${encodeURIComponent("Hi "+selected.contact_name+",\n\nWe need a completed W-9 form on file before we can process payment. Please complete and return at your earliest convenience.\n\nThank you,\nRonyx Logistics Operations")}`}
                        style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.72rem", display:"block", textAlign:"center" }}>📄 Request W-9</a>
                    )}
                    {(!autoIns||!cargoIns) && (selected.contact_email||selected.insurance_agent_email) && (
                      <a href={`mailto:${selected.insurance_agent_email||selected.contact_email}?subject=${encodeURIComponent("COI Required — "+selected.company_name)}&body=${encodeURIComponent("Please provide an updated Certificate of Insurance (COI) for "+selected.company_name+". Insurance is required to maintain dispatch eligibility.\n\nThank you,\nRonyx Logistics Operations")}`}
                        style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.72rem", display:"block", textAlign:"center" }}>🛡 Request COI</a>
                    )}
                    <button onClick={()=>{
                      const isBlocked = selected.dispatch_blocked_override;
                      const note = isBlocked ? "Dispatch block removed" : (prompt("Reason for blocking dispatch:")||"Blocked by office");
                      if (!isBlocked && !note) return;
                      const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:isBlocked?"Dispatch Unblocked":"Dispatch Blocked",detail:note};
                      updateSelected({...selected,dispatch_blocked_override:!isBlocked,changes_log:[change,...(selected.changes_log||[])]});
                      flash(isBlocked?"Dispatch block removed.":"Dispatch blocked.");
                    }} style={{ ...ghostBtn, fontSize:"0.72rem", color: selected.dispatch_blocked_override?"#15803d":"#dc2626", borderColor: selected.dispatch_blocked_override?"#86efac":"#fca5a5", background: selected.dispatch_blocked_override?"#f0fdf4":"#fff1f2" }}>
                      {selected.dispatch_blocked_override ? "✓ Unblock Dispatch" : "🚫 Block Dispatch"}
                    </button>
                    <button onClick={()=>{
                      const isHeld = selected.settlement_hold_override;
                      const note = isHeld ? "Settlement hold released" : (prompt("Reason for hold:")||"Hold placed by office");
                      if (!isHeld && !note) return;
                      const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:isHeld?"Settlement Released":"Settlement Hold",detail:note};
                      updateSelected({...selected,settlement_hold_override:!isHeld,changes_log:[change,...(selected.changes_log||[])]});
                      flash(isHeld?"Settlement hold released.":"Settlement placed on hold.");
                    }} style={{ ...ghostBtn, fontSize:"0.72rem", color: selected.settlement_hold_override?"#15803d":"#d97706", borderColor: selected.settlement_hold_override?"#86efac":"#fde68a", background: selected.settlement_hold_override?"#f0fdf4":"#fffbeb" }}>
                      {selected.settlement_hold_override ? "✓ Release Settlement Hold" : "⏸ Put Settlement on Hold"}
                    </button>
                  </div>
                  {selected.insurance_agent_name && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #f1f5f9" }}>
                      <div style={{ fontWeight:600, color:"#0f172a", fontSize:"0.82rem", marginBottom:4 }}>Insurance Agent: {selected.insurance_agent_name}</div>
                      <div style={{ display:"flex", gap:6 }}>
                        {selected.insurance_agent_phone && <a href={`tel:${selected.insurance_agent_phone}`} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.72rem" }}>📞 Agent</a>}
                        {selected.insurance_agent_email && <a href={`mailto:${selected.insurance_agent_email}`} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.72rem" }}>✉ Agent</a>}
                      </div>
                    </div>
                  )}
                </Card>

                {/* ── Changes Since Yesterday ── */}
                <Card title="Changes Since Yesterday">
                  {todayChanges.length === 0 ? (
                    <div style={{ color:"#94a3b8", fontSize:"0.82rem", textAlign:"center", padding:"10px 0" }}>No changes logged in the last 24 hours.</div>
                  ) : (
                    <div>
                      {todayChanges.slice(0,6).map((c,i) => (
                        <div key={i} style={{ display:"flex", gap:8, padding:"6px 0", borderBottom:"1px solid #f1f5f9" }}>
                          <span style={{ background:"#eff6ff", color:"#1e40af", padding:"2px 6px", borderRadius:5, fontSize:"0.65rem", fontWeight:700, flexShrink:0 }}>{c.type}</span>
                          <span style={{ fontSize:"0.75rem", color:"#475569" }}>{c.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                    <button onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Document Added",detail:"Insurance document uploaded"}; updateSelected({...selected,changes_log:[change,...(selected.changes_log||[])]}); flash("Change logged."); }} style={{ ...ghostBtn, fontSize:"0.68rem" }}>+ Log Change</button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Drivers ── */}
      {activeTab === "drivers" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={eyebrow}>Driver Roster</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{selected.drivers.length} driver{selected.drivers.length!==1?"s":""} · CDL and med card tracked individually</div>
            </div>
            <button onClick={() => setShowAddDriver(s=>!s)} style={primaryBtn}>+ Add Driver</button>
          </div>

          {/* Driver search */}
          {selected.drivers.length > 0 && (
            <div style={{ marginBottom: 16, padding: "14px 16px", background: "#eff6ff", borderRadius: 14, border: "2px solid #3b82f6", boxShadow: "0 4px 16px rgba(30,64,175,0.13)" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>🔍 Search Drivers</div>
              <div style={{ position: "relative" }}>
                <input
                  value={driverSearch}
                  onChange={e => setDriverSearch(e.target.value)}
                  placeholder="Driver name, CDL#, phone, truck#…"
                  style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10, border: "2px solid #1e40af", fontSize: "0.95rem", outline: "none", background: "#fff", boxSizing: "border-box" as const, color: "#0f172a", fontWeight: 600, boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)" }}
                />
                {driverSearch ? (
                  <button onClick={() => setDriverSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#1e40af", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem", color: "#fff", fontWeight: 900 }}>✕</button>
                ) : (
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", opacity: 0.35, pointerEvents: "none" }}>🔍</span>
                )}
              </div>
            </div>
          )}

          {showAddDriver && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              {/* Pick from existing drivers across all OOs */}
              {(() => {
                const allDrivers = companies.flatMap(c => c.drivers.map(d => ({ ...d, company: c.company_name })));
                const notYetAdded = allDrivers.filter(d => !selected.drivers.some(sd => sd.name.toLowerCase() === d.name.toLowerCase()));
                return notYetAdded.length > 0 ? (
                  <div style={{ marginBottom:14, padding:"10px 14px", background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10 }}>
                    <div style={{ fontSize:"0.75rem", fontWeight:700, color:"#0369a1", marginBottom:6 }}>Pick an existing driver from another company</div>
                    <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                      <select
                        value={pickDriverId}
                        onChange={e => {
                          setPickDriverId(e.target.value);
                          const found = allDrivers.find(d => d.id === e.target.value);
                          if (found) setAddDriverForm({ name: found.name, cdl_number: found.cdl_number, cdl_state: found.cdl_state, cdl_expiration: found.cdl_expiration, med_card_expiration: found.med_card_expiration, phone: found.phone });
                        }}
                        style={{ ...inp, minWidth:240, flex:1 }}
                      >
                        <option value="">— select a driver —</option>
                        {notYetAdded.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.company})</option>
                        ))}
                      </select>
                      {pickDriverId && <span style={{ fontSize:"0.7rem", color:"#0369a1" }}>✓ Fields pre-filled below — review then click Add Driver</span>}
                    </div>
                  </div>
                ) : null;
              })()}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                {([["Driver Name *","name","Carlos Ramirez"],["CDL Number","cdl_number","TX1234567"],["CDL State","cdl_state","TX"],["Phone","phone","(555) 000-0000"]] as [string,keyof typeof addDriverForm,string][]).map(([label,field,ph]) => (
                  <div key={field}><label style={lbl}>{label}</label><input value={addDriverForm[field] as string} onChange={e=>setAddDriverForm(f=>({...f,[field]:e.target.value}))} style={inp} placeholder={ph} /></div>
                ))}
                <div>
                  <label style={lbl}>CDL Class</label>
                  <select value={addDriverForm.cdl_class || ""} onChange={e=>setAddDriverForm(f=>({...f,cdl_class:e.target.value}))} style={inp}>
                    <option value="">— Select —</option>
                    <option value="A">Class A</option>
                    <option value="AM1">Class AM1</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                  </select>
                </div>
                <div><label style={lbl}>CDL Expiration</label><input type="date" value={addDriverForm.cdl_expiration} onChange={e=>setAddDriverForm(f=>({...f,cdl_expiration:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Med Card Expiration</label><input type="date" value={addDriverForm.med_card_expiration} onChange={e=>setAddDriverForm(f=>({...f,med_card_expiration:e.target.value}))} style={inp} /></div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button onClick={() => { addDriver(); setPickDriverId(""); }} style={primaryBtn}>Add Driver</button>
                <button onClick={() => { setShowAddDriver(false); setPickDriverId(""); setAddDriverForm({ name:"", cdl_number:"", cdl_state:"TX", cdl_class:"", cdl_expiration:"", med_card_expiration:"", phone:"" }); }} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {selected.drivers.length === 0 ? (
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"40px 0", textAlign:"center", color:"#94a3b8" }}>No drivers on file.</div>
          ) : (
            <>
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Driver","CDL #","State","Class","CDL Expiration","CDL File","Med Card Exp.","Phone","Assigned Truck","Actions"].map(h=>(
                      <th key={h} style={{ padding:"8px 14px", fontSize:"0.68rem", fontWeight:700, color:"#475569", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.drivers.filter(d => {
                    if (!driverSearch.trim()) return true;
                    const q = driverSearch.toLowerCase();
                    return d.name.toLowerCase().includes(q) || (d.cdl_number||"").toLowerCase().includes(q) || (d.phone||"").toLowerCase().includes(q) || (d.truck_number||"").toLowerCase().includes(q);
                  }).map(d => {
                    const cdlD   = daysUntil(d.cdl_expiration);
                    const medD   = daysUntil(d.med_card_expiration);
                    const cdlKey = `[${d.name}] CDL License`;
                    const cdlDoc = selected.documents.find(doc => doc.type === cdlKey);
                    return (
                      <tr key={d.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"10px 14px", fontWeight:700, color:"#0f172a" }}>{d.name}</td>
                        <td style={{ padding:"10px 14px", color:"#475569" }}>{d.cdl_number||"—"}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{ background:"#eff6ff", color:"#1e40af", padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.75rem" }}>{d.cdl_state||"—"}</span>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{ background:d.cdl_class?"#f0fdf4":"#f8fafc", color:d.cdl_class?"#15803d":"#94a3b8", padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.75rem" }}>{d.cdl_class ? `Class ${d.cdl_class}` : "—"}</span>
                        </td>
                        <td style={{ padding:"10px 14px" }}><span style={{ background:expBg(cdlD), color:expColor(cdlD), padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.75rem" }}>{expLabel(cdlD,d.cdl_expiration)}</span></td>
                        <td style={{ padding:"10px 14px" }}>
                          {cdlDoc ? (
                            <span style={{ color:"#15803d", fontSize:"0.72rem", fontWeight:700 }}>✓ On file</span>
                          ) : (
                            <label style={{ background:"#1e40af", color:"#fff", padding:"4px 10px", borderRadius:6, fontSize:"0.72rem", fontWeight:700, cursor:"pointer", display:"inline-block" }}>
                              🪪 Upload CDL
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={async e=>{ const f=e.target.files?.[0]; if(f){ const state=prompt(`CDL State for ${d.name} (e.g. TX):`,d.cdl_state||"TX")||""; const exp=prompt(`CDL expiration date (YYYY-MM-DD):`,d.cdl_expiration||"")||undefined; await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:cdlKey,file_name:f.name,expires_on:exp||null}); await apiPut(`/api/ronyx/owner-operators/${selected.id}/drivers/${d.id}`,{cdl_state:state.toUpperCase()||d.cdl_state,cdl_expiration:exp||d.cdl_expiration}); const doc:OODoc={type:cdlKey,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; const updatedDrivers=selected.drivers.map(dr=>dr.id===d.id?{...dr,cdl_state:state.toUpperCase()||dr.cdl_state,cdl_expiration:exp||dr.cdl_expiration}:dr); updateLocalState({...selected,documents:[doc,...selected.documents.filter(x=>x.type!==cdlKey)],drivers:updatedDrivers}); flash(`CDL uploaded for ${d.name}.`); } e.target.value=""; }} />
                            </label>
                          )}
                        </td>
                        <td style={{ padding:"10px 14px" }}><span style={{ background:expBg(medD), color:expColor(medD), padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.75rem" }}>{expLabel(medD,d.med_card_expiration)}</span></td>
                        <td style={{ padding:"10px 14px", color:"#475569" }}>{d.phone||"—"}</td>
                        <td style={{ padding:"10px 14px" }}>
                          {selected.trucks.length === 0 ? (
                            <span style={{ fontSize:"0.72rem", color:"#94a3b8" }}>No trucks on fleet</span>
                          ) : (
                            <select
                              value={d.truck_number || ""}
                              onChange={async e => {
                                const truck_number = e.target.value;
                                const res = await apiPut(`/api/ronyx/owner-operators/${selected.id}/drivers/${d.id}`, { truck_number: truck_number || null });
                                if (res.error) { flash(`Error: ${res.error}`); return; }
                                updateLocalState({ ...selected, drivers: selected.drivers.map(dr => dr.id === d.id ? { ...dr, truck_number: truck_number || undefined } : dr) });
                                flash(truck_number ? `Truck ${truck_number} assigned to ${d.name}.` : `Truck unassigned from ${d.name}.`);
                              }}
                              style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"5px 10px", fontSize:"0.78rem", color:"#0f172a", background:"#fff", minWidth:120, fontWeight: d.truck_number ? 700 : 400 }}
                            >
                              <option value="">— Unassigned —</option>
                              {selected.trucks.map(t => (
                                <option key={t.id} value={t.truck_number}>
                                  {t.truck_number}{t.make ? ` · ${t.make}` : ""}{t.model ? ` ${t.model}` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            {cdlDoc && <label style={{ background:"#f1f5f9", color:"#475569", padding:"3px 8px", borderRadius:6, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", border:"1px solid #e2e8f0" }}>
                              Replace CDL
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={async e=>{ const f=e.target.files?.[0]; if(f){ const state=prompt(`CDL State for ${d.name} (e.g. TX):`,d.cdl_state||"TX")||""; const exp=prompt(`New CDL expiration (YYYY-MM-DD):`,d.cdl_expiration||"")||undefined; await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:cdlKey,file_name:f.name,expires_on:exp||null}); await apiPut(`/api/ronyx/owner-operators/${selected.id}/drivers/${d.id}`,{cdl_state:state.toUpperCase()||d.cdl_state,cdl_expiration:exp||d.cdl_expiration}); const doc:OODoc={type:cdlKey,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; const updatedDrivers=selected.drivers.map(dr=>dr.id===d.id?{...dr,cdl_state:state.toUpperCase()||dr.cdl_state,cdl_expiration:exp||dr.cdl_expiration}:dr); updateLocalState({...selected,documents:[doc,...selected.documents.filter(x=>x.type!==cdlKey)],drivers:updatedDrivers}); flash(`CDL replaced for ${d.name}.`); } e.target.value=""; }} />
                            </label>}
                            <button
                              onClick={() => setDriverEditModal({ driver: d, form: { name: d.name, phone: d.phone, cdl_number: d.cdl_number, cdl_state: d.cdl_state, cdl_class: d.cdl_class || "", cdl_expiration: d.cdl_expiration, med_card_expiration: d.med_card_expiration }, saving: false })}
                              style={{ background:"#eff6ff", color:"#1e40af", border:"1px solid #bfdbfe", borderRadius:6, padding:"3px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>✏ Edit</button>
                            <button onClick={() => removeDriver(d.id)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Approved Truck Pools (per driver) ────────────── */}
            {selected.drivers.length > 0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontWeight:800, fontSize:"0.75rem", color:"#0f172a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>
                  Approved Truck Pools
                </div>
                <div style={{ fontSize:"0.72rem", color:"#64748b", marginBottom:12 }}>
                  Each driver can be pre-approved for up to 4 trucks (1 primary + 3 backups). If their truck breaks down, dispatch reassigns from this pool instantly.
                </div>
                {selected.drivers.map(d => {
                  const myAssignments = (selected.driver_truck_assignments || [])
                    .filter(a => a.driver_id === d.id)
                    .sort((a,b) => a.priority - b.priority);
                  const expanded = expandedDriverPool.has(d.id);
                  return (
                    <div key={d.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, marginBottom:8, overflow:"hidden" }}>
                      <div
                        onClick={() => setExpandedDriverPool(prev => { const n=new Set(prev); expanded?n.delete(d.id):n.add(d.id); return n; })}
                        style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", cursor:"pointer", background:"#f8fafc" }}
                      >
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontWeight:700, color:"#0f172a", fontSize:"0.85rem" }}>{d.name}</span>
                          <span style={{ background:"#eff6ff", color:"#1d4ed8", padding:"2px 8px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>
                            {myAssignments.length} truck{myAssignments.length !== 1?"s":""}
                          </span>
                        </div>
                        <span style={{ color:"#94a3b8", fontSize:"0.8rem" }}>{expanded?"▲":"▼"}</span>
                      </div>

                      {expanded && (
                        <div style={{ padding:"12px 16px" }}>
                          {/* Assigned trucks list */}
                          {myAssignments.length === 0 ? (
                            <div style={{ color:"#94a3b8", fontSize:"0.78rem", marginBottom:10 }}>No approved trucks assigned yet.</div>
                          ) : myAssignments.map(a => {
                            const t = selected.trucks.find(t => t.id === a.truck_id);
                            if (!t) return null;
                            const [stBg, stColor] = truckStatusColors(t.status);
                            const avail = isTruckAvailable(t.status);
                            return (
                              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background:"#f8fafc", borderRadius:8, marginBottom:6 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ background: a.priority===1?"#1e40af":"#64748b", color:"#fff", borderRadius:20, padding:"2px 8px", fontSize:"0.62rem", fontWeight:900, minWidth:64, textAlign:"center" }}>
                                    {PRIORITY_LABELS[a.priority]}
                                  </span>
                                  <div>
                                    <div style={{ fontWeight:700, fontSize:"0.82rem", color:"#0f172a" }}>
                                      Truck #{t.truck_number}
                                      {t.year ? ` · ${t.year}` : ""}{t.make ? ` ${t.make}` : ""}
                                    </div>
                                    {t.type && <div style={{ fontSize:"0.65rem", color:"#64748b" }}>{t.type}</div>}
                                  </div>
                                </div>
                                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                                  <span style={{ background:stBg, color:stColor, padding:"2px 8px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>
                                    {avail?"✓ Available":"✗ Unavailable"}
                                  </span>
                                  {a.requires_manager_approval && (
                                    <span style={{ background:"#fef3c7", color:"#92400e", padding:"2px 6px", borderRadius:6, fontSize:"0.62rem", fontWeight:700 }}>Mgr req.</span>
                                  )}
                                  <button onClick={() => removeTruckAssignment(a.id, d.name, t.truck_number)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 8px", fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>Remove</button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Assign truck form */}
                          {showAssignTruck === d.id ? (
                            <div style={{ background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:10, padding:"12px 14px", marginTop:8 }}>
                              <div style={{ fontWeight:700, fontSize:"0.75rem", color:"#0369a1", marginBottom:10 }}>Add Truck to {d.name}&apos;s Pool</div>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                                <div>
                                  <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Truck</label>
                                  <select
                                    value={assignTruckForm.truck_id}
                                    onChange={e => setAssignTruckForm(f => ({ ...f, truck_id:e.target.value, driver_id:d.id }))}
                                    style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.78rem" }}
                                  >
                                    <option value="">— Select Truck —</option>
                                    {selected.trucks
                                      .filter(t => !myAssignments.some(a => a.truck_id === t.id))
                                      .map(t => <option key={t.id} value={t.id}>#{t.truck_number}{t.make?` · ${t.make}`:""}</option>)
                                    }
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Role</label>
                                  <select
                                    value={assignTruckForm.priority}
                                    onChange={e => setAssignTruckForm(f => ({ ...f, priority:Number(e.target.value) }))}
                                    style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.78rem" }}
                                  >
                                    <option value={1}>Primary Truck</option>
                                    <option value={2}>Backup 1</option>
                                    <option value={3}>Backup 2</option>
                                    <option value={4}>Backup 3</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{ marginTop:8 }}>
                                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Notes (optional)</label>
                                <input value={assignTruckForm.notes} onChange={e => setAssignTruckForm(f=>({...f,notes:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.78rem", boxSizing:"border-box" }} placeholder="e.g. Assigned by owner, same carrier" />
                              </div>
                              <label style={{ display:"flex", alignItems:"center", gap:6, marginTop:8, fontSize:"0.72rem", color:"#64748b", cursor:"pointer" }}>
                                <input type="checkbox" checked={assignTruckForm.requires_manager_approval} onChange={e => setAssignTruckForm(f=>({...f,requires_manager_approval:e.target.checked}))} />
                                Requires manager approval for reassignment
                              </label>
                              <div style={{ display:"flex", gap:8, marginTop:10 }}>
                                <button onClick={() => { setAssignTruckForm(f=>({...f,driver_id:d.id})); assignTruckToDriver(); }} style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:7, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Save Assignment</button>
                                <button onClick={() => setShowAssignTruck("")} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:7, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Cancel</button>
                              </div>
                            </div>
                          ) : myAssignments.length < 4 ? (
                            <button onClick={() => { setShowAssignTruck(d.id); setAssignTruckForm({ driver_id:d.id, truck_id:"", priority:myAssignments.length===0?1:myAssignments.length+1, requires_manager_approval:false, notes:"" }); }} style={{ marginTop:6, background:"#eff6ff", color:"#1d4ed8", border:"1px dashed #93c5fd", borderRadius:8, padding:"6px 14px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
                              + Add Truck to Pool
                            </button>
                          ) : (
                            <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:6 }}>Max 4 trucks per driver.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
          )}

        </div>
      )}

      {/* ── Fleet ── */}
      {activeTab === "fleet" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={eyebrow}>Truck Fleet</div>
              <div style={{ fontSize:"0.8rem", color:"#64748b", marginTop:2 }}>{selected.trucks.length} truck{selected.trucks.length!==1?"s":""} — one insurance policy covers all</div>
            </div>
            <button onClick={() => setShowAddTruck(s=>!s)} style={primaryBtn}>+ Add Truck</button>
          </div>
          {showAddTruck && (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px", marginBottom:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px 14px" }}>
                {([["Truck # *","truck_number","SMT-101"],["Year","year","2021"],["Make","make","Kenworth"],["Model","model","T880"],["VIN","vin","1XKYD49X…"]] as [string,keyof typeof addTruckForm,string][]).map(([l,f,ph]) => (
                  <div key={f}><label style={lbl}>{l}</label><input value={addTruckForm[f] as string} onChange={e=>setAddTruckForm(f2=>({...f2,[f]:e.target.value}))} style={inp} placeholder={ph} /></div>
                ))}
                <div><label style={lbl}>Last Inspection</label><input type="date" value={addTruckForm.last_inspection||""} onChange={e=>setAddTruckForm(f=>({...f,last_inspection:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Inspection Result</label>
                  <select value={addTruckForm.inspection_result} onChange={e=>setAddTruckForm(f=>({...f,inspection_result:e.target.value as OOTruck["inspection_result"]}))} style={inp}>
                    <option>Pass</option><option>Pass w/ Defects</option><option>Fail</option>
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button onClick={addTruck} style={primaryBtn}>Add Truck</button>
                <button onClick={() => setShowAddTruck(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}
          {selected.trucks.length === 0 ? (
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"40px 0", textAlign:"center", color:"#94a3b8" }}>No trucks on file.</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
              {selected.trucks.map(t => {
                const [eligible2] = ooDispatchEligible(selected);
                const inspOK = !t.inspection_result || t.inspection_result === "Pass";
                const available = isTruckAvailable(t.status);
                const truckEligible = eligible2 && inspOK && available;
                const [stBg, stColor] = truckStatusColors(t.status);
                const approvedDrivers = selected.drivers.filter(d => (t.approved_driver_ids || []).includes(d.id));
                const driverAssignments = (selected.driver_truck_assignments || []).filter(a => a.truck_id === t.id);
                return (
                  <div key={t.id} style={{ background:"#fff", border:`1px solid ${available?"#e2e8f0":"#fecaca"}`, borderRadius:14, padding:"16px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ fontSize:"1.3rem" }}>🚚</div>
                      <div style={{ display:"flex", gap:4 }}>
                        <span style={{ background:stBg, color:stColor, padding:"2px 8px", borderRadius:20, fontSize:"0.65rem", fontWeight:800 }}>{truckStatusLabel(t.status)}</span>
                        <button onClick={() => removeTruck(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"0.85rem" }}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginTop:6 }}>{t.truck_number}</div>
                    <div style={{ fontSize:"0.8rem", color:"#64748b", marginTop:2 }}>{[t.year, t.make, t.model].filter(Boolean).join(" ")}{t.type ? ` · ${t.type}` : ""}</div>
                    {t.vin && <div style={{ fontSize:"0.68rem", color:"#94a3b8", marginTop:4 }}>VIN: {t.vin}</div>}
                    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:4 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem" }}>
                        <span style={{ color:"#64748b" }}>Inspection</span>
                        <span style={{ fontWeight:700, color:inspOK?"#15803d":"#dc2626" }}>{t.inspection_result||"—"}</span>
                      </div>
                      {t.last_inspection && <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem" }}>
                        <span style={{ color:"#64748b" }}>Last Inspected</span>
                        <span style={{ color:"#475569" }}>{fmtDate(t.last_inspection)}</span>
                      </div>}
                      <div style={{ marginTop:6, display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span style={{ background:truckEligible?"#f0fdf4":"#fff1f2", color:truckEligible?"#15803d":"#dc2626", padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:800 }}>
                          {truckEligible?"✓ Dispatch Eligible":"✗ Not Eligible"}
                        </span>
                      </div>
                    </div>

                    {/* Approved Drivers */}
                    <div style={{ marginTop:12, borderTop:"1px solid #f1f5f9", paddingTop:10 }}>
                      <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Approved Drivers ({approvedDrivers.length})</div>
                      {approvedDrivers.length === 0 ? (
                        <div style={{ fontSize:"0.72rem", color:"#94a3b8" }}>No approved drivers assigned</div>
                      ) : driverAssignments
                          .sort((a,b) => a.priority - b.priority)
                          .map(a => {
                            const drv = selected.drivers.find(d => d.id === a.driver_id);
                            if (!drv) return null;
                            return (
                              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.75rem", padding:"3px 0" }}>
                                <span style={{ fontWeight:600, color:"#0f172a" }}>{drv.name}</span>
                                <div style={{ display:"flex", gap:4 }}>
                                  <span style={{ background:"#f1f5f9", color:"#475569", padding:"1px 6px", borderRadius:4, fontSize:"0.62rem", fontWeight:700 }}>{PRIORITY_LABELS[a.priority]}</span>
                                  {a.requires_manager_approval && <span style={{ background:"#fef3c7", color:"#92400e", padding:"1px 6px", borderRadius:4, fontSize:"0.62rem", fontWeight:700 }}>Mgr req.</span>}
                                </div>
                              </div>
                            );
                          })
                      }
                    </div>

                    {/* Maintenance actions */}
                    {available && (
                      <button
                        onClick={() => setMaintenanceModal({ truckId: t.id, truckNumber: t.truck_number })}
                        style={{ marginTop:10, width:"100%", background:"#fff7ed", color:"#c2410c", border:"1px solid #fed7aa", borderRadius:8, padding:"6px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}
                      >
                        🔧 Send to Maintenance
                      </button>
                    )}
                    {!available && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Restore truck ${t.truck_number} to active?`)) return;
                          updateLocalState({ ...selected, trucks: selected.trucks.map(tr => tr.id === t.id ? { ...tr, status: "active" as TruckStatus } : tr) });
                          await fetch(`/api/ronyx/owner-operators/${selected.id}/trucks/${t.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ status:"active" }) });
                          flash(`Truck ${t.truck_number} restored to active.`);
                        }}
                        style={{ marginTop:10, width:"100%", background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:8, padding:"6px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}
                      >
                        Restore — Mark Available
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Documents ── */}
      {activeTab === "documents" && (
        <div>
          {/* Company identity banner */}
          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e40af)", borderRadius:14, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:"1.3rem", color:"#fff", flexShrink:0 }}>
              {selected.company_name.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize:"0.65rem", fontWeight:700, color:"rgba(255,255,255,0.55)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Uploading documents for</div>
              <div style={{ fontWeight:900, color:"#fff", fontSize:"1.15rem" }}>{selected.company_name}</div>
              {(selected.mc_number || selected.dot_number) && (
                <div style={{ fontSize:"0.72rem", color:"rgba(255,255,255,0.6)", marginTop:2 }}>
                  {selected.mc_number && `MC# ${selected.mc_number}`}{selected.mc_number && selected.dot_number && " · "}{selected.dot_number && `DOT# ${selected.dot_number}`}
                </div>
              )}
            </div>
            <div style={{ marginLeft:"auto", fontSize:"0.75rem", color:"rgba(255,255,255,0.55)" }}>
              {selected.documents.length} document{selected.documents.length !== 1 ? "s" : ""} on file
            </div>
          </div>

          {/* Insurance Agent edit */}
          <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:14, padding:"16px 20px", marginBottom:16 }}>
            <div style={{ fontWeight:800, color:"#1e40af", marginBottom:12, fontSize:"0.88rem" }}>🛡️ Insurance Agent Contact</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px 16px" }}>
              <div><label style={lbl}>Agent Name</label><input value={selected.insurance_agent_name} onChange={e=>updateSelected({...selected,insurance_agent_name:e.target.value})} style={inp} placeholder="Agent name" /></div>
              <div><label style={lbl}>Agent Phone</label><input value={selected.insurance_agent_phone} onChange={e=>updateSelected({...selected,insurance_agent_phone:e.target.value})} style={inp} type="tel" /></div>
              <div><label style={lbl}>Agent Email</label><input value={selected.insurance_agent_email} onChange={e=>updateSelected({...selected,insurance_agent_email:e.target.value})} style={inp} type="email" /></div>
            </div>
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              {selected.insurance_agent_phone && <a href={`tel:${selected.insurance_agent_phone}`} style={{ ...ghostBtn, textDecoration:"none" }}>📞 Call Agent</a>}
              {selected.insurance_agent_email && <a href={`mailto:${selected.insurance_agent_email}`} style={{ ...ghostBtn, textDecoration:"none" }}>✉ Email Agent</a>}
            </div>
          </div>

          {/* COI Fraud Check banner */}
          <div style={{ background:"#fff7ed", border:"1px solid #fdba74", borderRadius:12, padding:"12px 18px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
            <div>
              <div style={{ fontWeight:800, color:"#c2410c", fontSize:"0.82rem", marginBottom:2 }}>🔍 Verify Insurance (COI Check)</div>
              <div style={{ fontSize:"0.75rem", color:"#92400e" }}>Confirm the carrier's policy is active and not fraudulent via FMCSA or ACORD database.</div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {/* CCB™ FMCSA Live Verify — uses API key stored in integrations table */}
              <FmcsaVerifyButton
                dotNumber={selected.dot_number}
                mcNumber={selected.mc_number}
                ooId={selected.id}
                ooName={selected.company_name}
                onVerified={(result) => {
                  if (result.operating_status) {
                    updateLocalState({
                      ...selected,
                      fmcsa_verified_at:      result.verified_at,
                      fmcsa_operating_status: result.operating_status,
                      fmcsa_safety_rating:    result.safety_rating,
                      fmcsa_legal_name:       result.legal_name,
                    } as any);
                  }
                  flash(`FMCSA verified: ${result.legal_name ?? selected.company_name} — ${result.operating_status ?? "status unknown"}`);
                }}
              />
              <button onClick={() => { window.open(`https://www.acord.org/`, "_blank"); flash("ACORD certificate verification opened."); }} style={{ ...ghostBtn, fontSize:"0.75rem" }}>
                ACORD COI Lookup
              </button>
              <button onClick={() => { const sub = encodeURIComponent(`COI Verification Request — ${selected.company_name} MC# ${selected.mc_number || "—"}`); const body = encodeURIComponent(`Please provide a current Certificate of Insurance for:\n\nCompany: ${selected.company_name}\nMC#: ${selected.mc_number || "—"}\nDOT#: ${selected.dot_number || "—"}\n\nWe require the COI be issued directly to MoveAround TMS / Ronyx Logistics.\n\nThank you,\nRonyx Logistics Operations`); window.location.href = `mailto:${selected.insurance_agent_email || ""}?subject=${sub}&body=${body}`; flash("Email to insurance agent opened."); }} style={{ ...ghostBtn, fontSize:"0.75rem" }}>
                Request COI via Email
              </button>
              <button onClick={() => {
                const hasDocs = selected.documents.filter(d => d.file_url);
                if (!hasDocs.length) { flash("No uploaded documents with links yet."); return; }
                const lines = hasDocs.map(d => `• ${d.type}: ${d.file_url}`).join("\n");
                const sub  = encodeURIComponent(`Insurance & Compliance Documents — ${selected.company_name}`);
                const body = encodeURIComponent(`Documents on file for ${selected.company_name}:\n\n${lines}\n\nFor questions contact Ronyx Logistics Operations.`);
                window.location.href = `mailto:?subject=${sub}&body=${body}`;
                flash("Email with all document links opened.");
              }} style={{ ...ghostBtn, fontSize:"0.75rem" }}>
                📧 Email All Documents
              </button>
            </div>
          </div>

          {/* Insurance Documents */}
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10, marginTop:4 }}>🛡️ Insurance Documents</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12, marginBottom:12 }}>
            {[
              { type:"Auto Liability Insurance",    icon:"🚗" },
              { type:"General Liability Insurance", icon:"🏢" },
              { type:"Cargo Insurance",             icon:"📦" },
              { type:"Workers Comp Insurance",      icon:"🩺" },
            ].map(({ type: docType, icon }) => {
              const existing = selected.documents.find(d => d.type === docType);
              const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
              return (
                <div key={docType} style={{ background:existing?"#f0fdf4":"#fff1f2", border:`2px solid ${existing?"#86efac":"#fca5a5"}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:18 }}>{icon}</span>
                    <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.82rem" }}>{docType}</div>
                  </div>
                  <div style={{ fontSize:"0.7rem", color:"#64748b", marginBottom:4 }}>For: <strong style={{ color:"#0f172a" }}>{selected.company_name}</strong></div>
                  {existing ? (
                    <>
                      <div style={{ fontSize:"0.72rem", color:"#15803d", fontWeight:600, marginBottom:4 }}>✓ {existing.file_name}</div>
                      {existing.expires_on && (
                        <div style={{ background:expBg(expDays), color:expColor(expDays), padding:"3px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:700, display:"inline-block", marginBottom:6 }}>
                          {expLabel(expDays, existing.expires_on)}
                        </div>
                      )}
                      {existing.file_url ? (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                          <button onClick={()=>openDoc(existing.file_url!,false,existing.file_name||docType)} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.7rem", fontWeight:700, color:"#1e40af", background:"#dbeafe", padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer" }}>👁 View</button>
                          <button onClick={()=>openDoc(existing.file_url!,true,existing.file_name||docType)} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.7rem", fontWeight:700, color:"#374151", background:"#f3f4f6", padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer" }}>🖨️ Print</button>
                          <a href={`mailto:?subject=${encodeURIComponent(docType+" — "+selected.company_name)}&body=${encodeURIComponent("Document: "+existing.file_name+"\n\nView / download:\n"+existing.file_url)}`} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.7rem", fontWeight:700, color:"#065f46", background:"#d1fae5", padding:"4px 9px", borderRadius:6, textDecoration:"none" }}>📧 Email</a>
                        </div>
                      ) : (
                        <div style={{ fontSize:"0.7rem", color:"#92400e", background:"#fef3c7", border:"1px solid #fde68a", padding:"4px 8px", borderRadius:6, marginBottom:6 }}>⚠ File not stored — click Replace below to re-upload</div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize:"0.72rem", color:"#dc2626", fontWeight:600, marginBottom:6 }}>⚠ Not uploaded — required for dispatch</div>
                  )}
                  <label style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:4, background:existing?"#0f172a":"#dc2626", color:"#fff", padding:"6px 14px", borderRadius:8, fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>
                    {existing ? "🔄 Replace" : "📤 Upload"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleDocUpload(docType,f); e.target.value=""; }} />
                  </label>
                </div>
              );
            })}
          </div>

          {/* COI — 3 named-entity buttons */}
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10 }}>📄 Certificates of Insurance (COI)</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {[
              { type:"COI — Ronyx Logistics",  label:"Ronyx",           fullLabel:"Ronyx Logistics",  icon:"🚚", color:"#15803d", bg:"#f0fdf4", border:"#86efac" },
              { type:"COI — M.A. Mortenson",   label:"M.A. Mortenson", fullLabel:"M.A. Mortenson",   icon:"🏗️", color:"#1e40af", bg:"#eff6ff", border:"#93c5fd" },
              { type:"COI — BAS Equipment",    label:"BAS Equipment",  fullLabel:"BAS Equipment",    icon:"🚜", color:"#0891b2", bg:"#f0f9ff", border:"#7dd3fc" },
            ].map(({ type: docType, label, fullLabel, icon, color, bg, border }) => {
              const existing = selected.documents.find(d => d.type === docType);
              const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
              return (
                <div key={docType} style={{ display:"flex", alignItems:"center", gap:12, background:existing?bg:"#fff1f2", border:`1.5px solid ${existing?border:"#fca5a5"}`, borderRadius:10, padding:"10px 14px" }}>
                  {/* Label */}
                  <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, color:existing?color:"#dc2626", fontSize:"0.82rem" }}>{fullLabel}</div>
                    {existing ? (
                      <div style={{ fontSize:"0.7rem", color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        ✓ {existing.file_name}
                        {existing.expires_on && <span style={{ marginLeft:8, fontWeight:700, color:expColor(expDays) }}>{expLabel(expDays, existing.expires_on)}</span>}
                      </div>
                    ) : (
                      <div style={{ fontSize:"0.7rem", color:"#dc2626", fontWeight:600 }}>Not uploaded</div>
                    )}
                  </div>
                  {/* Single action area */}
                  <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
                    {existing?.file_url && (
                      <button onClick={()=>openDoc(existing.file_url!,false,existing.file_name||docType)}
                        style={{ fontSize:"0.72rem", fontWeight:700, color:color, background:bg, padding:"5px 12px", borderRadius:7, border:`1px solid ${border}`, cursor:"pointer" }}>
                        👁 View / Print
                      </button>
                    )}
                    {existing?.file_url && (
                      <a href={`mailto:?subject=${encodeURIComponent("COI for "+fullLabel+" — "+selected.company_name)}&body=${encodeURIComponent("COI File: "+existing.file_name+"\n\nNamed insured: "+fullLabel+"\nUploaded for: "+selected.company_name+"\n\nView / download:\n"+existing.file_url)}`}
                        style={{ fontSize:"0.72rem", fontWeight:700, color:"#065f46", background:"#d1fae5", padding:"5px 12px", borderRadius:7, border:"1px solid #6ee7b7", textDecoration:"none" }}>
                        📧 Email
                      </a>
                    )}
                    <label style={{ display:"inline-flex", alignItems:"center", gap:4, background:existing?"#0f172a":"#dc2626", color:"#fff", padding:"5px 14px", borderRadius:8, fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>
                      {existing ? "🔄 Replace" : "📤 Upload"}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleDocUpload(docType,f); e.target.value=""; }} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Business / Legal Documents */}
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10 }}>📋 Business & Legal Documents</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12, marginBottom:20 }}>
            {[
              { type:"Contract",             icon:"📝" },
              { type:"W-9 / Tax Form",       icon:"🧾" },
              { type:"MC Authority Letter",  icon:"🏛️" },
              { type:"Safety Rating Letter", icon:"⭐" },
              { type:"1099 Form",            icon:"📊" },
              { type:"Other",                icon:"📁" },
            ].map(({ type: docType, icon }) => {
              const existing = selected.documents.find(d => d.type === docType);
              const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
              return (
                <div key={docType} style={{ background:existing?"#f0fdf4":"#fafafa", border:`1px solid ${existing?"#86efac":"#e2e8f0"}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:16 }}>{icon}</span>
                    <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.82rem" }}>{docType}</div>
                  </div>
                  <div style={{ fontSize:"0.7rem", color:"#64748b", marginBottom:4 }}>For: <strong style={{ color:"#0f172a" }}>{selected.company_name}</strong></div>
                  {existing ? (
                    <>
                      <div style={{ fontSize:"0.72rem", color:"#15803d", fontWeight:600, marginBottom:4 }}>✓ {existing.file_name}</div>
                      {docType === "Contract" ? (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 10px", marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:2 }}>Start Date *</div>
                            <input type="date" defaultValue={existing.issued_on?.slice(0,10)||""} title="Contract start / effective date"
                              onBlur={async e => {
                                const v = e.target.value || null;
                                if (v === (existing.issued_on?.slice(0,10)||null)) return;
                                await apiPut(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:docType,issued_on:v});
                                updateLocalState({...selected, documents:selected.documents.map(x => x.type===docType ? {...x,issued_on:v||undefined} : x)});
                                flash("Contract start date saved.");
                              }}
                              style={{ width:"100%", border:`1px solid ${existing.issued_on?"#e2e8f0":"#fca5a5"}`, borderRadius:6, padding:"4px 6px", fontSize:"0.72rem", color:existing.issued_on?"#0f172a":"#dc2626", fontWeight:600, outline:"none", boxSizing:"border-box" as const, cursor:"pointer", background:existing.issued_on?"#fff":"#fff1f2" }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize:"0.58rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:2 }}>End Date</div>
                            <input type="date" defaultValue={existing.expires_on?.slice(0,10)||""} title="Contract expiration date"
                              onBlur={async e => {
                                const v = e.target.value || null;
                                if (v === (existing.expires_on?.slice(0,10)||null)) return;
                                await apiPut(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:docType,expires_on:v});
                                updateLocalState({...selected, documents:selected.documents.map(x => x.type===docType ? {...x,expires_on:v||undefined} : x)});
                                flash("Contract end date saved.");
                              }}
                              style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 6px", fontSize:"0.72rem", color: expDays!==null&&expDays<0?"#dc2626":expDays!==null&&expDays<=90?"#ca8a04":"#475569", fontWeight:600, outline:"none", boxSizing:"border-box" as const, cursor:"pointer", background: expDays!==null&&expDays<0?"#fff1f2":expDays!==null&&expDays<=90?"#fefce8":"#fff" }}
                            />
                          </div>
                        </div>
                      ) : existing.expires_on ? (
                        <div style={{ background:expBg(expDays), color:expColor(expDays), padding:"3px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:700, display:"inline-block", marginBottom:4 }}>
                          {expLabel(expDays, existing.expires_on)}
                        </div>
                      ) : null}
                      {existing.file_url ? (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                          <button onClick={()=>openDoc(existing.file_url!,false,existing.file_name||docType)} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.7rem", fontWeight:700, color:"#1e40af", background:"#dbeafe", padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer" }}>👁 View</button>
                          <button onClick={()=>openDoc(existing.file_url!,true,existing.file_name||docType)} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.7rem", fontWeight:700, color:"#374151", background:"#f3f4f6", padding:"4px 9px", borderRadius:6, border:"none", cursor:"pointer" }}>🖨️ Print</button>
                          <a href={`mailto:?subject=${encodeURIComponent(docType+" — "+selected.company_name)}&body=${encodeURIComponent("Document: "+existing.file_name+"\n\nView / download:\n"+existing.file_url)}`} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:"0.7rem", fontWeight:700, color:"#065f46", background:"#d1fae5", padding:"4px 9px", borderRadius:6, textDecoration:"none" }}>📧 Email</a>
                        </div>
                      ) : (
                        <div style={{ fontSize:"0.7rem", color:"#92400e", background:"#fef3c7", border:"1px solid #fde68a", padding:"4px 8px", borderRadius:6, marginBottom:6 }}>⚠ File not stored — click Replace below to re-upload</div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginBottom:6 }}>{docType === "Contract" ? <span style={{ color:"#dc2626", fontWeight:600 }}>⚠ Contract not uploaded</span> : "Not uploaded"}</div>
                  )}
                  <label style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:4, background:"#0f172a", color:"#fff", padding:"5px 14px", borderRadius:8, fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>
                    {existing ? "🔄 Replace" : "📤 Upload"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleDocUpload(docType,f); e.target.value=""; }} />
                  </label>
                </div>
              );
            })}
          </div>

          {/* Driver Documents */}
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10 }}>🪪 Driver Documents</div>
          {selected.drivers.length === 0 ? (
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"18px", color:"#94a3b8", fontSize:"0.82rem", marginBottom:20 }}>No drivers on file. Add drivers in the Drivers tab first.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
              {selected.drivers.map(d => {
                async function driverDocUpload(docLabel: string, f: File, hasExp: boolean) {
                  if (!selected) return;
                  const sel = selected;
                  const key = `[${d.name}] ${docLabel}`;
                  const exp = hasExp ? (prompt(`${docLabel} expiration date for ${d.name} (YYYY-MM-DD):`) || undefined) : undefined;
                  await apiPost(`/api/ronyx/owner-operators/${sel.id}/documents`,{doc_type:key,file_name:f.name,expires_on:exp||null});
                  const doc: OODoc = { type:key, uploaded_at:new Date().toISOString(), file_name:f.name, expires_on:exp };
                  updateLocalState({...sel, documents:[doc,...sel.documents.filter(x=>x.type!==key)]});
                  flash(`${docLabel} uploaded for ${d.name}.`);
                }
                return (
                  <div key={d.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 18px" }}>
                    <div style={{ fontWeight:800, color:"#0f172a", marginBottom:12 }}>🧑‍✈️ {d.name}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:10 }}>
                      {[
                        { label:"CDL License",       hasExp:true  },
                        { label:"Medical Card",      hasExp:true  },
                        { label:"MVR Report",        hasExp:false },
                        { label:"Drug Test",         hasExp:false },
                        { label:"Background Check",  hasExp:false },
                      ].map(({ label, hasExp }) => {
                        const key = `[${d.name}] ${label}`;
                        const ex  = selected.documents.find(doc => doc.type === key);
                        const expD = ex?.expires_on ? daysUntil(ex.expires_on) : null;
                        return (
                          <div key={label} style={{ background:ex?"#f0fdf4":"#fafafa", border:`1px solid ${ex?"#86efac":"#e2e8f0"}`, borderRadius:10, padding:"10px 12px" }}>
                            <div style={{ fontWeight:600, color:"#0f172a", fontSize:"0.78rem", marginBottom:4 }}>{label}</div>
                            {ex ? (
                              <div>
                                <div style={{ fontSize:"0.68rem", color:"#15803d", fontWeight:600 }}>✓ On file</div>
                                {ex.expires_on && <div style={{ background:expBg(expD), color:expColor(expD), padding:"2px 6px", borderRadius:5, fontSize:"0.65rem", fontWeight:700, display:"inline-block", marginTop:2 }}>{expLabel(expD,ex.expires_on)}</div>}
                              </div>
                            ) : (
                              <div style={{ fontSize:"0.68rem", color:"#94a3b8" }}>Not uploaded</div>
                            )}
                            <label style={{ display:"inline-block", marginTop:6, background:"#1e40af", color:"#fff", border:"none", borderRadius:6, padding:"3px 10px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>
                              {ex?"Replace":"Upload"}
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) driverDocUpload(label,f,hasExp); e.target.value=""; }} />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All uploaded documents list */}
          {selected.documents.length > 0 && (
            <div>
              <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10 }}>📁 All Uploaded Documents ({selected.documents.length})</div>
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {["Document","File","Uploaded","Expires","Actions"].map(h=>(
                        <th key={h} style={{ padding:"10px 14px", fontSize:"0.65rem", fontWeight:700, color:"#475569", textTransform:"uppercase", textAlign:"left", borderBottom:"1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.documents.map((doc, i) => {
                      const expD = doc.expires_on ? daysUntil(doc.expires_on) : null;
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid #f1f5f9", background: i%2===0?"#fff":"#fafafa" }}>
                          <td style={{ padding:"10px 14px", fontWeight:700, color:"#0f172a", fontSize:"0.82rem" }}>
                            <div>{doc.type}</div>
                            <div style={{ fontSize:"0.68rem", color:"#94a3b8", fontWeight:400, marginTop:2 }}>{selected.company_name}</div>
                          </td>
                          <td style={{ padding:"10px 14px", color:"#475569", fontSize:"0.75rem", maxWidth:200 }}>
                            <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{doc.file_name || "—"}</div>
                          </td>
                          <td style={{ padding:"10px 14px", color:"#94a3b8", fontSize:"0.72rem", whiteSpace:"nowrap" }}>{fmtDate(doc.uploaded_at)}</td>
                          <td style={{ padding:"10px 14px" }}>
                            {doc.type === "Contract" ? (
                              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                <div>
                                  <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:2 }}>Start</div>
                                  <input
                                    type="date"
                                    defaultValue={doc.issued_on?.slice(0,10) || ""}
                                    title="Contract start / effective date"
                                    onBlur={async e => {
                                      const newDate = e.target.value || null;
                                      if (newDate === (doc.issued_on?.slice(0,10)||null)) return;
                                      await apiPut(`/api/ronyx/owner-operators/${selected.id}/documents`, { doc_type: doc.type, issued_on: newDate });
                                      updateLocalState({ ...selected, documents: selected.documents.map((d,j) => j===i ? { ...d, issued_on: newDate||undefined } : d) });
                                      flash("Contract start date updated.");
                                    }}
                                    style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"3px 8px", fontSize:"0.7rem", color:"#475569", fontWeight:600, cursor:"pointer", outline:"none", width:130 }}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize:"0.6rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:2 }}>End</div>
                                  <input
                                    type="date"
                                    defaultValue={doc.expires_on?.slice(0,10) || ""}
                                    title="Contract expiration date"
                                    onBlur={async e => {
                                      const newDate = e.target.value || null;
                                      if (newDate === (doc.expires_on?.slice(0,10)||null)) return;
                                      await apiPut(`/api/ronyx/owner-operators/${selected.id}/documents`, { doc_type: doc.type, expires_on: newDate });
                                      updateLocalState({ ...selected, documents: selected.documents.map((d,j) => j===i ? { ...d, expires_on: newDate||undefined } : d) });
                                      flash("Contract end date updated.");
                                    }}
                                    style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"3px 8px", fontSize:"0.72rem", background: expBg(expD), color: expColor(expD)||"#475569", fontWeight:700, cursor:"pointer", outline:"none", width:130 }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <input
                                type="date"
                                defaultValue={doc.expires_on?.slice(0,10) || ""}
                                title="Click to set or override expiration date"
                                onBlur={async e => {
                                  const newDate = e.target.value || null;
                                  if (newDate === (doc.expires_on?.slice(0,10)||null)) return;
                                  await apiPut(`/api/ronyx/owner-operators/${selected.id}/documents`, { doc_type: doc.type, expires_on: newDate });
                                  updateLocalState({ ...selected, documents: selected.documents.map((d,j) => j===i ? { ...d, expires_on: newDate||undefined } : d) });
                                  flash(`Expiration date updated for ${doc.type}.`);
                                }}
                                style={{ border:"1px solid #e2e8f0", borderRadius:6, padding:"3px 8px", fontSize:"0.72rem", background: expBg(expD), color: expColor(expD)||"#475569", fontWeight:700, cursor:"pointer", outline:"none", width:130 }}
                              />
                            )}
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                              {/* View button — opens file in new tab */}
                              {doc.file_url ? (
                                <button
                                  onClick={()=>openDoc(doc.file_url!)}
                                  style={{ background:"#eff6ff", color:"#1e40af", border:"1px solid #bfdbfe", borderRadius:6, padding:"4px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}
                                >
                                  👁 View
                                </button>
                              ) : (
                                <span style={{ background:"#f1f5f9", color:"#94a3b8", border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 10px", fontSize:"0.72rem", fontWeight:600, whiteSpace:"nowrap" }} title="No file URL — re-upload to store file">
                                  No file
                                </span>
                              )}
                              {/* Replace / re-upload */}
                              <label style={{ background:"#f8fafc", color:"#475569", border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                                🔄 Replace
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f) handleDocUpload(doc.type,f); e.target.value=""; }} />
                              </label>
                              {/* Remove */}
                              <button onClick={async ()=>{
                                await fetch(`/api/ronyx/owner-operators/${selected.id}/documents`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({doc_type:doc.type})});
                                updateLocalState({...selected,documents:selected.documents.filter((_,j)=>j!==i)});
                                flash("Document removed.");
                              }} style={{ background:"#fee2e2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:6, padding:"4px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                                🗑 Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:10, padding:"10px 14px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.75rem", color:"#64748b" }}>
                💡 Documents without a "View" button were uploaded before file storage was enabled. Click "Replace" to re-upload and get a permanent link.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Project Jobs ── */}
      {activeTab === "jobs" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:10, marginBottom:14 }}>
            <KPI label="Total Loads"   value={filteredJobs.length} />
            <KPI label="Gross Revenue" value={`$${totalRevenue.toLocaleString()}`} color="#15803d" />
            <KPI label="OO Settlement" value={`$${totalOOPay.toLocaleString()}`}   color="#1e40af" />
            <KPI label="Your Margin"   value={`$${totalMargin.toLocaleString()}`}  color="#7c3aed" />
            <KPI label="Pending"       value={pendingCount} color={pendingCount>0?"#d97706":undefined} />
            <KPI label="Pending Pay"   value={`$${pendingAmount.toLocaleString()}`} color={pendingAmount>0?"#d97706":undefined} />
          </div>

          <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
            <select value={jobFilter} onChange={e=>setJobFilter(e.target.value)} style={{ ...inp, width:"auto", flex:1 }}>
              <option value="All Projects">All Projects</option>
              {projectNumbers.map(p=><option key={p}>{p}</option>)}
            </select>
            <select value={settlementFilter} onChange={e=>setSettlementFilter(e.target.value)} style={{ ...inp, width:"auto" }}>
              {["All","Pending","Approved","Processing","Paid","Hold"].map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowAddJob(s=>!s)} style={primaryBtn}>+ Add Load</button>
            {pendingCount>0 && <button onClick={() => { const oo={...selected,jobs:selected.jobs.map(j=>filteredJobs.find(f=>f.id===j.id&&j.settlement_status==="Pending")?{...j,settlement_status:"Approved" as const}:j)}; updateLocalState(oo); filteredJobs.filter(j=>j.settlement_status==="Pending").forEach(j=>apiPut(`/api/ronyx/owner-operators/${selected.id}/jobs`,{job_id:j.id,settlement_status:"Approved"})); flash(`${pendingCount} approved.`); }} style={{ ...primaryBtn, background:"#15803d" }}>✓ Approve All Pending</button>}
            <button onClick={() => {
              const h=["Date","Project #","Project Name","Truck","Driver","Origin","Destination","Material","Tons","Revenue","OO Pay","Margin","Ticket","Settlement"];
              const rows=filteredJobs.map(j=>[j.load_date,j.project_number,j.project_name,j.truck_number,j.driver_name,j.origin,j.destination,j.material,j.tons,j.gross_revenue,j.oo_rate,j.margin,j.ticket_status||"Verified",j.settlement_status]);
              const csv=[h,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
              const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download=`${selected.company_name.replace(/\s+/g,"_")}_loads.csv`; a.click();
              flash("CSV downloaded.");
            }} style={ghostBtn}>⬇ CSV</button>
            {selected.contact_email && <button onClick={() => {
              const sub=encodeURIComponent(`Load Report — ${selected.company_name} — ${new Date().toLocaleDateString()}`);
              const lines=[`Dear ${selected.contact_name||selected.company_name},`,"","Load Report from MoveAround TMS:",""];
              filteredJobs.forEach(j=>lines.push(`${j.load_date} | ${j.project_number} | ${j.truck_number} | ${j.driver_name} | $${j.oo_rate} | ${j.settlement_status}`));
              lines.push("","Thank you,","Ronyx Logistics Operations Team");
              window.location.href=`mailto:${selected.contact_email}?subject=${sub}&body=${encodeURIComponent(lines.join("\n"))}`;
              flash("Email client opened.");
            }} style={{ ...primaryBtn, background:"#7c3aed" }}>✉ Email Report</button>}
          </div>

          {showAddJob && (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px", marginBottom:14 }}>
              <h3 style={{ margin:"0 0 12px", fontWeight:800 }}>Add Load</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px 14px" }}>
                <div><label style={lbl}>Project Name</label><input value={addJobForm.project_name} onChange={e=>setAddJobForm(f=>({...f,project_name:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Project # *</label><input value={addJobForm.project_number} onChange={e=>setAddJobForm(f=>({...f,project_number:e.target.value}))} style={inp} placeholder="DOMINO-2026-001" /></div>
                <div><label style={lbl}>Load Date *</label><input type="date" value={addJobForm.load_date} onChange={e=>setAddJobForm(f=>({...f,load_date:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Truck #</label><select value={addJobForm.truck_number} onChange={e=>setAddJobForm(f=>({...f,truck_number:e.target.value}))} style={inp}><option value="">Select…</option>{selected.trucks.map(t=><option key={t.id}>{t.truck_number}</option>)}</select></div>
                <div><label style={lbl}>Driver</label><select value={addJobForm.driver_name} onChange={e=>setAddJobForm(f=>({...f,driver_name:e.target.value}))} style={inp}><option value="">Select…</option>{selected.drivers.map(d=><option key={d.id}>{d.name}</option>)}</select></div>
                <div><label style={lbl}>Material</label><input value={addJobForm.material} onChange={e=>setAddJobForm(f=>({...f,material:e.target.value}))} style={inp} placeholder="Limestone" /></div>
                <div><label style={lbl}>Origin</label><input value={addJobForm.origin} onChange={e=>setAddJobForm(f=>({...f,origin:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Destination</label><input value={addJobForm.destination} onChange={e=>setAddJobForm(f=>({...f,destination:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Tons</label><input type="number" step="0.1" value={addJobForm.tons||""} onChange={e=>setAddJobForm(f=>({...f,tons:parseFloat(e.target.value)||0}))} style={inp} /></div>
                <div><label style={lbl}>Gross Revenue ($)</label><input type="number" value={addJobForm.gross_revenue||""} onChange={e=>setAddJobForm(f=>({...f,gross_revenue:parseFloat(e.target.value)||0}))} style={inp} /></div>
                <div><label style={lbl}>OO Pay ($)</label><input type="number" value={addJobForm.oo_rate||""} onChange={e=>setAddJobForm(f=>({...f,oo_rate:parseFloat(e.target.value)||0}))} style={inp} /></div>
                <div><label style={lbl}>Ticket Status</label><select value={addJobForm.ticket_status} onChange={e=>setAddJobForm(f=>({...f,ticket_status:e.target.value as OOJob["ticket_status"]}))} style={inp}><option>Verified</option><option>Needs Review</option><option>Missing</option><option>Duplicate</option></select></div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button onClick={addJob} style={primaryBtn}>Add Load</button>
                <button onClick={() => setShowAddJob(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"40px 0", textAlign:"center", color:"#94a3b8" }}>No loads match filters.</div>
          ) : (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Date","Project #","Truck","Driver","Route","Tons","Revenue","OO Pay","Margin","Ticket","Settlement",""].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", fontSize:"0.65rem", fontWeight:700, color:"#475569", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(j => {
                    const [sBg,sColor]=settlementColors(j.settlement_status);
                    const [tBg,tColor]=ticketStatusColors(j.ticket_status);
                    return (
                      <tr key={j.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"9px 12px", color:"#475569", whiteSpace:"nowrap" }}>{fmtDate(j.load_date)}</td>
                        <td style={{ padding:"9px 12px" }}><span style={{ fontWeight:700, color:"#1e40af", fontSize:"0.72rem" }}>{j.project_number}</span></td>
                        <td style={{ padding:"9px 12px", fontWeight:600 }}>{j.truck_number||"—"}</td>
                        <td style={{ padding:"9px 12px", color:"#475569" }}>{j.driver_name||"—"}</td>
                        <td style={{ padding:"9px 12px", color:"#64748b", fontSize:"0.72rem" }}>{j.origin}→{j.destination}</td>
                        <td style={{ padding:"9px 12px", fontWeight:600 }}>{j.tons}t</td>
                        <td style={{ padding:"9px 12px", fontWeight:700, color:"#15803d" }}>${j.gross_revenue.toLocaleString()}</td>
                        <td style={{ padding:"9px 12px", fontWeight:700, color:"#1e40af" }}>${j.oo_rate.toLocaleString()}</td>
                        <td style={{ padding:"9px 12px", fontWeight:700, color:"#7c3aed" }}>${j.margin.toLocaleString()}</td>
                        <td style={{ padding:"9px 12px" }}>
                          <select value={j.ticket_status||"Verified"} onChange={e=>setTicketStatus(selected.id,j.id,e.target.value as OOJob["ticket_status"])} style={{ background:tBg, color:tColor, border:"none", borderRadius:6, padding:"3px 6px", fontSize:"0.7rem", fontWeight:700, cursor:"pointer" }}>
                            {["Verified","Needs Review","Missing","Duplicate"].map(s=><option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:"9px 12px" }}><span style={{ background:sBg, color:sColor, padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.7rem" }}>{j.settlement_status}</span></td>
                        <td style={{ padding:"9px 12px" }}>
                          <div style={{ display:"flex", gap:3 }}>
                            {j.settlement_status==="Pending"  && <button onClick={()=>setSettlement(selected.id,j.id,"Approved")}   style={{ background:"#eff6ff", color:"#1e40af", border:"none", borderRadius:5, padding:"3px 7px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>Approve</button>}
                            {j.settlement_status==="Approved" && <button onClick={()=>setSettlement(selected.id,j.id,"Paid")}      style={{ background:"#f0fdf4", color:"#15803d", border:"none", borderRadius:5, padding:"3px 7px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>Paid</button>}
                            {!["Hold","Paid"].includes(j.settlement_status) && <button onClick={()=>setSettlement(selected.id,j.id,"Hold")} style={{ background:"#fff1f2", color:"#dc2626", border:"none", borderRadius:5, padding:"3px 7px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>Hold</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Settlement Center ── */}
      {activeTab === "settlement" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:10, marginBottom:20 }}>
            <KPI label="Completed Loads" value={selected.jobs.filter(j=>j.settlement_status==="Paid").length} color="#15803d" bg="#f0fdf4" />
            <KPI label="Tickets Verified" value={tick.verified}   color="#15803d" />
            <KPI label="Tickets Missing"  value={tick.missing}   color={tick.missing>0?"#dc2626":undefined} bg={tick.missing>0?"#fff1f2":undefined} />
            <KPI label="Payroll Holds"    value={selected.jobs.filter(j=>j.settlement_status==="Hold").length} color={selected.jobs.filter(j=>j.settlement_status==="Hold").length>0?"#dc2626":undefined} />
            <KPI label="Settlement Ready" value={`$${settlementReady.toLocaleString()}`} color="#1e40af" bg="#eff6ff" />
            <KPI label="Total Paid"       value={`$${selected.jobs.filter(j=>j.settlement_status==="Paid").reduce((s,j)=>s+j.oo_rate,0).toLocaleString()}`} color="#15803d" />
          </div>

          {/* Holds */}
          {selected.jobs.filter(j=>j.settlement_status==="Hold").length > 0 && (
            <div style={{ background:"#fff1f2", border:"1px solid #fda4af", borderRadius:14, padding:"14px 18px", marginBottom:14 }}>
              <div style={{ fontWeight:800, color:"#dc2626", marginBottom:10 }}>Settlement Holds</div>
              {selected.jobs.filter(j=>j.settlement_status==="Hold").map(j => (
                <div key={j.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #fda4af30" }}>
                  <div>
                    <span style={{ fontWeight:700, color:"#0f172a" }}>{j.load_date} · {j.truck_number} · {j.driver_name}</span>
                    <span style={{ marginLeft:10, fontSize:"0.78rem", color:"#dc2626" }}>OO Pay: ${j.oo_rate} · {j.ticket_status==="Missing"?"Missing Ticket":j.ticket_status||"Check ticket"}</span>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setSettlement(selected.id,j.id,"Approved")} style={{ background:"#eff6ff", color:"#1e40af", border:"none", borderRadius:6, padding:"4px 10px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Approve</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ready to settle */}
          {selected.jobs.filter(j=>j.settlement_status==="Approved").length > 0 && (
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:14, padding:"14px 18px", marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontWeight:800, color:"#1e40af" }}>Ready to Settle — ${settlementReady.toLocaleString()}</div>
                <button onClick={() => { const oo={...selected,jobs:selected.jobs.map(j=>j.settlement_status==="Approved"?{...j,settlement_status:"Paid" as const}:j)}; updateLocalState(oo); selected.jobs.filter(j=>j.settlement_status==="Approved").forEach(j=>apiPut(`/api/ronyx/owner-operators/${selected.id}/jobs`,{job_id:j.id,settlement_status:"Paid"})); flash(`All settlements marked Paid.`); }} style={primaryBtn}>✓ Mark All Paid</button>
              </div>
              {selected.jobs.filter(j=>j.settlement_status==="Approved").map(j => (
                <div key={j.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #bfdbfe50" }}>
                  <span style={{ fontWeight:600, color:"#0f172a" }}>{fmtDate(j.load_date)} · {j.truck_number} · {j.driver_name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontWeight:800, color:"#1e40af" }}>${j.oo_rate.toLocaleString()}</span>
                    <button onClick={()=>setSettlement(selected.id,j.id,"Paid")} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #86efac", borderRadius:6, padding:"3px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Mark Paid</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All loads settlement grid */}
          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Date","Project #","Driver","Ticket Status","OO Pay","Settlement"].map(h=>(
                    <th key={h} style={{ padding:"8px 14px", fontSize:"0.68rem", fontWeight:700, color:"#475569", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.jobs.map(j => {
                  const [sBg,sColor]=settlementColors(j.settlement_status);
                  const [tBg,tColor]=ticketStatusColors(j.ticket_status);
                  return (
                    <tr key={j.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                      <td style={{ padding:"9px 14px", color:"#475569" }}>{fmtDate(j.load_date)}</td>
                      <td style={{ padding:"9px 14px", fontWeight:700, color:"#1e40af", fontSize:"0.78rem" }}>{j.project_number}</td>
                      <td style={{ padding:"9px 14px", color:"#475569" }}>{j.driver_name||"—"}</td>
                      <td style={{ padding:"9px 14px" }}><span style={{ background:tBg, color:tColor, padding:"3px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:700 }}>{j.ticket_status||"Verified"}</span></td>
                      <td style={{ padding:"9px 14px", fontWeight:800, color:"#1e40af" }}>${j.oo_rate.toLocaleString()}</td>
                      <td style={{ padding:"9px 14px" }}><span style={{ background:sBg, color:sColor, padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.72rem" }}>{j.settlement_status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Compliance Monitor Tab ── */}
      {activeTab === "compliance" && (() => {
        const insDoc    = selected.documents.find(d => ["Insurance Certificate","Auto Liability Insurance","General Liability Insurance","Insurance Certificate (COI)","Cargo Insurance"].includes(d.type));
        const autoIns   = selected.documents.find(d => d.type === "Auto Liability Insurance");
        const glIns     = selected.documents.find(d => d.type === "General Liability Insurance");
        const cargoIns  = selected.documents.find(d => d.type === "Cargo Insurance");
        const contract  = selected.documents.find(d => d.type === "Contract");
        const w9        = selected.documents.find(d => d.type === "W-9");
        const [eligible, blockReasons] = ooDispatchEligible(selected);

        function complianceStatus(doc?: OODoc): string {
          if (!doc) return "Missing";
          const days = doc.expires_on ? daysUntil(doc.expires_on) : null;
          if (days === null) return "On File";
          if (days < 0) return "Expired";
          if (days <= 30) return "Expiring Soon";
          return "Valid";
        }
        function statusBadge(s: string) {
          const styles: Record<string, [string, string]> = {
            "Valid":          ["#f0fdf4","#15803d"],
            "On File":        ["#f0fdf4","#15803d"],
            "Expiring Soon":  ["#fefce8","#d97706"],
            "Expired":        ["#fff1f2","#dc2626"],
            "Missing":        ["#fff7ed","#c2410c"],
          };
          const [bg, color] = styles[s] || ["#f1f5f9","#475569"];
          return <span style={{ background:bg, color, padding:"3px 10px", borderRadius:20, fontWeight:800, fontSize:"0.72rem" }}>{s}</span>;
        }

        const insStatus    = complianceStatus(insDoc || autoIns);
        const rmisStatus   = (!selected.mc_number || !selected.dot_number) ? "Incomplete" : blockReasons.length === 0 ? "Certified" : insStatus === "Expired" ? "Non-Certified" : "Warning";
        const [rBg, rColor] = rmisStatus==="Certified" ? ["#f0fdf4","#15803d"] : rmisStatus==="Non-Certified" ? ["#fff1f2","#dc2626"] : ["#fefce8","#d97706"];

        const driverIssues = selected.drivers.filter(d => {
          const cdlDays = daysUntil(d.cdl_expiration);
          const medDays = daysUntil(d.med_card_expiration);
          return (cdlDays !== null && cdlDays <= 0) || (medDays !== null && medDays <= 0);
        });

        return (
          <div>
            {/* Compliance Status Banner */}
            <div style={{ background: rmisStatus==="Non-Certified"?"#1e293b":"#fff", border:`1px solid ${rColor}`, borderRadius:14, padding:"18px 22px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>RMIS / Compliance Status</div>
                  <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                    <span style={{ background:rBg, color:rColor, padding:"8px 20px", borderRadius:20, fontWeight:900, fontSize:"1rem" }}>{rmisStatus}</span>
                    <div style={{ fontSize:"0.82rem", color: rmisStatus==="Non-Certified"?"#94a3b8":"#64748b" }}>
                      MC: {selected.mc_number||"—"} · DOT: {selected.dot_number||"—"}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>Dispatch</div>
                    <span style={{ background:eligible?"#f0fdf4":"#fff1f2", color:eligible?"#15803d":"#dc2626", padding:"6px 14px", borderRadius:20, fontWeight:800, fontSize:"0.85rem" }}>
                      {eligible ? "✓ Eligible" : "✗ Blocked"}
                    </span>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"0.62rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", marginBottom:4 }}>Settlement</div>
                    <span style={{ background:eligible?"#f0fdf4":"#fff1f2", color:eligible?"#15803d":"#dc2626", padding:"6px 14px", borderRadius:20, fontWeight:800, fontSize:"0.85rem" }}>
                      {eligible ? "✓ Eligible" : "✗ Hold"}
                    </span>
                  </div>
                </div>
              </div>
              {blockReasons.length > 0 && (
                <div style={{ marginTop:12, display:"flex", flexWrap:"wrap", gap:6 }}>
                  {blockReasons.map((r,i) => (
                    <span key={i} style={{ background:"#fff1f2", color:"#dc2626", padding:"4px 10px", borderRadius:8, fontSize:"0.72rem", fontWeight:700, border:"1px solid #fca5a5" }}>✗ {r}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {/* Insurance Certifications */}
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Insurance Certifications</div>
                {[
                  { label:"Auto Liability",    doc: autoIns || insDoc },
                  { label:"General Liability", doc: glIns },
                  { label:"Cargo Insurance",   doc: cargoIns },
                ].map(({ label, doc }) => {
                  const days = doc?.expires_on ? daysUntil(doc.expires_on) : null;
                  const st   = complianceStatus(doc);
                  return (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f1f5f9" }}>
                      <div>
                        <div style={{ fontWeight:600, color:"#0f172a", fontSize:"0.85rem" }}>{label}</div>
                        {doc?.expires_on && <div style={{ fontSize:"0.7rem", color:expColor(days), fontWeight:600 }}>Exp: {expLabel(days, doc.expires_on)}</div>}
                        {!doc && <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>No document on file</div>}
                      </div>
                      {statusBadge(st)}
                    </div>
                  );
                })}
              </div>

              {/* Carrier Documents */}
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Carrier Documents</div>
                {[
                  { label:"MC Authority",  val: selected.mc_number ? "On File" : "Missing" },
                  { label:"DOT #",         val: selected.dot_number ? "On File" : "Missing" },
                  { label:"EIN / Tax ID",  val: selected.ein ? "On File" : "Missing" },
                  { label:"Contract",      val: complianceStatus(contract) },
                  { label:"W-9",           val: complianceStatus(w9) },
                  { label:"COI",           val: complianceStatus(insDoc) },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
                    <span style={{ fontWeight:600, color:"#0f172a", fontSize:"0.84rem" }}>{label}</span>
                    {statusBadge(val)}
                  </div>
                ))}
              </div>

              {/* Driver Compliance */}
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>Driver Document Compliance</div>
                {selected.drivers.length === 0 ? (
                  <div style={{ color:"#94a3b8", fontSize:"0.82rem" }}>No drivers on file.</div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.78rem" }}>
                      <thead>
                        <tr>
                          {["Driver","CDL","CDL Exp.","Med Card","Med Exp.","Status"].map(h=>(
                            <th key={h} style={{ padding:"6px 10px", fontSize:"0.63rem", fontWeight:700, color:"#94a3b8", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.drivers.map(d => {
                          const cdlDays = daysUntil(d.cdl_expiration);
                          const medDays = daysUntil(d.med_card_expiration);
                          const cdlSt   = cdlDays===null?"Missing":cdlDays<0?"Expired":cdlDays<=30?"Expiring Soon":"Valid";
                          const medSt   = medDays===null?"Missing":medDays<0?"Expired":medDays<=30?"Expiring Soon":"Valid";
                          const ok      = cdlSt==="Valid" && medSt==="Valid";
                          return (
                            <tr key={d.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                              <td style={{ padding:"7px 10px", fontWeight:600, color:"#0f172a" }}>{d.name}</td>
                              <td style={{ padding:"7px 10px" }}>{statusBadge(cdlSt)}</td>
                              <td style={{ padding:"7px 10px", color:expColor(cdlDays), fontWeight:600, fontSize:"0.72rem" }}>{expLabel(cdlDays,d.cdl_expiration)}</td>
                              <td style={{ padding:"7px 10px" }}>{statusBadge(medSt)}</td>
                              <td style={{ padding:"7px 10px", color:expColor(medDays), fontWeight:600, fontSize:"0.72rem" }}>{expLabel(medDays,d.med_card_expiration)}</td>
                              <td style={{ padding:"7px 10px" }}><span style={{ color:ok?"#15803d":"#dc2626", fontWeight:700 }}>{ok?"✓ OK":"✗ Action"}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Office Compliance Assistant */}
              <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:14, padding:"16px 20px" }}>
                <div style={{ fontWeight:800, color:"#f8fafc", marginBottom:12 }}>🤖 Compliance Assistant</div>
                {rmisStatus === "Non-Certified" ? (
                  <div>
                    <div style={{ color:"#fca5a5", fontWeight:700, marginBottom:10, fontSize:"0.85rem" }}>{selected.company_name} is NON-CERTIFIED.</div>
                    {[
                      "Dispatch is BLOCKED — do not assign new loads.",
                      "Settlements are on HOLD until insurance is updated.",
                      "Request new COI from insurance agent immediately.",
                      "Do NOT dispatch until status is updated to Certified.",
                    ].map((s,i)=>(
                      <div key={i} style={{ color:"#e2e8f0", fontSize:"0.78rem", marginBottom:8, display:"flex", gap:8 }}>
                        <span style={{ background:"#dc2626", color:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700, flexShrink:0 }}>{i+1}</span>
                        {s}
                      </div>
                    ))}
                  </div>
                ) : rmisStatus === "Warning" ? (
                  <div>
                    {blockReasons.map((r,i)=>(
                      <div key={i} style={{ color:"#fde68a", fontSize:"0.78rem", marginBottom:8, display:"flex", gap:8 }}>
                        <span style={{ background:"#d97706", color:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700, flexShrink:0 }}>!</span>
                        {r}
                      </div>
                    ))}
                    {driverIssues.length > 0 && (
                      <div style={{ marginTop:10, color:"#fda4af", fontWeight:600, fontSize:"0.78rem" }}>
                        {driverIssues.length} driver{driverIssues.length>1?"s":""} with expired documents: {driverIssues.map(d=>d.name).join(", ")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color:"#86efac", fontWeight:700, textAlign:"center", padding:"20px 0" }}>✓ Carrier is Certified — all clear.</div>
                )}
                <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
                  <button onClick={() => { window.open(`https://safer.fmcsa.dot.gov/query.asp?query_param=USDOT&query_string=${selected.dot_number?.replace(/[^0-9]/g,"")||""}`, "_blank"); flash("FMCSA SAFER opened."); }} style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:8, padding:"6px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>FMCSA Verify</button>
                  <button onClick={() => setActiveTab("documents")} style={{ background:"transparent", color:"#cbd5e1", border:"1px solid #334155", borderRadius:8, padding:"6px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Upload Documents</button>
                </div>
              </div>
            </div>

            {/* Truck Compliance */}
            {selected.trucks.length > 0 && (
              <div style={{ marginTop:14, background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 20px" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Fleet Compliance</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10 }}>
                  {selected.trucks.map(t => {
                    const inspDays = t.last_inspection ? daysUntil(new Date(new Date(t.last_inspection).getTime() + 365*86400000).toISOString().slice(0,10)) : null;
                    const inspSt  = inspDays===null?"Missing":inspDays<0?"Expired":inspDays<=30?"Expiring Soon":"Valid";
                    return (
                      <div key={t.id} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"10px 14px" }}>
                        <div style={{ fontWeight:700, color:"#0f172a", marginBottom:8 }}>🚛 {t.truck_number}</div>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                          <span style={{ fontSize:"0.72rem", color:"#64748b" }}>Last Inspection</span>
                          {statusBadge(inspSt)}
                        </div>
                        {t.last_inspection && <div style={{ fontSize:"0.68rem", color:"#94a3b8" }}>Inspected: {fmtDate(t.last_inspection)}</div>}
                        {t.inspection_result && <div style={{ fontSize:"0.68rem", color: t.inspection_result==="Pass"?"#15803d":t.inspection_result==="Fail"?"#dc2626":"#d97706", fontWeight:700 }}>{t.inspection_result}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Subcontractors Tab ── */}
      {activeTab === "subs" && (
        <div style={{ padding:"4px 0" }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:"0.68rem", fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em" }}>Subcontractors</div>
              <div style={{ fontSize:"0.8rem", color:"#64748b", marginTop:2 }}>
                {selected.subcontractors.length} subcontractor{selected.subcontractors.length!==1?"s":""} working under {selected.company_name}
              </div>
            </div>
            <button onClick={()=>setShowAddSub(s=>!s)} style={primaryBtn}>+ Add Subcontractor</button>
          </div>

          {/* Add form */}
          {showAddSub && (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"18px 20px", marginBottom:16 }}>
              <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.88rem", marginBottom:12 }}>New Subcontractor</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px 14px" }}>
                {([["Company Name *","company_name","ABC Hauling LLC"],["Contact Name","contact_name","John Smith"],["Phone","contact_phone","(555) 000-0000"],["Email","contact_email","john@abchauling.com"],["MC #","mc_number","MC-123456"],["DOT #","dot_number","1234567"]] as [string, keyof typeof addSubForm, string][]).map(([label,field,ph]) => (
                  <div key={field}>
                    <label style={lbl}>{label}</label>
                    <input value={addSubForm[field]} onChange={e=>setAddSubForm(f=>({...f,[field]:e.target.value}))} style={inp} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button onClick={async ()=>{
                  if (!addSubForm.company_name.trim()) { flash("Company name required."); return; }
                  const res = await apiPost(`/api/ronyx/owner-operators/${selected.id}/subcontractors`, addSubForm);
                  if (res.error) { flash(`Error: ${res.error}`); return; }
                  const newSub: OOSubcontractor = { ...res.subcontractor, drivers: [] };
                  updateLocalState({ ...selected, subcontractors: [...selected.subcontractors, newSub] });
                  setAddSubForm({ company_name:"", contact_name:"", contact_phone:"", contact_email:"", mc_number:"", dot_number:"" });
                  setShowAddSub(false);
                  flash(`${newSub.company_name} added as subcontractor.`);
                }} style={primaryBtn}>Add Subcontractor</button>
                <button onClick={()=>setShowAddSub(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {/* Subcontractor cards */}
          {selected.subcontractors.length === 0 ? (
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"48px 0", textAlign:"center", color:"#94a3b8" }}>
              <div style={{ fontSize:"2rem", marginBottom:8 }}>🏗️</div>
              <div style={{ fontWeight:600, marginBottom:4 }}>No subcontractors yet</div>
              <div style={{ fontSize:"0.8rem" }}>Add subcontractors that haul under {selected.company_name}</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {selected.subcontractors.map(sub => {
                const expanded  = expandedSubs.has(sub.id);
                const driverForm = subDriverForms[sub.id] || { name:"", phone:"", cdl_number:"", cdl_expiration:"" };
                const [showDriverForm, setShowDriverFormFor] = [!!subDriverForms[`show_${sub.id}`], (v: boolean) => setSubDriverForms(f=>({ ...f, [`show_${sub.id}`]: v as any }))];

                return (
                  <div key={sub.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
                    {/* Sub header */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", cursor:"pointer" }} onClick={()=>setExpandedSubs(s=>{ const n=new Set(s); n.has(sub.id)?n.delete(sub.id):n.add(sub.id); return n; })}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:"#eff6ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem", fontWeight:900, color:"#1e40af" }}>
                          {sub.company_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.9rem" }}>{sub.company_name}</div>
                          <div style={{ fontSize:"0.72rem", color:"#64748b" }}>
                            {sub.contact_name && <span>{sub.contact_name}</span>}
                            {sub.contact_phone && <span style={{ marginLeft:8 }}>📞 {sub.contact_phone}</span>}
                            {sub.mc_number && <span style={{ marginLeft:8, background:"#eff6ff", color:"#1e40af", padding:"1px 6px", borderRadius:4, fontWeight:700 }}>MC# {sub.mc_number}</span>}
                            {sub.dot_number && <span style={{ marginLeft:6, background:"#f0fdf4", color:"#15803d", padding:"1px 6px", borderRadius:4, fontWeight:700 }}>DOT# {sub.dot_number}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ background:"#eff6ff", color:"#1e40af", padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:700 }}>
                          {sub.drivers.length} driver{sub.drivers.length!==1?"s":""}
                        </span>
                        <span style={{ color:"#94a3b8", fontSize:"1rem" }}>{expanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded: drivers + actions */}
                    {expanded && (
                      <div style={{ borderTop:"1px solid #f1f5f9", padding:"14px 18px", background:"#fafbfc" }}>
                        {/* Drivers table */}
                        {sub.drivers.length > 0 ? (
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem", marginBottom:12 }}>
                            <thead>
                              <tr style={{ background:"#f1f5f9" }}>
                                {["Driver Name","Phone","CDL #","CDL Expiration",""].map(h=>(
                                  <th key={h} style={{ padding:"6px 10px", fontWeight:700, color:"#475569", fontSize:"0.68rem", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sub.drivers.map(d => (
                                <tr key={d.id} style={{ borderBottom:"1px solid #f1f5f9" }}>
                                  <td style={{ padding:"8px 10px", fontWeight:700, color:"#0f172a" }}>{d.name}</td>
                                  <td style={{ padding:"8px 10px", color:"#475569" }}>{d.phone || "—"}</td>
                                  <td style={{ padding:"8px 10px", color:"#475569" }}>{d.cdl_number || "—"}</td>
                                  <td style={{ padding:"8px 10px" }}>
                                    {d.cdl_expiration ? (
                                      <span style={{ background:expBg(daysUntil(d.cdl_expiration)), color:expColor(daysUntil(d.cdl_expiration)), padding:"2px 7px", borderRadius:6, fontWeight:700, fontSize:"0.72rem" }}>
                                        {expLabel(daysUntil(d.cdl_expiration), d.cdl_expiration)}
                                      </span>
                                    ) : <span style={{ color:"#94a3b8" }}>—</span>}
                                  </td>
                                  <td style={{ padding:"8px 10px" }}>
                                    <button onClick={async ()=>{
                                      await apiDelete(`/api/ronyx/owner-operators/${selected.id}/subcontractors/${sub.id}/drivers/${d.id}`);
                                      const updated = { ...sub, drivers: sub.drivers.filter(x=>x.id!==d.id) };
                                      updateLocalState({ ...selected, subcontractors: selected.subcontractors.map(s=>s.id===sub.id?updated:s) });
                                      flash(`${d.name} removed.`);
                                    }} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 9px", fontSize:"0.7rem", fontWeight:700, cursor:"pointer" }}>Remove</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{ color:"#94a3b8", fontSize:"0.8rem", marginBottom:12 }}>No drivers added yet.</div>
                        )}

                        {/* Add driver form */}
                        {showDriverForm ? (
                          <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px", marginBottom:10 }}>
                            <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.82rem", marginBottom:10 }}>Add Driver to {sub.company_name}</div>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                              {([["Name *","name","Carlos Ramirez"],["Phone","phone","(555) 000-0000"],["CDL #","cdl_number","TX1234567"],["CDL Exp","cdl_expiration",""]] as [string,string,string][]).map(([label,field,ph]) => (
                                <div key={field}>
                                  <label style={{ ...lbl, fontSize:"0.65rem" }}>{label}</label>
                                  <input
                                    type={field==="cdl_expiration"?"date":"text"}
                                    value={(driverForm as any)[field]}
                                    onChange={e=>setSubDriverForms(f=>({ ...f, [sub.id]: { ...driverForm, [field]:e.target.value } }))}
                                    placeholder={ph}
                                    style={{ ...inp, fontSize:"0.78rem", padding:"5px 8px" }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div style={{ display:"flex", gap:8, marginTop:10 }}>
                              <button onClick={async ()=>{
                                if (!driverForm.name.trim()) { flash("Driver name required."); return; }
                                const res = await apiPost(`/api/ronyx/owner-operators/${selected.id}/subcontractors/${sub.id}/drivers`, driverForm);
                                if (res.error) { flash(`Error: ${res.error}`); return; }
                                const newD: OOSubDriver = { id: res.driver.id, name: res.driver.name, phone: res.driver.phone||"", cdl_number: res.driver.cdl_number||"", cdl_expiration: res.driver.cdl_expiration||"" };
                                const updated = { ...sub, drivers: [...sub.drivers, newD] };
                                updateLocalState({ ...selected, subcontractors: selected.subcontractors.map(s=>s.id===sub.id?updated:s) });
                                setSubDriverForms(f=>({ ...f, [sub.id]: { name:"", phone:"", cdl_number:"", cdl_expiration:"" }, [`show_${sub.id}`]: false as any }));
                                flash(`${newD.name} added to ${sub.company_name}.`);
                              }} style={{ ...primaryBtn, fontSize:"0.75rem" }}>Add Driver</button>
                              <button onClick={()=>setSubDriverForms(f=>({ ...f, [`show_${sub.id}`]: false as any }))} style={{ ...ghostBtn, fontSize:"0.75rem" }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={()=>setSubDriverForms(f=>({ ...f, [`show_${sub.id}`]: true as any, [sub.id]: f[sub.id] || { name:"", phone:"", cdl_number:"", cdl_expiration:"" } }))} style={{ ...ghostBtn, fontSize:"0.75rem", marginBottom:10 }}>
                            + Add Driver to {sub.company_name}
                          </button>
                        )}

                        {/* Sub actions */}
                        <div style={{ display:"flex", gap:8, marginTop:4, paddingTop:10, borderTop:"1px solid #f1f5f9" }}>
                          {sub.contact_email && <a href={`mailto:${sub.contact_email}`} style={{ ...ghostBtn, fontSize:"0.72rem", textDecoration:"none" }}>📧 Email</a>}
                          {sub.contact_phone && <a href={`tel:${sub.contact_phone}`} style={{ ...ghostBtn, fontSize:"0.72rem", textDecoration:"none" }}>📞 Call</a>}
                          <button onClick={async ()=>{
                            if (!confirm(`Remove ${sub.company_name} from ${selected.company_name}?`)) return;
                            await apiDelete(`/api/ronyx/owner-operators/${selected.id}/subcontractors/${sub.id}`);
                            updateLocalState({ ...selected, subcontractors: selected.subcontractors.filter(s=>s.id!==sub.id) });
                            flash(`${sub.company_name} removed.`);
                          }} style={{ marginLeft:"auto", background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:8, padding:"6px 12px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Remove Subcontractor</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COI Tab ── */}
      {activeTab === "coi" && selected && (
        <div>
          <input ref={coiFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }}
            onChange={async e => {
              const f = e.target.files?.[0];
              if (f && pendingCoiTypeRef.current) await handleCOIUpload(pendingCoiTypeRef.current, f);
              e.target.value = "";
            }}
          />

          {/* Header */}
          <div style={{ background:"#0f172a", borderRadius:14, padding:"18px 22px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:"0.62rem", fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Insurance / COI Requirements</div>
              <div style={{ fontSize:"1.05rem", fontWeight:900, color:"#f8fafc" }}>📄 Certificates of Insurance (COI)</div>
              <div style={{ fontSize:"0.75rem", color:"#64748b", marginTop:3 }}>Each company that hauls for Ronyx requires its own named COI. Upload one certificate per slot below.</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <a href="/ronyx/owner-operators/coi-matrix" style={{ background:"rgba(255,255,255,0.07)", color:"#94a3b8", padding:"7px 14px", borderRadius:8, fontSize:"0.75rem", fontWeight:700, textDecoration:"none", border:"1px solid rgba(255,255,255,0.1)" }}>COI Matrix →</a>
              <button onClick={() => window.print()} style={{ background:"rgba(255,255,255,0.07)", color:"#94a3b8", padding:"7px 14px", borderRadius:8, fontSize:"0.75rem", fontWeight:700, cursor:"pointer", border:"1px solid rgba(255,255,255,0.1)" }}>🖨 Print All</button>
            </div>
          </div>

          {/* Three named COI slots */}
          {([
            { key:"named_coi_ma_mortenson",  label:"M.A. Mortenson",   icon:"🏗️", color:"#1e40af", bg:"#eff6ff",
              legacyTypes:["ma_morrison_auto_liability_coi","ma_morrison_general_liability_coi","ma_morrison_cargo_coi"] },
            { key:"named_coi_ronyx",          label:"Ronyx Logistics",  icon:"🚚", color:"#15803d", bg:"#f0fdf4",
              legacyTypes:["ronyx_contractor_auto_liability_coi","ronyx_contractor_general_liability_coi","ronyx_contractor_cargo_coi","auto_liability_coi"] },
            { key:"named_coi_bas_equipment",  label:"BAS Equipment",    icon:"🚜", color:"#0891b2", bg:"#f0f9ff",
              legacyTypes:["bass_equipment_auto_liability_coi","bass_equipment_general_liability_coi","bass_equipment_cargo_coi"] },
          ] as const).map(slot => {
            const doc = coiDocs.find(d => d.document_type === slot.key)
              || coiDocs.find(d => (slot.legacyTypes as readonly string[]).includes(d.document_type));
            const days = daysUntil(doc?.expiration_date);
            const isExpired = days !== null && days < 0;
            const isExpiring = days !== null && days >= 0 && days <= 30;
            const isUploading = showCoiUpload === slot.key;

            return (
              <div key={slot.key} style={{ background:"#fff", border:`2px solid ${doc ? (isExpired?"#fda4af":isExpiring?"#fde68a":"#bbf7d0") : "#e2e8f0"}`, borderRadius:16, marginBottom:14, overflow:"hidden" }}>
                {/* Card header */}
                <div style={{ background: doc ? (isExpired?"#fff1f2":isExpiring?"#fefce8":"#f0fdf4") : "#f8fafc", padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #f1f5f9" }}>
                  <span style={{ fontSize:"1.4rem" }}>{slot.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:900, fontSize:"0.95rem", color:"#0f172a" }}>COI</div>
                    <div style={{ fontSize:"0.78rem", color:"#475569" }}>Named: <strong style={{ color:slot.color }}>{slot.label}</strong> &nbsp;·&nbsp; For: <strong>{selected.company_name}</strong></div>
                  </div>
                  <span style={{ padding:"4px 12px", borderRadius:20, fontSize:"0.7rem", fontWeight:800,
                    background: doc ? (isExpired?"#fee2e2":isExpiring?"#fef3c7":"#dcfce7") : "#f1f5f9",
                    color: doc ? (isExpired?"#dc2626":isExpiring?"#92400e":"#15803d") : "#64748b",
                    border: `1px solid ${doc ? (isExpired?"#fca5a5":isExpiring?"#fde68a":"#86efac") : "#e2e8f0"}` }}>
                    {doc ? (isExpired ? "⚠ EXPIRED" : isExpiring ? `⚠ Expires in ${days}d` : "✓ On File") : "Not Uploaded"}
                  </span>
                </div>

                {/* Card body */}
                <div style={{ padding:"14px 20px" }}>
                  {doc ? (
                    <div style={{ display:"flex", gap:24, flexWrap:"wrap", alignItems:"flex-start" }}>
                      <div style={{ flex:1, minWidth:200 }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:"0.78rem", color:"#475569" }}>
                          {doc.insurance_provider && <div><span style={{ color:"#94a3b8" }}>Provider:</span> <strong style={{ color:"#0f172a" }}>{doc.insurance_provider}</strong></div>}
                          {doc.policy_number     && <div><span style={{ color:"#94a3b8" }}>Policy #:</span> {doc.policy_number}</div>}
                          {doc.effective_date    && <div><span style={{ color:"#94a3b8" }}>Effective:</span> {fmtDate(doc.effective_date)}</div>}
                          {doc.expiration_date   && (
                            <div>
                              <span style={{ color:"#94a3b8" }}>Expires:</span>{" "}
                              <strong style={{ color: isExpired?"#dc2626":isExpiring?"#ca8a04":"#15803d" }}>
                                {fmtDate(doc.expiration_date)} {days !== null ? (days < 0 ? `(${Math.abs(days)}d ago)` : `(${days}d)`) : ""}
                              </strong>
                            </div>
                          )}
                          {doc.file_name && <div><span style={{ color:"#94a3b8" }}>File:</span> {doc.file_name}</div>}
                          {doc.reviewed_by && <div style={{ color:"#15803d", fontSize:"0.68rem" }}>✓ Reviewed by {doc.reviewed_by}</div>}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"flex-start", flexShrink:0 }}>
                        {doc.file_url && (
                          <>
                            <button onClick={() => openDoc(doc.file_url!)} style={{ background:"#eff6ff", color:"#1e40af", border:"1px solid #bfdbfe", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>👁 Preview</button>
                            <button onClick={() => {
                              const win = window.open(doc.file_url!, "_blank");
                              win?.addEventListener("load", () => win.print());
                            }} style={{ background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>🖨 Print</button>
                            <a href={doc.file_url} download={doc.file_name || "coi"} style={{ background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer", textDecoration:"none" }}>⬇ Download</a>
                          </>
                        )}
                        <button onClick={() => {
                          const sub = `COI for ${slot.label} — ${selected.company_name}`;
                          const bod = `Hi ${selected.contact_name || selected.company_name},\n\nWe need an updated Certificate of Insurance naming ${slot.label} as an additional insured.\n\nPlease send the updated COI as soon as possible to keep your dispatch eligibility active.\n\nThank you,\nRonyx Logistics`;
                          window.open(`mailto:${selected.contact_email || ""}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(bod)}`);
                        }} style={{ background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>✉ Email</button>
                        {doc.review_status !== "approved" && doc.review_status !== "flagged_fraudulent" && (
                          <button onClick={() => updateCOIStatus(doc.id, { review_status:"approved", reviewed_by:"Staff", status:"complete" })} style={{ background:"#f0fdf4", color:"#15803d", border:"1px solid #bbf7d0", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>✓ Approve</button>
                        )}
                        {doc.review_status === "flagged_fraudulent" ? (
                          <span style={{ background:"#450a0a", color:"#f87171", border:"1px solid #7f1d1d", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:800 }}>🚨 FLAGGED FRAUDULENT</span>
                        ) : (
                          <button onClick={() => {
                            if (window.confirm(`Flag this COI as potentially fraudulent?\n\nThis will:\n• Set status to "Flagged – Fraudulent"\n• Block dispatch for ${selected.company_name}\n• Log the action for audit\n\nSyvia: verify directly with the insurance carrier before flagging.`)) {
                              updateCOIStatus(doc.id, { review_status:"flagged_fraudulent", status:"rejected", dispatch_blocked:true });
                              flash("COI flagged as fraudulent. Dispatch blocked.");
                            }
                          }} style={{ background:"#fff1f2", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>🚨 Flag Fraudulent</button>
                        )}
                        <button onClick={() => { pendingCoiTypeRef.current = slot.key; setShowCoiUpload(slot.key); setCoiUploadForm(f => ({ ...f, document_type:slot.key, coi_group:"ronyx_ma_mortenson" })); }}
                          style={{ background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 14px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Replace</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:"1.4rem" }}>⚠️</span>
                        <div>
                          <div style={{ fontWeight:700, color:"#dc2626", fontSize:"0.85rem" }}>COI for {slot.label} not uploaded</div>
                          <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:1 }}>Required for dispatch eligibility</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => { pendingCoiTypeRef.current = slot.key; setShowCoiUpload(slot.key); setCoiUploadForm(f => ({ ...f, document_type:slot.key, coi_group:"ronyx_ma_mortenson" })); }}
                          style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.78rem", fontWeight:700, cursor:"pointer" }}>📤 Upload COI</button>
                        <button onClick={() => {
                          const sub = `COI Required for ${slot.label} — ${selected.company_name}`;
                          const bod = `Hi ${selected.contact_name || selected.company_name},\n\nWe need a Certificate of Insurance naming ${slot.label} as an additional insured on your policy.\n\nPlease provide this document as soon as possible to remain dispatch-eligible.\n\nThank you,\nRonyx Logistics`;
                          window.open(`mailto:${selected.contact_email || ""}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(bod)}`);
                        }} style={{ background:"#fef3c7", color:"#92400e", border:"1px solid #fde68a", borderRadius:8, padding:"8px 16px", fontSize:"0.78rem", fontWeight:700, cursor:"pointer" }}>✉ Request by Email</button>
                      </div>
                    </div>
                  )}

                  {/* Upload form */}
                  {isUploading && (
                    <div style={{ marginTop:14, background:"#f8fafc", borderRadius:10, padding:"14px 16px", border:"1px solid #e2e8f0" }}>
                      <div style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>Upload COI — {slot.label}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 12px", marginBottom:10 }}>
                        <div>
                          <label style={{ fontSize:"0.62rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:2 }}>Insurance Provider</label>
                          <input value={coiUploadForm.insurance_provider} onChange={e=>setCoiUploadForm(f=>({...f,insurance_provider:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.78rem", boxSizing:"border-box" as const }} placeholder="State Farm, Zurich…" />
                        </div>
                        <div>
                          <label style={{ fontSize:"0.62rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:2 }}>Policy Number</label>
                          <input value={coiUploadForm.policy_number} onChange={e=>setCoiUploadForm(f=>({...f,policy_number:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.78rem", boxSizing:"border-box" as const }} placeholder="POL-12345" />
                        </div>
                        <div>
                          <label style={{ fontSize:"0.62rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:2 }}>Effective Date</label>
                          <input type="date" value={coiUploadForm.effective_date} onChange={e=>setCoiUploadForm(f=>({...f,effective_date:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.78rem" }} />
                        </div>
                        <div>
                          <label style={{ fontSize:"0.62rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:2 }}>Expiration Date</label>
                          <input type="date" value={coiUploadForm.expiration_date} onChange={e=>setCoiUploadForm(f=>({...f,expiration_date:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:6, padding:"6px 8px", fontSize:"0.75rem" }} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => { pendingCoiTypeRef.current = slot.key; coiFileRef.current?.click(); }} style={{ background:"#1e40af", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Choose File & Upload</button>
                        <button onClick={() => setShowCoiUpload("")} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:8, padding:"8px 12px", fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Maintenance / Out-of-Service Modal ── */}
      {maintenanceModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9000, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:480, maxWidth:"95vw", boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ fontWeight:900, fontSize:"1rem", color:"#0f172a", marginBottom:4 }}>Mark Truck Out of Service</div>
            <div style={{ fontSize:"0.78rem", color:"#64748b", marginBottom:16 }}>Truck <strong>#{maintenanceModal.truckNumber}</strong> will be flagged as unavailable. Staff will be guided to approved backup trucks for affected drivers.</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 14px" }}>
              <div>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Event Type</label>
                <select value={maintForm.event_type} onChange={e=>setMaintForm(f=>({...f,event_type:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:"0.82rem" }}>
                  <option value="breakdown">Breakdown</option>
                  <option value="out_of_service">Out of Service (other)</option>
                  <option value="inspection_failed">Inspection Failed</option>
                  <option value="scheduled_maintenance">Scheduled Maintenance</option>
                  <option value="needs_review">Needs Review</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Severity</label>
                <select value={maintForm.severity} onChange={e=>setMaintForm(f=>({...f,severity:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:"0.82rem" }}>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Issue Title *</label>
                <input value={maintForm.issue_title} onChange={e=>setMaintForm(f=>({...f,issue_title:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:"0.82rem", boxSizing:"border-box" }} placeholder="e.g. Engine failure on I-10, flat tire, brakes" />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Description (optional)</label>
                <textarea value={maintForm.issue_description} onChange={e=>setMaintForm(f=>({...f,issue_description:e.target.value}))} rows={2} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:"0.82rem", resize:"vertical", boxSizing:"border-box" }} placeholder="Additional details..." />
              </div>
              <div>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Est. Return Date</label>
                <input type="date" value={maintForm.estimated_return_at} onChange={e=>setMaintForm(f=>({...f,estimated_return_at:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:"0.82rem" }} />
              </div>
              <div>
                <label style={{ fontSize:"0.65rem", fontWeight:700, color:"#64748b", display:"block", marginBottom:3 }}>Reported By</label>
                <input value={maintForm.reported_by} onChange={e=>setMaintForm(f=>({...f,reported_by:e.target.value}))} style={{ width:"100%", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 10px", fontSize:"0.82rem" }} placeholder="Staff name" />
              </div>
            </div>

            {/* Affected drivers + recommended backups */}
            {selected && (() => {
              const affectedDrivers = selected.drivers.filter(d => d.truck_number === maintenanceModal.truckNumber);
              if (affectedDrivers.length === 0) return null;
              return (
                <div style={{ marginTop:14, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:10, padding:"12px 14px" }}>
                  <div style={{ fontSize:"0.68rem", fontWeight:800, color:"#ea580c", marginBottom:8 }}>AFFECTED DRIVERS</div>
                  {affectedDrivers.map(d => {
                    const backups = (selected.driver_truck_assignments || [])
                      .filter(a => a.driver_id === d.id && a.assignment_type === "backup")
                      .sort((a,b) => a.priority - b.priority)
                      .map(a => ({ ...a, truck: selected.trucks.find(t => t.id === a.truck_id) }))
                      .filter(a => a.truck && isTruckAvailable(a.truck.status));
                    return (
                      <div key={d.id} style={{ marginBottom:6 }}>
                        <div style={{ fontWeight:700, fontSize:"0.82rem", color:"#0f172a" }}>{d.name}</div>
                        {backups.length > 0 ? (
                          <div style={{ fontSize:"0.72rem", color:"#15803d", marginTop:2 }}>
                            Recommended backup: <strong>Truck #{backups[0].truck!.truck_number}</strong> ({PRIORITY_LABELS[backups[0].priority]})
                          </div>
                        ) : (
                          <div style={{ fontSize:"0.72rem", color:"#dc2626", marginTop:2 }}>No approved backup trucks available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={markTruckOutOfService} style={{ background:"#dc2626", color:"#fff", border:"none", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>Mark Out of Service</button>
              <button onClick={() => setMaintenanceModal(null)} style={{ background:"#f1f5f9", color:"#475569", border:"none", borderRadius:9, padding:"9px 18px", fontWeight:700, fontSize:"0.82rem", cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── OO Profile Edit Modal ── */}
      {ooEditModal && (
        <div onClick={() => setOoEditModal(null)} style={{ position:"fixed", inset:0, zIndex:9200, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:"100%", maxWidth:580, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight:900, fontSize:"1rem", color:"#0f172a", marginBottom:18 }}>✏ Edit Company Profile</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
              {([
                ["Company Name *", "company_name", "text"],
                ["Contact Name",   "contact_name",  "text"],
                ["Contact Phone",  "contact_phone", "tel"],
                ["Contact Email",  "contact_email", "email"],
                ["MC Number",      "mc_number",     "text"],
                ["DOT Number",     "dot_number",    "text"],
                ["EIN / Tax ID",   "ein",           "text"],
                ["Website",        "website",       "text"],
                ["Insurance Agent","insurance_agent_name",  "text"],
                ["Agent Phone",    "insurance_agent_phone", "tel"],
                ["Agent Email",    "insurance_agent_email", "email"],
              ] as [string, keyof typeof ooEditModal.form, string][]).map(([label, field, type]) => (
                <div key={field} style={{ gridColumn: field === "company_name" || field === "insurance_agent_name" ? "1/-1" : undefined }}>
                  <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>{label}</label>
                  <input
                    type={type}
                    value={(ooEditModal.form[field] as string) || ""}
                    onChange={e => setOoEditModal(m => m && ({ ...m, form: { ...m.form, [field]: e.target.value } }))}
                    style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }}
                  />
                </div>
              ))}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Business Address</label>
                <input
                  value={(ooEditModal.form.business_address as string) || ""}
                  onChange={e => setOoEditModal(m => m && ({ ...m, form: { ...m.form, business_address: e.target.value } }))}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }}
                  placeholder="Street, City, State ZIP"
                />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Notes</label>
                <textarea
                  value={(ooEditModal.form.notes as string) || ""}
                  onChange={e => setOoEditModal(m => m && ({ ...m, form: { ...m.form, notes: e.target.value } }))}
                  rows={3}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", resize:"vertical", fontFamily:"inherit", boxSizing:"border-box" as const }}
                />
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button
                disabled={ooEditModal.saving || !ooEditModal.form.company_name?.trim()}
                onClick={async () => {
                  setOoEditModal(m => m && ({ ...m, saving: true }));
                  const ooId = ooEditModal.id;
                  const res = await apiPut(`/api/ronyx/owner-operators/${ooId}`, ooEditModal.form);
                  if (res.error) {
                    flash(`Save failed: ${res.error}`);
                    setOoEditModal(m => m && ({ ...m, saving: false }));
                  } else {
                    // Update in-memory: companies list + selected (if open)
                    setCompanies(prev => prev.map(c => c.id === ooId ? { ...c, ...ooEditModal.form } : c));
                    if (selected?.id === ooId) updateLocalState({ ...selected, ...ooEditModal.form });
                    flash("Profile saved.");
                    setOoEditModal(null);
                  }
                }}
                style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background: ooEditModal.saving ? "#94a3b8" : "#1e40af", color:"#fff", fontWeight:800, fontSize:"0.85rem", cursor: ooEditModal.saving ? "default" : "pointer" }}>
                {ooEditModal.saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setOoEditModal(null)} style={{ padding:"10px 18px", borderRadius:9, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", fontWeight:700, fontSize:"0.85rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Driver Edit Modal ── */}
      {driverEditModal && (
        <div onClick={() => setDriverEditModal(null)} style={{ position:"fixed", inset:0, zIndex:9200, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:"100%", maxWidth:480, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight:900, fontSize:"1rem", color:"#0f172a", marginBottom:4 }}>✏ Edit Driver</div>
            <div style={{ fontSize:"0.78rem", color:"#64748b", marginBottom:18 }}>{driverEditModal.driver.name}</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Driver Name *</label>
                <input
                  value={driverEditModal.form.name || ""}
                  onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, name: e.target.value } }))}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }}
                />
              </div>
              <div>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Phone</label>
                <input type="tel" value={driverEditModal.form.phone || ""} onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, phone: e.target.value } }))} style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>CDL Number</label>
                <input value={driverEditModal.form.cdl_number || ""} onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, cdl_number: e.target.value } }))} style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>CDL State</label>
                <input value={driverEditModal.form.cdl_state || ""} onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, cdl_state: e.target.value.toUpperCase().slice(0,2) } }))} maxLength={2} style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }} placeholder="TX" />
              </div>
              <div>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>CDL Class</label>
                <select value={driverEditModal.form.cdl_class || ""} onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, cdl_class: e.target.value } }))} style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", background:"#fff", boxSizing:"border-box" as const }}>
                  <option value="">— Select —</option>
                  <option value="A">Class A</option>
                  <option value="AM1">Class AM1</option>
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>CDL Expiration</label>
                <input type="date" value={driverEditModal.form.cdl_expiration || ""} onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, cdl_expiration: e.target.value } }))} style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:3 }}>Med Card Expiration</label>
                <input type="date" value={driverEditModal.form.med_card_expiration || ""} onChange={e => setDriverEditModal(m => m && ({ ...m, form: { ...m.form, med_card_expiration: e.target.value } }))} style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.83rem", outline:"none", boxSizing:"border-box" as const }} />
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button
                disabled={driverEditModal.saving || !driverEditModal.form.name?.trim()}
                onClick={async () => {
                  setDriverEditModal(m => m && ({ ...m, saving: true }));
                  const res = await apiPut(`/api/ronyx/owner-operators/${selected.id}/drivers/${driverEditModal.driver.id}`, driverEditModal.form);
                  if (res.error) {
                    flash(`Save failed: ${res.error}`);
                    setDriverEditModal(m => m && ({ ...m, saving: false }));
                  } else {
                    const updated = { ...driverEditModal.driver, ...driverEditModal.form };
                    updateLocalState({ ...selected, drivers: selected.drivers.map(d => d.id === driverEditModal.driver.id ? updated : d) });
                    flash(`${updated.name} saved.`);
                    setDriverEditModal(null);
                  }
                }}
                style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background: driverEditModal.saving ? "#94a3b8" : "#1e40af", color:"#fff", fontWeight:800, fontSize:"0.85rem", cursor: driverEditModal.saving ? "default" : "pointer" }}>
                {driverEditModal.saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setDriverEditModal(null)} style={{ padding:"10px 18px", borderRadius:9, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", fontWeight:700, fontSize:"0.85rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email document modal ── */}
      {docEmailModal && (
        <div onClick={() => setDocEmailModal(null)} style={{ position:"fixed", inset:0, zIndex:9100, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:"100%", maxWidth:460, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontWeight:900, fontSize:"1rem", color:"#0f172a", marginBottom:4 }}>✉ Email Document</div>
            <div style={{ fontSize:"0.78rem", color:"#64748b", marginBottom:18 }}>{docEmailModal.docType} — {selected?.company_name}</div>

            <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:4 }}>To</label>
            <input
              value={docEmailModal.to}
              onChange={e => setDocEmailModal(m => m && ({ ...m, to: e.target.value }))}
              placeholder="recipient@email.com"
              style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.85rem", outline:"none", marginBottom:12, boxSizing:"border-box" as const }}
            />

            <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:4 }}>Subject</label>
            <input
              value={docEmailModal.subject}
              onChange={e => setDocEmailModal(m => m && ({ ...m, subject: e.target.value }))}
              style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.85rem", outline:"none", marginBottom:12, boxSizing:"border-box" as const }}
            />

            <label style={{ fontSize:"0.72rem", fontWeight:700, color:"#475569", display:"block", marginBottom:4 }}>Message</label>
            <textarea
              value={docEmailModal.message}
              onChange={e => setDocEmailModal(m => m && ({ ...m, message: e.target.value }))}
              rows={4}
              style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:"0.82rem", outline:"none", resize:"vertical", fontFamily:"inherit", marginBottom:16, boxSizing:"border-box" as const }}
            />

            <div style={{ fontSize:"0.72rem", color:"#64748b", marginBottom:16 }}>
              📎 Attachment: <strong>{docEmailModal.fileName}</strong>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button
                disabled={docEmailModal.sending || !docEmailModal.to.trim()}
                onClick={async () => {
                  setDocEmailModal(m => m && ({ ...m, sending: true }));
                  try {
                    const res = await fetch("/api/ronyx/owner-operators/send-doc", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        to:       docEmailModal.to.trim(),
                        subject:  docEmailModal.subject,
                        message:  docEmailModal.message,
                        doc_type: docEmailModal.docType,
                        file_url: docEmailModal.fileUrl,
                        file_name: docEmailModal.fileName,
                        oo_name:  selected?.company_name,
                      }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      flash(`Sent to ${docEmailModal.to}`);
                      setDocEmailModal(null);
                    } else {
                      flash(data.message || data.error || "Send failed");
                      setDocEmailModal(m => m && ({ ...m, sending: false }));
                    }
                  } catch {
                    flash("Send failed — check connection");
                    setDocEmailModal(m => m && ({ ...m, sending: false }));
                  }
                }}
                style={{ flex:1, padding:"10px 0", borderRadius:9, border:"none", background: docEmailModal.sending ? "#94a3b8" : "#1e40af", color:"#fff", fontWeight:800, fontSize:"0.85rem", cursor: docEmailModal.sending ? "default" : "pointer" }}>
                {docEmailModal.sending ? "Sending…" : "Send Email"}
              </button>
              <button onClick={() => setDocEmailModal(null)} style={{ padding:"10px 18px", borderRadius:9, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", fontWeight:700, fontSize:"0.85rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-app document viewer ── */}
      {docViewer && (() => {
        const isPdf = /\.pdf(\?|$)/i.test(docViewer.url) || docViewer.url.includes("application%2Fpdf") || docViewer.url.includes("content-type=application");
        const isImage = !isPdf && /\.(jpe?g|png|webp|heic|gif|bmp|tiff?)(\?|$)/i.test(docViewer.url);
        return (
          <div
            onClick={() => setDocViewer(null)}
            style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:960, height:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.4)" }}>
              {/* Title bar */}
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 18px", borderBottom:"1px solid #e2e8f0", flexShrink:0, background:"#f8fafc" }}>
                <span style={{ fontSize:"1.1rem" }}>{isPdf ? "📄" : isImage ? "🖼️" : "📁"}</span>
                <span style={{ flex:1, fontWeight:700, fontSize:"0.85rem", color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {docViewer.filename || "Document"}
                </span>
                <a href={docViewer.url} download target="_blank" rel="noreferrer"
                  style={{ padding:"5px 12px", background:"#f1f5f9", color:"#475569", borderRadius:7, fontWeight:700, fontSize:"0.72rem", textDecoration:"none", border:"1px solid #e2e8f0" }}>
                  ⬇ Download
                </a>
                <button onClick={() => { const w = window.open(docViewer.url); if (w && isPdf) { w.onload = () => w.print(); } }}
                  style={{ padding:"5px 12px", background:"#f1f5f9", color:"#475569", borderRadius:7, fontWeight:700, fontSize:"0.72rem", border:"1px solid #e2e8f0", cursor:"pointer" }}>
                  🖨 Print
                </button>
                <button onClick={() => setDocViewer(null)}
                  style={{ padding:"5px 12px", background:"#fff1f2", color:"#dc2626", borderRadius:7, fontWeight:700, fontSize:"0.72rem", border:"1px solid #fecaca", cursor:"pointer" }}>
                  ✕ Close
                </button>
              </div>
              {/* Content */}
              <div style={{ flex:1, overflow:"auto", background:"#475569", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {isImage ? (
                  <img src={docViewer.url} alt={docViewer.filename || "document"} style={{ maxWidth:"100%", maxHeight:"100%", objectFit:"contain", borderRadius:4 }} />
                ) : (
                  <iframe
                    src={docViewer.url}
                    title={docViewer.filename || "document"}
                    style={{ width:"100%", height:"100%", border:"none" }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Intel Verify drawer ── */}
      {verifyDrawerOO && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex" }}
          onClick={() => setVerifyDrawerOO(null)}>
          {/* Backdrop */}
          <div style={{ flex: 1, background: "rgba(15,23,42,0.45)" }} />
          {/* Panel */}
          <div style={{ width: 520, maxWidth: "100vw", background: "#fff", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.18)" }}
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12, background: "#faf5ff" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>MoveAround Intel Verify™</div>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{verifyDrawerOO.name}</div>
              </div>
              <a href="/ronyx/intel-verify" target="_blank" rel="noopener noreferrer"
                style={{ padding: "6px 12px", background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#7c3aed", textDecoration: "none", whiteSpace: "nowrap" }}>
                Open Full Workbench ↗
              </a>
              <button onClick={() => setVerifyDrawerOO(null)}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 800, fontSize: 16, color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                ×
              </button>
            </div>
            {/* Panel body */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              <IntelVerifyPanel
                ooId={verifyDrawerOO.id}
                ooName={verifyDrawerOO.name}
                compact={true}
                onClose={() => setVerifyDrawerOO(null)}
                onDone={() => { loadCompanies(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"13px 22px", borderRadius:14, fontWeight:700, fontSize:14 }}>{msg}</div>;
}
