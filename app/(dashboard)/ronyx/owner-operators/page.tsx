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

type ActiveView = "list" | "detail";

/* ─── localStorage helpers ───────────────────────── */
const LS_KEY = "ronyx_owner_operators";
function load(): OOCompany[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function save(data: OOCompany[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} }
function uid() { return Math.random().toString(36).slice(2, 10); }

/* ─── Date helpers ───────────────────────────────── */
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
  if (days < 0) return "#dc2626";
  if (days <= 30) return "#d97706";
  if (days <= 90) return "#f59e0b";
  return "#15803d";
}
function expBg(days: number | null) {
  if (days === null) return "#f1f5f9";
  if (days < 0) return "#fff1f2";
  if (days <= 30) return "#fff7ed";
  if (days <= 90) return "#fefce8";
  return "#f0fdf4";
}

/* ─── Compliance score ───────────────────────────── */
function ooComplianceScore(oo: OOCompany) {
  const checks = [
    !!oo.mc_number, !!oo.dot_number, !!oo.ein,
    oo.documents.some(d => d.type === "Insurance Certificate"),
    oo.documents.some(d => d.type === "Contract"),
    oo.trucks.length > 0,
    oo.drivers.length > 0,
    oo.drivers.every(d => { const days = daysUntil(d.cdl_expiration); return days !== null && days > 0; }),
    oo.drivers.every(d => { const days = daysUntil(d.med_card_expiration); return days !== null && days > 0; }),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/* ─── Settlement status color ────────────────────── */
function settlementColors(s: string): [string, string] {
  if (s === "Paid")       return ["#f0fdf4", "#15803d"];
  if (s === "Approved")   return ["#eff6ff", "#1e40af"];
  if (s === "Processing") return ["#fefce8", "#92400e"];
  if (s === "Hold")       return ["#fff1f2", "#dc2626"];
  return ["#f1f5f9", "#475569"];
}

/* ─── Style constants ────────────────────────────── */
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties  = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };
const eyebrow: React.CSSProperties   = { fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const lbl: React.CSSProperties       = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };

/* ─── Empty company template ─────────────────────── */
const EMPTY_COMPANY: Omit<OOCompany, "id"> = {
  company_name: "", contact_name: "", contact_phone: "", contact_email: "",
  business_address: "", mc_number: "", dot_number: "", ein: "",
  insurance_agent_name: "", insurance_agent_email: "", insurance_agent_phone: "",
  drivers: [], trucks: [], documents: [], jobs: [],
};

/* ─── DEMO data (first load only) ───────────────── */
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
      { id: uid(), name: "Carlos Ramirez",  cdl_number: "TX1234567", cdl_state: "TX", cdl_expiration: "2025-09-15", med_card_expiration: "2025-07-01", phone: "(713) 555-0201" },
      { id: uid(), name: "Marcus Lee",       cdl_number: "TX7654321", cdl_state: "TX", cdl_expiration: "2026-03-20", med_card_expiration: "2026-03-20", phone: "(713) 555-0202" },
      { id: uid(), name: "Daniel Torres",    cdl_number: "TX9988776", cdl_state: "TX", cdl_expiration: "2026-11-10", med_card_expiration: "2026-08-15", phone: "(713) 555-0203" },
    ],
    trucks: [
      { id: uid(), truck_number: "SMT-101", year: "2020", make: "Kenworth", model: "T880", vin: "1XKYD49X7LJ123401" },
      { id: uid(), truck_number: "SMT-102", year: "2019", make: "Peterbilt", model: "567", vin: "1XPBD49X7FD305711" },
    ],
    documents: [
      { type: "Insurance Certificate", uploaded_at: new Date(Date.now() - 30 * 86400000).toISOString(), file_name: "insurance_cert_2026.pdf", expires_on: "2026-12-31" },
      { type: "Contract",              uploaded_at: new Date(Date.now() - 60 * 86400000).toISOString(), file_name: "contract_smith_hauling.pdf" },
    ],
    jobs: [
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-12", truck_number: "SMT-101", driver_name: "Carlos Ramirez",  origin: "Plant B",     destination: "Jobsite 18",  material: "Limestone",  tons: 24.5, gross_revenue: 588, oo_rate: 450, margin: 138, settlement_status: "Approved" },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-13", truck_number: "SMT-102", driver_name: "Marcus Lee",       origin: "Quarry North", destination: "Jobsite 18",  material: "Limestone",  tons: 22.1, gross_revenue: 530, oo_rate: 405, margin: 125, settlement_status: "Pending" },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-001", load_date: "2026-06-13", truck_number: "SMT-101", driver_name: "Daniel Torres",    origin: "Plant B",     destination: "Jobsite 18",  material: "Base Rock",  tons: 25.0, gross_revenue: 600, oo_rate: 460, margin: 140, settlement_status: "Pending" },
      { id: uid(), project_name: "Domino Project", project_number: "DOMINO-2026-002", load_date: "2026-06-10", truck_number: "SMT-102", driver_name: "Marcus Lee",       origin: "Plant A",     destination: "Jobsite 22",  material: "Crushed Rock",tons: 21.8, gross_revenue: 523, oo_rate: 400, margin: 123, settlement_status: "Paid" },
    ],
  },
];

