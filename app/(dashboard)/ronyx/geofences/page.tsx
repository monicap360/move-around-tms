"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Geofence = {
  geofence_id: number;
  project_id?: string | null;
  location_type: string;
  location_name: string;
  address?: string | null;
  center_lat?: number | null;
  center_lon?: number | null;
  radius_miles?: number | null;
  allowed_materials?: any;
  requires_photo?: boolean | null;
  requires_signature?: boolean | null;
  active?: boolean | null;
};

const locationTypes = ["pickup", "dump", "scale", "yard"];

export default function GeofencesPage() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    project_id: "",
    location_type: "pickup",
    location_name: "",
    address: "",
    center_lat: "",
    center_lon: "",
    radius_miles: "0.25",
    allowed_materials: "[]",
    requires_photo: true,
    requires_signature: true,
    active: true,
  });

  useEffect(() => {
    void loadGeofences();
  }, []);

  async function loadGeofences() {
    const res = await fetch("/api/ronyx/geofences", { cache: "no-store" });
    const data = await res.json();
    setGeofences(data.geofences || []);
  }

  function startEdit(geofence: Geofence) {
    setEditingId(geofence.geofence_id);
    setForm({
      project_id: geofence.project_id || "",
      location_type: geofence.location_type,
      location_name: geofence.location_name,
      address: geofence.address || "",
      center_lat: geofence.center_lat?.toString() || "",
      center_lon: geofence.center_lon?.toString() || "",
      radius_miles: geofence.radius_miles?.toString() || "0.25",
      allowed_materials: JSON.stringify(geofence.allowed_materials || [], null, 2),
      requires_photo: Boolean(geofence.requires_photo),
      requires_signature: Boolean(geofence.requires_signature),
      active: Boolean(geofence.active),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      project_id: "",
      location_type: "pickup",
      location_name: "",
      address: "",
      center_lat: "",
      center_lon: "",
      radius_miles: "0.25",
      allowed_materials: "[]",
      requires_photo: true,
      requires_signature: true,
      active: true,
    });
  }

  async function saveGeofence() {
    if (!form.location_name) {
      setMessage("Location name is required.");
      return;
    }
    let allowedMaterials: any = [];
    try {
      allowedMaterials = JSON.parse(form.allowed_materials || "[]");
    } catch {
      setMessage("Allowed materials must be valid JSON.");
      return;
    }
    const payload = {
      ...form,
      project_id: form.project_id || null,
      center_lat: form.center_lat ? Number(form.center_lat) : null,
      center_lon: form.center_lon ? Number(form.center_lon) : null,
      radius_miles: form.radius_miles ? Number(form.radius_miles) : null,
      allowed_materials: allowedMaterials,
    };

    const res = await fetch("/api/ronyx/geofences", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { ...payload, geofence_id: editingId } : payload),
    });

    if (!res.ok) {
      setMessage("Failed to save geofence.");
      return;
    }
    setMessage(editingId ? "Geofence updated." : "Geofence created.");
    resetForm();
    await loadGeofences();
  }

  return (
    <div className="ronyx-shell">
      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • AI Validation</p>
          <h1>Geofences</h1>
          <p className="ronyx-muted">
            Manage pickup/dump geofences and validation requirements.
          </p>
        </div>
        <Link href="/ronyx" className="ronyx-action">
          Back to Dashboard
        </Link>
      </header>

      <section className="ronyx-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          {editingId ? "Edit Geofence" : "Add Geofence"}
        </h2>
        {message && <div className="ronyx-tag">{message}</div>}
        <div className="ronyx-grid" style={{ rowGap: 16 }}>
          <div>
            <label className="ronyx-label">Project ID (optional)</label>
            <input
              className="ronyx-input"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Location Type</label>
            <select
              className="ronyx-input"
              value={form.location_type}
              onChange={(e) => setForm({ ...form, location_type: e.target.value })}
            >
              {locationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ronyx-label">Location Name</label>
            <input
              className="ronyx-input"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Address</label>
            <input
              className="ronyx-input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Center Lat</label>
            <input
              className="ronyx-input"
              value={form.center_lat}
              onChange={(e) => setForm({ ...form, center_lat: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Center Lon</label>
            <input
              className="ronyx-input"
              value={form.center_lon}
              onChange={(e) => setForm({ ...form, center_lon: e.target.value })}
            />
          </div>
          <div>
            <label className="ronyx-label">Radius (miles)</label>
            <input
              type="number"
              className="ronyx-input"
              value={form.radius_miles}
              onChange={(e) => setForm({ ...form, radius_miles: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="ronyx-label">Allowed Materials (JSON)</label>
            <textarea
              className="ronyx-input"
              rows={4}
              value={form.allowed_materials}
              onChange={(e) => setForm({ ...form, allowed_materials: e.target.value })}
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Requires Photo</span>
            <input
              type="checkbox"
              checked={form.requires_photo}
              onChange={(e) => setForm({ ...form, requires_photo: e.target.checked })}
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Requires Signature</span>
            <input
              type="checkbox"
              checked={form.requires_signature}
              onChange={(e) => setForm({ ...form, requires_signature: e.target.checked })}
            />
          </div>
          <div className="ronyx-row" style={{ alignItems: "center" }}>
            <span>Active</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="ronyx-action" onClick={saveGeofence}>
            {editingId ? "Update Geofence" : "Add Geofence"}
          </button>
          <button className="ronyx-action" onClick={resetForm}>
            Clear
          </button>
        </div>
      </section>

      <section className="ronyx-card">
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
          Geofence Directory
        </h2>
        {geofences.length === 0 ? (
          <div className="ronyx-row">No geofences yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                  <th style={{ padding: "8px 6px" }}>Type</th>
                  <th style={{ padding: "8px 6px" }}>Name</th>
                  <th style={{ padding: "8px 6px" }}>Radius</th>
                  <th style={{ padding: "8px 6px" }}>Active</th>
                  <th style={{ padding: "8px 6px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {geofences.map((geofence) => (
                  <tr key={geofence.geofence_id} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <td style={{ padding: "8px 6px" }}>{geofence.location_type}</td>
                    <td style={{ padding: "8px 6px" }}>{geofence.location_name}</td>
                    <td style={{ padding: "8px 6px" }}>{geofence.radius_miles ?? "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{geofence.active ? "✅" : "—"}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <button className="btn-sm btn-secondary" onClick={() => startEdit(geofence)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
