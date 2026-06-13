"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { can, driverSeesAll, UserRole, ROLE_LABELS } from "@/lib/driverPermissions";

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  driver_type: string;
  license_number: string;
  license_state: string;
  license_expiration_date: string;
  mvr_expiration: string;
  medical_card_expiration: string;
  assigned_truck_number: string;
  status: string;
  rating: number;
  last_ticket_date: string;
  hire_date: string;
  background_check_status: string;
  drug_test_status: string;
  photo_url: string;
  // profile extras
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  position_role: string;
  pay_rate: string;
  supervisor_name: string;
  orientation_completed: boolean;
  hazmat_training: boolean;
  driver_scorecard: string;
};

type DriverDocument = {
  id: string;
  doc_type: string;
  status: string;
  expires_on: string | null;
  uploaded_at: string | null;
  file_url: string | null;
};

const EMPTY_DRIVER: Partial<Driver> = {
  full_name: "",
  phone: "",
  email: "",
  driver_type: "W2",
  license_number: "",
  license_state: "",
  license_expiration_date: "",
  mvr_expiration: "",
  medical_card_expiration: "",
  assigned_truck_number: "",
  status: "active",
  position_role: "company driver",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  pay_rate: "",
  supervisor_name: "",
  orientation_completed: false,
  hazmat_training: false,
};

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  available: "#10b981",
  assigned: "#3b82f6",
  "off duty": "#f59e0b",
  suspended: "#ef4444",
  inactive: "#6b7280",
};

const DOC_TYPES = [
  "CDL",
  "Medical Card",
  "MVR",
  "Insurance",
  "Drug Test",
  "Background Check",
  "W9",
  "W4",
  "Direct Deposit Form",
  "Driver Agreement",
  "Safety Form",
  "Other",
];

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function docStatusBadge(days: number | null) {
  if (days === null) return { label: "Missing", color: "#6b7280" };
  if (days <= 0) return { label: "Expired", color: "#ef4444" };
  if (days <= 14) return { label: "Expiring Soon", color: "#f59e0b" };
  return { label: "Valid", color: "#10b981" };
}

