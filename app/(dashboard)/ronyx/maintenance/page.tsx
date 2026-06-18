"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import ModuleUpgradeCard from "@/components/ronyx/ModuleUpgradeCard";

// ─── Types ────────────────────────────────────────────────────────────────────

type UnitStatus = "Ready" | "In Use" | "Due Soon" | "Overdue" | "In Shop" | "Out of Service" | "Dispatch Hold" | "Inactive";
type WOStatus   = "Needs Review" | "Scheduled" | "In Service" | "Waiting on Parts" | "Ready for Review" | "Completed" | "Overdue" | "Dispatch Hold" | "Archived";
type WOType     = "Preventive" | "Repair" | "Damage" | "Safety";
type Priority   = "Low" | "Medium" | "High" | "Critical";
type AssignedTo = "Internal" | "Vendor";

type FleetUnit = {
  id: string;
  unit_number: string;
  unit_type: string;
  vin?: string;
  plate?: string;
  assigned_driver_id?: string;
  assigned_driver_name?: string;
  odometer: number;
  current_mileage?: number;
  last_service_date?: string;
  next_service_date?: string;
  next_service_miles?: number;
  registration_expires?: string;
  insurance_expires?: string;
  annual_inspection_expires?: string;
  status: UnitStatus;
  dispatch_eligible: boolean;
  seat_capacity?: number;
  luggage_capacity?: number;
  dispatch_block_reason?: string;
  notes?: string;
};

type WorkOrder = {
  id: string;
  unit_id: string;
  unit_number: string;
  issue: string;
  wo_type?: WOType;
  description?: string;
  priority: Priority;
  status: WOStatus;
  opened_date: string;
  due_date?: string;
  vendor?: string;
  assigned_to_type?: AssignedTo;
  estimated_cost?: number;
  actual_cost?: number;
  dispatch_hold?: boolean;
  notes?: string;
};

