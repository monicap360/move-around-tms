"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────── */
type TruckStatus = "Available" | "Assigned" | "In Maintenance" | "Out of Service" | "Inactive";
type MaintenanceRisk = "Low" | "Medium" | "High" | "Critical";

type Truck = {
  id: string;
  unit: string;
  vin: string;
  plate: string;
  year: string;
  make: string;
  model: string;
  type: string;
  status: TruckStatus;
  assignedDriver: string;
  assignedTrailer: string;
  currentLoad: string;
  location: string;
  odometer: string;
  engineHours: string;
  fuelMpg: string;
  revenueWeek: string;
  costPerMile: string;
  readinessScore: number;
  healthScore: number;
  maintenanceRisk: MaintenanceRisk;
  nextService: string;
  inspectionExp: string;
  insuranceExp: string;
  registrationExp: string;
  lastMaintenance: string;
};

/* ─── Demo data ─────────────────────────────────────────── */
const INITIAL_TRUCKS: Truck[] = [
  {
    id: "TRK-214", unit: "Unit 214", vin: "1HTMMAAM88H123456", plate: "TX-82941C",
    year: "2021", make: "Peterbilt", model: "567", type: "Dump Truck",
    status: "Available", assignedDriver: "Carlos Ramirez", assignedTrailer: "End Dump 07",
    currentLoad: "Unassigned", location: "Galveston Yard",
    odometer: "184,220", engineHours: "7,842", fuelMpg: "6.8",
    revenueWeek: "$4,820", costPerMile: "$1.72",
    readinessScore: 96, healthScore: 94, maintenanceRisk: "Low",
    nextService: "1,240 miles", inspectionExp: "10/18/2026",
    insuranceExp: "01/12/2027", registrationExp: "12/31/2026", lastMaintenance: "05/28/2026",
  },
  {
    id: "TRK-118", unit: "Unit 118", vin: "3AKJGLDR9HSHC4412", plate: "TX-66120B",
    year: "2019", make: "Freightliner", model: "Cascadia", type: "Aggregate Hauler",
    status: "Assigned", assignedDriver: "Marcus Lee", assignedTrailer: "Belly Dump 03",
    currentLoad: "LD-1051", location: "Plant B → Jobsite 18",
    odometer: "231,884", engineHours: "9,551", fuelMpg: "6.1",
    revenueWeek: "$3,910", costPerMile: "$1.96",
    readinessScore: 87, healthScore: 82, maintenanceRisk: "Medium",
    nextService: "420 miles", inspectionExp: "08/20/2026",
    insuranceExp: "02/18/2027", registrationExp: "11/30/2026", lastMaintenance: "05/12/2026",
  },
  {
    id: "TRK-301", unit: "Unit 301", vin: "1XPBD49X7FD305711", plate: "TX-90218A",
    year: "2017", make: "Kenworth", model: "T880", type: "Owner Operator Truck",
    status: "Out of Service", assignedDriver: "Daniel Torres", assignedTrailer: "Flatbed 11",
    currentLoad: "None", location: "Texas City Yard",
    odometer: "312,640", engineHours: "12,203", fuelMpg: "5.4",
    revenueWeek: "$0", costPerMile: "$2.38",
    readinessScore: 42, healthScore: 38, maintenanceRisk: "Critical",
    nextService: "Overdue", inspectionExp: "Expired",
    insuranceExp: "09/14/2026", registrationExp: "Expired", lastMaintenance: "03/02/2026",
  },
  {
    id: "TRK-127", unit: "Unit 127", vin: "1XKZD49X7HJ445829", plate: "TX-55129M",
    year: "2022", make: "Kenworth", model: "T880", type: "Dump Truck",
    status: "In Maintenance", assignedDriver: "Jose Martinez", assignedTrailer: "End Dump 12",
    currentLoad: "None", location: "Maintenance Bay",
    odometer: "104,992", engineHours: "4,290", fuelMpg: "7.1",
    revenueWeek: "$5,240", costPerMile: "$1.54",
    readinessScore: 73, healthScore: 76, maintenanceRisk: "High",
    nextService: "In progress", inspectionExp: "11/22/2026",
    insuranceExp: "03/30/2027", registrationExp: "12/31/2026", lastMaintenance: "06/10/2026",
  },
];