export default function RonyxDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDocs, setFilterDocs] = useState("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [profileTab, setProfileTab] = useState<"info" | "docs" | "history">("info");
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<Partial<Driver>>(EMPTY_DRIVER);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [docUpload, setDocUpload] = useState({ doc_type: "CDL", expires_on: "" });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [userRole, setUserRole] = useState<UserRole>("super_admin");

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/drivers/list", { cache: "no-store" });
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (driverId: string) => {
    try {
      const res = await fetch(`/api/ronyx/drivers/documents?driverId=${driverId}`, { cache: "no-store" });
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    if (selectedDriver) {
      void loadDocuments(selectedDriver.id);
    }
  }, [selectedDriver, loadDocuments]);

  const expiringDrivers = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    return drivers.filter((d) => {
      const fields = [d.mvr_expiration, d.medical_card_expiration, d.license_expiration_date];
      return fields.some((f) => {
        if (!f) return false;
        const dt = new Date(f);
        return dt <= cutoff;
      });
    });
  }, [drivers]);

  const filtered = useMemo(() => {
    if (!driverSeesAll(userRole)) return [];
    return drivers.filter((d) => {
      if (search && !d.full_name?.toLowerCase().includes(search.toLowerCase()) &&
        !d.email?.toLowerCase().includes(search.toLowerCase()) &&
        !d.assigned_truck_number?.includes(search)) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (filterType !== "all" && d.driver_type !== filterType) return false;
      if (filterDocs === "expiring") {
        const days = Math.min(
          ...[d.mvr_expiration, d.medical_card_expiration, d.license_expiration_date]
            .map((f) => daysUntil(f) ?? 9999),
        );
        if (days > 14) return false;
      } else if (filterDocs === "missing") {
        const hasMissing = !d.license_number || !d.mvr_expiration || !d.medical_card_expiration;
        if (!hasMissing) return false;
      }
      return true;
    });
  }, [drivers, search, filterStatus, filterType, filterDocs, userRole]);

  async function saveDriver() {
    setSaving(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/ronyx/drivers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error("Save failed");
      setShowAddForm(false);
      setAddForm(EMPTY_DRIVER);
      setStatusMsg("Driver added.");
      void loadDrivers();
    } catch {
      setStatusMsg("Failed to add driver.");
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(""), 3000);
    }
  }

  async function updateDriver(field: keyof Driver, value: string | boolean) {
    if (!selectedDriver) return;
    const updated = { ...selectedDriver, [field]: value };
    setSelectedDriver(updated as Driver);
    try {
      await fetch(`/api/ronyx/drivers/profile?driverId=${selectedDriver.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setDrivers((prev) => prev.map((d) => d.id === selectedDriver.id ? updated as Driver : d));
    } catch {
      setStatusMsg("Save failed.");
    }
  }

  async function uploadDoc() {
    if (!selectedDriver) return;
    try {
      let res: Response;
      if (docFile) {
        const fd = new FormData();
        fd.append("file",       docFile);
        fd.append("driver_id",  selectedDriver.id);
        fd.append("doc_type",   docUpload.doc_type);
        fd.append("expires_on", docUpload.expires_on || "");
        res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/ronyx/drivers/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driver_id: selectedDriver.id,
            doc_type:  docUpload.doc_type,
            status:    "pending",
            expires_on: docUpload.expires_on || null,
          }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        setDocuments((prev) => [data.document, ...prev]);
        setDocFile(null);
        setStatusMsg("Document saved.");
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(err.error || "Upload failed.");
      }
    } catch {
      setStatusMsg("Upload failed.");
    }
  }

  async function attachDocFile(docType: string, file: File) {
    if (!selectedDriver) return;
    const fd = new FormData();
    fd.append("file",      file);
    fd.append("driver_id", selectedDriver.id);
    fd.append("doc_type",  docType);
    try {
      const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        setDocuments((prev) => [data.document, ...prev.filter((d) => d.doc_type !== docType)]);
        setStatusMsg(`${docType} attached.`);
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(err.error || "Upload failed.");
      }
    } catch {
      setStatusMsg("Upload failed.");
    }
  }

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, rgba(37,99,235,0.12), transparent 55%), #e2eaf6",
    color: "#0f172a",
    padding: 32,
    fontFamily: "'Poppins', sans-serif",
  };

  const card: React.CSSProperties = {
    background: "#f8fafc",
    border: "1px solid rgba(30,64,175,0.18)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
    marginBottom: 20,
  };

  const input: React.CSSProperties = {
    background: "#fff",
    border: "1px solid rgba(30,64,175,0.2)",
    borderRadius: 10,
    padding: "9px 12px",
    color: "#0f172a",
    fontSize: "0.875rem",
    width: "100%",
    boxSizing: "border-box",
  };

  const btn = (color = "#1d4ed8"): React.CSSProperties => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const badge = (color: string): React.CSSProperties => ({
    display: "inline-block",
    background: color + "22",
    color,
    border: `1px solid ${color}44`,
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  });

  const label: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "rgba(15,23,42,0.6)",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div style={shell}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: "0.75rem", color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Ronyx TMS</p>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: 4 }}>Driver Management</h1>
            <p style={{ color: "rgba(15,23,42,0.6)", marginTop: 4, fontSize: "0.9rem" }}>
              Compliance, payroll, documents, and assignments for all drivers.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {statusMsg && <span style={{ fontSize: "0.8rem", color: "#10b981" }}>{statusMsg}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid rgba(30,64,175,0.2)", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600 }}>Demo role:</span>
              <select
                style={{ border: "none", fontSize: "0.8rem", fontWeight: 700, color: "#1d4ed8", background: "transparent", cursor: "pointer" }}
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
              >
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {can(userRole, "add_driver") && (
              <button style={btn()} onClick={() => setShowAddForm(true)}>+ Add Driver</button>
            )}
            {can(userRole, "export_drivers") && (
              <button style={btn("#6b7280")} onClick={() => setStatusMsg("Exported (demo)")}>Export</button>
            )}
          </div>
        </div>

        {/* Expiring Documents Alert */}
        {expiringDrivers.length > 0 && (
          <div style={{ ...card, borderLeft: "4px solid #f59e0b", background: "#fffbeb" }}>
            <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 10 }}>
              ⚠️ Expiring MVRs / Documents — Next 7 Days ({expiringDrivers.length} driver{expiringDrivers.length > 1 ? "s" : ""})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {expiringDrivers.map((d) => {
                const mvrDays = daysUntil(d.mvr_expiration);
                const medDays = daysUntil(d.medical_card_expiration);
                const cdlDays = daysUntil(d.license_expiration_date);
                return (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, minWidth: 160 }}>{d.full_name || "Unknown"}</span>
                    {mvrDays !== null && mvrDays <= 7 && (
                      <span style={badge(mvrDays <= 0 ? "#ef4444" : "#f59e0b")}>
                        MVR {mvrDays <= 0 ? "EXPIRED" : `expires in ${mvrDays}d`}
                      </span>
                    )}
                    {medDays !== null && medDays <= 7 && (
                      <span style={badge(medDays <= 0 ? "#ef4444" : "#f59e0b")}>
                        Medical {medDays <= 0 ? "EXPIRED" : `expires in ${medDays}d`}
                      </span>
                    )}
                    {cdlDays !== null && cdlDays <= 7 && (
                      <span style={badge(cdlDays <= 0 ? "#ef4444" : "#f59e0b")}>
                        CDL {cdlDays <= 0 ? "EXPIRED" : `expires in ${cdlDays}d`}
                      </span>
                    )}
                    <button style={{ ...btn("#1d4ed8"), fontSize: "0.75rem", padding: "4px 10px" }} onClick={() => setSelectedDriver(d)}>
                      View Profile
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ ...card, padding: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={{ ...input, maxWidth: 260 }}
              placeholder="Search name, email, truck..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select style={{ ...input, width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="off duty">Off Duty</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
            <select style={{ ...input, width: "auto" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="W2">W2</option>
              <option value="1099">1099</option>
              <option value="Owner Operator">Owner Operator</option>
            </select>
            <select style={{ ...input, width: "auto" }} value={filterDocs} onChange={(e) => setFilterDocs(e.target.value)}>
              <option value="all">All Documents</option>
              <option value="expiring">Expiring Docs</option>
              <option value="missing">Missing Docs</option>
            </select>
          </div>
        </div>

        {/* Driver Table */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 12 }}>
            All Drivers ({filtered.length})
          </div>
          {!driverSeesAll(userRole) ? (
            <p style={{ color: "rgba(15,23,42,0.5)", textAlign: "center", padding: 32 }}>
              Drivers can only view their own profile. In production, your record would appear here.
            </p>
          ) : loading ? (
            <p style={{ color: "rgba(15,23,42,0.5)", textAlign: "center", padding: 32 }}>Loading drivers…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: "rgba(15,23,42,0.5)", textAlign: "center", padding: 32 }}>
              No drivers found. Add one above.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid rgba(30,64,175,0.15)" }}>
                    {["Driver", "Phone", "Type", "CDL #", "CDL Exp", "MVR Exp", "Medical Exp", "Truck", "Status", "Rating", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "10px 8px", color: "#1d4ed8", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const mvrDays = daysUntil(d.mvr_expiration);
                    const medDays = daysUntil(d.medical_card_expiration);
                    const cdlDays = daysUntil(d.license_expiration_date);
                    const statusColor = STATUS_COLORS[d.status?.toLowerCase() || "active"] || "#6b7280";
                    return (
                      <tr key={d.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.07)" }}>
                        <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                          {d.full_name || "—"}
                          {d.email && <div style={{ color: "rgba(15,23,42,0.5)", fontWeight: 400, fontSize: "0.75rem" }}>{d.email}</div>}
                        </td>
                        <td style={{ padding: "10px 8px", color: "rgba(15,23,42,0.7)" }}>{d.phone || "—"}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={badge("#1d4ed8")}>{d.driver_type || "W2"}</span>
                        </td>
                        <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>{d.license_number || "—"}</td>
                        <td style={{ padding: "10px 8px" }}>
                          {d.license_expiration_date ? (
                            <span style={{ color: cdlDays !== null && cdlDays <= 30 ? "#ef4444" : "inherit" }}>
                              {d.license_expiration_date}
                            </span>
                          ) : "—"}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {d.mvr_expiration ? (
                            <span style={badge(mvrDays !== null && mvrDays <= 14 ? (mvrDays <= 0 ? "#ef4444" : "#f59e0b") : "#10b981")}>
                              {d.mvr_expiration}
                            </span>
                          ) : <span style={badge("#6b7280")}>Missing</span>}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {d.medical_card_expiration ? (
                            <span style={badge(medDays !== null && medDays <= 14 ? (medDays <= 0 ? "#ef4444" : "#f59e0b") : "#10b981")}>
                              {d.medical_card_expiration}
                            </span>
                          ) : <span style={badge("#6b7280")}>Missing</span>}
                        </td>
                        <td style={{ padding: "10px 8px" }}>{d.assigned_truck_number || "—"}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <span style={badge(statusColor)}>{d.status || "active"}</span>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          {"⭐".repeat(Math.min(Math.round(d.rating || 0), 5)) || "—"}
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            <button style={{ ...btn(), fontSize: "0.72rem", padding: "4px 8px" }} onClick={() => { setSelectedDriver(d); setProfileTab("info"); }}>
                              View
                            </button>
                            <button style={{ ...btn("#6b7280"), fontSize: "0.72rem", padding: "4px 8px" }} onClick={() => { setSelectedDriver(d); setProfileTab("docs"); }}>
                              Docs
                            </button>
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

        {/* Add Driver Modal */}
        {showAddForm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
            <div style={{ background: "#f8fafc", borderRadius: 20, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, fontSize: "1.2rem" }}>Add Driver</h2>
                <button style={{ ...btn("#ef4444"), padding: "6px 14px" }} onClick={() => setShowAddForm(false)}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  ["Full Name", "full_name", "text"],
                  ["Phone", "phone", "tel"],
                  ["Email", "email", "email"],
                  ["Address", "address", "text"],
                  ["CDL Number", "license_number", "text"],
                  ["CDL State", "license_state", "text"],
                  ["CDL Expiration", "license_expiration_date", "date"],
                  ["MVR Expiration", "mvr_expiration", "date"],
                  ["Medical Card Exp", "medical_card_expiration", "date"],
                  ["Truck #", "assigned_truck_number", "text"],
                  ["Hire Date", "hire_date", "date"],
                  ["Supervisor", "supervisor_name", "text"],
                  ["Emergency Contact", "emergency_contact_name", "text"],
                  ["Emergency Phone", "emergency_contact_phone", "tel"],
                ].map(([l, k, t]) => (
                  <div key={k}>
                    <span style={label}>{l}</span>
                    <input
                      style={input}
                      type={t}
                      value={(addForm as any)[k] || ""}
                      onChange={(e) => setAddForm({ ...addForm, [k]: e.target.value })}
                    />
                  </div>
                ))}
                <div>
                  <span style={label}>Driver Type</span>
                  <select style={input} value={addForm.driver_type || "W2"} onChange={(e) => setAddForm({ ...addForm, driver_type: e.target.value })}>
                    <option value="W2">W2</option>
                    <option value="1099">1099</option>
                    <option value="Owner Operator">Owner Operator</option>
                  </select>
                </div>
                <div>
                  <span style={label}>Status</span>
                  <select style={input} value={addForm.status || "active"} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="available">Available</option>
                    <option value="off duty">Off Duty</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
                <button style={btn("#6b7280")} onClick={() => setShowAddForm(false)}>Cancel</button>
                <button style={btn()} onClick={saveDriver} disabled={saving}>
                  {saving ? "Saving…" : "Save Driver"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Driver Profile Drawer */}
        {selectedDriver && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", justifyContent: "flex-end", zIndex: 100 }}>
            <div style={{ background: "#f8fafc", width: "100%", maxWidth: 640, overflowY: "auto", padding: 28, boxShadow: "-8px 0 40px rgba(0,0,0,0.2)" }}>
              {/* Drawer Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#1d4ed8", fontWeight: 700, textTransform: "uppercase" }}>Driver Profile</div>
                  <h2 style={{ fontWeight: 800, fontSize: "1.4rem", marginTop: 2 }}>{selectedDriver.full_name || "Unknown Driver"}</h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={badge(STATUS_COLORS[selectedDriver.status?.toLowerCase() || "active"] || "#6b7280")}>
                      {selectedDriver.status || "active"}
                    </span>
                    <span style={badge("#1d4ed8")}>{selectedDriver.driver_type || "W2"}</span>
                    {selectedDriver.assigned_truck_number && (
                      <span style={badge("#6b7280")}>Truck #{selectedDriver.assigned_truck_number}</span>
                    )}
                  </div>
                </div>
                <button style={{ ...btn("#ef4444"), padding: "6px 14px" }} onClick={() => setSelectedDriver(null)}>✕ Close</button>
              </div>

              {/* Quick Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {([
                  ["Mark Available",    "#10b981", "edit_driver"],
                  ["Mark Off Duty",     "#f59e0b", "edit_driver"],
                  ["Suspend",           "#ef4444", "suspend_driver"],
                  ["Send Login Invite", "#1d4ed8", "send_login_invite"],
                  ["View Pay Summary",  "#6b7280", "view_pay_summary"],
                  ["Assign Load",       "#0ea5e9", "assign_load"],
                ] as [string, string, string][])
                  .filter(([, , action]) => can(userRole, action))
                  .map(([lbl, color]) => (
                    <button key={lbl} style={{ ...btn(color), fontSize: "0.75rem", padding: "5px 12px" }}
                      onClick={() => setStatusMsg(`${lbl} (demo)`)}>
                      {lbl}
                    </button>
                  ))}
              </div>

              {statusMsg && <div style={{ color: "#10b981", fontSize: "0.85rem", marginBottom: 12 }}>{statusMsg}</div>}

              {/* Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {(["info", "docs", "history"] as const).map((t) => (
                  <button key={t} onClick={() => setProfileTab(t)} style={{
                    padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(30,64,175,0.2)",
                    background: profileTab === t ? "#1d4ed8" : "rgba(29,78,216,0.06)",
                    color: profileTab === t ? "#fff" : "#0f172a",
                    fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                  }}>{t === "info" ? "Info & Compliance" : t === "docs" ? "Documents" : "History"}</button>
                ))}
              </div>

              {/* Tab: Info */}
              {profileTab === "info" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* Contact */}
                  <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.85rem", color: "#1d4ed8", marginTop: 4 }}>Contact</div>
                  {([
                    ["Phone", "phone"],
                    ["Email", "email"],
                    ["Address", "address"],
                    ["Emergency Contact", "emergency_contact_name"],
                    ["Emergency Phone", "emergency_contact_phone"],
                  ] as [string, keyof Driver][]).map(([l, k]) => (
                    <div key={k}>
                      <span style={label}>{l}</span>
                      <input style={input} value={(selectedDriver as any)[k] || ""} onChange={(e) => updateDriver(k, e.target.value)} />
                    </div>
                  ))}

                  {/* Employment */}
                  <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.85rem", color: "#1d4ed8", marginTop: 8 }}>Employment</div>
                  <div>
                    <span style={label}>Driver Type</span>
                    <select style={input} value={selectedDriver.driver_type || "W2"} onChange={(e) => updateDriver("driver_type", e.target.value)}>
                      <option value="W2">W2</option>
                      <option value="1099">1099</option>
                      <option value="Owner Operator">Owner Operator</option>
                    </select>
                  </div>
                  <div>
                    <span style={label}>Status</span>
                    <select style={input} value={selectedDriver.status || "active"} onChange={(e) => updateDriver("status", e.target.value)}>
                      <option value="active">Active</option>
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="off duty">Off Duty</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  {([
                    ["Hire Date",  "hire_date",              null],
                    ["Role",       "position_role",          null],
                    ["Supervisor", "supervisor_name",        null],
                    ["Pay Rate",   "pay_rate",               "view_pay_rate"],
                    ["Truck #",    "assigned_truck_number",  null],
                  ] as [string, keyof Driver, string | null][])
                    .filter(([, , perm]) => !perm || can(userRole, perm))
                    .map(([l, k]) => (
                      <div key={k}>
                        <span style={label}>{l}</span>
                        <input style={input} value={(selectedDriver as any)[k] || ""} onChange={(e) => updateDriver(k, e.target.value)} />
                      </div>
                    ))}

                  {/* Compliance */}
                  <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.85rem", color: "#1d4ed8", marginTop: 8 }}>CDL & Compliance</div>
                  {([
                    ["CDL Number", "license_number"],
                    ["CDL State", "license_state"],
                    ["CDL Expiration", "license_expiration_date"],
                    ["MVR Expiration", "mvr_expiration"],
                    ["Medical Card Exp", "medical_card_expiration"],
                  ] as [string, keyof Driver][]).map(([l, k]) => (
                    <div key={k}>
                      <span style={label}>{l}</span>
                      <input style={input} value={(selectedDriver as any)[k] || ""} onChange={(e) => updateDriver(k, e.target.value)} />
                    </div>
                  ))}
                  <div>
                    <span style={label}>Background Check</span>
                    <select style={input} value={selectedDriver.background_check_status || "pending"} onChange={(e) => updateDriver("background_check_status", e.target.value)}>
                      <option value="clear">Clear</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div>
                    <span style={label}>Drug Test</span>
                    <select style={input} value={selectedDriver.drug_test_status || "pending"} onChange={(e) => updateDriver("drug_test_status", e.target.value)}>
                      <option value="pass">Pass</option>
                      <option value="pending">Pending</option>
                      <option value="fail">Fail</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={!!selectedDriver.orientation_completed} onChange={(e) => updateDriver("orientation_completed", e.target.checked)} />
                    <span style={label}>Orientation Completed</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={!!selectedDriver.hazmat_training} onChange={(e) => updateDriver("hazmat_training", e.target.checked)} />
                    <span style={label}>Hazmat Training</span>
                  </div>
                </div>
              )}

              {/* Tab: Documents */}
              {profileTab === "docs" && (
                <div>
                  {can(userRole, "upload_docs") && (
                    <div style={{ background: "#fff", border: "1px solid rgba(30,64,175,0.15)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>Upload Document</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <span style={label}>Document Type</span>
                          <select style={input} value={docUpload.doc_type} onChange={(e) => setDocUpload({ ...docUpload, doc_type: e.target.value })}>
                            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <span style={label}>Expiration Date</span>
                          <input type="date" style={input} value={docUpload.expires_on} onChange={(e) => setDocUpload({ ...docUpload, expires_on: e.target.value })} />
                        </div>
                        <div style={{ flex: "2 1 200px" }}>
                          <span style={label}>File (PDF, JPG, PNG)</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            style={{ ...input, padding: "6px 8px" }}
                            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                          />
                          {docFile && <span style={{ fontSize: "0.72rem", color: "#10b981", marginTop: 2, display: "block" }}>{docFile.name}</span>}
                        </div>
                        <button style={btn()} onClick={uploadDoc}>
                          {docFile ? "Upload File" : "Log Entry"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Required Docs Checklist */}
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Required Documents</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {["CDL", "Medical Card", "MVR", "Drug Test", "Background Check", "Insurance"].map((type) => {
                      const doc = documents.find((d) => d.doc_type === type);
                      const days = daysUntil(doc?.expires_on);
                      const { label: bLabel, color } = docStatusBadge(doc ? days : null);
                      return (
                        <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid rgba(30,64,175,0.12)", borderRadius: 10, padding: "10px 14px", flexWrap: "wrap", gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", minWidth: 130 }}>{type}</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {doc?.expires_on && <span style={{ fontSize: "0.75rem", color: "rgba(15,23,42,0.5)" }}>Exp: {doc.expires_on}</span>}
                            <span style={badge(color)}>{bLabel}</span>
                            {doc?.file_url && (
                              <a href={doc.file_url} target="_blank" rel="noreferrer"
                                style={{ ...btn("#1d4ed8"), fontSize: "0.72rem", padding: "4px 10px", textDecoration: "none" }}>
                                View
                              </a>
                            )}
                            {can(userRole, "upload_docs") && (
                              <label style={{ ...btn(doc?.file_url ? "#6b7280" : "#1d4ed8"), fontSize: "0.72rem", padding: "4px 10px", cursor: "pointer" }}>
                                {doc?.file_url ? "Replace" : "Attach File"}
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void attachDocFile(type, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* All uploaded docs */}
                  {documents.length > 0 && (
                    <>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Uploaded Documents</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {documents.map((doc) => {
                          const days = daysUntil(doc.expires_on);
                          const { label: bLabel, color } = docStatusBadge(days);
                          return (
                            <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid rgba(30,64,175,0.1)", borderRadius: 10, padding: "8px 14px" }}>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>{doc.doc_type}</span>
                                {doc.uploaded_at && <span style={{ color: "rgba(15,23,42,0.4)", fontSize: "0.72rem", marginLeft: 8 }}>Uploaded {doc.uploaded_at.slice(0, 10)}</span>}
                              </div>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {doc.expires_on && <span style={{ fontSize: "0.72rem", color: "rgba(15,23,42,0.5)" }}>Exp: {doc.expires_on}</span>}
                                <span style={badge(color)}>{bLabel}</span>
                                {doc.file_url && (
                                  <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ ...btn("#1d4ed8"), fontSize: "0.72rem", padding: "3px 8px", textDecoration: "none" }}>View</a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab: History */}
              {profileTab === "history" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Driver Notes & Activity Log</div>
                  {[
                    { date: "—", text: "Profile created in MoveAround TMS." },
                    { date: "—", text: "Document upload required: MVR, Medical Card." },
                  ].map((item, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid rgba(30,64,175,0.1)", borderRadius: 10, padding: "10px 14px", fontSize: "0.85rem", color: "rgba(15,23,42,0.75)" }}>
                      <span style={{ fontWeight: 600, marginRight: 8 }}>{item.date}</span>{item.text}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button style={{ ...btn("#6b7280"), fontSize: "0.78rem" }} onClick={() => setStatusMsg("Note added (demo)")}>Add Note</button>
                    <button style={{ ...btn("#6b7280"), fontSize: "0.78rem" }} onClick={() => setStatusMsg("Call logged (demo)")}>Log Call</button>
                    <button style={{ ...btn("#6b7280"), fontSize: "0.78rem" }} onClick={() => setStatusMsg("Exported (demo)")}>Export History</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
