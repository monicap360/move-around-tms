"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────── */
type Profile = {
  id?: string;
  driver_id?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: string;
  driver_type?: string;
  position_role?: string;
  supervisor_name?: string;
  hire_date?: string;
  license_number?: string;
  license_state?: string;
  license_expiration_date?: string;
  mvr_expiration?: string;
  medical_card_expiration?: string;
  assigned_truck_number?: string;
  pay_rate?: number | string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  background_check_status?: string;
  drug_test_status?: string;
  hazmat_training?: boolean;
  orientation_completed?: boolean;
  rating?: number;
};

type Document = {
  id: string;
  doc_type: string;
  status: string;
  expires_on: string | null;
  file_url: string | null;
  uploaded_at: string;
};

const TABS = ["Overview", "Documents", "Assignments", "Compensation", "Activity"] as const;
type Tab = (typeof TABS)[number];

/* ─── Helpers ────────────────────────────────────── */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ComplianceChip({ label, date }: { label: string; date: string | null | undefined }) {
  const days = daysUntil(date);
  let bg = "#f1f5f9", color = "#64748b", text = "No date";
  if (days !== null) {
    if (days < 0)   { bg = "#fee2e2"; color = "#dc2626"; text = `EXPIRED (${date})`; }
    else if (days <= 30) { bg = "#fef3c7"; color = "#d97706"; text = `Exp ${date} (${days}d)`; }
    else            { bg = "#dcfce7"; color = "#15803d"; text = `Exp ${date}`; }
  }
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", padding: "8px 14px", borderRadius: 8, background: bg, minWidth: 140 }}>
      <span style={{ fontSize: "0.7rem", fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: color, marginTop: 2 }}>{text}</span>
    </div>
  );
}

function statusChip(status: string | undefined) {
  const map: Record<string, [string, string]> = {
    active:    ["#dcfce7", "#15803d"],
    inactive:  ["#f1f5f9", "#64748b"],
    suspended: ["#fee2e2", "#dc2626"],
  };
  const [bg, text] = map[status ?? "inactive"] ?? map.inactive;
  return (
    <span style={{ background: bg, color: text, padding: "3px 12px", borderRadius: 20, fontWeight: 700, fontSize: "0.78rem" }}>
      {status ?? "unknown"}
    </span>
  );
}

/* ─── Editable field ─────────────────────────────── */
function EditField({
  label,
  value,
  field,
  type = "text",
  options,
  onSave,
}: {
  label: string;
  value: string | number | boolean | undefined | null;
  field: string;
  type?: string;
  options?: string[];
  onSave: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  function commit() {
    onSave(field, draft);
    setEditing(false);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      {editing ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {options ? (
            <select value={draft} onChange={(e) => setDraft(e.target.value)} style={editInp} autoFocus>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              type={type}
              style={editInp}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            />
          )}
          <button onClick={commit} style={saveBtnSm}>Save</button>
          <button onClick={() => setEditing(false)} style={cancelBtnSm}>✕</button>
        </div>
      ) : (
        <div
          onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
          style={{ fontSize: "0.9rem", color: value ? "#0f172a" : "#cbd5e1", cursor: "pointer", padding: "5px 0", borderBottom: "1px dashed #e2e8f0", display: "inline-block", minWidth: 160 }}
          title="Click to edit"
        >
          {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
        </div>
      )}
    </div>
  );
}

/* ─── Document row ───────────────────────────────── */
function DocRow({ doc, onReplace, onDelete }: { doc: Document; onReplace: (doc: Document) => void; onDelete: (id: string) => void }) {
  const days = daysUntil(doc.expires_on);
  let expColor = "#64748b";
  if (days !== null) {
    if (days < 0) expColor = "#dc2626";
    else if (days <= 30) expColor = "#d97706";
    else expColor = "#15803d";
  }

  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={td}><strong style={{ color: "#0f172a" }}>{doc.doc_type}</strong></td>
      <td style={td}>
        <span style={{ background: doc.status === "uploaded" ? "#dcfce7" : "#f1f5f9", color: doc.status === "uploaded" ? "#15803d" : "#64748b", padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700 }}>
          {doc.status}
        </span>
      </td>
      <td style={{ ...td, color: expColor, fontWeight: days !== null && days <= 30 ? 700 : 400 }}>
        {doc.expires_on ?? "—"}
        {days !== null && days < 0 && " ⚠"}
      </td>
      <td style={td}>
        {doc.file_url ? (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", fontSize: "0.8rem", fontWeight: 600 }}>View</a>
        ) : <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>No file</span>}
      </td>
      <td style={td}>
        <div style={{ display: "flex", gap: 6 }}>
          <label style={{ ...actionSm, cursor: "pointer" }}>
            Replace
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) onReplace({ ...doc }); }} />
          </label>
          <button onClick={() => onDelete(doc.id)} style={{ ...actionSm, color: "#dc2626", background: "#fee2e2" }}>Delete</button>
        </div>
      </td>
    </tr>
  );
}

