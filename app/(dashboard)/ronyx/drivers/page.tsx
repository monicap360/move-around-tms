"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────── */
type DriverStatus = "Active" | "Available" | "Assigned" | "Inactive" | "Suspended";
type DocumentStatus = "Good" | "Expiring" | "Expired" | "Missing";

type Driver = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  truck: string;
  trailer: string;
  status: DriverStatus;
  driverType: "W2" | "1099" | "Owner Operator";
  cdl: string;
  cdlState: string;
  cdlExp: string;
  mvrExp: string;
  medicalExp: string;
  docs: DocumentStatus;
  rating: number;
  safetyScore: number;
  onTime: number;
  lastLoad: string;
  revenueWeek: string;
  drugTestStatus?: string;
  backgroundCheckStatus?: string;
};

type ComplianceAlert = {
  title: string;
  driver: string;
  driverId: string;
  detail: string;
  level: "critical" | "warning";
};

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function computeDocStatus(fields: { cdlExp: string; mvrExp: string; medicalExp: string }): DocumentStatus {
  const days = [fields.cdlExp, fields.mvrExp, fields.medicalExp].map(daysUntil);
  if (days.some((d) => d === null)) return "Missing";
  if (days.some((d) => d !== null && d < 0)) return "Expired";
  if (days.some((d) => d !== null && d <= 30)) return "Expiring";
  return "Good";
}

function normalizeStatus(raw: string): DriverStatus {
  const s = (raw || "").toLowerCase();
  if (s === "suspended") return "Suspended";
  if (s === "inactive")  return "Inactive";
  if (s === "assigned")  return "Assigned";
  if (s === "available") return "Available";
  return "Active";
}

function normalizeDrType(raw: string): "W2" | "1099" | "Owner Operator" {
  const s = (raw || "").toLowerCase();
  if (s === "1099") return "1099";
  if (s.includes("owner")) return "Owner Operator";
  return "W2";
}

function mapApiDriver(d: any): Driver {
  const cdlExp     = fmtDate(d.license_expiration_date);
  const mvrExp     = fmtDate(d.mvr_expiration);
  const medicalExp = fmtDate(d.medical_card_expiration);
  return {
    id:          d.id,
    name:        d.full_name || d.name || "Unknown",
    role:        d.position_role || "Driver",
    phone:       d.phone || "—",
    email:       d.email || "—",
    location:    d.address ? d.address.split(",").slice(-2).join(",").trim() : "—",
    truck:       d.assigned_truck_number || "—",
    trailer:     "—",
    status:      normalizeStatus(d.status),
    driverType:  normalizeDrType(d.driver_type),
    cdl:         d.license_number || "—",
    cdlState:    d.license_state  || "—",
    cdlExp,
    mvrExp,
    medicalExp,
    docs:        computeDocStatus({ cdlExp: d.license_expiration_date, mvrExp: d.mvr_expiration, medicalExp: d.medical_card_expiration }),
    rating:      Number(d.rating) || 0,
    safetyScore: 100,
    onTime:      100,
    lastLoad:    "—",
    revenueWeek: "—",
  };
}

function buildAlerts(drivers: Driver[]): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  for (const d of drivers) {
    if (d.docs === "Expired") {
      alerts.push({ title: "Expired Documents", driver: d.name, driverId: d.id, detail: "One or more compliance docs are expired", level: "critical" });
    } else if (d.docs === "Expiring") {
      alerts.push({ title: "Documents Expiring Soon", driver: d.name, driverId: d.id, detail: "Docs expire within 30 days — action required", level: "warning" });
    } else if (d.docs === "Missing") {
      alerts.push({ title: "Missing Documents", driver: d.name, driverId: d.id, detail: "CDL, MVR, or medical card date not on file", level: "warning" });
    }
  }
  return alerts.slice(0, 6);
}

