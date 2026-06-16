"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Types ─────────────────────────────────────────── */
type OODriver = {
  id: string;
  name: string;
  cdl_number: string;
  cdl_state: string;
  cdl_expiration: string;
  med_card_expiration: string;
  phone: string;
};
type OOTruck = {
  id: string;
  truck_number: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  last_inspection?: string;
  inspection_result?: "Pass" | "Pass w/ Defects" | "Fail";
};
type OODoc = {
  type: string;
  uploaded_at: string;
  file_name: string;
  expires_on?: string;
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

type OOCompany = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  business_address: string;
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
  notes?: string;
  last_contact_date?: string;
  reminder_log?: ReminderEntry[];
  compliance_history?: HistoryEntry[];
  changes_log?: ChangeEntry[];
  logo_url?: string;
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
  const insDoc = oo.documents.find(d => d.type === "Insurance Certificate");
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
  const insDoc = oo.documents.find(d => d.type === "Insurance Certificate");
  const insExpDays = insDoc?.expires_on ? daysUntil(insDoc.expires_on) : null;
  if (!insDoc)                                         blocks.push("No insurance on file");
  else if (insExpDays !== null && insExpDays <= 0)     blocks.push("Insurance expired");
  if (!oo.mc_number)                                   blocks.push("MC# missing");
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
  const insDoc = oo.documents.find(d => d.type === "Insurance Certificate");
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
  drivers: [], trucks: [], documents: [], jobs: [], logo_url: undefined,
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
  return (
    <div onClick={onClick} style={{ background: bg || "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", cursor: onClick ? "pointer" : undefined }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color: color || "#0f172a", marginTop: 4, lineHeight: 1.1 }}>{value}</div>
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
  const [companies, setCompanies]   = useState<OOCompany[]>([]);
  const [view, setView]             = useState<"list" | "detail">("list");
  const [selected, setSelected]     = useState<OOCompany | null>(null);
  const [activeTab, setActiveTab]   = useState<"overview" | "drivers" | "fleet" | "documents" | "jobs" | "settlement" | "compliance">("overview");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [toast, setToast]           = useState("");

  // Add company form
  const [newCompanyForm, setNewCompanyForm] = useState({ ...EMPTY_COMPANY });
  const [newOODrivers, setNewOODrivers]     = useState<{ name: string; phone: string; cdl_number: string; cdl_state: string; cdl_expiration: string; med_card_expiration: string }[]>([]);
  const BLANK_OO_DRIVER = { name: "", phone: "", cdl_number: "", cdl_state: "TX", cdl_expiration: "", med_card_expiration: "" };

  // Add driver/truck/job forms
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddTruck,  setShowAddTruck]  = useState(false);
  const [showAddJob,    setShowAddJob]    = useState(false);
  const [addDriverForm, setAddDriverForm] = useState<Omit<OODriver,"id">>({ name:"", cdl_number:"", cdl_state:"TX", cdl_expiration:"", med_card_expiration:"", phone:"" });
  const [addTruckForm,  setAddTruckForm]  = useState<Omit<OOTruck,"id">>({ truck_number:"", year:"", make:"", model:"", vin:"", last_inspection:"", inspection_result:"Pass" });
  const [addJobForm,    setAddJobForm]    = useState<Omit<OOJob,"id">>({ project_name:"Domino Project", project_number:"", load_date:"", truck_number:"", driver_name:"", origin:"", destination:"", material:"", tons:0, gross_revenue:0, oo_rate:0, margin:0, ticket_status:"Verified", settlement_status:"Pending" });

  // Jobs filters
  const [jobFilter,        setJobFilter]        = useState("All Projects");
  const [settlementFilter, setSettlementFilter] = useState("All");
  const [editingNotes, setEditingNotes]         = useState(false);
  const [notesValue,   setNotesValue]           = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<string>("");

  useEffect(() => {
    fetch("/api/ronyx/owner-operators")
      .then(r => r.json())
      .then(({ companies: data }) => { setCompanies(data || []); })
      .catch(() => setCompanies([]));
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }
  function persist(updated: OOCompany[]) { setCompanies(updated); }
  function updateLocalState(oo: OOCompany) { setSelected(oo); setCompanies(prev => prev.map(c => c.id === oo.id ? oo : c)); }
  function updateSelected(oo: OOCompany) {
    updateLocalState(oo);
    // Sync scalar / JSONB fields to DB (fire-and-forget)
    apiPut(`/api/ronyx/owner-operators/${oo.id}`, {
      notes: oo.notes, last_contact_date: oo.last_contact_date,
      insurance_agent_name: oo.insurance_agent_name, insurance_agent_email: oo.insurance_agent_email, insurance_agent_phone: oo.insurance_agent_phone,
      reminder_log: oo.reminder_log, compliance_history: oo.compliance_history, changes_log: oo.changes_log,
    });
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
    setAddDriverForm({ name:"", cdl_number:"", cdl_state:"TX", cdl_expiration:"", med_card_expiration:"", phone:"" });
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

    // 2. Prompt for expiry on insurance/contract types
    const needsExpiry = [
      "Insurance Certificate","Insurance Certificate (COI)",
      "Auto Liability Insurance","General Liability Insurance",
      "Cargo Insurance","Workers Comp Insurance","Contract",
    ].includes(docType);
    const expiresInput = needsExpiry
      ? prompt(`${docType} expiration date (YYYY-MM-DD):`, "") || undefined
      : undefined;

    // 3. Record in DB with file URL
    await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`, {
      doc_type:   docType,
      file_name:  file.name,
      file_url:   fileUrl,
      expires_on: expiresInput || null,
    });

    const doc: OODoc = { type: docType, uploaded_at: new Date().toISOString(), file_name: file.name, expires_on: expiresInput };
    updateLocalState({ ...selected, documents: [doc, ...selected.documents.filter(d => d.type !== docType)] });
    flash(`${docType} uploaded${fileUrl ? " & stored" : ""}.`);
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
          <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Owner Operator Command Center</h1>
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/ronyx/owner-operators/import" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>📋 Bulk Import</a>
            <button onClick={() => setShowAddCompany(s=>!s)} style={primaryBtn}>+ Add Owner Operator</button>
          </div>
        </div>

        {showAddCompany && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontWeight: 800 }}>New Owner Operator Company</h3>
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
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8, padding: 10, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                  <div><label style={lbl}>Driver Name *</label><input value={d.name} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} style={inp} placeholder="Full name" /></div>
                  <div><label style={lbl}>Phone</label><input value={d.phone} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, phone: e.target.value } : x))} style={inp} /></div>
                  <div><label style={lbl}>CDL #</label><input value={d.cdl_number} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, cdl_number: e.target.value } : x))} style={inp} /></div>
                  <div><label style={lbl}>CDL State</label><input value={d.cdl_state} onChange={(e) => setNewOODrivers((prev) => prev.map((x, i) => i === idx ? { ...x, cdl_state: e.target.value } : x))} style={{ ...inp, width: "100%" }} /></div>
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

        {/* Company cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {companies.map(oo => {
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
            const insDoc      = oo.documents.find(d => d.type === "Insurance Certificate");
            const insExpDays  = insDoc?.expires_on ? daysUntil(insDoc.expires_on) : null;

            return (
              <div key={oo.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden", cursor: "pointer" }} onClick={() => openOO(oo)}>
                {/* Header strip */}
                <div style={{ background: health>=85?"#f0fdf4":health>=70?"#fefce8":"#fff1f2", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: oo.logo_url ? "#fff" : "#1e40af", border: oo.logo_url ? "1px solid #e2e8f0" : "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0, overflow: "hidden" }}>
                    {oo.logo_url ? <img src={oo.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : oo.company_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontWeight: 900, color: "#0f172a", fontSize: "1.05rem" }}>{oo.company_name}</h3>
                      <span style={{ background: eligible?"#f0fdf4":"#fff1f2", color: eligible?"#15803d":"#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800 }}>
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
                <div style={{ padding: "10px 20px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                  {projects.slice(0,3).map(p => (
                    <span key={p} style={{ background: "#eff6ff", color: "#1e40af", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>{p}</span>
                  ))}
                  {projects.length > 3 && <span style={{ color: "#94a3b8", fontSize: "0.72rem" }}>+{projects.length-3} more</span>}
                  {insDoc && (
                    <span style={{ marginLeft: "auto", background: expBg(insExpDays), color: expColor(insExpDays), padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>
                      Insurance: {expLabel(insExpDays, insDoc.expires_on)}
                    </span>
                  )}
                  {actions.length > 0 && (
                    <span style={{ background: "#fff1f2", color: "#dc2626", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>
                      ⚠ {actions.length} action{actions.length>1?"s":""} required
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOO(oo); }}
                    title="Delete owner operator"
                    style={{ marginLeft: "auto", background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", padding: "3px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {companies.length === 0 && (
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

  const DETAIL_TABS = [
    { key:"overview",   label:"Overview"    },
    { key:"drivers",    label:"Drivers"     },
    { key:"fleet",      label:"Fleet"       },
    { key:"documents",  label:"Documents"   },
    { key:"jobs",       label:"Project Jobs"},
    { key:"settlement", label:"Settlement"  },
    { key:"compliance", label:"Compliance Monitor" },
  ] as const;

  return (
    <div style={{ maxWidth: 1100 }}>
      {toast && <Toast msg={toast} />}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(pendingDocRef.current, f); e.target.value = ""; }} />

      {/* Breadcrumb */}
      <button onClick={() => setView("list")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:"0.83rem", padding:0, marginBottom:14 }}>← Owner Operators</button>

      {/* Company header */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 64, height: 64, borderRadius: 14, background: selected.logo_url ? "#fff" : "#1e40af", border: selected.logo_url ? "2px solid #e2e8f0" : "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.5rem", overflow: "hidden" }}>
              {selected.logo_url
                ? <img src={selected.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : selected.company_name.charAt(0)}
            </div>
            {/* Logo upload button */}
            <label style={{ position: "absolute", bottom: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", cursor: "pointer", border: "2px solid #fff", title: "Upload logo" }}>
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
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>{selected.company_name}</h1>
            <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span><strong>MC:</strong> {selected.mc_number||"—"}</span>
              <span><strong>DOT:</strong> {selected.dot_number||"—"}</span>
              <span><strong>EIN:</strong> {selected.ein||"—"}</span>
              {selected.contact_phone && <span>📞 {selected.contact_phone}</span>}
              {selected.contact_email && <span>✉ {selected.contact_email}</span>}
            </div>
            {selected.logo_url && (
              <button onClick={async () => { await fetch(`/api/ronyx/owner-operators/${selected.id}/logo`, { method: "DELETE" }); updateLocalState({ ...selected, logo_url: undefined }); flash("Logo removed."); }} style={{ marginTop: 6, background: "none", border: "none", color: "#94a3b8", fontSize: "0.68rem", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Remove logo</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>OO Health</div><ScoreBadge score={health} size="lg" /></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>Performance</div><ScoreBadge score={perf} size="lg" /></div>
            <span style={{ background: eligible?"#f0fdf4":"#fff1f2", color: eligible?"#15803d":"#dc2626", padding: "8px 16px", borderRadius: 20, fontWeight: 800, fontSize: "0.85rem" }}>
              {eligible ? "🟢 Dispatch Eligible" : "🔴 Dispatch Blocked"}
            </span>
          </div>
        </div>
        {!eligible && <div style={{ marginTop: 10, background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 8, padding: "8px 14px", fontSize: "0.78rem", color: "#dc2626" }}><strong>Blocked:</strong> {blocks.join(" · ")}</div>}
      </div>

      {/* Quick KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
        <KPI label="Settlement Ready" value={`$${settlementReady.toLocaleString()}`} color="#1e40af" bg="#eff6ff" />
        <KPI label="Revenue MTD"      value={`$${revMTD.toLocaleString()}`}          color="#15803d" bg="#f0fdf4" />
        <KPI label="Margin MTD"       value={`$${marMTD.toLocaleString()}`}          color="#7c3aed" bg="#f5f3ff" />
        <KPI label="Verified Tickets" value={tick.verified}  color="#15803d" />
        <KPI label="Needs Review"     value={tick.needsReview} color={tick.needsReview>0?"#d97706":undefined} />
        <KPI label="Missing Tickets"  value={tick.missing}   color={tick.missing>0?"#dc2626":undefined} bg={tick.missing>0?"#fff1f2":undefined} />
        <KPI label="Drivers"          value={selected.drivers.length} />
        <KPI label="Trucks"           value={selected.trucks.length} />
      </div>

      {/* Quick Upload Actions */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>Quick Upload</span>
        {[
          { label: "🛡️ Auto Liability Ins.", type: "Auto Liability Insurance",    hasExpiry: true  },
          { label: "🛡️ General Liability",   type: "General Liability Insurance", hasExpiry: true  },
          { label: "📦 Cargo Insurance",      type: "Cargo Insurance",             hasExpiry: true  },
          { label: "📄 COI",                  type: "Insurance Certificate (COI)", hasExpiry: true  },
          { label: "📝 Contract",             type: "Contract",                    hasExpiry: true  },
          { label: "🧾 W-9",                  type: "W-9 / Tax Form",              hasExpiry: false },
          { label: "🏛️ MC Authority",         type: "MC Authority Letter",         hasExpiry: false },
        ].map(({ label, type, hasExpiry }) => {
          const onFile = selected.documents.find(d => d.type === type);
          return (
            <label key={type} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", border: `1px solid ${onFile ? "#86efac" : "#e2e8f0"}`, borderRadius: 8, fontSize: "0.75rem", fontWeight: 700, color: onFile ? "#15803d" : "#475569", background: onFile ? "#f0fdf4" : "#f8fafc", cursor: "pointer", whiteSpace: "nowrap" }}>
              {onFile ? "✓ " : ""}{label}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={async e => {
                const f = e.target.files?.[0];
                if (f) {
                  const exp = hasExpiry ? (prompt(`${type} expiration date (YYYY-MM-DD):`) || undefined) : undefined;
                  await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`, { doc_type: type, file_name: f.name, expires_on: exp || null });
                  const doc: OODoc = { type, uploaded_at: new Date().toISOString(), file_name: f.name, expires_on: exp };
                  const change: ChangeEntry = { date: new Date().toISOString().slice(0,10), type: "Document Added", detail: `${type} uploaded` };
                  updateLocalState({ ...selected, documents: [doc, ...selected.documents.filter(d => d.type !== type)], changes_log: [change, ...(selected.changes_log||[])] });
                  flash(`${type} uploaded.`);
                }
                e.target.value = "";
              }} />
            </label>
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
        const autoIns   = selected.documents.find(d => d.type==="Auto Liability Insurance" || d.type==="Insurance Certificate" || d.type==="Insurance Certificate (COI)");
        const glIns     = selected.documents.find(d => d.type==="General Liability Insurance");
        const cargoIns  = selected.documents.find(d => d.type==="Cargo Insurance");
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
          const dtDoc  = selected.documents.find(doc=>doc.type===`[${d.name}] Drug Test`);
          const bgDoc  = selected.documents.find(doc=>doc.type===`[${d.name}] Background Check`);
          if (!cdlDoc) missingItems.push({ label:`CDL Upload Missing — ${d.name}` });
          if (!dtDoc)  missingItems.push({ label:`Drug Test Missing — ${d.name}` });
          if (!bgDoc)  missingItems.push({ label:`Background Check Missing — ${d.name}` });
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
          const sub = encodeURIComponent(`Document Renewal Required — ${selected.company_name} — ${label}`);
          const body = encodeURIComponent(`Dear ${selected.contact_name||selected.company_name},\n\nThis is a reminder that the following document requires renewal:\n\n${label}\n\nPlease provide an updated document at your earliest convenience.\n\nMC#: ${selected.mc_number||"—"}\n\nThank you,\nRonyx Logistics Operations`);
          window.location.href = `mailto:${selected.contact_email||selected.insurance_agent_email||""}?subject=${sub}&body=${body}`;
          const log: ReminderEntry = { doc_type:docType, sent_at:new Date().toISOString(), method:"email" };
          const change: ChangeEntry = { date:new Date().toISOString().slice(0,10), type:"Reminder Sent", detail:`${label} reminder emailed` };
          updateSelected({ ...selected, reminder_log:[log,...(selected.reminder_log||[])], changes_log:[change,...(selected.changes_log||[])] });
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
                    { label:"Drivers",    score:driversScore,   detail:`${driversOK}/${driversTotal||0} drivers compliant` },
                    { label:"Fleet",      score:fleetScore,     detail:`${trucksOK}/${trucksTotal||0} trucks passing inspection` },
                    { label:"Contracts",  score:contractsScore, detail:`${contractsOK}/2 documents on file (Contract, W-9)` },
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
                    return (
                      <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
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
                    <div style={{ position:"relative", paddingLeft:18 }}>
                      <div style={{ position:"absolute", left:6, top:0, bottom:0, width:2, background:"#e2e8f0" }} />
                      {(selected.compliance_history||[]).slice(0,5).map((h,i) => {
                        const dot = h.type==="critical"?"#dc2626":h.type==="warning"?"#d97706":"#1e40af";
                        return (
                          <div key={i} style={{ position:"relative", marginBottom:12 }}>
                            <div style={{ position:"absolute", left:-18, top:4, width:10, height:10, borderRadius:"50%", background:dot, border:"2px solid #fff" }} />
                            <div style={{ fontSize:"0.7rem", color:"#94a3b8", marginBottom:2 }}>{h.date}</div>
                            <div style={{ fontSize:"0.82rem", color:"#0f172a", fontWeight:600 }}>{h.event}</div>
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

                {/* ── #8 Contact Center ── */}
                <Card title="Contact Center">
                  <div style={{ marginBottom:10 }}>
                    <div style={{ fontWeight:700, color:"#0f172a", marginBottom:2 }}>{selected.contact_name||"—"}</div>
                    <div style={{ fontSize:"0.72rem", color:"#64748b" }}>Primary Contact</div>
                    {selected.last_contact_date && (
                      <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginTop:4 }}>
                        Last contact: {Math.floor((Date.now()-new Date(selected.last_contact_date).getTime())/86400000)} day{Math.floor((Date.now()-new Date(selected.last_contact_date).getTime())/86400000)!==1?"s":""} ago
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {selected.contact_phone && <a href={`tel:${selected.contact_phone}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Called carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ ...primaryBtn, textDecoration:"none", fontSize:"0.75rem" }}>📞 Call</a>}
                    {selected.contact_email && <a href={`mailto:${selected.contact_email}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Emailed carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.75rem" }}>✉ Email</a>}
                    {selected.contact_phone && <a href={`sms:${selected.contact_phone}`} onClick={()=>{ const change:ChangeEntry={date:new Date().toISOString().slice(0,10),type:"Contacted",detail:"Texted carrier"}; updateSelected({...selected,last_contact_date:new Date().toISOString().slice(0,10),changes_log:[change,...(selected.changes_log||[])]}); }} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.75rem" }}>💬 Text</a>}
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={eyebrow}>Driver Roster</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{selected.drivers.length} driver{selected.drivers.length!==1?"s":""} · CDL and med card tracked individually</div>
            </div>
            <button onClick={() => setShowAddDriver(s=>!s)} style={primaryBtn}>+ Add Driver</button>
          </div>

          {showAddDriver && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                {([["Driver Name *","name","Carlos Ramirez"],["CDL Number","cdl_number","TX1234567"],["CDL State","cdl_state","TX"],["Phone","phone","(555) 000-0000"]] as [string,keyof typeof addDriverForm,string][]).map(([label,field,ph]) => (
                  <div key={field}><label style={lbl}>{label}</label><input value={addDriverForm[field]} onChange={e=>setAddDriverForm(f=>({...f,[field]:e.target.value}))} style={inp} placeholder={ph} /></div>
                ))}
                <div><label style={lbl}>CDL Expiration</label><input type="date" value={addDriverForm.cdl_expiration} onChange={e=>setAddDriverForm(f=>({...f,cdl_expiration:e.target.value}))} style={inp} /></div>
                <div><label style={lbl}>Med Card Expiration</label><input type="date" value={addDriverForm.med_card_expiration} onChange={e=>setAddDriverForm(f=>({...f,med_card_expiration:e.target.value}))} style={inp} /></div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:12 }}>
                <button onClick={addDriver} style={primaryBtn}>Add Driver</button>
                <button onClick={() => setShowAddDriver(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {selected.drivers.length === 0 ? (
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"40px 0", textAlign:"center", color:"#94a3b8" }}>No drivers on file.</div>
          ) : (
            <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.82rem" }}>
                <thead>
                  <tr style={{ background:"#f8fafc" }}>
                    {["Driver","CDL #","State","CDL Expiration","CDL File","Med Card Exp.","Phone","Actions"].map(h=>(
                      <th key={h} style={{ padding:"8px 14px", fontSize:"0.68rem", fontWeight:700, color:"#475569", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.drivers.map(d => {
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
                          <div style={{ display:"flex", gap:6 }}>
                            {cdlDoc && <label style={{ background:"#f1f5f9", color:"#475569", padding:"3px 8px", borderRadius:6, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", border:"1px solid #e2e8f0" }}>
                              Replace CDL
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={async e=>{ const f=e.target.files?.[0]; if(f){ const state=prompt(`CDL State for ${d.name} (e.g. TX):`,d.cdl_state||"TX")||""; const exp=prompt(`New CDL expiration (YYYY-MM-DD):`,d.cdl_expiration||"")||undefined; await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:cdlKey,file_name:f.name,expires_on:exp||null}); await apiPut(`/api/ronyx/owner-operators/${selected.id}/drivers/${d.id}`,{cdl_state:state.toUpperCase()||d.cdl_state,cdl_expiration:exp||d.cdl_expiration}); const doc:OODoc={type:cdlKey,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; const updatedDrivers=selected.drivers.map(dr=>dr.id===d.id?{...dr,cdl_state:state.toUpperCase()||dr.cdl_state,cdl_expiration:exp||dr.cdl_expiration}:dr); updateLocalState({...selected,documents:[doc,...selected.documents.filter(x=>x.type!==cdlKey)],drivers:updatedDrivers}); flash(`CDL replaced for ${d.name}.`); } e.target.value=""; }} />
                            </label>}
                            <button onClick={() => removeDriver(d.id)} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 10px", fontSize:"0.72rem", fontWeight:700, cursor:"pointer" }}>Remove</button>
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:10 }}>
              {selected.trucks.map(t => {
                const [eligible2] = ooDispatchEligible(selected);
                const inspOK = !t.inspection_result || t.inspection_result === "Pass";
                const truckEligible = eligible2 && inspOK;
                return (
                  <div key={t.id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"16px 18px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ fontSize:"1.3rem" }}>🚚</div>
                      <button onClick={() => removeTruck(t.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}>✕</button>
                    </div>
                    <div style={{ fontWeight:800, fontSize:"1rem", color:"#0f172a", marginTop:6 }}>{t.truck_number}</div>
                    <div style={{ fontSize:"0.8rem", color:"#64748b", marginTop:2 }}>{t.year} {t.make} {t.model}</div>
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
                      <div style={{ marginTop:6 }}>
                        <span style={{ background:truckEligible?"#f0fdf4":"#fff1f2", color:truckEligible?"#15803d":"#dc2626", padding:"3px 10px", borderRadius:20, fontSize:"0.72rem", fontWeight:800 }}>
                          {truckEligible?"✓ Dispatch Eligible":"✗ Not Eligible"}
                        </span>
                      </div>
                    </div>
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
              <button onClick={() => { window.open(`https://safer.fmcsa.dot.gov/query.asp?query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${selected.dot_number?.replace(/[^0-9]/g,"")}`, "_blank"); flash("FMCSA SAFER opened — verify carrier registration and insurance."); }} style={{ ...primaryBtn, background:"#c2410c", fontSize:"0.75rem" }}>
                FMCSA SAFER Verify
              </button>
              <button onClick={() => { window.open(`https://www.acord.org/`, "_blank"); flash("ACORD certificate verification opened."); }} style={{ ...ghostBtn, fontSize:"0.75rem" }}>
                ACORD COI Lookup
              </button>
              <button onClick={() => { const sub = encodeURIComponent(`COI Verification Request — ${selected.company_name} MC# ${selected.mc_number || "—"}`); const body = encodeURIComponent(`Please provide a current Certificate of Insurance for:\n\nCompany: ${selected.company_name}\nMC#: ${selected.mc_number || "—"}\nDOT#: ${selected.dot_number || "—"}\n\nWe require the COI be issued directly to MoveAround TMS / Ronyx Logistics.\n\nThank you,\nRonyx Logistics Operations`); window.location.href = `mailto:${selected.insurance_agent_email || ""}?subject=${sub}&body=${body}`; flash("Email to insurance agent opened."); }} style={{ ...ghostBtn, fontSize:"0.75rem" }}>
                Request COI via Email
              </button>
            </div>
          </div>

          {/* Insurance Documents */}
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10, marginTop:4 }}>🛡️ Insurance Documents</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12, marginBottom:20 }}>
            {[
              { type:"Auto Liability Insurance",    hasExpiry:true  },
              { type:"General Liability Insurance", hasExpiry:true  },
              { type:"Cargo Insurance",             hasExpiry:true  },
              { type:"Insurance Certificate (COI)", hasExpiry:true  },
              { type:"Workers Comp Insurance",      hasExpiry:true  },
            ].map(({ type: docType, hasExpiry }) => {
              const existing = selected.documents.find(d => d.type === docType);
              const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
              return (
                <div key={docType} style={{ background:existing?"#f0fdf4":"#fafafa", border:`1px solid ${existing?"#86efac":"#e2e8f0"}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.82rem", marginBottom:6 }}>{docType}</div>
                  {existing ? (
                    <>
                      <div style={{ fontSize:"0.72rem", color:"#15803d", fontWeight:600, marginBottom:4 }}>✓ {existing.file_name}</div>
                      {existing.expires_on && (
                        <div style={{ background:expBg(expDays), color:expColor(expDays), padding:"3px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:700, display:"inline-block", marginBottom:4 }}>
                          {expLabel(expDays, existing.expires_on)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginBottom:6 }}>Not uploaded</div>
                  )}
                  <label style={{ display:"inline-block", marginTop:6, ...primaryBtn, fontSize:"0.72rem", padding:"5px 12px", cursor:"pointer" }}>
                    {existing?"Replace":"Upload"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={async e=>{ const f=e.target.files?.[0]; if(f){ const exp=hasExpiry?(prompt(`${docType} expiration date (YYYY-MM-DD):`)||undefined):undefined; await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:docType,file_name:f.name,expires_on:exp||null}); const doc:OODoc={type:docType,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; updateLocalState({...selected,documents:[doc,...selected.documents.filter(d=>d.type!==docType)]}); flash(`${docType} uploaded.`); } e.target.value=""; }} />
                  </label>
                </div>
              );
            })}
          </div>

          {/* Business / Legal Documents */}
          <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10 }}>📋 Business & Legal Documents</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12, marginBottom:20 }}>
            {[
              { type:"Contract",             hasExpiry:true  },
              { type:"W-9 / Tax Form",       hasExpiry:false },
              { type:"MC Authority Letter",  hasExpiry:false },
              { type:"Safety Rating Letter", hasExpiry:false },
              { type:"1099 Form",            hasExpiry:false },
              { type:"Other",                hasExpiry:false },
            ].map(({ type: docType, hasExpiry }) => {
              const existing = selected.documents.find(d => d.type === docType);
              const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
              return (
                <div key={docType} style={{ background:existing?"#f0fdf4":"#fafafa", border:`1px solid ${existing?"#86efac":"#e2e8f0"}`, borderRadius:12, padding:"14px 16px" }}>
                  <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.82rem", marginBottom:6 }}>{docType}</div>
                  {existing ? (
                    <>
                      <div style={{ fontSize:"0.72rem", color:"#15803d", fontWeight:600, marginBottom:4 }}>✓ {existing.file_name}</div>
                      {existing.expires_on && (
                        <div style={{ background:expBg(expDays), color:expColor(expDays), padding:"3px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:700, display:"inline-block", marginBottom:4 }}>
                          {expLabel(expDays, existing.expires_on)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize:"0.72rem", color:"#94a3b8", marginBottom:6 }}>Not uploaded</div>
                  )}
                  <label style={{ display:"inline-block", marginTop:6, ...primaryBtn, fontSize:"0.72rem", padding:"5px 12px", cursor:"pointer" }}>
                    {existing?"Replace":"Upload"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={async e=>{ const f=e.target.files?.[0]; if(f){ const exp=hasExpiry?(prompt(`${docType} expiration date (YYYY-MM-DD):`)||undefined):undefined; await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:docType,file_name:f.name,expires_on:exp||null}); const doc:OODoc={type:docType,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; updateLocalState({...selected,documents:[doc,...selected.documents.filter(d=>d.type!==docType)]}); flash(`${docType} uploaded.`); } e.target.value=""; }} />
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
                  const key = `[${d.name}] ${docLabel}`;
                  const exp = hasExp ? (prompt(`${docLabel} expiration date for ${d.name} (YYYY-MM-DD):`) || undefined) : undefined;
                  await apiPost(`/api/ronyx/owner-operators/${selected.id}/documents`,{doc_type:key,file_name:f.name,expires_on:exp||null});
                  const doc: OODoc = { type:key, uploaded_at:new Date().toISOString(), file_name:f.name, expires_on:exp };
                  updateLocalState({...selected, documents:[doc,...selected.documents.filter(x=>x.type!==key)]});
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
              <div style={{ fontWeight:800, color:"#0f172a", fontSize:"0.88rem", marginBottom:10 }}>📁 All Uploaded Documents</div>
              <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {["Document","File Name","Uploaded","Expires",""].map(h=>(
                        <th key={h} style={{ padding:"8px 14px", fontSize:"0.65rem", fontWeight:700, color:"#475569", textTransform:"uppercase", textAlign:"left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.documents.map((doc, i) => {
                      const expD = doc.expires_on ? daysUntil(doc.expires_on) : null;
                      return (
                        <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                          <td style={{ padding:"9px 14px", fontWeight:600, color:"#0f172a" }}>{doc.type}</td>
                          <td style={{ padding:"9px 14px", color:"#64748b", fontSize:"0.75rem" }}>{doc.file_name}</td>
                          <td style={{ padding:"9px 14px", color:"#94a3b8", fontSize:"0.72rem" }}>{fmtDate(doc.uploaded_at)}</td>
                          <td style={{ padding:"9px 14px" }}>
                            {doc.expires_on ? (
                              <span style={{ background:expBg(expD), color:expColor(expD), padding:"2px 8px", borderRadius:6, fontSize:"0.72rem", fontWeight:700 }}>{expLabel(expD,doc.expires_on)}</span>
                            ) : <span style={{ color:"#94a3b8", fontSize:"0.72rem" }}>—</span>}
                          </td>
                          <td style={{ padding:"9px 14px" }}>
                            <button onClick={async ()=>{ await fetch(`/api/ronyx/owner-operators/${selected.id}/documents`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({doc_type:doc.type})}); updateLocalState({...selected,documents:selected.documents.filter((_,j)=>j!==i)}); flash("Document removed."); }} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 8px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
        const insDoc    = selected.documents.find(d => d.type === "Insurance Certificate");
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
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#0f172a", color:"#fff", padding:"13px 22px", borderRadius:14, fontWeight:700, fontSize:14 }}>{msg}</div>;
}
