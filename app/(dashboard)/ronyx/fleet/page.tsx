"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

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


/* ─── Map API → Truck ───────────────────────────────────── */
function normalizeRisk(r: string): MaintenanceRisk {
  const s = (r || "").toLowerCase();
  if (s === "critical") return "Critical";
  if (s === "high")     return "High";
  if (s === "medium")   return "Medium";
  return "Low";
}
function normalizeTruckStatus(s: string): TruckStatus {
  const v = (s || "").toLowerCase().replace(/_/g, " ");
  if (v === "assigned")        return "Assigned";
  if (v === "in maintenance")  return "In Maintenance";
  if (v === "out of service")  return "Out of Service";
  if (v === "inactive")        return "Inactive";
  return "Available";
}
function mapApiTruck(d: any): Truck {
  return {
    id:               d.id           || d.truck_number,
    unit:             d.truck_number || d.unit || "Unknown",
    vin:              d.vin          || "—",
    plate:            d.plate        || "—",
    year:             String(d.year  || ""),
    make:             d.make         || "Unknown",
    model:            d.model        || "Unknown",
    type:             d.type         || d.truck_type || "Truck",
    status:           normalizeTruckStatus(d.status),
    assignedDriver:   d.assigned_driver   || "—",
    assignedTrailer:  d.assigned_trailer  || "—",
    currentLoad:      d.current_load      || "Unassigned",
    location:         d.location          || "Yard",
    odometer:         d.odometer          ? Number(d.odometer).toLocaleString() : "—",
    engineHours:      d.engine_hours      || "—",
    fuelMpg:          d.fuel_mpg          || "—",
    revenueWeek:      d.revenue_week      ? `$${Number(d.revenue_week).toLocaleString()}` : "$0",
    costPerMile:      d.cost_per_mile     ? `$${d.cost_per_mile}` : "—",
    readinessScore:   Number(d.readiness_score)  || 100,
    healthScore:      Number(d.health_score)      || 100,
    maintenanceRisk:  normalizeRisk(d.maintenance_risk),
    nextService:      d.next_service      || "—",
    inspectionExp:    d.inspection_exp    || "—",
    insuranceExp:     d.insurance_exp     || "—",
    registrationExp:  d.registration_exp  || "—",
    lastMaintenance:  d.last_maintenance  || "—",
  };
}

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