function exportDriversCSV(drivers: Driver[]) {
  const headers = ["Name", "Role", "Phone", "Email", "Status", "Type", "Truck", "CDL #", "CDL Exp", "MVR Exp", "Medical Exp", "Docs"];
  const rows = drivers.map((d) => [
    d.name, d.role, d.phone, d.email, d.status, d.driverType,
    d.truck, d.cdl, d.cdlExp, d.mvrExp, d.medicalExp, d.docs,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ronyx-drivers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── StatusBadge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: DriverStatus | DocumentStatus }) {
  const cls =
    status === "Available" || status === "Good" || status === "Active"
      ? "premium-badge green"
      : status === "Assigned"
      ? "premium-badge blue"
      : status === "Expiring"
      ? "premium-badge amber"
      : "premium-badge red";
  return <span className={cls}>{status}</span>;
}

/* ─── Toast ─────────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: "#0f172a", color: "#fff", padding: "13px 22px",
      borderRadius: 14, fontWeight: 700, fontSize: 14,
      boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
      animation: "fadeInUp 0.2s ease",
    }}>
      {msg}
    </div>
  );
}

/* ─── Assign modal ──────────────────────────────────────── */
function AssignModal({
  drivers,
  preselected,
  onClose,
  onSaved,
  showToast,
}: {
  drivers: Driver[];
  preselected: Driver | null;
  onClose: () => void;
  onSaved: (driverId: string, truck: string) => void;
  showToast: (msg: string) => void;
}) {
  const [driverId, setDriverId] = useState(preselected?.id ?? "");
  const [truck, setTruck]       = useState(preselected?.truck !== "—" ? preselected?.truck ?? "" : "");
  const [saving, setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) { showToast("Select a driver."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_truck_number: truck || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(driverId, truck);
      showToast(`Truck ${truck || "(cleared)"} assigned.`);
      onClose();
    } catch {
      showToast("Failed to assign truck. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 420, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Assign Truck</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Link a truck unit number to a driver's profile.</p>
        <form onSubmit={submit}>
          <label style={lbl}>Driver</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={inp} disabled={!!preselected}>
            <option value="">Select driver…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <label style={{ ...lbl, marginTop: 14 }}>Truck Unit #</label>
          <input value={truck} onChange={(e) => setTruck(e.target.value)} style={inp} placeholder="Unit 214" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, background: saving ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Assign"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Upload doc modal ──────────────────────────────────── */
const DOC_TYPES = ["MVR", "Medical Card", "CDL", "Drug Test", "Background Check", "Insurance Certificate"];

function UploadDocModal({
  drivers,
  preselectedDriver,
  preselectedDocType,
  onClose,
  showToast,
}: {
  drivers: Driver[];
  preselectedDriver?: Driver;
  preselectedDocType?: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [driverId, setDriverId] = useState(preselectedDriver?.id ?? "");
  const [docType, setDocType]   = useState(preselectedDocType ?? "");
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) { showToast("Select a driver."); return; }
    if (!docType)  { showToast("Select a document type."); return; }
    if (!file)     { showToast("Choose a file to upload."); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("driverId", driverId);
      form.append("doc_type", docType);
      form.append("file", file);
      const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      showToast(`${docType} uploaded successfully.`);
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 460, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Upload Document</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Attach a compliance document to a driver's record.</p>
        <form onSubmit={submit}>
          <label style={lbl}>Driver</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={inp} disabled={!!preselectedDriver}>
            <option value="">Select driver…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <label style={{ ...lbl, marginTop: 14 }}>Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inp} disabled={!!preselectedDocType}>
            <option value="">Select type…</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label style={{ ...lbl, marginTop: 14 }}>File</label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: "18px", textAlign: "center", cursor: "pointer", background: "#f8fafc", marginBottom: 4 }}
          >
            {file ? (
              <span style={{ fontWeight: 700, color: "#1e40af", fontSize: 13 }}>📄 {file.name}</span>
            ) : (
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Click to select PDF, JPG, or PNG</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={uploading} style={{ flex: 1, background: uploading ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: uploading ? "not-allowed" : "pointer" }}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.88rem", outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };

/* ─── Main page ─────────────────────────────────────────── */
export default function DriversPage() {
  const router = useRouter();
  const [allDrivers, setAllDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("All Statuses");
  const [docFilter, setDoc]           = useState("All Docs");
  const [toast, setToast]             = useState("");
  const [assignTarget, setAssignTarget] = useState<{ driver: Driver | null } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ driver?: Driver; docType?: string } | null>(null);

  function showToast(msg: string) { setToast(msg); }

  useEffect(() => {
    fetch("/api/ronyx/drivers/list")
      .then((r) => r.json())
      .then((data) => setAllDrivers((data.drivers || []).map(mapApiDriver)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleAssignSaved(driverId: string, truck: string) {
    setAllDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, truck: truck || "—" } : d));
  }

  const filteredDrivers = useMemo(() => allDrivers.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.phone.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) || d.truck.toLowerCase().includes(q) || d.cdl.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All Statuses" || d.status === statusFilter;
    const matchDoc = docFilter === "All Docs" || d.docs === docFilter ||
      (docFilter === "Needs Attention" && ["Expiring", "Expired", "Missing"].includes(d.docs));
    return matchSearch && matchStatus && matchDoc;
  }), [allDrivers, search, statusFilter, docFilter]);

  const complianceAlerts = useMemo(() => buildAlerts(allDrivers), [allDrivers]);
  const activeDrivers    = allDrivers.filter((d) => d.status !== "Inactive").length;
  const availableDrivers = allDrivers.filter((d) => d.status === "Available").length;
  const assignedDrivers  = allDrivers.filter((d) => d.status === "Assigned").length;
  const documentIssues   = allDrivers.filter((d) => ["Expiring", "Expired", "Missing"].includes(d.docs)).length;
  const topDriver        = useMemo(() => [...allDrivers].sort((a, b) => b.rating - a.rating)[0] ?? null, [allDrivers]);

  return (
    <main className="premium-page">
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* ── Hero ── */}
      <section className="premium-hero">
        <div>
          <p className="premium-eyebrow">Fleet Command / Drivers</p>
          <h1>Driver Management</h1>
          <p>
            Manage driver profiles, compliance, MVRs, CDL records, medical cards,
            assignments, ratings, documents, and weekly performance from one command center.
          </p>
        </div>
        <div className="premium-hero-actions">
          <button
            className="premium-button ghost"
            onClick={() => {
              if (allDrivers.length === 0) { showToast("No drivers to export yet."); return; }
              exportDriversCSV(filteredDrivers.length > 0 ? filteredDrivers : allDrivers);
              showToast(`Exported ${filteredDrivers.length || allDrivers.length} drivers as CSV.`);
            }}
          >
            Export Drivers
          </button>
          <button
            className="premium-button dark"
            onClick={() => setUploadTarget({})}
          >
            Upload Documents
          </button>
          <Link href="/ronyx/drivers/new" className="premium-button primary">
            + Add Driver
          </Link>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="premium-kpi-grid">
        <div className="premium-kpi"><span>Total Drivers</span><strong>{loading ? "…" : allDrivers.length}</strong><p>In Ronyx system</p></div>
        <div className="premium-kpi"><span>Active Drivers</span><strong>{loading ? "…" : activeDrivers}</strong><p>Ready or currently assigned</p></div>
        <div className="premium-kpi success"><span>Available Now</span><strong>{loading ? "…" : availableDrivers}</strong><p>Ready for dispatch</p></div>
        <div className="premium-kpi blue"><span>Assigned</span><strong>{loading ? "…" : assignedDrivers}</strong><p>Currently on load</p></div>
        <div className="premium-kpi danger"><span>Compliance Issues</span><strong>{loading ? "…" : documentIssues}</strong><p>Expired or expiring docs</p></div>
      </section>

      <section className="premium-layout">
        <div className="premium-main-column">

          {/* ── Compliance alerts ── */}
          {complianceAlerts.length > 0 && (
            <div className="premium-panel">
              <div className="premium-panel-header">
                <div>
                  <p className="premium-eyebrow">Compliance Watch</p>
                  <h2>Expiring MVRs &amp; Documents</h2>
                  <span>Priority alerts for safety, HR, and dispatch visibility.</span>
                </div>
                <Link href="/ronyx/hr-compliance" className="premium-button ghost" style={{ textDecoration: "none" }}>
                  Review All
                </Link>
              </div>
              <div className="premium-alert-grid">
                {complianceAlerts.map((alert, i) => (
                  <div key={i} className={alert.level === "critical" ? "premium-alert critical" : "premium-alert warning"}>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.driver}</p>
                      <span>{alert.detail}</span>
                    </div>
                    <Link href={`/ronyx/drivers/${alert.driverId}?tab=documents`} style={{ textDecoration: "none" }}>
                      <button>Open</button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Driver directory ── */}
          <div className="premium-panel">
            <div className="premium-panel-header">
              <div>
                <p className="premium-eyebrow">Driver Directory</p>
                <h2>All Drivers</h2>
                <span>Search, filter, assign, suspend, and manage driver records.</span>
              </div>
            </div>

            <div className="premium-filter-bar">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, CDL, email, or truck..." />
              <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
                <option>All Statuses</option>
                <option>Active</option>
                <option>Available</option>
                <option>Assigned</option>
                <option>Inactive</option>
                <option>Suspended</option>
              </select>
              <select value={docFilter} onChange={(e) => setDoc(e.target.value)}>
                <option>All Docs</option>
                <option>Good</option>
                <option>Expiring</option>
                <option>Expired</option>
                <option>Missing</option>
                <option>Needs Attention</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading drivers…</div>
            ) : filteredDrivers.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                {allDrivers.length === 0
                  ? <>No drivers yet. <Link href="/ronyx/drivers/new" style={{ color: "#1e40af" }}>Add your first driver →</Link></>
                  : "No drivers match your filters."}
              </div>
            ) : (
              <div className="premium-driver-list">
                {filteredDrivers.map((driver) => (
                  <article className="premium-driver-card" key={driver.id}>
                    <div className="driver-identity">
                      <div className="driver-avatar">
                        {driver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3>{driver.name}</h3>
                        <p>{driver.role}</p>
                        <span>{driver.location}</span>
                      </div>
                    </div>

                    <div className="driver-data-grid">
                      <div><span>Phone</span><strong>{driver.phone}</strong></div>
                      <div><span>Type</span><strong>{driver.driverType}</strong></div>
                      <div><span>Truck</span><strong>{driver.truck}</strong></div>
                      <div><span>Trailer</span><strong>{driver.trailer}</strong></div>
                      <div><span>CDL</span><strong>{driver.cdl}</strong></div>
                      <div>
                        <span>MVR Exp.</span>
                        <strong className={driver.mvrExp === "Expired" ? "danger-text" : ""}>{driver.mvrExp}</strong>
                      </div>
                      <div>
                        <span>Medical</span>
                        <strong className={driver.medicalExp === "Expired" ? "danger-text" : ""}>{driver.medicalExp}</strong>
                      </div>
                      <div><span>Revenue Week</span><strong>{driver.revenueWeek}</strong></div>
                    </div>

                    <div className="driver-score-strip">
                      <div><span>Rating</span><strong>{driver.rating > 0 ? `★ ${driver.rating}` : "—"}</strong></div>
                      <div><span>Safety</span><strong>{driver.safetyScore}%</strong></div>
                      <div><span>On-Time</span><strong>{driver.onTime}%</strong></div>
                      <div><span>Last Load</span><strong>{driver.lastLoad}</strong></div>
                    </div>

                    <div className="driver-card-footer">
                      <div className="badge-row">
                        <StatusBadge status={driver.status} />
                        <StatusBadge status={driver.docs} />
                      </div>
                      <div className="driver-actions">
                        <Link href={`/ronyx/drivers/${driver.id}`}>
                          <button>Profile</button>
                        </Link>
                        <Link href={`/ronyx/drivers/${driver.id}?tab=documents`}>
                          <button>Documents</button>
                        </Link>
                        <button onClick={() => setAssignTarget({ driver })}>Assign</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="premium-side-column">
          <div className="premium-panel">
            <p className="premium-eyebrow">Quick Actions</p>
            <h2>Driver Tools</h2>
            <div className="quick-action-list">
              <Link href="/ronyx/drivers/new" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Add New Driver</button>
              </Link>
              <button onClick={() => showToast("Login invite — coming soon.")}>
                Send Login Invite
              </button>
              <button onClick={() => setUploadTarget({ docType: "CDL" })}>
                Upload CDL
              </button>
              <button onClick={() => setUploadTarget({ docType: "MVR" })}>
                Upload MVR
              </button>
              <button onClick={() => setUploadTarget({ docType: "Medical Card" })}>
                Upload Medical Card
              </button>
              <button onClick={() => setAssignTarget({ driver: null })}>
                Assign Truck
              </button>
              <button onClick={() => showToast("Driver resume export — coming soon.")}>
                Create Driver Resume
              </button>
              <Link href="/ronyx/payroll" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Open Payroll Summary</button>
              </Link>
            </div>
          </div>

          <div className="premium-panel dark-panel">
            <p className="premium-eyebrow">AI Dispatch Insight</p>
            <h2>Recommended Actions</h2>
            <p>
              {documentIssues > 0
                ? `${documentIssues} driver${documentIssues > 1 ? "s have" : " has"} compliance docs that need attention before next dispatch.`
                : "All driver compliance docs are current. Fleet is ready for dispatch."}
            </p>
            <Link href="/ronyx/hr-compliance" style={{ textDecoration: "none" }}>
              <button className="premium-button primary full">Run Compliance Review</button>
            </Link>
          </div>

          {topDriver && (
            <div className="premium-panel">
              <p className="premium-eyebrow">Driver Performance</p>
              <h2>Top Driver</h2>
              <Link href={`/ronyx/drivers/${topDriver.id}`} style={{ textDecoration: "none" }}>
                <div className="top-driver-box" style={{ cursor: "pointer" }}>
                  <div className="driver-avatar large">
                    {topDriver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <h3>{topDriver.name}</h3>
                  <p>{topDriver.rating > 0 ? `★ ${topDriver.rating} rating` : "No rating yet"} · {topDriver.truck}</p>
                  <StatusBadge status={topDriver.docs} />
                </div>
              </Link>
            </div>
          )}
        </aside>
      </section>

      {/* ── Modals ── */}
      {assignTarget !== null && (
        <AssignModal
          drivers={allDrivers}
          preselected={assignTarget.driver}
          onClose={() => setAssignTarget(null)}
          onSaved={handleAssignSaved}
          showToast={showToast}
        />
      )}

      {uploadTarget !== null && (
        <UploadDocModal
          drivers={allDrivers}
          preselectedDriver={uploadTarget.driver}
          preselectedDocType={uploadTarget.docType}
          onClose={() => setUploadTarget(null)}
          showToast={showToast}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </main>
  );
}