/* ─── Export CSV ────────────────────────────────────────── */
function exportFleetCSV(trucks: Truck[]) {
  const headers = ["Unit", "Year", "Make", "Model", "Type", "Status", "Plate", "VIN", "Driver", "Odometer", "MPG", "Cost/Mile", "Revenue Week", "Health", "Readiness", "Risk", "Next Service", "Inspection", "Insurance", "Registration"];
  const rows = trucks.map((t) => [
    t.unit, t.year, t.make, t.model, t.type, t.status, t.plate, t.vin,
    t.assignedDriver, t.odometer, t.fuelMpg, t.costPerMile, t.revenueWeek,
    t.healthScore + "%", t.readinessScore + "%", t.maintenanceRisk,
    t.nextService, t.inspectionExp, t.insuranceExp, t.registrationExp,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ronyx-fleet-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Badge ─────────────────────────────────────────────── */
function Badge({ value }: { value: TruckStatus | MaintenanceRisk }) {
  const cls =
    value === "Available" || value === "Low"   ? "fleet-badge green"  :
    value === "Assigned"                        ? "fleet-badge blue"   :
    value === "Medium"                          ? "fleet-badge amber"  :
    value === "In Maintenance" || value === "High" ? "fleet-badge orange" :
    "fleet-badge red";
  return <span className={cls}>{value}</span>;
}

/* ─── Score ring ────────────────────────────────────────── */
function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="score-ring">
      <div className="score-ring-inner" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg)` }}>
        <div><strong style={{ color }}>{score}</strong><span>%</span></div>
      </div>
      <p>{label}</p>
    </div>
  );
}

/* ─── Toast ─────────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: "0 16px 48px rgba(0,0,0,0.35)" }}>
      {msg}
    </div>
  );
}

/* ─── Assign modal ──────────────────────────────────────── */
function AssignModal({ truck, onClose, onSave, showToast }: {
  truck: Truck;
  onClose: () => void;
  onSave: (id: string, driver: string, trailer: string) => void;
  showToast: (msg: string) => void;
}) {
  const [driver, setDriver]   = useState(truck.assignedDriver);
  const [trailer, setTrailer] = useState(truck.assignedTrailer);
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600, marginBottom: 2 };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(truck.id, driver, trailer);
    showToast(`${truck.unit} assigned to ${driver || "unassigned"}.`);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 420, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Assign Driver &amp; Trailer</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>{truck.unit} · {truck.year} {truck.make} {truck.model}</p>
        <form onSubmit={submit}>
          <label style={lbl}>Driver</label>
          <input value={driver} onChange={(e) => setDriver(e.target.value)} style={inp} placeholder="Driver name" />
          <label style={{ ...lbl, marginTop: 12 }}>Trailer</label>
          <input value={trailer} onChange={(e) => setTrailer(e.target.value)} style={inp} placeholder="Trailer unit" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ flex: 1, background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: "pointer" }}>Save Assignment</button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Service modal ─────────────────────────────────────── */
function ServiceModal({ truck, onClose, showToast }: {
  truck: Truck;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [date, setDate]  = useState("");
  const [notes, setNotes] = useState("");
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    showToast(`Service scheduled for ${truck.unit}${date ? " on " + date : ""}.`);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 420, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Schedule Service</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>{truck.unit} · Next due: {truck.nextService}</p>
        <form onSubmit={submit}>
          <label style={lbl}>Service Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inp, marginBottom: 14 }} />
          <label style={lbl}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inp, minHeight: 80, resize: "vertical" }} placeholder="Oil change, brake inspection, tire rotation…" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ flex: 1, background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: "pointer" }}>Schedule</button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Upload doc modal ──────────────────────────────────── */
const TRUCK_DOC_TYPES = ["Registration", "Insurance Certificate", "Annual Inspection", "Title", "IFTA License", "Lease Agreement"];

function UploadDocModal({ preselectedDoc, onClose, showToast }: {
  preselectedDoc?: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [truckId, setTruckId]   = useState("");
  const [docType, setDocType]   = useState(preselectedDoc ?? "");
  const [file, setFile]         = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lbl: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!truckId) { showToast("Select a truck."); return; }
    if (!docType) { showToast("Select a document type."); return; }
    if (!file)    { showToast("Choose a file."); return; }
    showToast(`${docType} uploaded for ${truckId}.`);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 460, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Upload Truck Document</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Attach a compliance document to a fleet unit.</p>
        <form onSubmit={submit}>
          <label style={lbl}>Truck Unit</label>
          <select value={truckId} onChange={(e) => setTruckId(e.target.value)} style={{ ...inp, marginBottom: 14 }}>
            <option value="">Select truck…</option>
            {INITIAL_TRUCKS.map((t) => <option key={t.id} value={t.unit}>{t.unit} — {t.year} {t.make} {t.model}</option>)}
          </select>
          <label style={lbl}>Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ ...inp, marginBottom: 14 }} disabled={!!preselectedDoc}>
            <option value="">Select type…</option>
            {TRUCK_DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label style={lbl}>File</label>
          <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: 18, textAlign: "center", cursor: "pointer", background: "#f8fafc" }}>
            {file ? <span style={{ fontWeight: 700, color: "#1e40af", fontSize: 13 }}>📄 {file.name}</span>
                  : <span style={{ color: "#94a3b8", fontSize: 13 }}>Click to select PDF, JPG, or PNG</span>}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" style={{ flex: 1, background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: "pointer" }}>Upload</button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function TrucksPage() {
  const [trucks, setTrucks]           = useState<Truck[]>(INITIAL_TRUCKS);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [riskFilter, setRiskFilter]   = useState("All Risks");
  const [toast, setToast]             = useState("");
  const [assignTarget, setAssignTarget] = useState<Truck | null>(null);
  const [serviceTarget, setServiceTarget] = useState<Truck | null>(null);
  const [uploadDocType, setUploadDocType] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); }

  function handleAssignSave(id: string, driver: string, trailer: string) {
    setTrucks((prev) => prev.map((t) => t.id === id ? { ...t, assignedDriver: driver, assignedTrailer: trailer, status: driver ? "Assigned" : "Available" } : t));
  }

  function toggleOOS(id: string) {
    setTrucks((prev) => prev.map((t) =>
      t.id === id ? { ...t, status: t.status === "Out of Service" ? "Available" : "Out of Service" } : t
    ));
    const truck = trucks.find((t) => t.id === id);
    const next  = truck?.status === "Out of Service" ? "Available" : "Out of Service";
    showToast(`${truck?.unit} marked as ${next}.`);
  }

  const filteredTrucks = useMemo(() => trucks.filter((truck) => {
    const q = search.toLowerCase();
    const matchSearch = !q || truck.unit.toLowerCase().includes(q) || truck.vin.toLowerCase().includes(q) ||
      truck.plate.toLowerCase().includes(q) || truck.make.toLowerCase().includes(q) ||
      truck.model.toLowerCase().includes(q) || truck.assignedDriver.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All Statuses" || truck.status === statusFilter;
    const matchRisk   = riskFilter   === "All Risks"    || truck.maintenanceRisk === riskFilter;
    return matchSearch && matchStatus && matchRisk;
  }), [trucks, search, statusFilter, riskFilter]);

  const activeTrucks      = trucks.filter((t) => t.status !== "Inactive").length;
  const availableTrucks   = trucks.filter((t) => t.status === "Available").length;
  const assignedTrucks    = trucks.filter((t) => t.status === "Assigned").length;
  const maintenanceCount  = trucks.filter((t) => t.status === "In Maintenance" || t.status === "Out of Service" || t.maintenanceRisk === "High" || t.maintenanceRisk === "Critical").length;
  const averageHealth     = Math.round(trucks.reduce((s, t) => s + t.healthScore, 0) / trucks.length);

  const maintenanceAlerts = useMemo(() => [
    ...trucks.filter((t) => t.maintenanceRisk === "Critical").map((t) => ({ title: "Critical Unit", truck: t, detail: "Requires immediate attention before dispatch.", level: "critical" as const })),
    ...trucks.filter((t) => t.maintenanceRisk === "High").map((t) => ({ title: "High Risk", truck: t, detail: "Schedule service before next dispatch.", level: "danger" as const })),
    ...trucks.filter((t) => t.maintenanceRisk === "Medium" && t.nextService !== "Overdue").map((t) => ({ title: "Service Due Soon", truck: t, detail: `Next service: ${t.nextService}`, level: "warning" as const })),
  ].slice(0, 4), [trucks]);

  return (
    <main className="fleet-page">
      {/* ── Hero ── */}
      <section className="fleet-hero">
        <div>
          <p className="fleet-eyebrow">Fleet Command / Trucks</p>
          <h1>Truck Management</h1>
          <p>
            Monitor every truck by readiness, maintenance risk, compliance status,
            cost per mile, revenue performance, driver assignment, location, and dispatch availability.
          </p>
        </div>
        <div className="fleet-hero-actions">
          <button className="fleet-button ghost" onClick={() => { exportFleetCSV(filteredTrucks); showToast(`Exported ${filteredTrucks.length} trucks as CSV.`); }}>
            Export Fleet
          </button>
          <button className="fleet-button dark" onClick={() => setServiceTarget(trucks[0])}>
            Schedule Maintenance
          </button>
          <button className="fleet-button primary" onClick={() => showToast("Add Truck — coming soon.")}>
            + Add Truck
          </button>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="fleet-kpi-grid">
        <div className="fleet-kpi"><span>Total Trucks</span><strong>{trucks.length}</strong><p>Fleet records</p></div>
        <div className="fleet-kpi"><span>Active Trucks</span><strong>{activeTrucks}</strong><p>Available or assigned</p></div>
        <div className="fleet-kpi success"><span>Available Now</span><strong>{availableTrucks}</strong><p>Ready for dispatch</p></div>
        <div className="fleet-kpi blue"><span>Assigned</span><strong>{assignedTrucks}</strong><p>Currently on load</p></div>
        <div className="fleet-kpi danger"><span>Maintenance Risk</span><strong>{maintenanceCount}</strong><p>Needs review</p></div>
        <div className="fleet-kpi purple"><span>Fleet Health</span><strong>{averageHealth}%</strong><p>Average health score</p></div>
      </section>

      <section className="fleet-layout">
        <div className="fleet-main-column">

          {/* ── Alerts ── */}
          {maintenanceAlerts.length > 0 && (
            <div className="fleet-panel">
              <div className="fleet-panel-header">
                <div>
                  <p className="fleet-eyebrow">Predictive Maintenance</p>
                  <h2>Fleet Risk Alerts</h2>
                  <span>AI-style alerts for trucks that may cause downtime, compliance issues, or dispatch delays.</span>
                </div>
                <Link href="/ronyx/hr-compliance" className="fleet-button ghost" style={{ textDecoration: "none" }}>Review All</Link>
              </div>
              <div className="fleet-alert-grid">
                {maintenanceAlerts.map((alert, i) => (
                  <div key={i} className={`fleet-alert ${alert.level}`}>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.truck.unit}</p>
                      <span>{alert.detail}</span>
                    </div>
                    <button onClick={() => setServiceTarget(alert.truck)}>Open</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Truck directory ── */}
          <div className="fleet-panel">
            <div className="fleet-panel-header">
              <div>
                <p className="fleet-eyebrow">Fleet Directory</p>
                <h2>All Trucks</h2>
                <span>Search, filter, assign, inspect, service, and manage fleet equipment.</span>
              </div>
            </div>

            <div className="fleet-filter-bar">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search unit, VIN, plate, make, model, or driver..." />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Statuses</option>
                <option>Available</option>
                <option>Assigned</option>
                <option>In Maintenance</option>
                <option>Out of Service</option>
                <option>Inactive</option>
              </select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option>All Risks</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            <div className="fleet-truck-list">
              {filteredTrucks.map((truck) => (
                <article className="fleet-truck-card" key={truck.id}>
                  <div className="truck-card-top">
                    <div className="truck-identity">
                      <div className="truck-icon">🚚</div>
                      <div>
                        <h3>{truck.unit}</h3>
                        <p>{truck.year} {truck.make} {truck.model}</p>
                        <span>{truck.type}</span>
                      </div>
                    </div>
                    <div className="truck-badges">
                      <Badge value={truck.status} />
                      <Badge value={truck.maintenanceRisk} />
                    </div>
                  </div>

                  <div className="truck-card-body">
                    <div className="truck-score-area">
                      <ScoreRing score={truck.readinessScore} label="Readiness" />
                      <ScoreRing score={truck.healthScore}    label="Health"    />
                    </div>

                    <div className="truck-data-grid">
                      <div><span>Assigned Driver</span><strong>{truck.assignedDriver}</strong></div>
                      <div><span>Trailer</span><strong>{truck.assignedTrailer}</strong></div>
                      <div><span>Current Load</span><strong>{truck.currentLoad}</strong></div>
                      <div><span>Location</span><strong>{truck.location}</strong></div>
                      <div><span>Plate</span><strong>{truck.plate}</strong></div>
                      <div><span>VIN</span><strong style={{ fontSize: 12 }}>{truck.vin}</strong></div>
                      <div><span>Odometer</span><strong>{truck.odometer}</strong></div>
                      <div><span>Engine Hours</span><strong>{truck.engineHours}</strong></div>
                      <div><span>Fuel MPG</span><strong>{truck.fuelMpg}</strong></div>
                      <div><span>Cost Per Mile</span><strong>{truck.costPerMile}</strong></div>
                      <div><span>Revenue Week</span><strong>{truck.revenueWeek}</strong></div>
                      <div>
                        <span>Next Service</span>
                        <strong className={truck.nextService === "Overdue" ? "fleet-danger-text" : ""}>{truck.nextService}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="truck-compliance-strip">
                    <div>
                      <span>Inspection</span>
                      <strong className={truck.inspectionExp === "Expired" ? "fleet-danger-text" : ""}>{truck.inspectionExp}</strong>
                    </div>
                    <div><span>Insurance</span><strong>{truck.insuranceExp}</strong></div>
                    <div>
                      <span>Registration</span>
                      <strong className={truck.registrationExp === "Expired" ? "fleet-danger-text" : ""}>{truck.registrationExp}</strong>
                    </div>
                    <div><span>Last Maintenance</span><strong>{truck.lastMaintenance}</strong></div>
                  </div>

                  <div className="truck-card-footer">
                    <div className="truck-action-group">
                      <button onClick={() => showToast(`${truck.unit} profile — full detail page coming soon.`)}>Profile</button>
                      <button onClick={() => setUploadDocType("")}>Documents</button>
                      <button onClick={() => setAssignTarget(truck)}>Assign</button>
                      <button onClick={() => setServiceTarget(truck)}>Service</button>
                    </div>
                    <button
                      className={truck.status === "Out of Service" ? "fleet-return-button" : "fleet-danger-button"}
                      onClick={() => toggleOOS(truck.id)}
                    >
                      {truck.status === "Out of Service" ? "Return to Service" : "Mark Out of Service"}
                    </button>
                  </div>
                </article>
              ))}

              {filteredTrucks.length === 0 && (
                <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>No trucks match your filters.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="fleet-side-column">
          <div className="fleet-panel">
            <p className="fleet-eyebrow">Quick Actions</p>
            <h2>Fleet Tools</h2>
            <div className="fleet-quick-list">
              <button onClick={() => showToast("Add Truck — coming soon.")}>Add New Truck</button>
              <button onClick={() => setUploadDocType("Registration")}>Upload Registration</button>
              <button onClick={() => setUploadDocType("Insurance Certificate")}>Upload Insurance</button>
              <button onClick={() => setServiceTarget(trucks[0])}>Schedule Inspection</button>
              <button onClick={() => setServiceTarget(trucks[0])}>Create Maintenance Ticket</button>
              <button onClick={() => setAssignTarget(trucks[0])}>Assign Driver</button>
              <button onClick={() => showToast("Assign trailer — use the Assign button on a truck card.")}>Assign Trailer</button>
              <Link href="/ronyx/ifta-fuel" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Open Fuel Log</button>
              </Link>
            </div>
          </div>

          <div className="fleet-panel dark-fleet-panel">
            <p className="fleet-eyebrow">AI Fleet Insight</p>
            <h2>Recommended Actions</h2>
            <p>
              {maintenanceCount > 0
                ? `${maintenanceCount} unit${maintenanceCount > 1 ? "s need" : " needs"} immediate attention before next dispatch. Review maintenance risk scores.`
                : "All units are healthy. Fleet is ready for dispatch."}
            </p>
            <button className="fleet-button primary full" onClick={() => showToast("Fleet health review — running analysis…")}>
              Run Fleet Health Review
            </button>
          </div>

          <div className="fleet-panel">
            <p className="fleet-eyebrow">Top Performer</p>
            <h2>Best Truck This Week</h2>
            {(() => {
              const top = [...trucks].sort((a, b) => parseFloat(b.revenueWeek.replace(/\D/g, "")) - parseFloat(a.revenueWeek.replace(/\D/g, "")))[0];
              return (
                <div className="fleet-top-box">
                  <div className="truck-icon large">🚚</div>
                  <h3>{top.unit}</h3>
                  <p>{top.revenueWeek} revenue · {top.fuelMpg} MPG · {top.healthScore}% health</p>
                  <Badge value={top.maintenanceRisk} />
                </div>
              );
            })()}
          </div>

          <div className="fleet-panel">
            <p className="fleet-eyebrow">Coming Soon</p>
            <h2>Advanced Features</h2>
            <ul className="fleet-feature-list">
              <li>Telematics integration</li>
              <li>GPS live map</li>
              <li>Fuel fraud detection</li>
              <li>AI maintenance forecasting</li>
              <li>Revenue vs. repair cost analysis</li>
              <li>DOT audit packet generator</li>
            </ul>
          </div>
        </aside>
      </section>

      {/* ── Modals ── */}
      {assignTarget  && <AssignModal truck={assignTarget}  onClose={() => setAssignTarget(null)}  onSave={handleAssignSave} showToast={showToast} />}
      {serviceTarget && <ServiceModal truck={serviceTarget} onClose={() => setServiceTarget(null)} showToast={showToast} />}
      {uploadDocType !== null && <UploadDocModal preselectedDoc={uploadDocType || undefined} onClose={() => setUploadDocType(null)} showToast={showToast} />}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </main>
  );
}