/* ─── Shared modal styles ───────────────────────────────── */
const mlbl: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const minp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };
const moverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" };
const mbox = (w = 420): React.CSSProperties => ({ background: "#fff", borderRadius: 20, padding: 28, width: w, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" });
const mbtn = (primary = true): React.CSSProperties => primary
  ? { flex: 1, background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: "pointer", fontSize: 14 }
  : { padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff", fontSize: 14 };

/* ─── Assign modal ──────────────────────────────────────── */
function AssignModal({ allTrucks, truck, onClose, onSave, showToast }: {
  allTrucks: Truck[];
  truck: Truck | null;   // null = show truck picker
  onClose: () => void;
  onSave: (id: string, driver: string, trailer: string) => void;
  showToast: (msg: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(truck?.id ?? "");
  const [driver, setDriver]         = useState(truck?.assignedDriver ?? "");
  const [trailer, setTrailer]       = useState(truck?.assignedTrailer ?? "");
  const resolved = truck ?? allTrucks.find((t) => t.id === selectedId) ?? null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolved) { showToast("Select a truck first."); return; }
    onSave(resolved.id, driver, trailer);
    showToast(`${resolved.unit} assigned to ${driver || "unassigned"}.`);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={mbox()}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Assign Driver &amp; Trailer</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>
          {resolved ? `${resolved.unit} · ${resolved.year} ${resolved.make} ${resolved.model}` : "Select a truck to assign."}
        </p>
        <form onSubmit={submit}>
          {!truck && (
            <>
              <label style={mlbl}>Truck</label>
              <select value={selectedId} onChange={(e) => { const t = allTrucks.find((x) => x.id === e.target.value); setSelectedId(e.target.value); setDriver(t?.assignedDriver ?? ""); setTrailer(t?.assignedTrailer ?? ""); }} style={{ ...minp, marginBottom: 14 }}>
                <option value="">Select truck…</option>
                {allTrucks.map((t) => <option key={t.id} value={t.id}>{t.unit} — {t.year} {t.make} {t.model}</option>)}
              </select>
            </>
          )}
          <label style={mlbl}>Driver</label>
          <input value={driver} onChange={(e) => setDriver(e.target.value)} style={{ ...minp, marginBottom: 14 }} placeholder="Driver name" />
          <label style={mlbl}>Trailer</label>
          <input value={trailer} onChange={(e) => setTrailer(e.target.value)} style={{ ...minp }} placeholder="Trailer unit" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" style={mbtn(true)}>Save Assignment</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Service modal ─────────────────────────────────────── */
function ServiceModal({ allTrucks, truck, title = "Schedule Service", onClose, showToast }: {
  allTrucks: Truck[];
  truck: Truck | null;   // null = show truck picker
  title?: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(truck?.id ?? "");
  const [date, setDate]   = useState("");
  const [notes, setNotes] = useState("");
  const resolved = truck ?? allTrucks.find((t) => t.id === selectedId) ?? null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolved) { showToast("Select a truck first."); return; }
    showToast(`${title} confirmed for ${resolved.unit}${date ? " on " + date : ""}.`);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={mbox()}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>{title}</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>
          {resolved ? `${resolved.unit} · Next due: ${resolved.nextService}` : "Select a truck to schedule service."}
        </p>
        <form onSubmit={submit}>
          {!truck && (
            <>
              <label style={mlbl}>Truck</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ ...minp, marginBottom: 14 }}>
                <option value="">Select truck…</option>
                {allTrucks.map((t) => <option key={t.id} value={t.id}>{t.unit} — {t.year} {t.make} {t.model}</option>)}
              </select>
            </>
          )}
          <label style={mlbl}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...minp, marginBottom: 14 }} />
          <label style={mlbl}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...minp, minHeight: 76, resize: "vertical" }} placeholder="Oil change, brake inspection, tire rotation…" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" style={mbtn(true)}>Confirm</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Add truck modal ───────────────────────────────────── */