type ActivityLog = {
  id: string;
  unit_id: string;
  unit_number: string;
  action: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  created_at: string;
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

const LANES: { key: WOStatus; label: string; color: string; bg: string; dbStatus: string }[] = [
  { key: "Needs Review",     label: "Needs Review",      color: "#94a3b8", bg: "#f8fafc", dbStatus: "Open"          },
  { key: "Scheduled",        label: "Scheduled",         color: "#3b82f6", bg: "#eff6ff", dbStatus: "Scheduled"      },
  { key: "In Service",       label: "In Service",        color: "#f59e0b", bg: "#fef3c7", dbStatus: "In Progress"    },
  { key: "Waiting on Parts", label: "Waiting on Parts",  color: "#8b5cf6", bg: "#f5f3ff", dbStatus: "Waiting Parts"  },
  { key: "Ready for Review", label: "Ready for Review",  color: "#06b6d4", bg: "#ecfeff", dbStatus: "Ready Review"   },
  { key: "Completed",        label: "Completed",         color: "#10b981", bg: "#f0fdf4", dbStatus: "Completed"      },
  { key: "Overdue",          label: "Overdue",           color: "#dc2626", bg: "#fef2f2", dbStatus: "Overdue"        },
  { key: "Dispatch Hold",    label: "Dispatch Hold",     color: "#1e293b", bg: "#f8fafc", dbStatus: "Dispatch Hold"  },
  { key: "Archived",         label: "Archived",          color: "#64748b", bg: "#f1f5f9", dbStatus: "Archived"       },
];

const NEXT_STATUS: Partial<Record<WOStatus, WOStatus>> = {
  "Needs Review":     "Scheduled",
  "Scheduled":        "In Service",
  "In Service":       "Ready for Review",
  "Waiting on Parts": "In Service",
  "Ready for Review": "Completed",
  "Overdue":          "In Service",
  "Dispatch Hold":    "Needs Review",
};
const NEXT_LABEL: Partial<Record<WOStatus, string>> = {
  "Needs Review":     "Schedule Service",
  "Scheduled":        "Start Service",
  "In Service":       "Ready for Review",
  "Waiting on Parts": "Parts Received",
  "Ready for Review": "Complete",
  "Overdue":          "Restart",
  "Dispatch Hold":    "Begin Review",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const warn30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

function fmtDate(d?: string | null) { return !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtCost(n?: number | null) { return !n ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }

function docStatus(date?: string | null): "expired" | "expiring" | "valid" | "none" {
  if (!date) return "none";
  if (date < today)  return "expired";
  if (date < warn30) return "expiring";
  return "valid";
}

const UNIT_STATUS_STYLE: Record<string, { dot: string; bg: string; text: string }> = {
  "Ready":          { dot: "#16a34a", bg: "#dcfce7", text: "#15803d" },
  "In Use":         { dot: "#3b82f6", bg: "#dbeafe", text: "#1d4ed8" },
  "Due Soon":       { dot: "#d97706", bg: "#fef3c7", text: "#92400e" },
  "Overdue":        { dot: "#dc2626", bg: "#fee2e2", text: "#991b1b" },
  "In Shop":        { dot: "#8b5cf6", bg: "#f5f3ff", text: "#6d28d9" },
  "Out of Service": { dot: "#dc2626", bg: "#fee2e2", text: "#991b1b" },
  "Dispatch Hold":  { dot: "#1e293b", bg: "#f1f5f9", text: "#1e293b" },
  "Inactive":       { dot: "#94a3b8", bg: "#f1f5f9", text: "#64748b" },
};

const PRIORITY_STYLE: Record<Priority, { bg: string; text: string }> = {
  Low:      { bg: "#dcfce7", text: "#15803d" },
  Medium:   { bg: "#fef9c3", text: "#92400e" },
  High:     { bg: "#fee2e2", text: "#991b1b" },
  Critical: { bg: "#1e293b", text: "#f8fafc" },
};

// ─── Maintenance document types ──────────────────────────────────────────────

type MaintDoc = {
  id: string;
  unit_id: string;
  work_order_id?: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  expires_at?: string | null;
  created_at: string;
};

const MAINT_DOC_TYPES = ["Registration", "Insurance", "Annual Inspection", "Work Order Invoice", "Repair Receipt", "Photo", "General"];

const DOC_STATUS_STYLE: Record<string, { color: string; label: string }> = {
  expired:  { color: "#dc2626", label: "EXPIRED" },
  expiring: { color: "#d97706", label: "EXPIRING SOON" },
  valid:    { color: "#16a34a", label: "Valid" },
  none:     { color: "#94a3b8", label: "Not Set" },
};

async function openDoc(fileUrl: string, doPrint = false) {
  try {
    const res  = await fetch(`/api/ronyx/view-doc?url=${encodeURIComponent(fileUrl)}`);
    const data = await res.json();
    const url  = data.signed_url || fileUrl;
    if (doPrint) { const w = window.open(url); if (w) w.onload = () => w.print(); }
    else window.open(url, "_blank");
  } catch { window.open(fileUrl, "_blank"); }
}

// ─── Maintenance Doc Section ──────────────────────────────────────────────────

function MaintDocSection({ unitId, unitNumber }: { unitId: string; unitNumber: string }) {
  const [docs,      setDocs]      = useState<MaintDoc[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType,   setDocType]   = useState("General");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/ronyx/maintenance/documents?unit_id=${unitId}`)
      .then(r => r.json())
      .then(d => { setDocs(d.documents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [unitId]);

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file",          file);
    fd.append("unit_id",       unitId);
    fd.append("document_type", docType);
    try {
      const res  = await fetch("/api/ronyx/maintenance/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (data.document) setDocs(prev => [data.document, ...prev]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <p className="mnt-drawer-section-title" style={{ marginTop: 20 }}>Uploaded Documents</p>

      {/* Upload row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <select
          value={docType}
          onChange={e => setDocType(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.78rem", color: "#0f172a", background: "#fff", flex: 1 }}
        >
          {MAINT_DOC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: uploading ? "#94a3b8" : "#1e40af", color: "#fff", padding: "6px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
          {uploading ? "Uploading…" : "📎 Upload"}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
          />
        </label>
      </div>

      {/* Doc list */}
      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: "0.78rem", padding: "8px 0" }}>Loading…</div>
      ) : docs.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: "0.78rem", background: "#f8fafc", borderRadius: 8, padding: "12px 14px", border: "1px dashed #e2e8f0", textAlign: "center" }}>
          No documents uploaded yet — select a type and upload above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map(doc => {
            const expSt = doc.expires_at ? DOC_STATUS_STYLE[docStatus(doc.expires_at)] : null;
            return (
              <div key={doc.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>{doc.document_type}</div>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{doc.file_name}</div>
                  {expSt && doc.expires_at && (
                    <div style={{ fontSize: "0.65rem", color: expSt.color, fontWeight: 700, marginTop: 2 }}>Expires: {fmtDate(doc.expires_at)} · {expSt.label}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => openDoc(doc.file_url)} style={{ fontSize: "0.7rem", fontWeight: 700, color: "#1e40af", background: "#dbeafe", border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer" }}>👁 View</button>
                  <button onClick={() => openDoc(doc.file_url, true)} style={{ fontSize: "0.7rem", fontWeight: 700, color: "#374151", background: "#f3f4f6", border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer" }}>🖨️ Print</button>
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Unit " + unitNumber + " — " + doc.document_type)}&body=${encodeURIComponent("Document: " + doc.document_type + "\nUnit: " + unitNumber + "\nFile: " + doc.file_name + "\n\nLink: " + doc.file_url)}`}
                    style={{ fontSize: "0.7rem", fontWeight: 700, color: "#065f46", background: "#d1fae5", borderRadius: 6, padding: "4px 9px", textDecoration: "none" }}
                  >📧 Email</a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function mapDbStatusToLane(dbStatus: string, dueDate?: string | null): WOStatus {
  if (dbStatus === "Open")          return "Needs Review";
  if (dbStatus === "Scheduled")     return "Scheduled";
  if (dbStatus === "In Progress")   return "In Service";
  if (dbStatus === "Waiting Parts") return "Waiting on Parts";
  if (dbStatus === "Ready Review")  return "Ready for Review";
  if (dbStatus === "Completed")     return "Completed";
  if (dbStatus === "Dispatch Hold") return "Dispatch Hold";
  if (dbStatus === "Archived")      return "Archived";
  // Compute overdue
  if (dueDate && dueDate < today && !["Completed","Archived"].includes(dbStatus)) return "Overdue";
  return "Needs Review";
}

function mapLaneToDbStatus(lane: WOStatus): string {
  const l = LANES.find(x => x.key === lane);
  return l?.dbStatus || "Open";
}

// ─── Work Order Card ──────────────────────────────────────────────────────────

function WorkOrderCard({ wo, onAdvance, onViewUnit, onAddNote, onUpdateStatus }: {
  wo: WorkOrder;
  onAdvance: (wo: WorkOrder) => void;
  onViewUnit: (unitId: string) => void;
  onAddNote: (wo: WorkOrder) => void;
  onUpdateStatus: (wo: WorkOrder, status: WOStatus) => void;
}) {
  const ps = PRIORITY_STYLE[wo.priority];
  const next = NEXT_STATUS[wo.status];
  const nextLabel = NEXT_LABEL[wo.status];

  return (
    <div className={`mnt-wo-card ${wo.status === "Dispatch Hold" ? "hold" : ""}`}>
      <div className="mnt-wo-head">
        <span className="mnt-wo-num">WO #{wo.id.slice(0, 6).toUpperCase()}</span>
        <span className="mnt-wo-priority" style={{ background: ps.bg, color: ps.text }}>{wo.priority}</span>
        {wo.wo_type && <span className="mnt-wo-type">{wo.wo_type}</span>}
      </div>

      <div className="mnt-wo-unit">Unit {wo.unit_number} {wo.unit_number && "·"} {wo.wo_type || "Work Order"}</div>
      <div className="mnt-wo-issue">{wo.issue}</div>

      <div className="mnt-wo-meta">
        <div className="mnt-wo-meta-row"><span>Assigned</span><strong>{wo.vendor || "Internal"}</strong></div>
        <div className="mnt-wo-meta-row"><span>Due</span><strong>{fmtDate(wo.due_date)}</strong></div>
        <div className="mnt-wo-meta-row"><span>Est. Cost</span><strong>{fmtCost(wo.estimated_cost)}</strong></div>
        {wo.actual_cost != null && <div className="mnt-wo-meta-row"><span>Actual</span><strong>{fmtCost(wo.actual_cost)}</strong></div>}
      </div>

      {wo.dispatch_hold && (
        <div className="mnt-wo-block-badge">🚫 Dispatch Hold — Unit blocked until resolved</div>
      )}

      <div className="mnt-wo-actions">
        {next && nextLabel && (
          <button type="button" onClick={() => onAdvance(wo)} className="mnt-wo-btn advance">{nextLabel}</button>
        )}
        <button type="button" onClick={() => onViewUnit(wo.unit_id)} className="mnt-wo-btn ghost">View Unit</button>
        <button type="button" onClick={() => onAddNote(wo)} className="mnt-wo-btn ghost">Note</button>
        <select className="mnt-wo-status-sel" value={wo.status} onChange={e => onUpdateStatus(wo, e.target.value as WOStatus)}>
          {LANES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Fleet Panel ──────────────────────────────────────────────────────────────

function FleetPanel({ units, onViewUnit, onCreateWO }: {
  units: FleetUnit[];
  onViewUnit: (id: string) => void;
  onCreateWO: (unit: FleetUnit) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? units.filter(u => u.unit_number.toLowerCase().includes(search.toLowerCase()) || u.unit_type?.toLowerCase().includes(search.toLowerCase()))
    : units;

  const ready = units.filter(u => u.dispatch_eligible && u.status === "Ready").length;

  return (
    <aside className="mnt-fleet-panel">
      <div className="mnt-fleet-head">
        <strong>Fleet Panel</strong>
        <span className="mnt-fleet-avail">{ready} ready</span>
      </div>
      <div className="mnt-fleet-search-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search unit…" className="mnt-fleet-search" />
      </div>
      <div className="mnt-fleet-list">
        {filtered.map(u => {
          const sc = UNIT_STATUS_STYLE[u.status] || UNIT_STATUS_STYLE["Inactive"];
          const regExpiry = docStatus(u.registration_expires);
          const insExpiry = docStatus(u.insurance_expires);
          const insExpiry2 = docStatus(u.annual_inspection_expires);
          const hasDocIssue = regExpiry === "expired" || insExpiry === "expired" || insExpiry2 === "expired";
          const hasDocWarn  = regExpiry === "expiring" || insExpiry === "expiring" || insExpiry2 === "expiring";
          const mileageUntil = u.next_service_miles && u.odometer ? u.next_service_miles - u.odometer : null;

          return (
            <div key={u.id} className={`mnt-fleet-card ${!u.dispatch_eligible ? "blocked" : ""}`}>
              <div className="mnt-fleet-top">
                <div className="mnt-fleet-dot" style={{ background: sc.dot }} />
                <div className="mnt-fleet-info">
                  <span className="mnt-fleet-num">Unit {u.unit_number}</span>
                  <span className="mnt-fleet-type">{u.unit_type}</span>
                </div>
                <span className="mnt-fleet-status-badge" style={{ background: sc.bg, color: sc.text }}>{u.status}</span>
              </div>

              <div className="mnt-fleet-detail">
                <div><span>Driver</span><span>{u.assigned_driver_name || "None"}</span></div>
                <div><span>Mileage</span><span>{u.odometer?.toLocaleString() || "—"}</span></div>
                {mileageUntil != null && (
                  <div><span>Next Service</span><span style={{ color: mileageUntil < 500 ? "#dc2626" : mileageUntil < 1500 ? "#d97706" : "#16a34a" }}>
                    {mileageUntil > 0 ? `${mileageUntil.toLocaleString()} mi` : "OVERDUE"}
                  </span></div>
                )}
              </div>

              {(hasDocIssue || hasDocWarn) && (
                <div className={`mnt-fleet-doc-warn ${hasDocIssue ? "expired" : "expiring"}`}>
                  {hasDocIssue ? "⚠ Document expired" : "⚠ Document expiring soon"}
                </div>
              )}

              {!u.dispatch_eligible && u.dispatch_block_reason && (
                <div className="mnt-fleet-block-reason">{u.dispatch_block_reason}</div>
              )}

              <div className="mnt-fleet-actions">
                <button type="button" onClick={() => onViewUnit(u.id)} className="mnt-fleet-btn">View</button>
                <button type="button" onClick={() => onCreateWO(u)} className="mnt-fleet-btn primary">Create WO</button>
                {!u.dispatch_eligible && (
                  <a href="/ronyx/dispatch/board" className="mnt-fleet-btn warn">Dispatch</a>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="mnt-empty-panel">No units found</div>}
      </div>
    </aside>
  );
}

// ─── Vehicle Drawer ───────────────────────────────────────────────────────────

function VehicleDrawer({ unit, workOrders, onClose, onBlock, onRestore, onCreateWO }: {
  unit: FleetUnit;
  workOrders: WorkOrder[];
  onClose: () => void;
  onBlock: (unit: FleetUnit) => void;
  onRestore: (unit: FleetUnit) => void;
  onCreateWO: (unit: FleetUnit) => void;
}) {
  const sc = UNIT_STATUS_STYLE[unit.status] || UNIT_STATUS_STYLE["Inactive"];
  const activeWOs = workOrders.filter(wo => wo.unit_id === unit.id && !["Completed","Archived"].includes(wo.status));

  const docs = [
    { label: "Registration",       date: unit.registration_expires,       status: docStatus(unit.registration_expires) },
    { label: "Insurance",          date: unit.insurance_expires,           status: docStatus(unit.insurance_expires) },
    { label: "Annual Inspection",  date: unit.annual_inspection_expires,   status: docStatus(unit.annual_inspection_expires) },
  ];

  const docStatusStyle = DOC_STATUS_STYLE;

  return (
    <div className="mnt-drawer-backdrop" onClick={onClose}>
      <div className="mnt-drawer" onClick={e => e.stopPropagation()}>
        <div className="mnt-drawer-head">
          <div>
            <p className="mnt-drawer-sub">Vehicle Profile</p>
            <h2>Unit {unit.unit_number} — {unit.unit_type}</h2>
            <span className="mnt-fleet-status-badge" style={{ background: sc.bg, color: sc.text }}>{unit.status}</span>
          </div>
          <button type="button" onClick={onClose} className="mnt-btn-ghost mnt-btn-sm">×</button>
        </div>

        <div className="mnt-drawer-grid">
          <div><span>Plate</span><strong>{unit.plate || "—"}</strong></div>
          <div><span>VIN</span><strong>{unit.vin ? unit.vin.slice(-8) : "—"}</strong></div>
          <div><span>Mileage</span><strong>{unit.odometer?.toLocaleString() || "—"}</strong></div>
          <div><span>Current Driver</span><strong>{unit.assigned_driver_name || "None"}</strong></div>
          <div><span>Dispatch Eligible</span><strong style={{ color: unit.dispatch_eligible ? "#16a34a" : "#dc2626" }}>{unit.dispatch_eligible ? "Yes" : "No"}</strong></div>
          {unit.seat_capacity != null && <div><span>Seat Capacity</span><strong>{unit.seat_capacity}</strong></div>}
          {unit.luggage_capacity != null && <div><span>Luggage Capacity</span><strong>{unit.luggage_capacity}</strong></div>}
        </div>

        <p className="mnt-drawer-section-title">Compliance Dates</p>
        <div className="mnt-drawer-docs">
          {docs.map(d => (
            <div key={d.label} className="mnt-drawer-doc-row">
              <span className="mnt-drawer-doc-label">{d.label}</span>
              <span className="mnt-drawer-doc-date">{fmtDate(d.date)}</span>
              <span className="mnt-drawer-doc-status" style={{ color: docStatusStyle[d.status].color }}>{docStatusStyle[d.status].label}</span>
            </div>
          ))}
        </div>

        <MaintDocSection unitId={unit.id} unitNumber={unit.unit_number} />

        {activeWOs.length > 0 && (
          <>
            <p className="mnt-drawer-section-title">Active Work Orders ({activeWOs.length})</p>
            <div className="mnt-drawer-wo-list">
              {activeWOs.map(wo => (
                <div key={wo.id} className="mnt-drawer-wo-row">
                  <span className="mnt-wo-priority" style={{ ...PRIORITY_STYLE[wo.priority] as any, padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>{wo.priority}</span>
                  <span className="mnt-drawer-wo-issue">{wo.issue}</span>
                  <span className="mnt-drawer-wo-status">{wo.status}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {unit.notes && (
          <div className="mnt-drawer-notes">
            <p className="mnt-drawer-section-title">Notes</p>
            <p>{unit.notes}</p>
          </div>
        )}

        <div className="mnt-drawer-footer">
          <button type="button" onClick={() => onCreateWO(unit)} className="mnt-btn-primary">Create Work Order</button>
          {unit.dispatch_eligible
            ? <button type="button" onClick={() => onBlock(unit)} className="mnt-btn-danger">Block Dispatch</button>
            : <button type="button" onClick={() => onRestore(unit)} className="mnt-btn-ghost">Restore Dispatch</button>
          }
          <button type="button" onClick={onClose} className="mnt-btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Work Order Modal ──────────────────────────────────────────────────

function CreateWOModal({ units, preSelectedUnit, onClose, onSaved }: {
  units: FleetUnit[];
  preSelectedUnit?: FleetUnit | null;
  onClose: () => void;
  onSaved: (wo: WorkOrder) => void;
}) {
  const [unitId,   setUnitId]   = useState(preSelectedUnit?.id || "");
  const [woType,   setWoType]   = useState<WOType>("Repair");
  const [priority, setPriority] = useState<Priority>("High");
  const [issue,    setIssue]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [assignTo, setAssignTo] = useState<AssignedTo>("Internal");
  const [vendor,   setVendor]   = useState("");
  const [cost,     setCost]     = useState("");
  const [dueDate,  setDueDate]  = useState("");
  const [hold,     setHold]     = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    if (!unitId || !issue.trim()) { setError("Select a unit and enter an issue."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/ronyx/maintenance/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit_id: unitId,
        issue:   issue.trim(),
        wo_type: woType,
        description: desc.trim() || null,
        priority,
        status:  hold ? "Dispatch Hold" : "Open",
        due_date: dueDate || null,
        vendor:   assignTo === "Vendor" ? vendor.trim() || null : null,
        estimated_cost: cost ? parseFloat(cost) : null,
        dispatch_hold: hold,
        notes: desc.trim() || null,
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || "Failed to create work order"); return; }

    // If dispatch hold, update the unit
    if (hold) {
      await fetch(`/api/ronyx/maintenance/units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch_eligible: false, status: "Dispatch Hold", dispatch_block_reason: issue.trim() }),
      });
    }

    onSaved(d.work_order);
    onClose();
  }

  return (
    <div className="mnt-modal-backdrop" onClick={onClose}>
      <div className="mnt-modal" onClick={e => e.stopPropagation()}>
        <p className="mnt-modal-sub">Create Work Order</p>
        <h2>New Maintenance Request</h2>

        {error && <div className="mnt-error">{error}</div>}

        <div className="mnt-form-grid">
          <div className="mnt-form-row full">
            <label className="mnt-form-label">Vehicle Unit *</label>
            <select value={unitId} onChange={e => setUnitId(e.target.value)} className="mnt-form-select">
              <option value="">Select unit…</option>
              {units.map(u => <option key={u.id} value={u.id}>Unit {u.unit_number} — {u.unit_type}</option>)}
            </select>
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Type</label>
            <select value={woType} onChange={e => setWoType(e.target.value as WOType)} className="mnt-form-select">
              {(["Preventive","Repair","Damage","Safety"] as WOType[]).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="mnt-form-select">
              {(["Low","Medium","High","Critical"] as Priority[]).map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="mnt-form-row full">
            <label className="mnt-form-label">Issue *</label>
            <input value={issue} onChange={e => setIssue(e.target.value)} className="mnt-form-input" placeholder="e.g. Brake warning light" />
          </div>
          <div className="mnt-form-row full">
            <label className="mnt-form-label">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="mnt-form-textarea" rows={3} placeholder="Details about the issue…" />
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Assigned To</label>
            <select value={assignTo} onChange={e => setAssignTo(e.target.value as AssignedTo)} className="mnt-form-select">
              <option value="Internal">Internal</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>
          {assignTo === "Vendor" && (
            <div className="mnt-form-row">
              <label className="mnt-form-label">Vendor Name</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)} className="mnt-form-input" placeholder="e.g. Miguel's Auto" />
            </div>
          )}
          <div className="mnt-form-row">
            <label className="mnt-form-label">Estimated Cost</label>
            <input value={cost} onChange={e => setCost(e.target.value)} className="mnt-form-input" type="number" min="0" step="0.01" placeholder="$0.00" />
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Due Date</label>
            <input value={dueDate} onChange={e => setDueDate(e.target.value)} className="mnt-form-input" type="date" />
          </div>
          <div className="mnt-form-row full">
            <label className="mnt-dispatch-hold-label">
              <input type="checkbox" checked={hold} onChange={e => setHold(e.target.checked)} />
              <span>Place on Dispatch Hold — vehicle cannot be assigned to trips until resolved</span>
            </label>
          </div>
        </div>

        {hold && (
          <div className="mnt-hold-warning">
            ⚠ Enabling Dispatch Hold will immediately block this vehicle from all dispatch assignments.
          </div>
        )}

        <div className="mnt-modal-footer">
          <button type="button" onClick={onClose} className="mnt-btn-ghost">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="mnt-btn-primary">{saving ? "Creating…" : "Create Work Order"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Dispatch Block Modal ─────────────────────────────────────────────────────

function DispatchBlockModal({ unit, onClose, onRestore }: {
  unit: FleetUnit;
  onClose: () => void;
  onRestore: () => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function restoreDispatch() {
    setSaving(true);
    await fetch(`/api/ronyx/maintenance/units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispatch_eligible: true, status: "Ready", dispatch_block_reason: null }),
    });
    setSaving(false);
    onRestore();
    onClose();
  }

  return (
    <div className="mnt-modal-backdrop" onClick={onClose}>
      <div className="mnt-modal" onClick={e => e.stopPropagation()}>
        <div className="mnt-block-icon">🚫</div>
        <p className="mnt-modal-sub">Vehicle Dispatch Blocked</p>
        <h2>Unit {unit.unit_number}</h2>
        <p className="mnt-block-detail">This vehicle cannot be assigned to trips.</p>

        <div className="mnt-block-info">
          <div><span>Status</span><strong style={{ color: "#dc2626" }}>{unit.status}</strong></div>
          <div><span>Reason</span><strong>{unit.dispatch_block_reason || "Maintenance hold"}</strong></div>
          <div><span>Dispatch Eligible</span><strong style={{ color: "#dc2626" }}>No</strong></div>
        </div>

        <div className="mnt-block-instruction">
          Required Action: Complete all open critical work orders and have a manager approve before restoring dispatch eligibility.
        </div>

        <div className="mnt-form-group">
          <label className="mnt-form-label">Manager Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} className="mnt-form-textarea" rows={2} placeholder="Add note about restoration…" />
        </div>

        <div className="mnt-modal-footer">
          <button type="button" onClick={onClose} className="mnt-btn-ghost">Close</button>
          <a href="/ronyx/maintenance" className="mnt-btn-ghost">View Work Orders</a>
          <button type="button" onClick={restoreDispatch} disabled={saving} className="mnt-btn-primary">{saving ? "Restoring…" : "Restore Dispatch"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ wo, onClose, onSaved }: { wo: WorkOrder; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!note.trim()) return; setSaving(true);
    await fetch(`/api/ronyx/maintenance/work-orders/${wo.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: note }),
    });
    await fetch("/api/ronyx/maintenance/activity", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: wo.unit_id, action: "note_added", new_value: note }),
    });
    setSaving(false); onSaved(); onClose();
  }
  return (
    <div className="mnt-modal-backdrop" onClick={onClose}>
      <div className="mnt-modal" onClick={e => e.stopPropagation()}>
        <p className="mnt-modal-sub">Add Note — Unit {wo.unit_number}</p>
        <h2>{wo.issue}</h2>
        <div className="mnt-form-group">
          <label className="mnt-form-label">Note *</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} className="mnt-form-textarea" rows={4} autoFocus placeholder="Enter note…" />
        </div>
        <div className="mnt-modal-footer">
          <button type="button" onClick={onClose} className="mnt-btn-ghost">Cancel</button>
          <button type="button" onClick={submit} disabled={!note.trim() || saving} className="mnt-btn-primary">{saving ? "Saving…" : "Save Note"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PM Schedule Section ──────────────────────────────────────────────────────

function PMSchedule({ units }: { units: FleetUnit[] }) {
  const rows = units.map(u => {
    const mileageUntil = u.next_service_miles && u.odometer ? u.next_service_miles - u.odometer : null;
    const status = !mileageUntil ? "Unknown"
      : mileageUntil < 0    ? "Overdue"
      : mileageUntil < 500  ? "Critical"
      : mileageUntil < 1500 ? "Due Soon"
      : "OK";
    return { unit: u, mileageUntil, status };
  });

  const statusStyle: Record<string, { bg: string; text: string }> = {
    OK:       { bg: "#dcfce7", text: "#15803d" },
    "Due Soon": { bg: "#fef3c7", text: "#92400e" },
    Critical: { bg: "#fee2e2", text: "#991b1b" },
    Overdue:  { bg: "#1e293b", text: "#f8fafc" },
    Unknown:  { bg: "#f1f5f9", text: "#64748b" },
  };

  return (
    <div className="mnt-section">
      <h3 className="mnt-section-title">Preventive Maintenance Schedule</h3>
      <table className="mnt-table">
        <thead><tr><th>Unit</th><th>Type</th><th>Last Service</th><th>Current Mileage</th><th>Next Due Miles</th><th>Mileage Left</th><th>Next Service Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(({ unit: u, mileageUntil, status }) => {
            const ss = statusStyle[status];
            return (
              <tr key={u.id}>
                <td className="mnt-table-unit">Unit {u.unit_number}</td>
                <td>{u.unit_type}</td>
                <td>{fmtDate(u.last_service_date)}</td>
                <td>{u.odometer?.toLocaleString() || "—"}</td>
                <td>{u.next_service_miles?.toLocaleString() || "—"}</td>
                <td>
                  {mileageUntil != null
                    ? <span style={{ color: mileageUntil < 0 ? "#dc2626" : mileageUntil < 1500 ? "#d97706" : "#16a34a", fontWeight: 700 }}>
                        {mileageUntil > 0 ? `${mileageUntil.toLocaleString()} mi` : `${Math.abs(mileageUntil).toLocaleString()} mi overdue`}
                      </span>
                    : "—"
                  }
                </td>
                <td>{fmtDate(u.next_service_date)}</td>
                <td><span style={{ background: ss.bg, color: ss.text, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{status}</span></td>
                <td className="mnt-table-actions">
                  <button type="button" className="mnt-table-btn">Schedule</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Damage Reports Section ───────────────────────────────────────────────────

function DamageReports({ workOrders }: { workOrders: WorkOrder[] }) {
  const damages = workOrders.filter(wo => wo.wo_type === "Damage");
  const statusStyle: Record<string, string> = {
    "Needs Review": "#d97706", "Scheduled": "#3b82f6", "In Service": "#f59e0b",
    "Ready for Review": "#06b6d4", "Completed": "#16a34a", "Archived": "#94a3b8",
  };
  return (
    <div className="mnt-section">
      <h3 className="mnt-section-title">Damage Reports</h3>
      {damages.length === 0
        ? <p className="mnt-empty-state">No damage reports on file</p>
        : (
          <table className="mnt-table">
            <thead><tr><th>Unit</th><th>Damage Type</th><th>Issue</th><th>Opened</th><th>Est. Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {damages.map(wo => (
                <tr key={wo.id}>
                  <td className="mnt-table-unit">Unit {wo.unit_number}</td>
                  <td>Damage</td>
                  <td>{wo.issue}</td>
                  <td>{fmtDate(wo.opened_date)}</td>
                  <td>{fmtCost(wo.estimated_cost)}</td>
                  <td><span style={{ color: statusStyle[wo.status] || "#64748b", fontWeight: 700, fontSize: 11 }}>{wo.status}</span></td>
                  <td className="mnt-table-actions">
                    <button type="button" className="mnt-table-btn">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  );
}

// ─── Cost Summary ─────────────────────────────────────────────────────────────

function CostSummary({ workOrders }: { workOrders: WorkOrder[] }) {
  const openCost      = workOrders.filter(wo => !["Completed","Archived"].includes(wo.status)).reduce((s, wo) => s + (wo.estimated_cost || 0), 0);
  const completedCost = workOrders.filter(wo => wo.status === "Completed").reduce((s, wo) => s + (wo.actual_cost || wo.estimated_cost || 0), 0);
  const repairCost    = workOrders.filter(wo => wo.wo_type === "Repair").reduce((s, wo) => s + (wo.estimated_cost || 0), 0);
  const preventiveCost = workOrders.filter(wo => wo.wo_type === "Preventive").reduce((s, wo) => s + (wo.estimated_cost || 0), 0);
  const damageCost    = workOrders.filter(wo => wo.wo_type === "Damage").reduce((s, wo) => s + (wo.estimated_cost || 0), 0);
  const safetyCost    = workOrders.filter(wo => wo.wo_type === "Safety").reduce((s, wo) => s + (wo.estimated_cost || 0), 0);
  const highestUnit   = (() => {
    const byUnit: Record<string, number> = {};
    for (const wo of workOrders) byUnit[wo.unit_number] = (byUnit[wo.unit_number] || 0) + (wo.estimated_cost || 0);
    const sorted = Object.entries(byUnit).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { unit: sorted[0][0], cost: sorted[0][1] } : null;
  })();

  return (
    <div className="mnt-section">
      <h3 className="mnt-section-title">Maintenance Cost Summary</h3>
      <div className="mnt-cost-grid">
        <div className="mnt-cost-card primary"><span>Open Estimates</span><strong>{fmtCost(openCost)}</strong></div>
        <div className="mnt-cost-card green"><span>Completed (Actual)</span><strong>{fmtCost(completedCost)}</strong></div>
        {highestUnit && <div className="mnt-cost-card warn"><span>Highest Cost Unit</span><strong>Unit {highestUnit.unit} — {fmtCost(highestUnit.cost)}</strong></div>}
        <div className="mnt-cost-card neutral"><span>Total Work Orders</span><strong>{workOrders.length}</strong></div>
      </div>
      <div className="mnt-cost-breakdown">
        <p className="mnt-section-subtitle">Cost by Type</p>
        {[["Repairs", repairCost], ["Preventive Maintenance", preventiveCost], ["Damage", damageCost], ["Safety", safetyCost]].map(([label, cost]) => (
          <div key={label as string} className="mnt-cost-row">
            <span>{label as string}</span>
            <div className="mnt-cost-bar-wrap"><div className="mnt-cost-bar" style={{ width: openCost > 0 ? `${Math.min(100, ((cost as number) / openCost) * 100)}%` : "0%" }} /></div>
            <strong>{fmtCost(cost as number)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Strip ─────────────────────────────────────────────────────────────

type MntAlert = { type: string; severity: "blocked" | "critical" | "high" | "warning"; message: string; unit_id?: string; wo_id?: string };

function computeAlerts(units: FleetUnit[], workOrders: WorkOrder[]): MntAlert[] {
  const alerts: MntAlert[] = [];
  const now = new Date().toISOString().slice(0, 10);

  for (const u of units) {
    if (!u.dispatch_eligible || u.status === "Out of Service" || u.status === "Dispatch Hold") {
      alerts.push({ type: "dispatch_hold", severity: "blocked", message: `Unit ${u.unit_number} — ${u.dispatch_block_reason || "dispatch blocked"}`, unit_id: u.id });
    }
    if (u.annual_inspection_expires && u.annual_inspection_expires < now) {
      alerts.push({ type: "inspection_expired", severity: "critical", message: `Unit ${u.unit_number} — annual inspection expired ${fmtDate(u.annual_inspection_expires)}`, unit_id: u.id });
    }
    if (u.registration_expires && u.registration_expires < now) {
      alerts.push({ type: "registration_expired", severity: "critical", message: `Unit ${u.unit_number} — registration expired ${fmtDate(u.registration_expires)}`, unit_id: u.id });
    }
    if (u.insurance_expires && u.insurance_expires < now) {
      alerts.push({ type: "insurance_expired", severity: "critical", message: `Unit ${u.unit_number} — insurance expired ${fmtDate(u.insurance_expires)}`, unit_id: u.id });
    }
    if (u.annual_inspection_expires && u.annual_inspection_expires >= now && u.annual_inspection_expires <= warn30) {
      alerts.push({ type: "inspection_expiring", severity: "high", message: `Unit ${u.unit_number} — inspection expires ${fmtDate(u.annual_inspection_expires)}`, unit_id: u.id });
    }
    // Overdue PM
    const milesLeft = u.next_service_miles && u.odometer ? u.next_service_miles - u.odometer : null;
    if (milesLeft != null && milesLeft < 0) {
      alerts.push({ type: "pm_overdue", severity: "high", message: `Unit ${u.unit_number} — oil change overdue by ${Math.abs(milesLeft).toLocaleString()} miles`, unit_id: u.id });
    } else if (milesLeft != null && milesLeft < 500) {
      alerts.push({ type: "pm_due_soon", severity: "warning", message: `Unit ${u.unit_number} — service due in ${milesLeft.toLocaleString()} miles`, unit_id: u.id });
    }
  }

  for (const wo of workOrders) {
    if (wo.priority === "Critical" && !["Completed","Archived"].includes(wo.status)) {
      alerts.push({ type: "open_critical_wo", severity: "critical", message: `Unit ${wo.unit_number} — critical WO: ${wo.issue}`, unit_id: wo.unit_id, wo_id: wo.id });
    }
    if (wo.due_date && wo.due_date < now && !["Completed","Archived"].includes(wo.status)) {
      alerts.push({ type: "wo_overdue", severity: "high", message: `Unit ${wo.unit_number} — work order overdue: ${wo.issue}`, unit_id: wo.unit_id, wo_id: wo.id });
    }
  }

  return alerts.sort((a, b) => {
    const order = { blocked: 0, critical: 1, high: 2, warning: 3 };
    return order[a.severity] - order[b.severity];
  });
}

function MaintenanceAlertStrip({ alerts, onViewUnit }: { alerts: MntAlert[]; onViewUnit: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  if (alerts.length === 0) return null;
  const counts = { blocked: 0, critical: 0, high: 0, warning: 0 };
  for (const a of alerts) counts[a.severity]++;
  const sevClass: Record<string, string> = { blocked: "sev-blocked", critical: "sev-critical", high: "sev-high", warning: "sev-warning" };
  const sevLabel: Record<string, string> = { blocked: "BLOCKED", critical: "CRITICAL", high: "HIGH", warning: "WARN" };

  return (
    <div className="mnt-alert-strip">
      <div className="mnt-alert-header" onClick={() => setCollapsed(c => !c)}>
        <div className="mnt-alert-header-left">
          <span className="mnt-alert-title">⚠ MAINTENANCE ALERTS</span>
          <span className="mnt-alert-total">{alerts.length} TOTAL</span>
          {counts.blocked  > 0 && <span className="mnt-alert-pill black">BLOCKED: {counts.blocked}</span>}
          {counts.critical > 0 && <span className="mnt-alert-pill red">CRITICAL: {counts.critical}</span>}
          {counts.high     > 0 && <span className="mnt-alert-pill orange">HIGH: {counts.high}</span>}
          {counts.warning  > 0 && <span className="mnt-alert-pill amber">WARN: {counts.warning}</span>}
        </div>
        <span>{collapsed ? "Show ▼" : "Hide ▲"}</span>
      </div>
      {!collapsed && (
        <div className="mnt-alert-rows">
          {alerts.map((a, i) => (
            <div key={i} className={`mnt-alert-row ${sevClass[a.severity]}`}>
              <span className="mnt-alert-badge">{sevLabel[a.severity]}</span>
              <span className="mnt-alert-msg">{a.message}</span>
              <div className="mnt-alert-row-actions">
                {a.unit_id && <button type="button" onClick={() => onViewUnit(a.unit_id!)} className="mnt-alert-action-btn">View Unit</button>}
                {(a.severity === "blocked" || a.severity === "critical") && (
                  <button type="button" onClick={() => window.location.href = "/ronyx/dispatch/board"} className="mnt-alert-action-btn">Dispatch</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = "board" | "fleet" | "workorders" | "pm" | "damage" | "costs" | "audit";

export default function MaintenancePage() {
  const { blocked: moduleBlocked, loading: moduleLoading } = useModuleAccess("maintenance");
  const [units,      setUnits]      = useState<FleetUnit[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activity,   setActivity]   = useState<ActivityLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState("");
  const [tab,        setTab]        = useState<TabKey>("board");
  const [draggedId,  setDraggedId]  = useState<string | null>(null);

  const [drawerUnit,  setDrawerUnit]  = useState<FleetUnit | null>(null);
  const [blockUnit,   setBlockUnit]   = useState<FleetUnit | null>(null);
  const [createWOFor, setCreateWOFor] = useState<FleetUnit | null | "new">(null);
  const [noteWO,      setNoteWO]      = useState<WorkOrder | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const loadAll = useCallback(async () => {
    const [ur, wr, ar] = await Promise.all([
      fetch("/api/ronyx/maintenance/units"),
      fetch("/api/ronyx/maintenance/work-orders"),
      fetch("/api/ronyx/maintenance/activity"),
    ]);
    const [ud, wd, ad] = await Promise.all([ur.json(), wr.json(), ar.json()]);

    const rawUnits: FleetUnit[] = (ud.units || []).map((u: any) => ({
      id:                     u.id,
      unit_number:            u.unit_number || u.unitNumber || "",
      unit_type:              u.unit_type   || u.type        || "Vehicle",
      vin:                    u.vin,
      plate:                  u.plate,
      assigned_driver_name:   u.assigned_driver_name || null,
      odometer:               u.odometer || u.current_mileage || 0,
      current_mileage:        u.current_mileage || u.odometer || 0,
      last_service_date:      u.last_service_date   || u.lastServiceDate,
      next_service_date:      u.next_service_date   || u.nextServiceDate,
      next_service_miles:     u.next_service_miles  || u.nextServiceMiles || 0,
      registration_expires:   u.registration_expires   || u.registrationExpires,
      insurance_expires:      u.insurance_expires      || u.insuranceExpires,
      annual_inspection_expires: u.annual_inspection_expires || u.annualInspectionExpires,
      status:                 (u.status as UnitStatus) || "Ready",
      dispatch_eligible:      u.dispatch_eligible ?? u.dispatchEligible ?? true,
      seat_capacity:          u.seat_capacity,
      luggage_capacity:       u.luggage_capacity,
      dispatch_block_reason:  u.dispatch_block_reason,
      notes:                  u.notes,
    }));

    const rawWOs: WorkOrder[] = (wd.work_orders || []).map((wo: any) => {
      const mappedStatus = mapDbStatusToLane(wo.status || "Open", wo.due_date);
      return {
        id:           wo.id,
        unit_id:      wo.unit_id,
        unit_number:  wo.unit_number || wo.maintenance_units?.unit_number || "",
        issue:        wo.issue || "",
        wo_type:      (wo.wo_type as WOType) || null,
        description:  wo.description || wo.notes,
        priority:     (wo.priority as Priority) || "Medium",
        status:       mappedStatus,
        opened_date:  wo.opened_date || wo.created_at?.slice(0, 10) || "",
        due_date:     wo.due_date,
        vendor:       wo.vendor,
        estimated_cost: wo.estimated_cost,
        actual_cost:    wo.actual_cost,
        dispatch_hold:  wo.dispatch_hold || false,
        notes:          wo.notes,
      };
    });

    setUnits(rawUnits);
    setWorkOrders(rawWOs);
    setActivity(ad.logs || ad.activity || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function advanceWO(wo: WorkOrder) {
    const next = NEXT_STATUS[wo.status];
    if (!next) return;
    const dbStatus = mapLaneToDbStatus(next);
    setWorkOrders(prev => prev.map(w => w.id === wo.id ? { ...w, status: next } : w));
    await fetch(`/api/ronyx/maintenance/work-orders/${wo.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: dbStatus }),
    });
    showToast(`WO moved to ${next}`);
  }

  async function moveWO(woId: string, newStatus: WOStatus) {
    const dbStatus = mapLaneToDbStatus(newStatus);
    setWorkOrders(prev => prev.map(w => w.id === woId ? { ...w, status: newStatus } : w));
    await fetch(`/api/ronyx/maintenance/work-orders/${woId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: dbStatus }),
    });
  }

  const alerts = useMemo(() => computeAlerts(units, workOrders), [units, workOrders]);

  const kpi = {
    total:        units.length,
    ready:        units.filter(u => u.dispatch_eligible && u.status === "Ready").length,
    down:         units.filter(u => ["Out of Service","In Shop"].includes(u.status)).length,
    hold:         units.filter(u => !u.dispatch_eligible).length,
    dueSoon:      units.filter(u => {
      const miles = u.next_service_miles && u.odometer ? u.next_service_miles - u.odometer : null;
      return miles != null && miles >= 0 && miles < 1500;
    }).length,
    overduepm:    units.filter(u => {
      const miles = u.next_service_miles && u.odometer ? u.next_service_miles - u.odometer : null;
      return miles != null && miles < 0;
    }).length,
    openRepairs:  workOrders.filter(w => !["Completed","Archived"].includes(w.status)).length,
    damage:       workOrders.filter(w => w.wo_type === "Damage").length,
  };

  if (moduleLoading) return null;
  if (moduleBlocked) return <ModuleUpgradeCard moduleSlug="maintenance" />;

  return (
    <div className="mnt-root">
      {toast && <div className="mnt-toast">{toast}</div>}

      {/* ── Header ── */}
      <div className="mnt-page-header">
        <div>
          <h1 className="mnt-page-title">RONYX MAINTENANCE CONTROL</h1>
          <p className="mnt-page-subtitle">Vehicle readiness, repairs, inspections, downtime, and dispatch holds · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <div className="mnt-header-actions">
          <button type="button" onClick={loadAll} className="mnt-btn-ghost mnt-btn-sm">Refresh</button>
          <a href="/ronyx/dispatch/board" className="mnt-btn-ghost mnt-btn-sm">Dispatch Board</a>
          <button type="button" onClick={() => setCreateWOFor("new")} className="mnt-btn-primary mnt-btn-sm">+ New Work Order</button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="mnt-kpi-grid">
        {[
          { label: "Fleet Units",    value: kpi.total,      dot: "#3b82f6", bg: "#eff6ff" },
          { label: "Ready Units",    value: kpi.ready,      dot: kpi.ready > 0 ? "#16a34a" : "#dc2626", bg: kpi.ready > 0 ? "#f0fdf4" : "#fee2e2" },
          { label: "Units Down",     value: kpi.down,       dot: kpi.down      > 0 ? "#dc2626" : "#16a34a", bg: kpi.down      > 0 ? "#fee2e2" : "#f0fdf4" },
          { label: "Dispatch Hold",  value: kpi.hold,       dot: kpi.hold      > 0 ? "#1e293b" : "#16a34a", bg: kpi.hold      > 0 ? "#f1f5f9" : "#f0fdf4" },
          { label: "Due Soon",       value: kpi.dueSoon,    dot: kpi.dueSoon   > 0 ? "#d97706" : "#16a34a", bg: kpi.dueSoon   > 0 ? "#fef3c7" : "#f0fdf4" },
          { label: "Overdue PM",     value: kpi.overduepm,  dot: kpi.overduepm > 0 ? "#dc2626" : "#16a34a", bg: kpi.overduepm > 0 ? "#fee2e2" : "#f0fdf4" },
          { label: "Open Repairs",   value: kpi.openRepairs, dot: kpi.openRepairs > 0 ? "#ea580c" : "#16a34a", bg: kpi.openRepairs > 0 ? "#fff7ed" : "#f0fdf4" },
          { label: "Damage Claims",  value: kpi.damage,     dot: kpi.damage    > 0 ? "#dc2626" : "#16a34a", bg: kpi.damage    > 0 ? "#fee2e2" : "#f0fdf4" },
        ].map(k => (
          <div key={k.label} className="mnt-kpi" style={{ background: k.bg }}>
            <div className="mnt-kpi-dot" style={{ background: k.dot }} />
            <div>
              <span className="mnt-kpi-label">{k.label}</span>
              <strong className="mnt-kpi-value" style={{ color: k.dot }}>{k.value}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alert Strip ── */}
      <MaintenanceAlertStrip alerts={alerts} onViewUnit={(id) => { const u = units.find(x => x.id === id); if (u) setDrawerUnit(u); }} />

      {/* ── Tabs ── */}
      <div className="mnt-tabs">
        {([
          { key: "board",      label: "Board",         count: kpi.openRepairs },
          { key: "fleet",      label: "Fleet Units",   count: 0 },
          { key: "workorders", label: "Work Orders",   count: kpi.openRepairs },
          { key: "pm",         label: "PM Schedule",   count: kpi.overduepm },
          { key: "damage",     label: "Damage Reports", count: kpi.damage },
          { key: "costs",      label: "Costs",         count: 0 },
          { key: "audit",      label: "Audit Log",     count: 0 },
        ] as const).map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`mnt-tab ${tab === t.key ? "active" : ""}`}>
            {t.label}{t.count > 0 && <span className="mnt-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Board Tab ── */}
      {tab === "board" && (
        <div className="mnt-board-layout">
          <div className="mnt-board-wrap">
            {loading ? <div className="mnt-loading">Loading work orders…</div> : (
              <div className="mnt-board">
                {LANES.map(lane => {
                  const laneWOs = workOrders.filter(wo => wo.status === lane.key);
                  return (
                    <div key={lane.key} className="mnt-lane"
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => { if (draggedId) { moveWO(draggedId, lane.key); setDraggedId(null); } }}>
                      <div className="mnt-lane-header" style={{ borderColor: lane.color, background: lane.bg }}>
                        <span className="mnt-lane-label" style={{ color: lane.color }}>{lane.label}</span>
                        <span className="mnt-lane-count" style={{ background: lane.color }}>{laneWOs.length}</span>
                      </div>
                      <div className="mnt-lane-cards">
                        {laneWOs.length === 0
                          ? <div className="mnt-lane-empty">Drop here</div>
                          : laneWOs.map(wo => (
                              <div key={wo.id} draggable onDragStart={() => setDraggedId(wo.id)}>
                                <WorkOrderCard
                                  wo={wo}
                                  onAdvance={advanceWO}
                                  onViewUnit={(unitId) => { const u = units.find(x => x.id === unitId); if (u) setDrawerUnit(u); }}
                                  onAddNote={setNoteWO}
                                  onUpdateStatus={(w, s) => moveWO(w.id, s)}
                                />
                              </div>
                            ))
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <FleetPanel units={units} onViewUnit={(id) => { const u = units.find(x => x.id === id); if (u) setDrawerUnit(u); }} onCreateWO={setCreateWOFor} />
        </div>
      )}

      {/* ── Fleet Tab ── */}
      {tab === "fleet" && (
        <div className="mnt-fleet-grid">
          {units.map(u => {
            const sc = UNIT_STATUS_STYLE[u.status] || UNIT_STATUS_STYLE["Inactive"];
            return (
              <div key={u.id} className={`mnt-fleet-full-card ${!u.dispatch_eligible ? "blocked" : ""}`}>
                <div className="mnt-fleet-full-head">
                  <div className="mnt-fleet-dot" style={{ background: sc.dot }} />
                  <div>
                    <strong>Unit {u.unit_number}</strong>
                    <span>{u.unit_type}</span>
                  </div>
                  <span className="mnt-fleet-status-badge" style={{ background: sc.bg, color: sc.text }}>{u.status}</span>
                </div>
                <div className="mnt-fleet-full-detail">
                  <div><span>Plate</span><strong>{u.plate || "—"}</strong></div>
                  <div><span>Mileage</span><strong>{u.odometer?.toLocaleString() || "—"}</strong></div>
                  <div><span>Dispatch</span><strong style={{ color: u.dispatch_eligible ? "#16a34a" : "#dc2626" }}>{u.dispatch_eligible ? "Eligible" : "BLOCKED"}</strong></div>
                  <div><span>Registration</span><strong style={{ color: docStatus(u.registration_expires) === "expired" ? "#dc2626" : docStatus(u.registration_expires) === "expiring" ? "#d97706" : "#64748b" }}>{fmtDate(u.registration_expires)}</strong></div>
                  <div><span>Insurance</span><strong style={{ color: docStatus(u.insurance_expires) === "expired" ? "#dc2626" : docStatus(u.insurance_expires) === "expiring" ? "#d97706" : "#64748b" }}>{fmtDate(u.insurance_expires)}</strong></div>
                  <div><span>Inspection</span><strong style={{ color: docStatus(u.annual_inspection_expires) === "expired" ? "#dc2626" : docStatus(u.annual_inspection_expires) === "expiring" ? "#d97706" : "#64748b" }}>{fmtDate(u.annual_inspection_expires)}</strong></div>
                </div>
                <div className="mnt-fleet-full-actions">
                  <button type="button" onClick={() => setDrawerUnit(u)} className="mnt-fleet-btn">View Details</button>
                  <button type="button" onClick={() => setCreateWOFor(u)} className="mnt-fleet-btn primary">Create WO</button>
                  {!u.dispatch_eligible
                    ? <button type="button" onClick={() => setBlockUnit(u)} className="mnt-fleet-btn warn">View Block</button>
                    : <button type="button" onClick={() => setBlockUnit(u)} className="mnt-fleet-btn">Block Dispatch</button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Work Orders Tab ── */}
      {tab === "workorders" && (
        <div className="mnt-section">
          <div className="mnt-section-header">
            <h3 className="mnt-section-title">All Work Orders</h3>
            <button type="button" onClick={() => setCreateWOFor("new")} className="mnt-btn-primary mnt-btn-sm">+ New WO</button>
          </div>
          <table className="mnt-table">
            <thead><tr><th>WO #</th><th>Unit</th><th>Type</th><th>Issue</th><th>Priority</th><th>Status</th><th>Due</th><th>Est. Cost</th><th>Assigned</th><th>Actions</th></tr></thead>
            <tbody>
              {workOrders.map(wo => {
                const ps = PRIORITY_STYLE[wo.priority];
                return (
                  <tr key={wo.id}>
                    <td className="mnt-table-unit">{wo.id.slice(0, 6).toUpperCase()}</td>
                    <td>Unit {wo.unit_number}</td>
                    <td>{wo.wo_type || "—"}</td>
                    <td>{wo.issue}</td>
                    <td><span style={{ background: ps.bg, color: ps.text, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{wo.priority}</span></td>
                    <td><span style={{ fontSize: 11, fontWeight: 700, color: LANES.find(l => l.key === wo.status)?.color || "#64748b" }}>{wo.status}</span></td>
                    <td>{fmtDate(wo.due_date)}</td>
                    <td>{fmtCost(wo.estimated_cost)}</td>
                    <td>{wo.vendor || "Internal"}</td>
                    <td className="mnt-table-actions">
                      <button type="button" onClick={() => setNoteWO(wo)} className="mnt-table-btn">Note</button>
                      {NEXT_STATUS[wo.status] && (
                        <button type="button" onClick={() => advanceWO(wo)} className="mnt-table-btn primary">Advance</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PM Schedule Tab ── */}
      {tab === "pm" && <PMSchedule units={units} />}

      {/* ── Damage Reports Tab ── */}
      {tab === "damage" && <DamageReports workOrders={workOrders} />}

      {/* ── Costs Tab ── */}
      {tab === "costs" && <CostSummary workOrders={workOrders} />}

      {/* ── Audit Log Tab ── */}
      {tab === "audit" && (
        <div className="mnt-section">
          <h3 className="mnt-section-title">Maintenance Audit Log</h3>
          {activity.length === 0 ? <p className="mnt-empty-state">No activity recorded yet</p> : (
            <table className="mnt-table">
              <thead><tr><th>Unit</th><th>Action</th><th>From</th><th>To</th><th>By</th><th>When</th></tr></thead>
              <tbody>
                {activity.map((a, i) => (
                  <tr key={i}>
                    <td>Unit {a.unit_number}</td>
                    <td>{a.action}</td>
                    <td>{a.old_value || "—"}</td>
                    <td>{a.new_value || "—"}</td>
                    <td>{a.changed_by || "System"}</td>
                    <td>{new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Modals / Drawers ── */}
      {drawerUnit && (
        <VehicleDrawer
          unit={drawerUnit}
          workOrders={workOrders}
          onClose={() => setDrawerUnit(null)}
          onBlock={(u) => { setDrawerUnit(null); setBlockUnit(u); }}
          onRestore={async (u) => {
            await fetch(`/api/ronyx/maintenance/units/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dispatch_eligible: true, status: "Ready", dispatch_block_reason: null }) });
            setDrawerUnit(null); loadAll(); showToast(`Unit ${u.unit_number} dispatch restored`);
          }}
          onCreateWO={(u) => { setDrawerUnit(null); setCreateWOFor(u); }}
        />
      )}

      {blockUnit && (
        <DispatchBlockModal
          unit={blockUnit}
          onClose={() => setBlockUnit(null)}
          onRestore={() => { setBlockUnit(null); loadAll(); showToast("Dispatch eligibility restored"); }}
        />
      )}

      {createWOFor && (
        <CreateWOModal
          units={units}
          preSelectedUnit={createWOFor !== "new" ? createWOFor : null}
          onClose={() => setCreateWOFor(null)}
          onSaved={() => { loadAll(); showToast("Work order created"); }}
        />
      )}

      {noteWO && (
        <NoteModal
          wo={noteWO}
          onClose={() => setNoteWO(null)}
          onSaved={() => { loadAll(); showToast("Note saved"); }}
        />
      )}
    </div>
  );
}
