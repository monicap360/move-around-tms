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

/* ─── Issue helpers ─────────────────────────────────────────── */
function daysUntil(dateStr: string): number | null {
  if (!dateStr || dateStr === "—") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 864e5);
}

type TruckIssue = {
  truck: Truck;
  category: "oos" | "critical" | "expiring" | "maint";
  title: string;
  detail: string;
  priority: "critical" | "high" | "medium" | "low";
};

function computeAllIssues(trucks: Truck[]): TruckIssue[] {
  const issues: TruckIssue[] = [];
  const ORDER = ["critical", "high", "medium", "low"] as const;
  for (const t of trucks) {
    if (t.status === "Out of Service")
      issues.push({ truck: t, category: "oos", title: "Out of Service", detail: `Unit ${t.unit} needs return to service`, priority: "critical" });
    if (t.maintenanceRisk === "Critical")
      issues.push({ truck: t, category: "critical", title: "Critical Risk", detail: `${t.unit} requires immediate attention`, priority: "critical" });
    else if (t.maintenanceRisk === "High")
      issues.push({ truck: t, category: "maint", title: "High Maintenance Risk", detail: `${t.unit} — schedule service before next dispatch`, priority: "high" });
    for (const [field, label] of [
      [t.inspectionExp,   "DOT Inspection"],
      [t.insuranceExp,    "Insurance"],
      [t.registrationExp, "Registration"],
    ] as [string, string][]) {
      const d = daysUntil(field);
      if (d !== null && d <= 45) {
        issues.push({
          truck: t, category: "expiring",
          title:  `${label} ${d < 0 ? "EXPIRED" : `expiring in ${d}d`}`,
          detail: `${t.unit} — ${label} ${d < 0 ? "expired" : "expires"} ${field}`,
          priority: d < 0 ? "critical" : d <= 7 ? "high" : d <= 14 ? "medium" : "low",
        });
      }
    }
  }
  return issues.sort((a, b) => ORDER.indexOf(a.priority) - ORDER.indexOf(b.priority));
}