/* ─── Main page ──────────────────────────────────── */
export default function DriverProfilePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get("tab") as Tab) || "Overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(searchParams.get("new") === "1" ? "Driver created! Upload documents and assign a truck below." : "");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const driverId = params.id;

  const loadProfile = useCallback(async () => {
    const [profRes, docsRes] = await Promise.all([
      fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`),
      fetch(`/api/ronyx/drivers/documents?driverId=${driverId}`),
    ]);
    const profData = await profRes.json();
    const docsData = await docsRes.json();
    setProfile(profData.profile || {});
    setDocuments(docsData.documents || []);
    setLoading(false);
  }, [driverId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function saveField(field: string, value: string) {
    setSaving(true);
    const res = await fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (res.ok) {
      setProfile((prev) => ({ ...prev, ...data.profile }));
      flash("Saved.");
    } else {
      flash(`Error: ${data.error}`);
    }
    setSaving(false);
  }

  async function uploadDocument(docType: string, file: File, expiresOn?: string) {
    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("driver_id", driverId);
    fd.append("doc_type", docType);
    if (expiresOn) fd.append("expires_on", expiresOn);
    const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setDocuments((prev) => [data.document, ...prev.filter((d) => d.doc_type !== docType)]);
      flash(`${docType} uploaded.`);
    } else {
      flash(`Upload error: ${data.error}`);
    }
    setUploadingDoc(false);
  }

  async function deleteDocument(docId: string) {
    if (!confirm("Delete this document?")) return;
    // Mark deleted via status update (no DELETE endpoint yet — use PUT)
    flash("Delete not yet wired to API — coming soon.");
  }

  function flash(msg: string) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 6000);
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading driver profile…</div>;
  }

  if (!profile) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ color: "#dc2626", fontWeight: 600 }}>Driver not found.</div>
        <Link href="/ronyx/drivers" style={{ color: "#1e40af", marginTop: 12, display: "inline-block" }}>← Back to Drivers</Link>
      </div>
    );
  }

  const name = profile.full_name || "Unnamed Driver";

  return (
    <div style={{ maxWidth: 960 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/ronyx/drivers" style={{ color: "#64748b", fontSize: "0.83rem", textDecoration: "none" }}>← Drivers</Link>
      </div>

      {/* Profile header */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 700, flexShrink: 0 }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{name}</h1>
            {statusChip(profile.status)}
            {saving && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Saving…</span>}
          </div>
          <div style={{ marginTop: 4, fontSize: "0.83rem", color: "#64748b" }}>
            {profile.position_role && <span>{profile.position_role} · </span>}
            {profile.phone && <span>{profile.phone} · </span>}
            {profile.email && <span>{profile.email}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/ronyx/drivers/new" style={{ padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, color: "#475569", textDecoration: "none" }}>
            + Add Driver
          </Link>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: "0.85rem", fontWeight: 500, background: statusMsg.startsWith("Error") ? "#fee2e2" : "#eff6ff", color: statusMsg.startsWith("Error") ? "#dc2626" : "#1e40af", border: `1px solid ${statusMsg.startsWith("Error") ? "#fecaca" : "#bfdbfe"}` }}>
          {statusMsg}
        </div>
      )}

      {/* Compliance chips */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <ComplianceChip label="CDL" date={profile.license_expiration_date} />
        <ComplianceChip label="MVR" date={profile.mvr_expiration} />
        <ComplianceChip label="Medical Card" date={profile.medical_card_expiration} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "9px 18px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? "#1e40af" : "#64748b",
              borderBottom: activeTab === tab ? "2px solid #1e40af" : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────── */}
      {activeTab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Personal">
            <EditField label="Full Name" value={profile.full_name} field="full_name" onSave={saveField} />
            <EditField label="Phone" value={profile.phone} field="phone" type="tel" onSave={saveField} />
            <EditField label="Email" value={profile.email} field="email" type="email" onSave={saveField} />
            <EditField label="Address" value={profile.address} field="address" onSave={saveField} />
            <EditField label="Status" value={profile.status} field="status" options={["active", "inactive", "suspended"]} onSave={saveField} />
          </Card>
          <Card title="Employment">
            <EditField label="Driver Type" value={profile.driver_type} field="driver_type" options={["W2", "1099", "owner_operator"]} onSave={saveField} />
            <EditField label="Position / Role" value={profile.position_role} field="position_role" onSave={saveField} />
            <EditField label="Hire Date" value={profile.hire_date} field="hire_date" type="date" onSave={saveField} />
            <EditField label="Supervisor" value={profile.supervisor_name} field="supervisor_name" onSave={saveField} />
          </Card>
          <Card title="License & Compliance">
            <EditField label="CDL Number" value={profile.license_number} field="license_number" onSave={saveField} />
            <EditField label="CDL State" value={profile.license_state} field="license_state" onSave={saveField} />
            <EditField label="CDL Expiration" value={profile.license_expiration_date} field="license_expiration_date" type="date" onSave={saveField} />
            <EditField label="MVR Expiration" value={profile.mvr_expiration} field="mvr_expiration" type="date" onSave={saveField} />
            <EditField label="Medical Card Exp." value={profile.medical_card_expiration} field="medical_card_expiration" type="date" onSave={saveField} />
          </Card>
          <Card title="Emergency Contact">
            <EditField label="Contact Name" value={profile.emergency_contact_name} field="emergency_contact_name" onSave={saveField} />
            <EditField label="Contact Phone" value={profile.emergency_contact_phone} field="emergency_contact_phone" type="tel" onSave={saveField} />
          </Card>
        </div>
      )}

      {/* ── Tab: Documents ────────────────────────── */}
      {activeTab === "Documents" && (
        <div>
          {/* Upload checklist */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Required Documents</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {["CDL", "MVR", "Medical Card", "Drug Test", "Background Check", "Insurance"].map((docType) => {
                const existing = documents.find((d) => d.doc_type === docType);
                return (
                  <div key={docType} style={{ border: `1px solid ${existing ? "#86efac" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 14px", background: existing ? "#f0fdf4" : "#fafafa" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{docType}</div>
                    <div style={{ fontSize: "0.72rem", color: existing ? "#15803d" : "#94a3b8", marginBottom: 8 }}>
                      {existing ? "✓ On file" : "Not uploaded"}
                    </div>
                    <label style={{ ...uploadLabelStyle, cursor: uploadingDoc ? "not-allowed" : "pointer", opacity: uploadingDoc ? 0.6 : 1 }}>
                      {existing ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                        style={{ display: "none" }}
                        disabled={uploadingDoc}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadDocument(docType, file);
                        }}
                      />
                    </label>
                    {existing?.file_url && (
                      <a href={existing.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, fontSize: "0.72rem", color: "#1e40af", fontWeight: 600 }}>View →</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Document history table */}
          {documents.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <h3 style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>All Documents</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={th}>Document</th>
                    <th style={th}>Status</th>
                    <th style={th}>Expires</th>
                    <th style={th}>File</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      onReplace={(d) => flash("Use the upload button above to replace.")}
                      onDelete={deleteDocument}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {documents.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
              No documents uploaded yet. Use the checklist above to add required documents.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Assignments ──────────────────────── */}
      {activeTab === "Assignments" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Truck Assignment">
            <EditField label="Assigned Truck #" value={profile.assigned_truck_number} field="assigned_truck_number" onSave={saveField} />
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "12px 0 0" }}>
              Full truck management (vehicles table) coming soon. Enter the truck unit number above to track assignment.
            </p>
          </Card>
          <Card title="Active Load">
            <div style={{ padding: "12px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              No active load assignment. Load assignments module coming in the next sprint.
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Compensation ─────────────────────── */}
      {activeTab === "Compensation" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Pay Setup">
            <EditField label="Driver Type" value={profile.driver_type} field="driver_type" options={["W2", "1099", "owner_operator"]} onSave={saveField} />
            <EditField label="Pay Rate ($/hr or $/mile)" value={profile.pay_rate} field="pay_rate" type="number" onSave={saveField} />
          </Card>
          <Card title="Compliance Checks">
            <EditField label="Background Check" value={profile.background_check_status} field="background_check_status" options={["pending", "cleared", "failed"]} onSave={saveField} />
            <EditField label="Drug Test" value={profile.drug_test_status} field="drug_test_status" options={["pending", "cleared", "failed"]} onSave={saveField} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Hazmat Training</div>
              <select
                value={profile.hazmat_training ? "Yes" : "No"}
                onChange={(e) => saveField("hazmat_training", e.target.value === "Yes" ? "true" : "false")}
                style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Orientation Completed</div>
              <select
                value={profile.orientation_completed ? "Yes" : "No"}
                onChange={(e) => saveField("orientation_completed", e.target.value === "Yes" ? "true" : "false")}
                style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Activity ─────────────────────────── */}
      {activeTab === "Activity" && (
        <Card title="Recent Activity">
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Activity feed (tickets, shifts, messages) will appear here once the Tickets and Dispatch modules are connected.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Shared sub-components ──────────────────────── */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "10px 18px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
        <h3 style={{ margin: 0, fontSize: "0.73rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</h3>
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle", fontSize: "0.85rem" };
const th: React.CSSProperties = { padding: "8px 14px", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" };

const editInp: React.CSSProperties = {
  padding: "5px 10px",
  border: "1px solid #93c5fd",
  borderRadius: 6,
  fontSize: "0.87rem",
  outline: "none",
  background: "#eff6ff",
};
const saveBtnSm: React.CSSProperties = {
  padding: "4px 12px",
  background: "#1e40af",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: "0.78rem",
  fontWeight: 700,
  cursor: "pointer",
};
const cancelBtnSm: React.CSSProperties = {
  padding: "4px 8px",
  background: "#f1f5f9",
  color: "#64748b",
  border: "none",
  borderRadius: 6,
  fontSize: "0.78rem",
  cursor: "pointer",
};
const actionSm: React.CSSProperties = {
  padding: "3px 10px",
  background: "#f1f5f9",
  border: "none",
  borderRadius: 6,
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#475569",
  cursor: "pointer",
  display: "inline-block",
};
const uploadLabelStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 12px",
  background: "#1e40af",
  color: "#fff",
  borderRadius: 6,
  fontSize: "0.75rem",
  fontWeight: 600,
};
