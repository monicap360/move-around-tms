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
};

/* ─── localStorage ───────────────────────────────────── */
const LS_KEY = "ronyx_owner_operators";
function load(): OOCompany[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function save(data: OOCompany[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 10); }

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
  drivers: [], trucks: [], documents: [], jobs: [],
};

/* ─── Demo data ──────────────────────────────────────── */
const DEMO: OOCompany[] = [
  {
    id: "oo-demo-1",
    company_name: "Smith Hauling LLC",
    contact_name: "James Smith",
    contact_phone: "(713) 555-0101",
    contact_email: "james@smithhauling.com",
    business_address: "1204 Port Industrial Blvd, Galveston TX 77550",
    mc_number: "MC-784312",
    dot_number: "DOT-3821044",
    ein: "82-4471220",
    insurance_agent_name: "Rebecca Nguyen",
    insurance_agent_email: "rnguyen@truckerinsurance.com",
    insurance_agent_phone: "(713) 555-0301",
    drivers: [
      { id: uid(), name: "Carlos Ramirez", cdl_number: "TX1234567", cdl_state: "TX", cdl_expiration: "2025-09-15", med_card_expiration: "2025-07-01", phone: "(713) 555-0201" },
      { id: uid(), name: "Marcus Lee",     cdl_number: "TX7654321", cdl_state: "TX", cdl_expiration: "2026-03-20", med_card_expiration: "2026-03-20", phone: "(713) 555-0202" },
      { id: uid(), name: "Daniel Torres",  cdl_number: "TX9988776", cdl_state: "TX", cdl_expiration: "2026-11-10", med_card_expiration: "2026-08-15", phone: "(713) 555-0203" },
    ],
    trucks: [
      { id: uid(), truck_number: "SMT-101", year: "2020", make: "Kenworth",  model: "T880", vin: "1XKYD49X7LJ123401", last_inspection: "2026-06-10", inspection_result: "Pass" },
      { id: uid(), truck_number: "SMT-102", year: "2019", make: "Peterbilt", model: "567",  vin: "1XPBD49X7FD305711", last_inspection: "2026-06-08", inspection_result: "Pass w/ Defects" },
    ],
    documents: [
      { type: "Insurance Certificate", uploaded_at: new Date(Date.now()-30*86400000).toISOString(), file_name: "insurance_cert_2026.pdf", expires_on: "2026-08-15" },
      { type: "Contract",              uploaded_at: new Date(Date.now()-60*86400000).toISOString(), file_name: "contract_smith_hauling.pdf", expires_on: "2026-12-31" },
    ],
    jobs: [
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-12", truck_number: "SMT-101", driver_name: "Carlos Ramirez", origin: "Plant B",     destination: "Jobsite 18", material: "Limestone",   tons: 24.5, gross_revenue: 588, oo_rate: 450, margin: 138, ticket_status: "Verified",    settlement_status: "Approved" },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-13", truck_number: "SMT-102", driver_name: "Marcus Lee",     origin: "Quarry N", destination: "Jobsite 18", material: "Limestone",   tons: 22.1, gross_revenue: 530, oo_rate: 405, margin: 125, ticket_status: "Missing",      settlement_status: "Hold"     },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-13", truck_number: "SMT-101", driver_name: "Daniel Torres",  origin: "Plant B",  destination: "Jobsite 18", material: "Base Rock",   tons: 25.0, gross_revenue: 600, oo_rate: 460, margin: 140, ticket_status: "Verified",    settlement_status: "Pending"  },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-002", load_date: "2026-06-10", truck_number: "SMT-102", driver_name: "Marcus Lee",     origin: "Plant A",  destination: "Jobsite 22", material: "Crushed Rock",tons: 21.8, gross_revenue: 523, oo_rate: 400, margin: 123, ticket_status: "Needs Review", settlement_status: "Pending"  },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-08", truck_number: "SMT-101", driver_name: "Carlos Ramirez", origin: "Plant B",  destination: "Jobsite 18", material: "Limestone",   tons: 23.9, gross_revenue: 574, oo_rate: 440, margin: 134, ticket_status: "Verified",    settlement_status: "Paid"     },
    ],
  },
];

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<string>("");

  useEffect(() => {
    const stored = load();
    setCompanies(stored.length > 0 ? stored : DEMO);
    if (stored.length === 0) save(DEMO);
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }
  function persist(updated: OOCompany[]) { setCompanies(updated); save(updated); }
  function updateSelected(oo: OOCompany) { setSelected(oo); persist(companies.map(c => c.id === oo.id ? oo : c)); }
  function openOO(oo: OOCompany) { setSelected(oo); setView("detail"); setActiveTab("overview"); }

  // Add company
  function addCompany() {
    if (!newCompanyForm.company_name.trim()) { flash("Company name is required."); return; }
    const oo: OOCompany = { id: uid(), ...newCompanyForm, drivers:[], trucks:[], documents:[], jobs:[] };
    persist([oo, ...companies]);
    setShowAddCompany(false); setNewCompanyForm({ ...EMPTY_COMPANY });
    flash(`${oo.company_name} added.`);
  }

  // Driver CRUD
  function addDriver() {
    if (!selected || !addDriverForm.name.trim()) { flash("Driver name required."); return; }
    updateSelected({ ...selected, drivers: [...selected.drivers, { id: uid(), ...addDriverForm }] });
    setAddDriverForm({ name:"", cdl_number:"", cdl_state:"TX", cdl_expiration:"", med_card_expiration:"", phone:"" });
    setShowAddDriver(false); flash("Driver added.");
  }
  function removeDriver(id: string) {
    if (!selected || !confirm("Remove driver?")) return;
    updateSelected({ ...selected, drivers: selected.drivers.filter(d => d.id !== id) });
  }

  // Truck CRUD
  function addTruck() {
    if (!selected || !addTruckForm.truck_number.trim()) { flash("Truck # required."); return; }
    updateSelected({ ...selected, trucks: [...selected.trucks, { id: uid(), ...addTruckForm }] });
    setAddTruckForm({ truck_number:"", year:"", make:"", model:"", vin:"", last_inspection:"", inspection_result:"Pass" });
    setShowAddTruck(false); flash("Truck added.");
  }
  function removeTruck(id: string) {
    if (!selected || !confirm("Remove truck?")) return;
    updateSelected({ ...selected, trucks: selected.trucks.filter(t => t.id !== id) });
  }

  // Job CRUD
  function addJob() {
    if (!selected || !addJobForm.project_number.trim() || !addJobForm.load_date) { flash("Project # and date required."); return; }
    const margin = (addJobForm.gross_revenue || 0) - (addJobForm.oo_rate || 0);
    updateSelected({ ...selected, jobs: [...selected.jobs, { id: uid(), ...addJobForm, margin }] });
    setAddJobForm({ project_name:"Domino Project", project_number:"", load_date:"", truck_number:"", driver_name:"", origin:"", destination:"", material:"", tons:0, gross_revenue:0, oo_rate:0, margin:0, ticket_status:"Verified", settlement_status:"Pending" });
    setShowAddJob(false); flash("Load added.");
  }
  function setSettlement(ooId: string, jobId: string, status: OOJob["settlement_status"]) {
    const oo = companies.find(c => c.id === ooId);
    if (!oo) return;
    const updated = { ...oo, jobs: oo.jobs.map(j => j.id === jobId ? { ...j, settlement_status: status } : j) };
    if (selected?.id === ooId) setSelected(updated);
    persist(companies.map(c => c.id === ooId ? updated : c));
    flash(`Settlement: ${status}.`);
  }
  function setTicketStatus(ooId: string, jobId: string, status: OOJob["ticket_status"]) {
    const oo = companies.find(c => c.id === ooId);
    if (!oo) return;
    const updated = { ...oo, jobs: oo.jobs.map(j => j.id === jobId ? { ...j, ticket_status: status } : j) };
    if (selected?.id === ooId) setSelected(updated);
    persist(companies.map(c => c.id === ooId ? updated : c));
  }

  // Doc upload
  function handleDocUpload(docType: string, file: File) {
    if (!selected) return;
    const expiresInput = ["Insurance Certificate","Contract"].includes(docType) ? prompt(`${docType} expiration date (YYYY-MM-DD):`, "") || undefined : undefined;
    const doc: OODoc = { type: docType, uploaded_at: new Date().toISOString(), file_name: file.name, expires_on: expiresInput };
    updateSelected({ ...selected, documents: [doc, ...selected.documents.filter(d => d.type !== docType)] });
    flash(`${docType} uploaded.`);
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
          <button onClick={() => setShowAddCompany(s=>!s)} style={primaryBtn}>+ Add Owner Operator</button>
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
            <div style={{ display:"flex", gap:10, marginTop:16 }}>
              <button onClick={addCompany} style={primaryBtn}>Save Company</button>
              <button onClick={() => setShowAddCompany(false)} style={ghostBtn}>Cancel</button>
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
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0 }}>
                    {oo.company_name.charAt(0)}
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
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.3rem", flexShrink: 0 }}>
            {selected.company_name.charAt(0)}
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
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card title="Business Details">
              <Row label="Company"     value={selected.company_name} />
              <Row label="MC Number"   value={selected.mc_number} />
              <Row label="DOT Number"  value={selected.dot_number} />
              <Row label="EIN / Tax ID"value={selected.ein} />
              <Row label="Address"     value={selected.business_address} />
            </Card>
            <Card title="Contact">
              <Row label="Contact" value={selected.contact_name} />
              <Row label="Phone"   value={selected.contact_phone} />
              <Row label="Email"   value={selected.contact_email} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {selected.contact_phone && <a href={`tel:${selected.contact_phone}`}  style={{ ...ghostBtn, textDecoration:"none" }}>📞 Call</a>}
                {selected.contact_email && <a href={`mailto:${selected.contact_email}`} style={{ ...ghostBtn, textDecoration:"none" }}>✉ Email</a>}
                {selected.contact_phone && <a href={`sms:${selected.contact_phone}`}  style={{ ...ghostBtn, textDecoration:"none" }}>💬 Text</a>}
              </div>
            </Card>
            <Card title="Profitability">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Revenue MTD",  value: `$${revMTD.toLocaleString()}`,  color: "#15803d" },
                  { label: "OO Settlement",value: `$${selected.jobs.reduce((s,j)=>s+j.oo_rate,0).toLocaleString()}`, color: "#1e40af" },
                  { label: "Margin MTD",   value: `$${marMTD.toLocaleString()}`,  color: "#7c3aed" },
                  { label: "Total Revenue",value: `$${selected.jobs.reduce((s,j)=>s+j.gross_revenue,0).toLocaleString()}`, color: "#15803d" },
                  { label: "Total Loads",  value: String(selected.jobs.length) },
                  { label: "Avg Margin/Load", value: selected.jobs.length>0?`$${Math.round(selected.jobs.reduce((s,j)=>s+j.margin,0)/selected.jobs.length).toLocaleString()}`:"—" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: "center", padding: "10px", background: "#f8fafc", borderRadius: 10 }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontWeight: 900, fontSize: "1.1rem", color: color || "#0f172a" }}>{value}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Ticket Health">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Verified",     value: tick.verified,     color: "#15803d", bg: "#f0fdf4" },
                  { label: "Needs Review", value: tick.needsReview,  color: "#d97706", bg: "#fefce8" },
                  { label: "Missing",      value: tick.missing,      color: "#dc2626", bg: "#fff1f2" },
                  { label: "Duplicate",    value: tick.duplicate,    color: "#7c3aed", bg: "#f5f3ff" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ textAlign: "center", background: bg, borderRadius: 10, padding: "10px 6px" }}>
                    <div style={{ fontSize: "1.6rem", fontWeight: 900, color }}>{value}</div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 700, color, textTransform: "uppercase" }}>{label}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title={`Drivers (${selected.drivers.length})`}>
              {selected.drivers.length === 0 ? (
                <div style={{ color:"#94a3b8", fontSize:"0.82rem", textAlign:"center", padding:"10px 0" }}>No drivers on file. <button onClick={()=>setActiveTab("drivers")} style={{ background:"none", border:"none", color:"#1e40af", cursor:"pointer", fontWeight:700, fontSize:"0.82rem" }}>+ Add Driver</button></div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {selected.drivers.map(d => {
                    const cdlD = daysUntil(d.cdl_expiration);
                    const medD = daysUntil(d.med_card_expiration);
                    const ok   = (cdlD===null||cdlD>0) && (medD===null||medD>0);
                    return (
                      <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #f1f5f9" }}>
                        <div>
                          <div style={{ fontWeight:700, color:"#0f172a", fontSize:"0.85rem" }}>{d.name}</div>
                          <div style={{ fontSize:"0.7rem", color:"#94a3b8" }}>{d.cdl_state} CDL {d.cdl_number||""}</div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                          <span style={{ background:expBg(cdlD), color:expColor(cdlD), padding:"2px 7px", borderRadius:6, fontSize:"0.68rem", fontWeight:700 }}>CDL {cdlD!==null&&cdlD<0?"EXPIRED":cdlD!==null&&cdlD<=30?cdlD+"d":"OK"}</span>
                          <span style={{ background:expBg(medD), color:expColor(medD), padding:"2px 7px", borderRadius:6, fontSize:"0.68rem", fontWeight:700 }}>Med {medD!==null&&medD<0?"EXPIRED":medD!==null&&medD<=30?medD+"d":"OK"}</span>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>setActiveTab("drivers")} style={{ ...ghostBtn, fontSize:"0.75rem", marginTop:4 }}>Manage Drivers →</button>
                </div>
              )}
            </Card>
            <Card title={`Trucks (${selected.trucks.length})`}>
              {selected.trucks.length === 0 ? (
                <div style={{ color:"#94a3b8", fontSize:"0.82rem", textAlign:"center", padding:"10px 0" }}>No trucks on file. <button onClick={()=>setActiveTab("fleet")} style={{ background:"none", border:"none", color:"#1e40af", cursor:"pointer", fontWeight:700, fontSize:"0.82rem" }}>+ Add Truck</button></div>
              ) : (
                <div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                    {selected.trucks.map(t => {
                      const inspOK = !t.inspection_result || t.inspection_result==="Pass";
                      return (
                        <span key={t.id} style={{ background:inspOK?"#f0fdf4":"#fff1f2", color:inspOK?"#15803d":"#dc2626", border:`1px solid ${inspOK?"#86efac":"#fca5a5"}`, padding:"5px 12px", borderRadius:10, fontSize:"0.78rem", fontWeight:700 }}>
                          🚛 {t.truck_number}{t.year?" · "+t.year:""}{t.make?" "+t.make:""}
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={()=>setActiveTab("fleet")} style={{ ...ghostBtn, fontSize:"0.75rem" }}>Manage Fleet →</button>
                </div>
              )}
            </Card>
          </div>

          {/* Right panel: Compliance Assistant */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card title="Compliance Assistant" accent="#1e40af">
              {actions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#15803d" }}>
                  <div style={{ fontSize: "2rem" }}>✅</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>All clear</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {actions.map((a, i) => (
                    <div key={i} style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#dc2626", marginBottom: 6 }}>{a}</div>
                      {a.includes("insurance") && selected.insurance_agent_email && (
                        <a href={`mailto:${selected.insurance_agent_email}?subject=COI Request — ${selected.company_name}`} style={{ ...primaryBtn, fontSize: "0.72rem", padding: "4px 10px", background: "#dc2626", textDecoration: "none", display: "inline-block" }}>Send Reminder</a>
                      )}
                      {a.includes("driver") && a.includes("CDL") && (
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Contact driver in roster →</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Document Health">
              {["Insurance Certificate","Contract","W-9 / Tax Form","MC Authority Letter"].map(docType => {
                const existing = selected.documents.find(d => d.type === docType);
                const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
                return (
                  <div key={docType} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "#0f172a" }}>{docType}</span>
                      {existing ? <span style={{ color: "#15803d", fontSize: "0.72rem" }}>✓</span> : <span style={{ color: "#dc2626", fontSize: "0.72rem" }}>✗</span>}
                    </div>
                    {existing?.expires_on ? (
                      <span style={{ background: expBg(expDays), color: expColor(expDays), padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700 }}>{expLabel(expDays, existing.expires_on)}</span>
                    ) : existing ? (
                      <span style={{ fontSize: "0.72rem", color: "#15803d" }}>On file</span>
                    ) : (
                      <label style={{ ...primaryBtn, fontSize: "0.68rem", padding: "3px 8px", cursor: "pointer" }}>
                        Upload<input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:"none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(docType, f); e.target.value=""; }} />
                      </label>
                    )}
                  </div>
                );
              })}
            </Card>

            {selected.insurance_agent_name && (
              <Card title="Insurance Agent">
                <Row label="Agent"  value={selected.insurance_agent_name} />
                <Row label="Phone"  value={selected.insurance_agent_phone} />
                <Row label="Email"  value={selected.insurance_agent_email} />
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {selected.insurance_agent_phone && <a href={`tel:${selected.insurance_agent_phone}`} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.75rem" }}>📞</a>}
                  {selected.insurance_agent_email && <a href={`mailto:${selected.insurance_agent_email}`} style={{ ...ghostBtn, textDecoration:"none", fontSize:"0.75rem" }}>✉ Email Agent</a>}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

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
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ const state=prompt(`CDL State for ${d.name} (e.g. TX):`,d.cdl_state||"TX")||""; const exp=prompt(`CDL expiration date (YYYY-MM-DD):`,d.cdl_expiration||"")||undefined; const doc:OODoc={type:cdlKey,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; const updatedDrivers=selected.drivers.map(dr=>dr.id===d.id?{...dr,cdl_state:state.toUpperCase()||dr.cdl_state,cdl_expiration:exp||dr.cdl_expiration}:dr); updateSelected({...selected,documents:[doc,...selected.documents.filter(x=>x.type!==cdlKey)],drivers:updatedDrivers}); flash(`CDL uploaded for ${d.name}.`); } e.target.value=""; }} />
                            </label>
                          )}
                        </td>
                        <td style={{ padding:"10px 14px" }}><span style={{ background:expBg(medD), color:expColor(medD), padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:"0.75rem" }}>{expLabel(medD,d.med_card_expiration)}</span></td>
                        <td style={{ padding:"10px 14px", color:"#475569" }}>{d.phone||"—"}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            {cdlDoc && <label style={{ background:"#f1f5f9", color:"#475569", padding:"3px 8px", borderRadius:6, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", border:"1px solid #e2e8f0" }}>
                              Replace CDL
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ const state=prompt(`CDL State for ${d.name} (e.g. TX):`,d.cdl_state||"TX")||""; const exp=prompt(`New CDL expiration (YYYY-MM-DD):`,d.cdl_expiration||"")||undefined; const doc:OODoc={type:cdlKey,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; const updatedDrivers=selected.drivers.map(dr=>dr.id===d.id?{...dr,cdl_state:state.toUpperCase()||dr.cdl_state,cdl_expiration:exp||dr.cdl_expiration}:dr); updateSelected({...selected,documents:[doc,...selected.documents.filter(x=>x.type!==cdlKey)],drivers:updatedDrivers}); flash(`CDL replaced for ${d.name}.`); } e.target.value=""; }} />
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
              <button onClick={() => { const mc = selected.mc_number?.replace(/[^0-9]/g,""); window.open(`https://safer.fmcsa.dot.gov/query.asp?query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${selected.dot_number?.replace(/[^0-9]/g,"")}`, "_blank"); flash("FMCSA SAFER opened — verify carrier registration and insurance."); }} style={{ ...primaryBtn, background:"#c2410c", fontSize:"0.75rem" }}>
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
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ if(hasExpiry){ const exp=prompt(`${docType} expiration date (YYYY-MM-DD):`)||undefined; const doc:OODoc={type:docType,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; updateSelected({...selected,documents:[doc,...selected.documents.filter(d=>d.type!==docType)]}); flash(`${docType} uploaded.`); } else handleDocUpload(docType,f); } e.target.value=""; }} />
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
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display:"none" }} onChange={e=>{ const f=e.target.files?.[0]; if(f){ if(hasExpiry){ const exp=prompt(`${docType} expiration date (YYYY-MM-DD):`)||undefined; const doc:OODoc={type:docType,uploaded_at:new Date().toISOString(),file_name:f.name,expires_on:exp}; updateSelected({...selected,documents:[doc,...selected.documents.filter(d=>d.type!==docType)]}); flash(`${docType} uploaded.`); } else handleDocUpload(docType,f); } e.target.value=""; }} />
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
                const driverDocs = selected.documents.filter(doc => doc.type.startsWith(`[${d.name}]`));
                function driverDocUpload(docLabel: string, f: File, hasExp: boolean) {
                  const key = `[${d.name}] ${docLabel}`;
                  if (hasExp) {
                    const exp = prompt(`${docLabel} expiration date for ${d.name} (YYYY-MM-DD):`) || undefined;
                    const doc: OODoc = { type:key, uploaded_at:new Date().toISOString(), file_name:f.name, expires_on:exp };
                    updateSelected({...selected, documents:[doc,...selected.documents.filter(x=>x.type!==key)]});
                  } else {
                    const doc: OODoc = { type:key, uploaded_at:new Date().toISOString(), file_name:f.name };
                    updateSelected({...selected, documents:[doc,...selected.documents.filter(x=>x.type!==key)]});
                  }
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
                            <button onClick={()=>{ updateSelected({...selected,documents:selected.documents.filter((_,j)=>j!==i)}); flash("Document removed."); }} style={{ background:"#fee2e2", color:"#dc2626", border:"none", borderRadius:6, padding:"3px 8px", fontSize:"0.68rem", fontWeight:700, cursor:"pointer" }}>Remove</button>
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
            {pendingCount>0 && <button onClick={() => { const oo={...selected,jobs:selected.jobs.map(j=>filteredJobs.find(f=>f.id===j.id&&j.settlement_status==="Pending")?{...j,settlement_status:"Approved" as const}:j)}; updateSelected(oo); flash(`${pendingCount} approved.`); }} style={{ ...primaryBtn, background:"#15803d" }}>✓ Approve All Pending</button>}
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
                <button onClick={() => { const oo={...selected,jobs:selected.jobs.map(j=>j.settlement_status==="Approved"?{...j,settlement_status:"Paid" as const}:j)}; updateSelected(oo); flash(`All settlements marked Paid.`); }} style={primaryBtn}>✓ Mark All Paid</button>
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
                    const insDays = null;
                    const insSt   = "Pending Review";
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