/* ─── Status modal ───────────────────────────────────────────── */
function StatusModal({ truck, onClose, onSave, showToast }: {
  truck: Truck;
  onClose: () => void;
  onSave: (id: string, status: TruckStatus) => void;
  showToast: (msg: string) => void;
}) {
  const STATUSES: TruckStatus[] = ["Available", "Assigned", "In Maintenance", "Out of Service", "Inactive"];
  const [status, setStatus] = useState<TruckStatus>(truck.status);
  const [notes, setNotes]   = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(truck.id, status);
    showToast(`${truck.unit} → ${status}`);
    onClose();
  }
  return (
    <div style={moverlay}>
      <div style={mbox(420)}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Change Unit Status</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13 }}>{truck.unit} · {truck.year} {truck.make} {truck.model}</p>
        <form onSubmit={submit}>
          <label style={mlbl}>New Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as TruckStatus)} style={{ ...minp, marginBottom: 14 }}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <label style={mlbl}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...minp, minHeight: 68, resize: "vertical" }} placeholder="Reason for status change…" />
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" style={mbtn(true)}>Save Status</button>
            <button type="button" onClick={onClose} style={mbtn(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Health score + next action ─────────────────────────────── */
function computeHealthScore(t: Truck): number {
  let s = 100;
  const ins = daysUntil(t.insuranceExp);
  const reg = daysUntil(t.registrationExp);
  const dot = daysUntil(t.inspectionExp);
  if (ins !== null) { if (ins < 0) s -= 15; else if (ins <= 14) s -= 8; else if (ins <= 30) s -= 4; }
  if (reg !== null) { if (reg < 0) s -= 12; else if (reg <= 14) s -= 6; else if (reg <= 30) s -= 3; }
  if (dot !== null) { if (dot < 0) s -= 12; else if (dot <= 14) s -= 6; else if (dot <= 30) s -= 3; }
  if (t.maintenanceRisk === "Critical") s -= 25;
  else if (t.maintenanceRisk === "High") s -= 15;
  else if (t.maintenanceRisk === "Medium") s -= 8;
  if (t.status === "Out of Service") s -= 20;
  else if (t.status === "In Maintenance") s -= 10;
  if (!t.assignedDriver || t.assignedDriver === "—") s -= 5;
  return Math.max(0, Math.min(100, s));
}

function computeNextAction(t: Truck, issues: TruckIssue[]): string {
  const myIssues = issues.filter(i => i.truck.id === t.id);
  const critical = myIssues.find(i => i.priority === "critical");
  if (critical) return critical.title;
  if (t.status === "Out of Service") return "Return to service";
  if (t.maintenanceRisk === "High") return "Schedule service";
  const high = myIssues.find(i => i.priority === "high");
  if (high) return high.title;
  if (!t.assignedDriver || t.assignedDriver === "—") return "Assign driver";
  return "Ready to dispatch";
}

/* ─── Availability board ──────────────────────────────────────── */
function AvailabilityBoard({ trucks, onAssign, onStatus }: {
  trucks: Truck[];
  onAssign: (t: Truck) => void;
  onStatus: (t: Truck) => void;
}) {
  const cols: { label: string; statuses: TruckStatus[]; color: string; bg: string }[] = [
    { label: "Available",      statuses: ["Available"],      color: "#16a34a", bg: "#f0fdf4" },
    { label: "Assigned",       statuses: ["Assigned"],       color: "#1d4ed8", bg: "#eff6ff" },
    { label: "In Maintenance", statuses: ["In Maintenance"], color: "#b45309", bg: "#fffbeb" },
    { label: "Out of Service", statuses: ["Out of Service"], color: "#dc2626", bg: "#fef2f2" },
    { label: "Inactive",       statuses: ["Inactive"],       color: "#64748b", bg: "#f8fafc" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, minWidth: 860 }}>
      {cols.map(col => {
        const units = trucks.filter(t => col.statuses.includes(t.status));
        return (
          <div key={col.label} style={{ background: col.bg, borderRadius: 12, border: `1px solid ${col.color}22`, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{col.label}</span>
              <span style={{ background: col.color, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{units.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {units.map(t => {
                const health = computeHealthScore(t);
                const hColor = health >= 80 ? "#16a34a" : health >= 60 ? "#ca8a04" : "#dc2626";
                return (
                  <div key={t.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                      <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{t.unit}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: hColor }}>{health}%</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3 }}>{t.type}</div>
                    {t.assignedDriver && t.assignedDriver !== "—" && (
                      <div style={{ fontSize: 11, color: "#475569", fontWeight: 600, marginBottom: 6 }}>👤 {t.assignedDriver}</div>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => onAssign(t)} style={{ flex: 1, padding: "4px 0", background: "#f1f5f9", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "#475569", cursor: "pointer" }}>Assign</button>
                      <button onClick={() => onStatus(t)} style={{ flex: 1, padding: "4px 0", background: "#f1f5f9", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 700, color: "#475569", cursor: "pointer" }}>Status</button>
                    </div>
                  </div>
                );
              })}
              {!units.length && <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>None</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Fleet table ─────────────────────────────────────────────── */
function FleetTable({ trucks, issues, onAssign, onService, onStatus, onUploadDoc }: {
  trucks: Truck[];
  issues: TruckIssue[];
  onAssign: (t: Truck) => void;
  onService: (t: Truck) => void;
  onStatus: (t: Truck) => void;
  onUploadDoc: () => void;
}) {
  const [search, setSearch]   = useState("");
  const [statusF, setStatusF] = useState("All Statuses");
  const [riskF, setRiskF]     = useState("All Risks");

  const filtered = useMemo(() => trucks.filter(t => {
    const q = search.toLowerCase();
    const match = !q || t.unit.toLowerCase().includes(q) || t.vin.toLowerCase().includes(q) || t.plate.toLowerCase().includes(q) || t.make.toLowerCase().includes(q) || t.model.toLowerCase().includes(q) || t.assignedDriver.toLowerCase().includes(q);
    return match && (statusF === "All Statuses" || t.status === statusF) && (riskF === "All Risks" || t.maintenanceRisk === riskF);
  }), [trucks, search, statusF, riskF]);

  const sColor = (s: TruckStatus) => s === "Available" ? "#16a34a" : s === "Assigned" ? "#1d4ed8" : s === "In Maintenance" ? "#b45309" : s === "Out of Service" ? "#dc2626" : "#64748b";
  const sBg    = (s: TruckStatus) => s === "Available" ? "#f0fdf4" : s === "Assigned" ? "#eff6ff" : s === "In Maintenance" ? "#fffbeb" : s === "Out of Service" ? "#fef2f2" : "#f8fafc";
  const rColor = (r: MaintenanceRisk) => r === "Critical" ? "#dc2626" : r === "High" ? "#ea580c" : r === "Medium" ? "#ca8a04" : "#16a34a";
  const rBg    = (r: MaintenanceRisk) => r === "Critical" ? "#fef2f2" : r === "High" ? "#fff7ed" : r === "Medium" ? "#fefce8" : "#f0fdf4";
  const expColor = (d: number | null) => d === null ? "#64748b" : d < 0 ? "#dc2626" : d <= 14 ? "#ea580c" : d <= 30 ? "#ca8a04" : "#475569";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search unit, VIN, plate, driver…" style={{ flex: "1 1 220px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, outline: "none" }} />
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff" }}>
          <option>All Statuses</option>
          {(["Available","Assigned","In Maintenance","Out of Service","Inactive"] as TruckStatus[]).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={riskF} onChange={e => setRiskF(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, background: "#fff" }}>
          <option>All Risks</option>
          {(["Low","Medium","High","Critical"] as MaintenanceRisk[]).map(r => <option key={r}>{r}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120, tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 80 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 60 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 96 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 156 }} />
            <col style={{ width: 200 }} />
          </colgroup>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Truck #","Type","Driver","Status","Health","Maint. Risk","Inspection","Registration","Insurance","Next Action","Actions"].map(h => (
                <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const health = computeHealthScore(t);
              const hColor = health >= 80 ? "#16a34a" : health >= 60 ? "#ca8a04" : "#dc2626";
              const next = computeNextAction(t, issues);
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 10px", fontWeight: 800, fontSize: 13 }}>{t.unit}</td>
                  <td style={{ padding: "10px 10px", color: "#475569", fontSize: 12 }}>{t.type}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: t.assignedDriver === "—" ? "#94a3b8" : "#0f172a", fontWeight: t.assignedDriver === "—" ? 400 : 600 }}>{t.assignedDriver}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ background: sBg(t.status), color: sColor(t.status), borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{t.status}</span>
                  </td>
                  <td style={{ padding: "10px 10px", fontWeight: 800, color: hColor, fontSize: 13 }}>{health}%</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ background: rBg(t.maintenanceRisk), color: rColor(t.maintenanceRisk), borderRadius: 6, padding: "3px 7px", fontSize: 11, fontWeight: 700 }}>{t.maintenanceRisk}</span>
                  </td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: expColor(daysUntil(t.inspectionExp)) }}>{t.inspectionExp}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: expColor(daysUntil(t.registrationExp)) }}>{t.registrationExp}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: expColor(daysUntil(t.insuranceExp)) }}>{t.insuranceExp}</td>
                  <td style={{ padding: "10px 10px", fontSize: 12, color: next === "Ready to dispatch" ? "#16a34a" : "#0f172a", fontWeight: next === "Ready to dispatch" ? 600 : 700 }}>{next}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => onAssign(t)} style={{ padding: "4px 7px", background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Assign</button>
                      <button onClick={() => onService(t)} style={{ padding: "4px 7px", background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Service</button>
                      <button onClick={() => onUploadDoc()} style={{ padding: "4px 7px", background: "#f8fafc", color: "#475569", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Docs</button>
                      <button onClick={() => onStatus(t)} style={{ padding: "4px 7px", background: "#f8fafc", color: "#475569", border: "none", borderRadius: 5, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>Status</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No trucks match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Mission control panel ───────────────────────────────────── */
function MissionControlPanel({ trucks, kpis, issues }: {
  trucks: Truck[];
  kpis: { total: number; available: number; oos: number; criticalRisk: number; avgHealth: number };
  issues: TruckIssue[];
}) {
  const critCount = issues.filter(i => i.priority === "critical").length;
  const message = kpis.total === 0
    ? "No fleet units loaded yet. Import your fleet list or add trucks manually to get started."
    : critCount > 0
    ? `${critCount} critical issue${critCount > 1 ? "s" : ""} require immediate attention today.`
    : kpis.available === kpis.total
    ? "All units available. Fleet is fully dispatch-ready."
    : `${kpis.available} of ${kpis.total} units available. Fleet health at ${kpis.avgHealth}%.`;

  const firstAction = kpis.total === 0
    ? "Import your fleet list (Excel or CSV)"
    : critCount > 0
    ? (issues.find(i => i.priority === "critical")?.title ?? "Review Work Queue")
    : kpis.oos > 0
    ? `Return ${kpis.oos} unit${kpis.oos > 1 ? "s" : ""} to service`
    : kpis.criticalRisk > 0
    ? "Schedule maintenance for high-risk units"
    : "Review Expiring Docs tab";

  const hidePanel = kpis.total > 0 && critCount === 0 && kpis.oos === 0 && kpis.criticalRisk === 0;
  if (hidePanel) return null;

  return (
    <div style={{ background: "#0f172a", borderRadius: 14, padding: "16px 22px", marginBottom: 18, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Fleet Mission Control</div>
        <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.45 }}>{message}</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 18px", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Recommended First Action</div>
        <div style={{ fontSize: 13, color: "#f59e0b", fontWeight: 800 }}>{firstAction}</div>
      </div>
      {kpis.total === 0 && (
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "10px 16px", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Onboarding Checklist</div>
          {["Import fleet data","Upload insurance, registration, inspection docs","Assign primary and backup drivers","Set inspection + IFTA dates"].map((item, i) => (
            <div key={i} style={{ fontSize: 12, color: "#94a3b8", display: "flex", gap: 6, marginBottom: 3 }}>
              <span style={{ color: "#475569" }}>○</span> {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Queue tab ──────────────────────────────────────────────── */
function QueueTab({ issues, onService, onStatus }: {
  issues: TruckIssue[];
  onService: (t: Truck) => void;
  onStatus: (t: Truck) => void;
}) {
  const pColor = (p: string) => p === "critical" ? "#dc2626" : p === "high" ? "#ea580c" : p === "medium" ? "#ca8a04" : "#16a34a";
  const pBg    = (p: string) => p === "critical" ? "#fef2f2" : p === "high" ? "#fff7ed" : p === "medium" ? "#fefce8" : "#f0fdf4";
  if (!issues.length) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, marginBottom: 4 }}>All Clear</div>
      <div style={{ fontSize: 13 }}>No open fleet issues. All units are healthy.</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(["critical","high","medium","low"] as const).map(p => {
          const cnt = issues.filter(i => i.priority === p).length;
          if (!cnt) return null;
          return <div key={p} style={{ background: pBg(p), border: `1px solid ${pColor(p)}30`, borderRadius: 7, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: pColor(p) }}>{cnt} {p}</div>;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {issues.map((item, i) => (
          <div key={i} style={{ background: "#fff", border: `1px solid ${pColor(item.priority)}25`, borderLeft: `4px solid ${pColor(item.priority)}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: pBg(item.priority), borderRadius: 6, padding: "3px 9px", fontSize: 10, fontWeight: 800, color: pColor(item.priority), textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>{item.priority}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>{item.detail}</div>
            </div>
            {item.category === "oos" ? (
              <button onClick={() => onStatus(item.truck)} style={{ padding: "5px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Return to Service</button>
            ) : (
              <button onClick={() => onService(item.truck)} style={{ padding: "5px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                {item.category === "expiring" ? "Take Action" : "Schedule Service"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Expiring tab ───────────────────────────────────────────── */
function ExpiringTab({ trucks, onService }: { trucks: Truck[]; onService: (t: Truck) => void }) {
  const rows: { truck: Truck; label: string; date: string; days: number }[] = [];
  for (const t of trucks) {
    for (const [field, label] of [[t.inspectionExp,"DOT Inspection"],[t.insuranceExp,"Insurance"],[t.registrationExp,"Registration"]] as [string,string][]) {
      const d = daysUntil(field);
      if (d !== null && d <= 60) rows.push({ truck: t, label, date: field, days: d });
    }
  }
  rows.sort((a, b) => a.days - b.days);
  if (!rows.length) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>All Documents Current</div>
      <div style={{ fontSize: 13 }}>No documents expiring within 60 days.</div>
    </div>
  );
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: "#f8fafc" }}>
          {["Unit","Make / Model","Document","Expires","Days Left",""].map(h => (
            <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const exp = row.days < 0; const hot = row.days <= 7;
          return (
            <tr key={i} style={{ background: exp ? "#fef2f2" : hot ? "#fff7ed" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "10px 14px", fontWeight: 700 }}>{row.truck.unit}</td>
              <td style={{ padding: "10px 14px", color: "#475569" }}>{row.truck.year} {row.truck.make} {row.truck.model}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600 }}>{row.label}</td>
              <td style={{ padding: "10px 14px", color: exp ? "#dc2626" : "#475569", fontWeight: exp ? 700 : 400 }}>{row.date}</td>
              <td style={{ padding: "10px 14px" }}>
                <span style={{ background: exp ? "#fef2f2" : hot ? "#fff7ed" : "#f0fdf4", color: exp ? "#dc2626" : hot ? "#ea580c" : "#16a34a", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                  {exp ? "EXPIRED" : `${row.days}d`}
                </span>
              </td>
              <td style={{ padding: "10px 14px" }}>
                <button onClick={() => onService(row.truck)} style={{ padding: "4px 10px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Renew</button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ─── OOS tab ────────────────────────────────────────────────── */
function OOSTab({ trucks, onStatus, onService }: { trucks: Truck[]; onStatus: (t: Truck) => void; onService: (t: Truck) => void }) {
  const oosUnits = trucks.filter(t => t.status === "Out of Service" || t.status === "Inactive");
  if (!oosUnits.length) return (
    <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>No Units Out of Service</div>
      <div style={{ fontSize: 13 }}>All fleet units are operational.</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {oosUnits.map(t => (
        <div key={t.id} style={{ background: "#fff", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 26 }}>🚚</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{t.unit}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{t.year} {t.make} {t.model} · {t.plate}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
              <span style={{ background: "#fef2f2", color: "#dc2626", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{t.status}</span>
              {t.assignedDriver && t.assignedDriver !== "—" && <span style={{ background: "#f8fafc", color: "#64748b", borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>Driver: {t.assignedDriver}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onService(t)} style={{ padding: "6px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Schedule Repair</button>
            <button onClick={() => onStatus(t)} style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Return to Service</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Maintenance tab ────────────────────────────────────────── */
function MaintenanceTab({ trucks, onService, onTicket }: { trucks: Truck[]; onService: (t: Truck) => void; onTicket: () => void }) {
  const atRisk = trucks.filter(t => ["Critical","High","Medium"].includes(t.maintenanceRisk) || t.status === "In Maintenance");
  const rColor = (r: MaintenanceRisk) => r === "Critical" ? "#dc2626" : r === "High" ? "#ea580c" : r === "Medium" ? "#ca8a04" : "#16a34a";
  const rBg    = (r: MaintenanceRisk) => r === "Critical" ? "#fef2f2" : r === "High" ? "#fff7ed" : r === "Medium" ? "#fefce8" : "#f0fdf4";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>{atRisk.length} unit{atRisk.length !== 1 ? "s" : ""} need maintenance attention</div>
        <button onClick={onTicket} style={{ padding: "7px 16px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Create Ticket</button>
      </div>
      {!atRisk.length ? (
        <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔧</div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>No Maintenance Issues</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>All units have low maintenance risk.</div>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Unit","Make / Model","Risk","Next Service","Last Maint.","Health",""].map(h => (
                <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atRisk.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{t.unit}</td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{t.year} {t.make} {t.model}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: rBg(t.maintenanceRisk), color: rColor(t.maintenanceRisk), borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700 }}>{t.maintenanceRisk}</span>
                </td>
                <td style={{ padding: "10px 14px", color: t.nextService === "Overdue" ? "#dc2626" : "#475569", fontWeight: t.nextService === "Overdue" ? 700 : 400 }}>{t.nextService}</td>
                <td style={{ padding: "10px 14px", color: "#475569" }}>{t.lastMaintenance}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: t.healthScore >= 80 ? "#16a34a" : t.healthScore >= 60 ? "#ca8a04" : "#dc2626" }}>{t.healthScore}%</td>
                <td style={{ padding: "10px 14px" }}>
                  <button onClick={() => onService(t)} style={{ padding: "4px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Schedule</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Reports tab ────────────────────────────────────────────── */
function ReportsTab({ trucks, onExport }: { trucks: Truck[]; onExport: () => void }) {
  const byStatus: Record<string, number> = {};
  const byRisk:   Record<string, number> = {};
  for (const t of trucks) {
    byStatus[t.status]          = (byStatus[t.status]          || 0) + 1;
    byRisk[t.maintenanceRisk]   = (byRisk[t.maintenanceRisk]   || 0) + 1;
  }
  const avgH = trucks.length ? Math.round(trucks.reduce((s, t) => s + t.healthScore, 0)    / trucks.length) : 0;
  const avgR = trucks.length ? Math.round(trucks.reduce((s, t) => s + t.readinessScore, 0) / trucks.length) : 0;
  const rColor = (k: string) => k === "Critical" ? "#dc2626" : k === "High" ? "#ea580c" : k === "Medium" ? "#ca8a04" : "#16a34a";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>Fleet summary and export</div>
        <button onClick={onExport} style={{ padding: "8px 20px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Export Fleet CSV</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 12, fontSize: 13 }}>Status Breakdown</div>
          {Object.entries(byStatus).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ color: "#475569" }}>{k}</span><strong style={{ color: "#0f172a" }}>{v}</strong>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 12, fontSize: 13 }}>Maintenance Risk Distribution</div>
          {Object.entries(byRisk).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ color: rColor(k) }}>{k}</span><strong style={{ color: rColor(k) }}>{v}</strong>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 14, fontSize: 13 }}>Average Fleet Scores</div>
          <div style={{ display: "flex", gap: 16 }}>
            <ScoreRing score={avgH} label="Avg Health" />
            <ScoreRing score={avgR} label="Avg Readiness" />
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, border: "1px solid #e2e8f0" }}>
          <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 12, fontSize: 13 }}>Top Revenue Units</div>
          {[...trucks].sort((a, b) => parseInt(b.revenueWeek.replace(/\D/g,"") || "0") - parseInt(a.revenueWeek.replace(/\D/g,"") || "0")).slice(0, 5).map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{t.unit}</span>
              <strong style={{ color: "#16a34a" }}>{t.revenueWeek}/wk</strong>
            </div>
          ))}
          {!trucks.length && <div style={{ color: "#94a3b8", fontSize: 13 }}>No data yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
type KpiFilter = "all"|"available"|"assigned"|"maintenance"|"oos"|"inactive"|"high_risk"|"inspection"|"registration"|"insurance";

export default function FleetReadinessCenterPage() {
  const [trucks, setTrucks]       = useState<Truck[]>([]);
  const [activeTab, setActiveTab] = useState<"queue"|"availability"|"fleet"|"maint"|"expiring"|"oos"|"reports">("queue");
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>("all");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toast, setToast]         = useState("");

  const [assignTarget,  setAssignTarget]  = useState<Truck | null | undefined>(undefined);
  const [serviceTarget, setServiceTarget] = useState<Truck | null | undefined>(undefined);
  const [uploadDocType, setUploadDocType] = useState<string | null>(null);
  const [addTruckOpen,  setAddTruckOpen]  = useState(false);
  const [ticketOpen,    setTicketOpen]    = useState(false);
  const [importOpen,    setImportOpen]    = useState(false);
  const [statusTarget,  setStatusTarget]  = useState<Truck | null>(null);

  useEffect(() => {
    fetch("/api/ronyx/trucks")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.trucks) && data.trucks.length > 0) setTrucks(data.trucks.map(mapApiTruck)); })
      .catch(() => {});
  }, []);

  function showToast(msg: string) { setToast(msg); }
  function handleAssignSave(id: string, driver: string, trailer: string) {
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, assignedDriver: driver, assignedTrailer: trailer, status: (driver ? "Assigned" : "Available") as TruckStatus } : t));
  }
  function handleStatusSave(id: string, status: TruckStatus) {
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  }

  const issues = useMemo(() => computeAllIssues(trucks), [trucks]);

  const kpis = useMemo(() => {
    const expI = trucks.filter(t => { const d = daysUntil(t.inspectionExp);   return d !== null && d <= 30; }).length;
    const expR = trucks.filter(t => { const d = daysUntil(t.registrationExp); return d !== null && d <= 30; }).length;
    const expN = trucks.filter(t => { const d = daysUntil(t.insuranceExp);    return d !== null && d <= 30; }).length;
    return {
      total:        trucks.length,
      available:    trucks.filter(t => t.status === "Available").length,
      assigned:     trucks.filter(t => t.status === "Assigned").length,
      inMaint:      trucks.filter(t => t.status === "In Maintenance").length,
      oos:          trucks.filter(t => t.status === "Out of Service").length,
      inactive:     trucks.filter(t => t.status === "Inactive").length,
      avgHealth:    trucks.length ? Math.round(trucks.reduce((s, t) => s + computeHealthScore(t), 0) / trucks.length) : 0,
      criticalRisk: trucks.filter(t => t.maintenanceRisk === "Critical" || t.maintenanceRisk === "High").length,
      expI, expR, expN,
    };
  }, [trucks]);

  const kpiFilteredTrucks = useMemo(() => {
    if (kpiFilter === "all")          return trucks;
    if (kpiFilter === "available")    return trucks.filter(t => t.status === "Available");
    if (kpiFilter === "assigned")     return trucks.filter(t => t.status === "Assigned");
    if (kpiFilter === "maintenance")  return trucks.filter(t => t.status === "In Maintenance");
    if (kpiFilter === "oos")          return trucks.filter(t => t.status === "Out of Service");
    if (kpiFilter === "inactive")     return trucks.filter(t => t.status === "Inactive");
    if (kpiFilter === "high_risk")    return trucks.filter(t => t.maintenanceRisk === "Critical" || t.maintenanceRisk === "High");
    if (kpiFilter === "inspection")   return trucks.filter(t => { const d = daysUntil(t.inspectionExp);   return d !== null && d <= 30; });
    if (kpiFilter === "registration") return trucks.filter(t => { const d = daysUntil(t.registrationExp); return d !== null && d <= 30; });
    if (kpiFilter === "insurance")    return trucks.filter(t => { const d = daysUntil(t.insuranceExp);    return d !== null && d <= 30; });
    return trucks;
  }, [trucks, kpiFilter]);

  const KPI_CARDS: { label: string; value: string | number; filter: KpiFilter; color: string; alert?: boolean }[] = [
    { label: "Total Fleet",       value: kpis.total,           filter: "all",          color: "#475569" },
    { label: "Available Now",     value: kpis.available,       filter: "available",    color: "#16a34a" },
    { label: "Assigned",          value: kpis.assigned,        filter: "assigned",     color: "#1d4ed8" },
    { label: "In Maintenance",    value: kpis.inMaint,         filter: "maintenance",  color: "#b45309" },
    { label: "Out of Service",    value: kpis.oos,             filter: "oos",          color: "#dc2626",  alert: kpis.oos > 0 },
    { label: "High Risk Units",   value: kpis.criticalRisk,    filter: "high_risk",    color: "#ea580c",  alert: kpis.criticalRisk > 0 },
    { label: "Inspection Exp.",   value: kpis.expI,            filter: "inspection",   color: kpis.expI  > 0 ? "#ea580c" : "#64748b", alert: kpis.expI  > 0 },
    { label: "Registration Exp.", value: kpis.expR,            filter: "registration", color: kpis.expR  > 0 ? "#ea580c" : "#64748b", alert: kpis.expR  > 0 },
    { label: "Insurance Exp.",    value: kpis.expN,            filter: "insurance",    color: kpis.expN  > 0 ? "#ea580c" : "#64748b", alert: kpis.expN  > 0 },
    { label: "Avg Fleet Health",  value: `${kpis.avgHealth}%`, filter: "all",          color: kpis.avgHealth >= 80 ? "#16a34a" : kpis.avgHealth >= 60 ? "#b45309" : "#dc2626" },
  ];

  const TABS = [
    { id: "queue",        label: "Work Queue",     badge: issues.filter(i => i.priority === "critical" || i.priority === "high").length || null },
    { id: "availability", label: "Availability",   badge: null },
    { id: "fleet",        label: "Fleet Table",    badge: null },
    { id: "maint",        label: "Maintenance",    badge: kpis.criticalRisk || null },
    { id: "expiring",     label: "Expiring Docs",  badge: (kpis.expI + kpis.expR + kpis.expN) || null },
    { id: "oos",          label: "Out of Service", badge: kpis.oos || null },
    { id: "reports",      label: "Reports",        badge: null },
  ] as const;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "18px 28px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Fleet Operations</div>
            <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>Fleet Readiness Command Center</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Fleet availability, assignments, maintenance risk, compliance, and dispatch readiness — all in one command center.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            <button onClick={() => setTicketOpen(true)} style={{ padding: "9px 16px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Maint. Ticket</button>
            <button onClick={() => { exportFleetCSV(trucks); showToast(`Exported ${trucks.length} trucks.`); }} style={{ padding: "9px 16px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Export CSV</button>
            <button onClick={() => setImportOpen(true)} style={{ padding: "9px 16px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>⬆ Import</button>
            <button onClick={() => setAddTruckOpen(true)} style={{ padding: "9px 20px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>+ Add Truck</button>
            <button onClick={() => setToolsOpen(o => !o)} style={{ padding: "9px 14px", background: toolsOpen ? "#f1f5f9" : "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Tools {toolsOpen ? "▲" : "▼"}</button>
          </div>
        </div>

        {/* KPI cards */}
        <div style={{ display: "flex", overflowX: "auto", borderTop: "1px solid #f1f5f9", marginLeft: -28, marginRight: -28, paddingLeft: 28 }}>
          {KPI_CARDS.map(k => (
            <button
              key={k.label}
              onClick={() => { setKpiFilter(k.filter); setActiveTab("fleet"); }}
              style={{ padding: "11px 16px", background: kpiFilter === k.filter && activeTab === "fleet" ? "#f0f9ff" : "transparent", border: "none", borderBottom: `3px solid ${kpiFilter === k.filter && activeTab === "fleet" ? "#1e40af" : "transparent"}`, cursor: "pointer", minWidth: 90, textAlign: "center", flexShrink: 0, borderRight: "1px solid #f1f5f9" }}
            >
              <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 9, color: k.alert ? k.color : "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2, whiteSpace: "nowrap" }}>{k.label}</div>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} style={{ padding: "11px 16px", background: "transparent", border: "none", borderBottom: `3px solid ${activeTab === tab.id ? "#1e40af" : "transparent"}`, color: activeTab === tab.id ? "#1e40af" : "#64748b", fontWeight: activeTab === tab.id ? 800 : 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              {tab.label}
              {!!tab.badge && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tools drawer ── */}
      {toolsOpen && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 28px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Assign Driver",    fn: () => setAssignTarget(null) },
              { label: "Schedule Service", fn: () => setServiceTarget(null) },
              { label: "Upload Document",  fn: () => setUploadDocType("") },
              { label: "Log Fuel Stop",    fn: () => {} },
            ].map(a => (
              <button key={a.label} onClick={a.fn} style={{ padding: "7px 14px", background: "#f8fafc", color: "#1e293b", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{a.label}</button>
            ))}
            <Link href="/ronyx/compliance" style={{ padding: "7px 14px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>Compliance Center →</Link>
            <Link href="/ronyx/fleet/ifta" style={{ padding: "7px 14px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none" }}>FuelIQ™ Command Center →</Link>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: "18px 24px 32px" }}>
        <MissionControlPanel trucks={trucks} kpis={kpis} issues={issues} />

        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: 20, minHeight: 400 }}>
          {activeTab === "queue" && (
            <QueueTab issues={issues} onService={t => setServiceTarget(t)} onStatus={t => setStatusTarget(t)} />
          )}
          {activeTab === "availability" && (
            <div style={{ overflowX: "auto" }}>
              <AvailabilityBoard trucks={kpiFilteredTrucks} onAssign={t => setAssignTarget(t)} onStatus={t => setStatusTarget(t)} />
            </div>
          )}
          {activeTab === "fleet" && (
            <FleetTable
              trucks={kpiFilteredTrucks}
              issues={issues}
              onAssign={t => setAssignTarget(t)}
              onService={t => setServiceTarget(t)}
              onStatus={t => setStatusTarget(t)}
              onUploadDoc={() => setUploadDocType("")}
            />
          )}
          {activeTab === "maint" && (
            <MaintenanceTab trucks={kpiFilteredTrucks} onService={t => setServiceTarget(t)} onTicket={() => setTicketOpen(true)} />
          )}
          {activeTab === "expiring" && (
            <ExpiringTab trucks={kpiFilteredTrucks} onService={t => setServiceTarget(t)} />
          )}
          {activeTab === "oos" && (
            <OOSTab trucks={kpiFilteredTrucks} onStatus={t => setStatusTarget(t)} onService={t => setServiceTarget(t)} />
          )}
          {activeTab === "reports" && (
            <ReportsTab trucks={trucks} onExport={() => { exportFleetCSV(trucks); showToast(`Exported ${trucks.length} trucks.`); }} />
          )}
        </div>
      </div>

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
        <AddTruckModal onClose={() => setAddTruckOpen(false)} onAdd={t => setTrucks(p => [...p, t])} showToast={showToast} />
      )}
      {ticketOpen && (
        <MaintenanceTicketModal allTrucks={trucks} onClose={() => setTicketOpen(false)} showToast={showToast} />
      )}
      {importOpen && (
        <ImportTrucksModal
          existingTrucks={trucks}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            fetch("/api/ronyx/trucks").then(r => r.json()).then(data => {
              if (Array.isArray(data.trucks) && data.trucks.length > 0) setTrucks(data.trucks.map(mapApiTruck));
            });
          }}
          showToast={showToast}
        />
      )}
      {statusTarget && (
        <StatusModal truck={statusTarget} onClose={() => setStatusTarget(null)} onSave={handleStatusSave} showToast={showToast} />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </div>
  );
}