/* ─── Main page ──────────────────────────────────── */
export default function OwnerOperatorsPage() {
  const [companies, setCompanies]   = useState<OOCompany[]>([]);
  const [view, setView]             = useState<ActiveView>("list");
  const [selected, setSelected]     = useState<OOCompany | null>(null);
  const [activeTab, setActiveTab]   = useState<"overview" | "drivers" | "fleet" | "documents" | "jobs">("overview");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [toast, setToast]           = useState("");

  // Forms
  const [addDriverForm, setAddDriverForm] = useState<Omit<OODriver, "id">>({ name: "", cdl_number: "", cdl_state: "TX", cdl_expiration: "", med_card_expiration: "", phone: "" });
  const [addTruckForm, setAddTruckForm]   = useState<Omit<OOTruck, "id">>({ truck_number: "", year: "", make: "", model: "", vin: "" });
  const [addJobForm, setAddJobForm]       = useState<Omit<OOJob, "id">>({ project_name: "Domino Project", project_number: "", load_date: "", truck_number: "", driver_name: "", origin: "", destination: "", material: "", tons: 0, gross_revenue: 0, oo_rate: 0, margin: 0, settlement_status: "Pending" });
  const [newCompanyForm, setNewCompanyForm] = useState({ ...EMPTY_COMPANY });
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddTruck, setShowAddTruck]   = useState(false);
  const [showAddJob, setShowAddJob]       = useState(false);
  const [jobFilter, setJobFilter]         = useState("All Projects");
  const [settlementFilter, setSettlementFilter] = useState("All");

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const pendingDocRef = useRef<string>("");

  useEffect(() => {
    const stored = load();
    setCompanies(stored.length > 0 ? stored : DEMO);
    if (stored.length === 0) save(DEMO);
  }, []);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  function persist(updated: OOCompany[]) { setCompanies(updated); save(updated); }

  function updateSelected(oo: OOCompany) {
    setSelected(oo);
    persist(companies.map(c => c.id === oo.id ? oo : c));
  }

  function openOO(oo: OOCompany) { setSelected(oo); setView("detail"); setActiveTab("overview"); }

  // Add company
  function addCompany() {
    if (!newCompanyForm.company_name.trim()) { flash("Company name is required."); return; }
    const oo: OOCompany = { id: uid(), ...newCompanyForm, drivers: [], trucks: [], documents: [], jobs: [] };
    const updated = [oo, ...companies];
    persist(updated);
    setShowAddCompany(false);
    setNewCompanyForm({ ...EMPTY_COMPANY });
    flash(`${oo.company_name} added.`);
  }

  // Add driver to OO
  function addDriver() {
    if (!selected) return;
    if (!addDriverForm.name.trim()) { flash("Driver name is required."); return; }
    const d: OODriver = { id: uid(), ...addDriverForm };
    const oo = { ...selected, drivers: [...selected.drivers, d] };
    updateSelected(oo);
    setAddDriverForm({ name: "", cdl_number: "", cdl_state: "TX", cdl_expiration: "", med_card_expiration: "", phone: "" });
    setShowAddDriver(false);
    flash(`${d.name} added.`);
  }

  // Add truck to OO
  function addTruck() {
    if (!selected) return;
    if (!addTruckForm.truck_number.trim()) { flash("Truck number is required."); return; }
    const t: OOTruck = { id: uid(), ...addTruckForm };
    const oo = { ...selected, trucks: [...selected.trucks, t] };
    updateSelected(oo);
    setAddTruckForm({ truck_number: "", year: "", make: "", model: "", vin: "" });
    setShowAddTruck(false);
    flash(`${t.truck_number} added.`);
  }

  // Add job
  function addJob() {
    if (!selected) return;
    if (!addJobForm.project_number.trim() || !addJobForm.load_date) { flash("Project # and date are required."); return; }
    const margin = (addJobForm.gross_revenue || 0) - (addJobForm.oo_rate || 0);
    const j: OOJob = { id: uid(), ...addJobForm, margin };
    const oo = { ...selected, jobs: [...selected.jobs, j] };
    updateSelected(oo);
    setAddJobForm({ project_name: "Domino Project", project_number: "", load_date: "", truck_number: "", driver_name: "", origin: "", destination: "", material: "", tons: 0, gross_revenue: 0, oo_rate: 0, margin: 0, settlement_status: "Pending" });
    setShowAddJob(false);
    flash("Load added.");
  }

  // Upload document
  function handleDocUpload(docType: string, file: File) {
    if (!selected) return;
    const expiresInput = docType === "Insurance Certificate" ? prompt("Insurance expiration date (YYYY-MM-DD):", "") || undefined : undefined;
    const doc: OODoc = { type: docType, uploaded_at: new Date().toISOString(), file_name: file.name, expires_on: expiresInput };
    const oo = { ...selected, documents: [doc, ...selected.documents.filter(d => d.type !== docType)] };
    updateSelected(oo);
    flash(`${docType} uploaded: ${file.name}`);
  }

  // Update settlement
  function setSettlement(ooId: string, jobId: string, status: OOJob["settlement_status"]) {
    const oo = companies.find(c => c.id === ooId);
    if (!oo) return;
    const updated = { ...oo, jobs: oo.jobs.map(j => j.id === jobId ? { ...j, settlement_status: status } : j) };
    if (selected?.id === ooId) setSelected(updated);
    persist(companies.map(c => c.id === ooId ? updated : c));
    flash(`Settlement ${status}.`);
  }

  // Delete driver / truck
  function removeDriver(driverId: string) {
    if (!selected || !confirm("Remove this driver?")) return;
    updateSelected({ ...selected, drivers: selected.drivers.filter(d => d.id !== driverId) });
  }
  function removeTruck(truckId: string) {
    if (!selected || !confirm("Remove this truck?")) return;
    updateSelected({ ...selected, trucks: selected.trucks.filter(t => t.id !== truckId) });
  }

  // ── Project job stats ─────────────────────────────
  const projectNumbers = selected ? [...new Set(selected.jobs.map(j => j.project_number))] : [];
  const filteredJobs = selected ? selected.jobs.filter(j =>
    (jobFilter === "All Projects" || j.project_number === jobFilter) &&
    (settlementFilter === "All" || j.settlement_status === settlementFilter)
  ) : [];
  const totalRevenue    = filteredJobs.reduce((s, j) => s + j.gross_revenue, 0);
  const totalOOPay      = filteredJobs.reduce((s, j) => s + j.oo_rate, 0);
  const totalMargin     = filteredJobs.reduce((s, j) => s + j.margin, 0);
  const pendingCount    = filteredJobs.filter(j => j.settlement_status === "Pending").length;
  const pendingAmount   = filteredJobs.filter(j => j.settlement_status === "Pending").reduce((s, j) => s + j.oo_rate, 0);

  if (view === "list") {
    return (
      <div style={{ maxWidth: 1080 }}>
        {toast && <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{toast}</div>}

        {/* ── Header ──────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={eyebrow}>MoveAround TMS / Owner Operators</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Owner Operator Hub</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
            Manage every OO company — MC#, DOT#, fleet, drivers, insurance, contracts, and Domino Project job assignments. Built to beat Rose Rocket and Axon.
          </p>
        </div>

        {/* ── KPI row ─────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            { label: "OO Companies",    value: companies.length },
            { label: "Total Drivers",   value: companies.reduce((s, c) => s + c.drivers.length, 0) },
            { label: "Total Trucks",    value: companies.reduce((s, c) => s + c.trucks.length, 0) },
            { label: "Pending Settmts", value: companies.reduce((s, c) => s + c.jobs.filter(j => j.settlement_status === "Pending").length, 0), color: "#d97706" },
            { label: "Compliance Issues", value: companies.filter(c => ooComplianceScore(c) < 80).length, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={eyebrow}>{label}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 900, color: color || "#0f172a", marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Add company ──────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={() => setShowAddCompany(s => !s)} style={primaryBtn}>+ Add Owner Operator</button>
        </div>

        {showAddCompany && (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontWeight: 800, color: "#0f172a" }}>New Owner Operator Company</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
              {([["Company Name *", "company_name", "Smith Trucking LLC"], ["Contact Name", "contact_name", "John Smith"], ["Contact Phone", "contact_phone", "(555) 000-0000"], ["Contact Email", "contact_email", "dispatch@co.com"], ["MC Number", "mc_number", "MC-123456"], ["DOT Number", "dot_number", "DOT-1234567"], ["EIN / Tax ID", "ein", "XX-XXXXXXX"]] as [string, keyof typeof EMPTY_COMPANY, string][]).map(([label, field, ph]) => (
                <div key={field}>
                  <label style={lbl}>{label}</label>
                  <input value={newCompanyForm[field] as string} onChange={e => setNewCompanyForm(f => ({ ...f, [field]: e.target.value }))} style={inp} placeholder={ph} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Business Address</label>
                <input value={newCompanyForm.business_address} onChange={e => setNewCompanyForm(f => ({ ...f, business_address: e.target.value }))} style={inp} placeholder="Street, City, State ZIP" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={addCompany} style={primaryBtn}>Save Company</button>
              <button onClick={() => setShowAddCompany(false)} style={ghostBtn}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Company list ─────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {companies.map(oo => {
            const score = ooComplianceScore(oo);
            const scoreColor = score >= 80 ? "#15803d" : score >= 60 ? "#d97706" : "#dc2626";
            const scoreBg    = score >= 80 ? "#f0fdf4"  : score >= 60 ? "#fefce8"  : "#fff1f2";
            const hasInsurance = oo.documents.some(d => d.type === "Insurance Certificate");
            const hasContract  = oo.documents.some(d => d.type === "Contract");
            const pendingJobs  = oo.jobs.filter(j => j.settlement_status === "Pending").length;
            const ooRevenue    = oo.jobs.reduce((s, j) => s + j.gross_revenue, 0);
            const driverIssues = oo.drivers.filter(d => { const c = daysUntil(d.cdl_expiration); const m = daysUntil(d.med_card_expiration); return (c !== null && c <= 30) || (m !== null && m <= 30) || (c !== null && c < 0) || (m !== null && m < 0); }).length;

            return (
              <div key={oo.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", cursor: "pointer" }} onClick={() => openOO(oo)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", flexShrink: 0 }}>
                    {oo.company_name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>{oo.company_name}</h3>
                      <span style={{ background: scoreBg, color: scoreColor, padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800 }}>{score}% Compliant</span>
                      {pendingJobs > 0 && <span style={{ background: "#fefce8", color: "#92400e", padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>⏳ {pendingJobs} settlement{pendingJobs > 1 ? "s" : ""} pending</span>}
                      {driverIssues > 0 && <span style={{ background: "#fff1f2", color: "#dc2626", padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>⚠ {driverIssues} driver compliance issue{driverIssues > 1 ? "s" : ""}</span>}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <span>{oo.mc_number || "No MC#"}</span>
                      <span>{oo.dot_number || "No DOT#"}</span>
                      <span>📞 {oo.contact_phone || "No phone"}</span>
                      <span>✉ {oo.contact_email || "No email"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}><div style={eyebrow}>Trucks</div><div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>{oo.trucks.length}</div></div>
                    <div style={{ textAlign: "center" }}><div style={eyebrow}>Drivers</div><div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#0f172a" }}>{oo.drivers.length}</div></div>
                    <div style={{ textAlign: "center" }}><div style={eyebrow}>Revenue</div><div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#15803d" }}>${ooRevenue.toLocaleString()}</div></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ background: hasInsurance ? "#f0fdf4" : "#fff1f2", color: hasInsurance ? "#15803d" : "#dc2626", padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700 }}>{hasInsurance ? "✓ Insurance" : "✗ No Insurance"}</div>
                      <div style={{ background: hasContract  ? "#f0fdf4" : "#fff1f2", color: hasContract  ? "#15803d" : "#dc2626", padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700 }}>{hasContract  ? "✓ Contract"  : "✗ No Contract"}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {companies.length === 0 && (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "60px 0", textAlign: "center", color: "#94a3b8" }}>
              No owner operators added yet. Click <strong>+ Add Owner Operator</strong> above.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Detail view ───────────────────────────────────
  if (!selected) return null;
  const score      = ooComplianceScore(selected);
  const scoreColor = score >= 80 ? "#15803d" : score >= 60 ? "#d97706" : "#dc2626";
  const scoreBg    = score >= 80 ? "#f0fdf4"  : score >= 60 ? "#fefce8"  : "#fff1f2";

  const DETAIL_TABS = ["overview", "drivers", "fleet", "documents", "jobs"] as const;

  return (
    <div style={{ maxWidth: 1080 }}>
      {toast && <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{toast}</div>}
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(pendingDocRef.current, f); e.target.value = ""; }} />

      {/* ── Breadcrumb ──────────────────────────────── */}
      <button onClick={() => setView("list")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.83rem", padding: 0, marginBottom: 16 }}>← Owner Operators</button>

      {/* ── Company header ───────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 14, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.4rem", flexShrink: 0 }}>
          {selected.company_name.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>{selected.company_name}</h1>
          <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span><strong>MC:</strong> {selected.mc_number || "—"}</span>
            <span><strong>DOT:</strong> {selected.dot_number || "—"}</span>
            <span><strong>EIN:</strong> {selected.ein || "—"}</span>
            <span>📞 {selected.contact_phone || "—"}</span>
            <span>✉ {selected.contact_email || "—"}</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>{selected.business_address || "—"}</div>
        </div>
        <span style={{ background: scoreBg, color: scoreColor, padding: "6px 14px", borderRadius: 20, fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>{score}% Compliant</span>
      </div>

      {/* ── Compliance quick-check row ───────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "MC Number",  ok: !!selected.mc_number },
          { label: "DOT Number", ok: !!selected.dot_number },
          { label: "EIN on file", ok: !!selected.ein },
          { label: "Insurance",  ok: selected.documents.some(d => d.type === "Insurance Certificate") },
          { label: "Contract",   ok: selected.documents.some(d => d.type === "Contract") },
          { label: "Trucks on file", ok: selected.trucks.length > 0 },
          { label: "Drivers on file", ok: selected.drivers.length > 0 },
        ].map(({ label, ok }) => (
          <div key={label} style={{ background: ok ? "#f0fdf4" : "#fff1f2", border: `1px solid ${ok ? "#86efac" : "#fda4af"}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem" }}>{ok ? "✅" : "❌"}</div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: ok ? "#15803d" : "#dc2626", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {DETAIL_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? "#1e40af" : "#64748b", borderBottom: activeTab === tab ? "2px solid #1e40af" : "2px solid transparent", marginBottom: -2, textTransform: "capitalize" }}>
            {tab === "jobs" ? "Project Jobs" : tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────── */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card title="Business Details">
            <Row label="Company"      value={selected.company_name} />
            <Row label="MC Number"    value={selected.mc_number} />
            <Row label="DOT Number"   value={selected.dot_number} />
            <Row label="EIN / Tax ID" value={selected.ein} />
            <Row label="Address"      value={selected.business_address} />
          </Card>
          <Card title="Contact">
            <Row label="Contact Name"  value={selected.contact_name} />
            <Row label="Phone"         value={selected.contact_phone} />
            <Row label="Email"         value={selected.contact_email} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {selected.contact_phone && <a href={`tel:${selected.contact_phone}`}  style={{ ...ghostBtn, textDecoration: "none" }}>📞 Call</a>}
              {selected.contact_email && <a href={`mailto:${selected.contact_email}`} style={{ ...ghostBtn, textDecoration: "none" }}>✉ Email</a>}
              {selected.contact_phone && <a href={`sms:${selected.contact_phone}`}  style={{ ...ghostBtn, textDecoration: "none" }}>💬 Text</a>}
            </div>
          </Card>
          <Card title="Project Summary">
            <Row label="Total Loads"     value={String(selected.jobs.length)} />
            <Row label="Gross Revenue"   value={`$${selected.jobs.reduce((s,j)=>s+j.gross_revenue,0).toLocaleString()}`} />
            <Row label="Total OO Pay"    value={`$${selected.jobs.reduce((s,j)=>s+j.oo_rate,0).toLocaleString()}`} />
            <Row label="Total Margin"    value={`$${selected.jobs.reduce((s,j)=>s+j.margin,0).toLocaleString()}`} />
            <Row label="Pending Settlements" value={String(selected.jobs.filter(j=>j.settlement_status==="Pending").length)} />
          </Card>
          <Card title="Fleet Summary">
            <Row label="Trucks on File" value={String(selected.trucks.length)} />
            <Row label="Drivers on File" value={String(selected.drivers.length)} />
            <Row label="Insurance"  value={selected.documents.find(d=>d.type==="Insurance Certificate")?.file_name || "Not uploaded"} />
            <Row label="Contract"   value={selected.documents.find(d=>d.type==="Contract")?.file_name || "Not uploaded"} />
          </Card>
          <Card title="Insurance Agent">
            <Row label="Agent Name"  value={selected.insurance_agent_name} />
            <Row label="Agent Phone" value={selected.insurance_agent_phone} />
            <Row label="Agent Email" value={selected.insurance_agent_email} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {selected.insurance_agent_phone && <a href={`tel:${selected.insurance_agent_phone}`}  style={{ ...ghostBtn, textDecoration: "none" }}>📞 Call Agent</a>}
              {selected.insurance_agent_email && <a href={`mailto:${selected.insurance_agent_email}`} style={{ ...ghostBtn, textDecoration: "none" }}>✉ Email Agent</a>}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Drivers ─────────────────────────────── */}
      {activeTab === "drivers" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={eyebrow}>Driver Roster</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{selected.drivers.length} driver{selected.drivers.length !== 1 ? "s" : ""} — CDL and medical card tracked individually</div>
            </div>
            <button onClick={() => setShowAddDriver(s => !s)} style={primaryBtn}>+ Add Driver</button>
          </div>

          {showAddDriver && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                {([["Driver Name *", "name", "Carlos Ramirez"], ["CDL Number", "cdl_number", "TX1234567"], ["CDL State", "cdl_state", "TX"], ["Phone", "phone", "(555) 000-0000"]] as [string, keyof typeof addDriverForm, string][]).map(([label, field, ph]) => (
                  <div key={field}>
                    <label style={lbl}>{label}</label>
                    <input value={addDriverForm[field]} onChange={e => setAddDriverForm(f => ({ ...f, [field]: e.target.value }))} style={inp} placeholder={ph} />
                  </div>
                ))}
                <div>
                  <label style={lbl}>CDL Expiration</label>
                  <input type="date" value={addDriverForm.cdl_expiration} onChange={e => setAddDriverForm(f => ({ ...f, cdl_expiration: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Med Card Expiration</label>
                  <input type="date" value={addDriverForm.med_card_expiration} onChange={e => setAddDriverForm(f => ({ ...f, med_card_expiration: e.target.value }))} style={inp} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={addDriver} style={primaryBtn}>Add Driver</button>
                <button onClick={() => setShowAddDriver(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {selected.drivers.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No drivers on file. Add drivers above.</div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Driver", "CDL #", "State", "CDL Expiration", "Med Card Expiration", "Phone", ""].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.drivers.map(d => {
                    const cdlDays = daysUntil(d.cdl_expiration);
                    const medDays = daysUntil(d.med_card_expiration);
                    return (
                      <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{d.name}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{d.cdl_number || "—"}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{d.cdl_state}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: expBg(cdlDays), color: expColor(cdlDays), padding: "3px 10px", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem" }}>
                            {d.cdl_expiration ? fmtDate(d.cdl_expiration) : "—"}{cdlDays !== null && cdlDays <= 30 ? ` (${cdlDays}d)` : ""}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: expBg(medDays), color: expColor(medDays), padding: "3px 10px", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem" }}>
                            {d.med_card_expiration ? fmtDate(d.med_card_expiration) : "—"}{medDays !== null && medDays <= 30 ? ` (${medDays}d)` : ""}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{d.phone || "—"}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <button onClick={() => removeDriver(d.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Remove</button>
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

      {/* ── Tab: Fleet ───────────────────────────────── */}
      {activeTab === "fleet" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={eyebrow}>Truck Fleet</div>
              <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{selected.trucks.length} truck{selected.trucks.length !== 1 ? "s" : ""} — one insurance policy covers all</div>
            </div>
            <button onClick={() => setShowAddTruck(s => !s)} style={primaryBtn}>+ Add Truck</button>
          </div>

          {showAddTruck && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                {([["Truck # *", "truck_number", "SMT-101"], ["Year", "year", "2021"], ["Make", "make", "Kenworth"], ["Model", "model", "T880"], ["VIN", "vin", "1XKYD49X…"]] as [string, keyof typeof addTruckForm, string][]).map(([label, field, ph]) => (
                  <div key={field}>
                    <label style={lbl}>{label}</label>
                    <input value={addTruckForm[field]} onChange={e => setAddTruckForm(f => ({ ...f, [field]: e.target.value }))} style={inp} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={addTruck} style={primaryBtn}>Add Truck</button>
                <button onClick={() => setShowAddTruck(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {selected.trucks.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No trucks on file. Add trucks above.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {selected.trucks.map(t => (
                <div key={t.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "1.2rem" }}>🚚</div>
                    <button onClick={() => removeTruck(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.8rem" }}>✕</button>
                  </div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", marginTop: 6 }}>{t.truck_number}</div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{t.year} {t.make} {t.model}</div>
                  {t.vin && <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 4 }}>VIN: {t.vin}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Documents ───────────────────────────── */}
      {activeTab === "documents" && (
        <div>
          {/* Insurance Agent Card */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: "#1e40af", marginBottom: 12, fontSize: "0.88rem" }}>🛡️ Insurance Agent Contact</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 16px" }}>
              <div>
                <label style={lbl}>Agent Name</label>
                <input value={selected.insurance_agent_name} onChange={e => updateSelected({ ...selected, insurance_agent_name: e.target.value })} style={inp} placeholder="Rebecca Nguyen" />
              </div>
              <div>
                <label style={lbl}>Agent Phone</label>
                <input value={selected.insurance_agent_phone} onChange={e => updateSelected({ ...selected, insurance_agent_phone: e.target.value })} style={inp} placeholder="(555) 000-0000" type="tel" />
              </div>
              <div>
                <label style={lbl}>Agent Email</label>
                <input value={selected.insurance_agent_email} onChange={e => updateSelected({ ...selected, insurance_agent_email: e.target.value })} style={inp} placeholder="agent@insurer.com" type="email" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {selected.insurance_agent_phone && <a href={`tel:${selected.insurance_agent_phone}`} style={{ ...ghostBtn, textDecoration: "none" }}>📞 Call Agent</a>}
              {selected.insurance_agent_email && <a href={`mailto:${selected.insurance_agent_email}`} style={{ ...ghostBtn, textDecoration: "none" }}>✉ Email Agent</a>}
              <span style={{ fontSize: "0.72rem", color: "#64748b", alignSelf: "center" }}>Changes auto-save</span>
            </div>
          </div>

          <div style={eyebrow}>Documents & Compliance Files</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2, marginBottom: 14 }}>
            One insurance certificate covers all trucks in this OO's fleet.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
            {["Insurance Certificate", "Contract", "W-9 / Tax Form", "MC Authority Letter", "Safety Rating", "Other"].map(docType => {
              const existing = selected.documents.find(d => d.type === docType);
              const expDays  = existing?.expires_on ? daysUntil(existing.expires_on) : null;
              return (
                <div key={docType} style={{ background: existing ? "#f0fdf4" : "#fafafa", border: `1px solid ${existing ? "#86efac" : "#e2e8f0"}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem", marginBottom: 4 }}>{docType}</div>
                  {existing ? (
                    <>
                      <div style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 600, marginBottom: 4 }}>✓ {existing.file_name}</div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>Uploaded {fmtDate(existing.uploaded_at)}</div>
                      {existing.expires_on && (
                        <div style={{ marginTop: 6, background: expBg(expDays), color: expColor(expDays), padding: "3px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, display: "inline-block" }}>
                          Exp {fmtDate(existing.expires_on)}{expDays !== null && expDays <= 60 ? ` (${expDays}d)` : ""}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 8 }}>Not uploaded</div>
                  )}
                  <label style={{ display: "inline-block", marginTop: 8, ...primaryBtn, fontSize: "0.72rem", padding: "5px 12px", cursor: "pointer" }}>
                    {existing ? "Replace" : "Upload"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(docType, f); e.target.value = ""; }} />
                  </label>
                </div>
              );
            })}
          </div>

          {selected.documents.length > 0 && (
            <div>
              <div style={{ ...eyebrow, marginBottom: 10 }}>All Documents</div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Document", "File", "Uploaded", "Expires"].map(h => (
                        <th key={h} style={{ padding: "8px 14px", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selected.documents.map((d, i) => {
                      const expDays = d.expires_on ? daysUntil(d.expires_on) : null;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>{d.type}</td>
                          <td style={{ padding: "10px 14px", color: "#1e40af", fontSize: "0.8rem" }}>{d.file_name}</td>
                          <td style={{ padding: "10px 14px", color: "#64748b" }}>{fmtDate(d.uploaded_at)}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {d.expires_on
                              ? <span style={{ background: expBg(expDays), color: expColor(expDays), padding: "2px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700 }}>{fmtDate(d.expires_on)}</span>
                              : <span style={{ color: "#94a3b8" }}>—</span>
                            }
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

      {/* ── Tab: Jobs (Domino Project) ────────────────── */}
      {activeTab === "jobs" && (
        <div>
          {/* Project KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            <KPI label="Total Loads"    value={filteredJobs.length} />
            <KPI label="Gross Revenue"  value={`$${totalRevenue.toLocaleString()}`}  color="#15803d" />
            <KPI label="OO Settlement"  value={`$${totalOOPay.toLocaleString()}`}    color="#1e40af" />
            <KPI label="Your Margin"    value={`$${totalMargin.toLocaleString()}`}   color="#7c3aed" />
            <KPI label="Pending"        value={pendingCount}   color={pendingCount > 0 ? "#d97706" : "#0f172a"} />
            <KPI label="Pending Pay"    value={`$${pendingAmount.toLocaleString()}`} color={pendingAmount > 0 ? "#d97706" : "#0f172a"} />
          </div>

          {/* Filters + Add */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <select value={jobFilter} onChange={e => setJobFilter(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }}>
              <option value="All Projects">All Projects</option>
              {projectNumbers.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={settlementFilter} onChange={e => setSettlementFilter(e.target.value)} style={{ ...inp, width: "auto" }}>
              {["All", "Pending", "Approved", "Processing", "Paid", "Hold"].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => setShowAddJob(s => !s)} style={primaryBtn}>+ Add Load</button>
            {pendingCount > 0 && (
              <button onClick={() => {
                const oo = { ...selected, jobs: selected.jobs.map(j => filteredJobs.find(f => f.id === j.id && j.settlement_status === "Pending") ? { ...j, settlement_status: "Approved" as const } : j) };
                updateSelected(oo); flash(`${pendingCount} settlements approved.`);
              }} style={{ ...primaryBtn, background: "#15803d" }}>
                ✓ Approve All Pending ({pendingCount})
              </button>
            )}
            <button onClick={() => {
              // Build CSV
              const header = ["Date","Project #","Project Name","Truck #","Driver","Origin","Destination","Material","Tons","Gross Revenue","OO Pay","Margin","Status"];
              const rows = filteredJobs.map(j => [
                j.load_date, j.project_number, j.project_name, j.truck_number, j.driver_name,
                j.origin, j.destination, j.material, j.tons, j.gross_revenue, j.oo_rate, j.margin, j.settlement_status
              ]);
              const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `${selected.company_name.replace(/\s+/g,"_")}_loads_${new Date().toISOString().slice(0,10)}.csv`;
              a.click(); URL.revokeObjectURL(url);
              flash("Load report downloaded.");
            }} style={ghostBtn}>⬇ Download CSV</button>
            {selected.contact_email && (
              <button onClick={() => {
                const subject = encodeURIComponent(`Load Report — ${selected.company_name} — ${new Date().toLocaleDateString()}`);
                const lines = [`Dear ${selected.contact_name || selected.company_name},`, "", "Here is your load report from MoveAround TMS:", ""];
                lines.push(`Project Filter: ${jobFilter}`, `Settlement Filter: ${settlementFilter}`, "");
                lines.push("LOAD DATE | PROJECT # | TRUCK | DRIVER | TONS | GROSS | YOUR PAY | STATUS");
                lines.push("----------|-----------|-------|--------|------|-------|----------|-------");
                filteredJobs.forEach(j => {
                  lines.push(`${j.load_date} | ${j.project_number} | ${j.truck_number} | ${j.driver_name} | ${j.tons}t | $${j.gross_revenue} | $${j.oo_rate} | ${j.settlement_status}`);
                });
                lines.push("", `─── TOTALS ───`);
                lines.push(`Loads: ${filteredJobs.length}  |  Gross Revenue: $${totalRevenue.toLocaleString()}  |  Your Settlement: $${totalOOPay.toLocaleString()}  |  Pending: $${pendingAmount.toLocaleString()}`);
                lines.push("", "Thank you for working with MoveAround.", "Ronyx Logistics Operations Team");
                window.location.href = `mailto:${selected.contact_email}?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
                flash("Email client opened with load report.");
              }} style={{ ...primaryBtn, background: "#7c3aed" }}>✉ Email Report to OO</button>
            )}
          </div>

          {showAddJob && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 12px", fontWeight: 800, color: "#0f172a" }}>Add Load to Project</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 14px" }}>
                <div><label style={lbl}>Project Name</label><input value={addJobForm.project_name} onChange={e => setAddJobForm(f => ({ ...f, project_name: e.target.value }))} style={inp} placeholder="Domino Project" /></div>
                <div><label style={lbl}>Project # *</label><input value={addJobForm.project_number} onChange={e => setAddJobForm(f => ({ ...f, project_number: e.target.value }))} style={inp} placeholder="DOMINO-2026-001" /></div>
                <div><label style={lbl}>Load Date *</label><input type="date" value={addJobForm.load_date} onChange={e => setAddJobForm(f => ({ ...f, load_date: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Truck #</label><select value={addJobForm.truck_number} onChange={e => setAddJobForm(f => ({ ...f, truck_number: e.target.value }))} style={inp}><option value="">Select…</option>{selected.trucks.map(t => <option key={t.id}>{t.truck_number}</option>)}</select></div>
                <div><label style={lbl}>Driver</label><select value={addJobForm.driver_name} onChange={e => setAddJobForm(f => ({ ...f, driver_name: e.target.value }))} style={inp}><option value="">Select…</option>{selected.drivers.map(d => <option key={d.id}>{d.name}</option>)}</select></div>
                <div><label style={lbl}>Material</label><input value={addJobForm.material} onChange={e => setAddJobForm(f => ({ ...f, material: e.target.value }))} style={inp} placeholder="Limestone" /></div>
                <div><label style={lbl}>Origin</label><input value={addJobForm.origin} onChange={e => setAddJobForm(f => ({ ...f, origin: e.target.value }))} style={inp} placeholder="Plant A" /></div>
                <div><label style={lbl}>Destination</label><input value={addJobForm.destination} onChange={e => setAddJobForm(f => ({ ...f, destination: e.target.value }))} style={inp} placeholder="Jobsite 18" /></div>
                <div><label style={lbl}>Tons</label><input type="number" step="0.1" value={addJobForm.tons || ""} onChange={e => setAddJobForm(f => ({ ...f, tons: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
                <div><label style={lbl}>Gross Revenue ($)</label><input type="number" value={addJobForm.gross_revenue || ""} onChange={e => setAddJobForm(f => ({ ...f, gross_revenue: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
                <div><label style={lbl}>OO Rate / Pay ($)</label><input type="number" value={addJobForm.oo_rate || ""} onChange={e => setAddJobForm(f => ({ ...f, oo_rate: parseFloat(e.target.value) || 0 }))} style={inp} /></div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 5 }}>Margin (auto)</div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#7c3aed", padding: "8px 12px", background: "#f5f3ff", borderRadius: 8 }}>${((addJobForm.gross_revenue || 0) - (addJobForm.oo_rate || 0)).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button onClick={addJob} style={primaryBtn}>Add Load</button>
                <button onClick={() => setShowAddJob(false)} style={ghostBtn}>Cancel</button>
              </div>
            </div>
          )}

          {filteredJobs.length === 0 ? (
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No loads match your filters.</div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Date", "Project #", "Truck", "Driver", "Route", "Tons", "Revenue", "OO Pay", "Margin", "Settlement", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", fontSize: "0.68rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(j => {
                    const [sBg, sColor] = settlementColors(j.settlement_status);
                    return (
                      <tr key={j.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{fmtDate(j.load_date)}</td>
                        <td style={{ padding: "10px 12px" }}><span style={{ fontWeight: 700, color: "#1e40af", fontSize: "0.75rem" }}>{j.project_number}</span></td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{j.truck_number || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#475569" }}>{j.driver_name || "—"}</td>
                        <td style={{ padding: "10px 12px", color: "#64748b", fontSize: "0.75rem" }}>{j.origin} → {j.destination}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{j.tons}t</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#15803d" }}>${j.gross_revenue.toLocaleString()}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e40af" }}>${j.oo_rate.toLocaleString()}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#7c3aed" }}>${j.margin.toLocaleString()}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ background: sBg, color: sColor, padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: "0.72rem" }}>{j.settlement_status}</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {j.settlement_status === "Pending"  && <button onClick={() => setSettlement(selected.id, j.id, "Approved")}   style={{ background: "#eff6ff", color: "#1e40af", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Approve</button>}
                            {j.settlement_status === "Approved" && <button onClick={() => setSettlement(selected.id, j.id, "Paid")}      style={{ background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Mark Paid</button>}
                            {!["Hold","Paid"].includes(j.settlement_status) && <button onClick={() => setSettlement(selected.id, j.id, "Hold")} style={{ background: "#fff1f2", color: "#dc2626", border: "none", borderRadius: 6, padding: "3px 8px", fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>Hold</button>}
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
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <h3 style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</h3>
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600, color: value ? "#0f172a" : "#cbd5e1" }}>{value || "—"}</div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color: color || "#0f172a", marginTop: 4, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