function AddTruckModal({ onClose, onAdd, showToast }: {
  onClose: () => void;
  onAdd: (truck: Truck) => void;
  showToast: (msg: string) => void;
}) {
  const [f, setF]     = useState({ unit: "", year: new Date().getFullYear().toString(), make: "", model: "", type: "Dump Truck", plate: "", vin: "", odometer: "0" });
  const [saving, setSaving] = useState(false);
  function set(k: keyof typeof f, v: string) { setF((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.unit.trim()) { showToast("Unit number is required."); return; }
    if (!f.make.trim()) { showToast("Make is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/trucks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truck_number: f.unit,
          year:         parseInt(f.year, 10) || new Date().getFullYear(),
          make:         f.make,
          model:        f.model,
          type:         f.type,
          plate:        f.plate || null,
          vin:          f.vin   || null,
          status:       "Available",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add truck");
      onAdd(mapApiTruck(data.truck ?? data));
      showToast(`${f.unit} added to fleet.`);
      onClose();
    } catch (err: any) {
      showToast(err.message || "Error saving truck.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={moverlay}>
      <div style={mbox(500)}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Add New Truck</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>Enter basic information to register the unit in the fleet.</p>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
            {([["Unit #", "unit", "Unit 214"], ["Year", "year", "2023"], ["Make", "make", "Kenworth"], ["Model", "model", "T880"], ["Plate", "plate", "TX-00000"], ["Odometer", "odometer", "0"]] as [string, keyof typeof f, string][]).map(([lbl, key, ph]) => (
              <div key={key}>
                <label style={mlbl}>{lbl}{key === "unit" || key === "make" ? " *" : ""}</label>
                <input value={f[key]} onChange={(e) => set(key, e.target.value)} style={minp} placeholder={ph} />
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={mlbl}>Truck Type</label>
              <select value={f.type} onChange={(e) => set("type", e.target.value)} style={minp}>
                {["Dump Truck", "Aggregate Hauler", "Flatbed", "End Dump", "Belly Dump", "Tanker", "Owner Operator Truck", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={mlbl}>VIN (optional)</label>
              <input value={f.vin} onChange={(e) => set("vin", e.target.value)} style={minp} placeholder="17-character VIN" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={mbtn(true)}>{saving ? "Saving…" : "Add to Fleet"}</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Maintenance ticket modal ──────────────────────────── */
const TICKET_TYPES = ["Oil Change", "Brake Inspection", "Tire Rotation / Replacement", "Annual DOT Inspection", "Engine Diagnostic", "Transmission Service", "Electrical Issue", "Coolant / Fluid Service", "Bodywork / Damage", "Other"];

function MaintenanceTicketModal({ allTrucks, onClose, showToast }: {
  allTrucks: Truck[];
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [truckId, setTruckId]   = useState("");
  const [ticketType, setType]   = useState("");
  const [priority, setPriority] = useState("Medium");
  const [notes, setNotes]       = useState("");
  const [dueDate, setDueDate]   = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!truckId)    { showToast("Select a truck."); return; }
    if (!ticketType) { showToast("Select a ticket type."); return; }
    const unit = allTrucks.find((t) => t.id === truckId)?.unit ?? truckId;
    showToast(`Maintenance ticket created for ${unit}: ${ticketType}.`);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={mbox(480)}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Create Maintenance Ticket</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>Log a service issue or scheduled maintenance for any fleet unit.</p>
        <form onSubmit={submit}>
          <label style={mlbl}>Truck</label>
          <select value={truckId} onChange={(e) => setTruckId(e.target.value)} style={{ ...minp, marginBottom: 14 }}>
            <option value="">Select truck…</option>
            {allTrucks.map((t) => <option key={t.id} value={t.id}>{t.unit} — {t.year} {t.make} {t.model}</option>)}
          </select>
          <label style={mlbl}>Ticket Type</label>
          <select value={ticketType} onChange={(e) => setType(e.target.value)} style={{ ...minp, marginBottom: 14 }}>
            <option value="">Select type…</option>
            {TICKET_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
            <div>
              <label style={mlbl}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={minp}>
                {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={mlbl}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={minp} />
            </div>
          </div>
          <label style={mlbl}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...minp, minHeight: 72, resize: "vertical" }} placeholder="Describe the issue or work needed…" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" style={mbtn(true)}>Create Ticket</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
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
            {/* truck list populated from parent via prop or left empty until trucks load */}
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

/* ─── Truck Import ───────────────────────────────────────── */
type TruckImportRow = {
  truck_number:            string;
  make:                    string;
  model:                   string;
  year:                    string;
  vin:                     string;
  plate:                   string;
  plate_state:             string;
  axle_config:             string;
  axle_count:              string;
  gvwr:                    string;
  tare_weight:             string;
  max_payload_tons:        string;
  max_payload_lbs:         string;
  body_type:               string;
  truck_size:              string;
  dot_class:               string;
  bed_capacity_yards:      string;
  registration_expiration: string;
  insurance_expiration:    string;
  status:                  string;
  notes:                   string;
  assigned_driver:         string;
  fuel_type:               string;
  _isDuplicate: boolean;
  _action: "import" | "update" | "skip";
};

const TRUCK_IMPORT_MAP: Record<string, string[]> = {
  truck_number:            ["truck #", "truck number", "unit", "unit #", "unit number", "truck", "vehicle #", "vehicle number"],
  make:                    ["make", "manufacturer", "brand"],
  model:                   ["model"],
  year:                    ["year", "model year", "yr"],
  vin:                     ["vin", "vin #", "vin number", "vehicle id", "vehicle identification"],
  plate:                   ["plate", "plate #", "plate number", "license plate", "tag"],
  plate_state:             ["plate state", "tag state", "registration state", "state"],
  axle_config:             ["axle config", "axle configuration", "axle type", "axles", "configuration", "axle setup"],
  axle_count:              ["axle count", "number of axles", "# axles", "num axles"],
  gvwr:                    ["gvwr", "gross weight", "gross vehicle weight", "gross vehicle weight rating"],
  tare_weight:             ["tare weight", "curb weight", "empty weight", "tare"],
  max_payload_tons:        ["payload tons", "max payload tons", "tons", "max tons", "payload (tons)", "capacity tons"],
  max_payload_lbs:         ["payload lbs", "max payload lbs", "payload pounds", "max payload"],
  body_type:               ["body type", "body", "type"],
  truck_size:              ["truck size", "size", "size class"],
  dot_class:               ["dot class", "class", "vehicle class", "dot classification"],
  bed_capacity_yards:      ["cubic yards", "yard capacity", "bed capacity", "yards", "capacity (yds)", "yds"],
  registration_expiration: ["registration exp", "reg expiration", "registration expiration", "reg exp"],
  insurance_expiration:    ["insurance exp", "insurance expiration", "ins exp"],
  status:                  ["status"],
  notes:                   ["notes", "comments", "remarks"],
  assigned_driver:         ["driver", "assigned driver", "operator"],
  fuel_type:               ["fuel", "fuel type"],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((raw, i) => {
    const h = normalizeHeader(raw);
    for (const [field, aliases] of Object.entries(TRUCK_IMPORT_MAP)) {
      if (!(field in map) && aliases.some((a) => h === a || h.includes(a))) {
        map[field] = i;
      }
    }
  });
  return map;
}

function parseTruckFile(file: File, existingNumbers: Set<string>): Promise<TruckImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb   = XLSX.read(data, { type: "array", cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, dateNF: "yyyy-mm-dd" });

        if (raw.length < 2) { resolve([]); return; }

        const headers  = (raw[0] as string[]).map(String);
        const colMap   = buildColumnMap(headers);
        const get = (row: string[], field: string) => String(row[colMap[field]] ?? "").trim();

        const rows: TruckImportRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as string[];
          if (!row || row.every((c) => !String(c ?? "").trim())) continue;
          const num = get(row, "truck_number");
          if (!num) continue;
          rows.push({
            truck_number:            num,
            make:                    get(row, "make"),
            model:                   get(row, "model"),
            year:                    get(row, "year"),
            vin:                     get(row, "vin"),
            plate:                   get(row, "plate"),
            plate_state:             get(row, "plate_state"),
            axle_config:             get(row, "axle_config"),
            axle_count:              get(row, "axle_count"),
            gvwr:                    get(row, "gvwr"),
            tare_weight:             get(row, "tare_weight"),
            max_payload_tons:        get(row, "max_payload_tons"),
            max_payload_lbs:         get(row, "max_payload_lbs"),
            body_type:               get(row, "body_type"),
            truck_size:              get(row, "truck_size"),
            dot_class:               get(row, "dot_class"),
            bed_capacity_yards:      get(row, "bed_capacity_yards"),
            registration_expiration: get(row, "registration_expiration"),
            insurance_expiration:    get(row, "insurance_expiration"),
            status:                  get(row, "status"),
            notes:                   get(row, "notes"),
            assigned_driver:         get(row, "assigned_driver"),
            fuel_type:               get(row, "fuel_type"),
            _isDuplicate: existingNumbers.has(num.toLowerCase()),
            _action:      existingNumbers.has(num.toLowerCase()) ? "update" : "import",
          });
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function ImportTrucksModal({ existingTrucks, onClose, onImported, showToast }: {
  existingTrucks: Truck[];
  onClose: () => void;
  onImported: () => void;
  showToast: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage]     = useState<"idle" | "review" | "done">("idle");
  const [rows, setRows]       = useState<TruckImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]   = useState<{ imported: number; updated: number; skipped: number; failed: number; errors: string[] } | null>(null);

  const existingNumbers = useMemo(
    () => new Set(existingTrucks.map((t) => (t.unit || t.id).toLowerCase())),
    [existingTrucks]
  );

  async function handleFile(file: File) {
    setParsing(true);
    try {
      const parsed = await parseTruckFile(file, existingNumbers);
      if (!parsed.length) { showToast("No rows found in file."); setParsing(false); return; }
      setRows(parsed);
      setStage("review");
    } catch {
      showToast("Could not parse file — use Excel (.xlsx) or CSV.");
    } finally {
      setParsing(false);
    }
  }

  function setAction(idx: number, action: TruckImportRow["_action"]) {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, _action: action } : r));
  }

  async function runImport() {
    const toSend = rows; // all rows including skips — API handles skip action server-side
    setImporting(true);
    try {
      const res = await fetch("/api/ronyx/trucks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      setStage("done");
      onImported();
    } catch (err: any) {
      showToast(err.message || "Import error.");
    } finally {
      setImporting(false);
    }
  }

  const toImport  = rows.filter((r) => r._action !== "skip").length;
  const toSkip    = rows.filter((r) => r._action === "skip").length;
  const dupCount  = rows.filter((r) => r._isDuplicate).length;

  return (
    <div style={moverlay}>
      <div style={{ ...mbox(680), maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Import Trucks</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Upload an Excel or CSV file. Supports: Truck #, Make, Model, Year, VIN, Plate, Plate State, Axle Config, GVWR, Payload, Body Type, and more.
          </p>
        </div>

        {/* Stage: idle */}
        {stage === "idle" && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              style={{ border: "2px dashed #cbd5e1", borderRadius: 14, padding: 40, textAlign: "center", cursor: "pointer", background: "#f8fafc" }}
            >
              {parsing
                ? <p style={{ color: "#1e40af", fontWeight: 700 }}>Parsing file…</p>
                : <>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                    <p style={{ fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>Click to upload or drag &amp; drop</p>
                    <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Excel (.xlsx) or CSV — first row must be headers</p>
                  </>
              }
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={onClose} style={mbtn(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Stage: review */}
        {stage === "review" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 12, flexShrink: 0 }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#15803d" }}>
                {toImport} to import
              </div>
              {dupCount > 0 && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>
                  {dupCount} duplicate{dupCount > 1 ? "s" : ""} → will update
                </div>
              )}
              {toSkip > 0 && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700, color: "#64748b" }}>
                  {toSkip} skipped
                </div>
              )}
            </div>

            <div style={{ overflowY: "auto", flex: 1, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>Truck #</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>Make / Model</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>Plate</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>Axle / Type</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: row._action === "skip" ? "#f8fafc" : "white", opacity: row._action === "skip" ? 0.5 : 1 }}>
                      <td style={{ padding: "7px 12px", fontWeight: 700 }}>{row.truck_number}</td>
                      <td style={{ padding: "7px 12px", color: "#475569" }}>{row.year} {row.make} {row.model || "—"}</td>
                      <td style={{ padding: "7px 12px", color: "#475569" }}>{row.plate || "—"}{row.plate_state ? ` (${row.plate_state})` : ""}</td>
                      <td style={{ padding: "7px 12px", color: "#475569" }}>{row.axle_config || row.body_type || "—"}</td>
                      <td style={{ padding: "7px 12px" }}>
                        {row._isDuplicate
                          ? <span style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>DUPLICATE</span>
                          : <span style={{ background: "#f0fdf4", color: "#15803d", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>NEW</span>
                        }
                      </td>
                      <td style={{ padding: "7px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {row._isDuplicate && (
                            <button
                              onClick={() => setAction(i, "update")}
                              style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${row._action === "update" ? "#1d4ed8" : "#e2e8f0"}`, background: row._action === "update" ? "#eff6ff" : "#fff", color: row._action === "update" ? "#1d4ed8" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Update
                            </button>
                          )}
                          {!row._isDuplicate && (
                            <button
                              onClick={() => setAction(i, "import")}
                              style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${row._action === "import" ? "#15803d" : "#e2e8f0"}`, background: row._action === "import" ? "#f0fdf4" : "#fff", color: row._action === "import" ? "#15803d" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                            >
                              Import
                            </button>
                          )}
                          <button
                            onClick={() => setAction(i, "skip")}
                            style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${row._action === "skip" ? "#94a3b8" : "#e2e8f0"}`, background: row._action === "skip" ? "#f1f5f9" : "#fff", color: "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            Skip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexShrink: 0 }}>
              <button
                onClick={runImport}
                disabled={importing || toImport === 0}
                style={{ ...mbtn(true), opacity: toImport === 0 ? 0.5 : 1 }}
              >
                {importing ? "Importing…" : `Import ${toImport} Truck${toImport !== 1 ? "s" : ""}`}
              </button>
              <button onClick={() => setStage("idle")} style={mbtn(false)}>Back</button>
              <button onClick={onClose} style={mbtn(false)}>Cancel</button>
            </div>
          </>
        )}

        {/* Stage: done */}
        {stage === "done" && result && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              {[
                { label: "Imported", value: result.imported, color: "#15803d", bg: "#f0fdf4" },
                { label: "Updated",  value: result.updated,  color: "#1d4ed8", bg: "#eff6ff" },
                { label: "Skipped",  value: result.skipped,  color: "#475569", bg: "#f8fafc" },
                { label: "Failed",   value: result.failed,   color: "#dc2626", bg: "#fef2f2" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, marginBottom: 14, maxHeight: 120, overflowY: "auto" }}>
                {result.errors.map((e, i) => <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#dc2626" }}>{e}</p>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={mbtn(true)}>Done</button>
              <button onClick={() => { setStage("idle"); setRows([]); setResult(null); }} style={mbtn(false)}>Import Another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function TrucksPage() {
  const [trucks, setTrucks]           = useState<Truck[]>([]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [riskFilter, setRiskFilter]   = useState("All Risks");
  const [toast, setToast]               = useState("");
  // undefined = closed, null = open with truck picker, Truck = open with preselected
  const [assignTarget, setAssignTarget]   = useState<Truck | null | undefined>(undefined);
  const [serviceTarget, setServiceTarget] = useState<Truck | null | undefined>(undefined);
  const [uploadDocType, setUploadDocType] = useState<string | null>(null);
  const [addTruckOpen, setAddTruckOpen]   = useState(false);
  const [ticketOpen, setTicketOpen]       = useState(false);
  const [importOpen, setImportOpen]       = useState(false);

  useEffect(() => {
    fetch("/api/ronyx/trucks")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.trucks) && data.trucks.length > 0) {
          setTrucks(data.trucks.map(mapApiTruck));
        }
      })
      .catch(() => {/* keep demo data on error */});
  }, []);

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
          <button className="fleet-button dark" onClick={() => setServiceTarget(null)}>
            Schedule Maintenance
          </button>
          <button className="fleet-button primary" onClick={() => setAddTruckOpen(true)}>
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
              <button
                onClick={() => setImportOpen(true)}
                style={{ padding: "8px 16px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                ⬆ Import Trucks
              </button>
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
              <button onClick={() => setAddTruckOpen(true)}>Add New Truck</button>
              <button onClick={() => setUploadDocType("Registration")}>Upload Registration</button>
              <button onClick={() => setUploadDocType("Insurance Certificate")}>Upload Insurance</button>
              <button onClick={() => setServiceTarget(null)}>Schedule Inspection</button>
              <button onClick={() => setTicketOpen(true)}>Create Maintenance Ticket</button>
              <button onClick={() => setAssignTarget(null)}>Assign Driver</button>
              <button onClick={() => setAssignTarget(null)}>Assign Trailer</button>
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
      {assignTarget !== undefined && (
        <AssignModal allTrucks={trucks} truck={assignTarget} onClose={() => setAssignTarget(undefined)} onSave={handleAssignSave} showToast={showToast} />
      )}
      {serviceTarget !== undefined && (
        <ServiceModal allTrucks={trucks} truck={serviceTarget} onClose={() => setServiceTarget(undefined)} showToast={showToast} />
      )}
      {uploadDocType !== null && (
        <UploadDocModal preselectedDoc={uploadDocType || undefined} onClose={() => setUploadDocType(null)} showToast={showToast} />
      )}
      {addTruckOpen && (
        <AddTruckModal onClose={() => setAddTruckOpen(false)} onAdd={(t) => setTrucks((p) => [...p, t])} showToast={showToast} />
      )}
      {ticketOpen && (
        <MaintenanceTicketModal allTrucks={trucks} onClose={() => setTicketOpen(false)} showToast={showToast} />
      )}
      {importOpen && (
        <ImportTrucksModal
          existingTrucks={trucks}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            fetch("/api/ronyx/trucks").then((r) => r.json()).then((data) => {
              if (Array.isArray(data.trucks) && data.trucks.length > 0) {
                setTrucks(data.trucks.map(mapApiTruck));
              }
            });
          }}
          showToast={showToast}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </main>
  );
}
