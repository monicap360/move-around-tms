"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";

type DriverOption = {
  id: string;
  name: string;
};

type DriverProfile = {
  full_name: string;
  photo_url: string;
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  license_number: string;
  license_state: string;
  license_class: string;
  license_expiration_date: string;
  cdl_endorsements: string;
  cdl_restrictions: string;
  hire_date: string;
  status: string;
  position_role: string;
  supervisor_name: string;
  pay_rate: string;
  mileage_rate: string;
  cdl_copy_url: string;
  medical_card_url: string;
  work_authorization_url: string;
  drug_test_results_url: string;
  background_check_url: string;
  training_certificates_url: string;
  assigned_truck_number: string;
  vehicle_vin: string;
  license_plate: string;
  equipment_type: string;
  maintenance_history: string;
  hos_logs: string;
  eld_records: string;
  inspection_reports: string;
  violations: string;
  orientation_completed: boolean;
  hazmat_training: boolean;
  safety_meetings_attendance: string;
  certification_renewal_dates: string;
  accidents_summary: string;
  incident_photos_url: string;
  incident_resolution: string;
  dvir_reports: string;
  repairs_requested_completed: string;
  preventive_maintenance_schedule: string;
  miles_driven: string;
  pay_period_earnings: string;
  deductions: string;
  bonuses_reimbursements: string;
  driver_scorecard: string;
  disciplinary_actions: string;
  recognition_awards: string;
  supervisor_notes: string;
  communication_log: string;
  hr_dispatch_updates: string;
};

type DriverDocument = {
  id: string;
  doc_type: string;
  status: string;
  expires_on: string | null;
  uploaded_at: string | null;
  file_url: string | null;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
};

const emptyProfile: DriverProfile = {
  full_name: "",
  photo_url: "",
  date_of_birth: "",
  phone: "",
  email: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  license_number: "",
  license_state: "",
  license_class: "",
  license_expiration_date: "",
  cdl_endorsements: "",
  cdl_restrictions: "",
  hire_date: "",
  status: "active",
  position_role: "company driver",
  supervisor_name: "",
  pay_rate: "",
  mileage_rate: "",
  cdl_copy_url: "",
  medical_card_url: "",
  work_authorization_url: "",
  drug_test_results_url: "",
  background_check_url: "",
  training_certificates_url: "",
  assigned_truck_number: "",
  vehicle_vin: "",
  license_plate: "",
  equipment_type: "",
  maintenance_history: "",
  hos_logs: "",
  eld_records: "",
  inspection_reports: "",
  violations: "",
  orientation_completed: false,
  hazmat_training: false,
  safety_meetings_attendance: "",
  certification_renewal_dates: "",
  accidents_summary: "",
  incident_photos_url: "",
  incident_resolution: "",
  dvir_reports: "",
  repairs_requested_completed: "",
  preventive_maintenance_schedule: "",
  miles_driven: "",
  pay_period_earnings: "",
  deductions: "",
  bonuses_reimbursements: "",
  driver_scorecard: "",
  disciplinary_actions: "",
  recognition_awards: "",
  supervisor_notes: "",
  communication_log: "",
  hr_dispatch_updates: "",
};

export default function RonyxDriversPage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [profile, setProfile] = useState<DriverProfile>(emptyProfile);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [activeTab, setActiveTab] = useState<"status" | "docs" | "performance">("status");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [docUpload, setDocUpload] = useState({
    doc_type: "CDL",
    expires_on: "",
    file: null as File | null,
  });
  const [docMessage, setDocMessage] = useState("");
  const [assignedLoad, setAssignedLoad] = useState<any | null>(null);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    if (!selectedDriverId) return;
    void loadProfile(selectedDriverId);
    void loadDocuments(selectedDriverId);
    void loadAssignedLoad();
  }, [selectedDriverId, loadAssignedLoad]);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/drivers/list");
      const data = await res.json();
      const list = data.drivers || [];
      setDrivers(list);
      if (list.length && !selectedDriverId) {
        setSelectedDriverId(list[0].id);
      }
    } catch (err) {
      console.error("Failed to load drivers", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDriverId]);

  async function loadProfile(driverId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`);
      const data = await res.json();
      const merged = { ...emptyProfile, ...(data.profile || {}) };
      setProfile(merged);
    } catch (err) {
      console.error("Failed to load driver profile", err);
      setProfile(emptyProfile);
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments(driverId: string) {
    try {
      const res = await fetch(`/api/ronyx/drivers/documents?driverId=${driverId}`, { cache: "no-store" });
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load driver documents", err);
      setDocuments([]);
    }
  }

  const loadAssignedLoad = useCallback(async () => {
    if (!profile.full_name) return;
    try {
      const res = await fetch(`/api/ronyx/loads?driver_name=${encodeURIComponent(profile.full_name)}`, { cache: "no-store" });
      const data = await res.json();
      setAssignedLoad(data.loads?.[0] || null);
    } catch {
      setAssignedLoad(null);
    }
  }, [profile.full_name]);

  async function uploadDocument() {
    if (!selectedDriverId || !docUpload.doc_type) return;
    setDocMessage("");
    const payload = {
      driver_id: selectedDriverId,
      doc_type: docUpload.doc_type,
      status: "pending",
      expires_on: docUpload.expires_on || null,
      file_url: docUpload.file ? docUpload.file.name : null,
    };
    const res = await fetch("/api/ronyx/drivers/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setDocMessage("Upload failed.");
      return;
    }
    const data = await res.json();
    setDocuments((prev) => [data.document, ...prev]);
    setDocMessage("Document uploaded.");
  }

  async function saveProfile() {
    if (!selectedDriverId) return;
    setSaving(true);
    setStatusMessage("");
    try {
      const res = await fetch(`/api/ronyx/drivers/profile?driverId=${selectedDriverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setProfile({ ...emptyProfile, ...(data.profile || {}) });
      setStatusMessage("Saved");
    } catch (err) {
      console.error("Failed to save driver profile", err);
      setStatusMessage("Save failed. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(""), 3000);
    }
  }

  const updateField = (field: keyof DriverProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const documentAlerts = useMemo(() => {
    const now = new Date();
    const alerts: string[] = [];
    documents.forEach((doc) => {
      if (!doc.expires_on) return;
      const expires = new Date(doc.expires_on);
      const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        alerts.push(`${doc.doc_type} expired TODAY`);
      } else if (diffDays <= 14) {
        alerts.push(`${doc.doc_type} expires in ${diffDays} days`);
      }
    });
    return alerts;
  }, [documents]);

  const requiredDocs = ["CDL", "Medical Card", "Drug Test", "Insurance", "Background Check"];
  const getDocForType = (type: string) => documents.find((doc) => doc.doc_type === type);

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --primary: #0ea5e9;
          --danger: #ef4444;
          --success: #10b981;
          --warning: #f59e0b;
          --secondary: #6b7280;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #ffffff;
          border-color: transparent;
        }
        .ronyx-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .ronyx-input:focus,
        .ronyx-input:focus-visible {
          outline: none;
          border-color: rgba(29, 78, 216, 0.6);
          box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.18);
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
          margin-bottom: 6px;
          display: inline-block;
        }
        .ronyx-textarea {
          width: 100%;
          min-height: 90px;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          resize: vertical;
        }
        .ronyx-tab {
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          background: rgba(29, 78, 216, 0.06);
          padding: 8px 16px;
          font-weight: 600;
        }
        .ronyx-tab.active {
          background: var(--ronyx-accent);
          color: #fff;
        }
        .ronyx-muted {
          color: rgba(15, 23, 42, 0.7);
          font-size: 0.9rem;
        }
        .btn-primary,
        .btn-secondary,
        .btn-warning,
        .btn-danger {
          border-radius: 6px;
          border: none;
          padding: 0 16px;
          height: 36px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
        }
        .btn-primary {
          background: var(--primary);
          color: #ffffff;
        }
        .btn-secondary {
          background: var(--secondary);
          color: #ffffff;
        }
        .btn-warning {
          background: var(--warning);
          color: #ffffff;
        }
        .btn-danger {
          background: var(--danger);
          color: #ffffff;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Driver Profile</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Complete profile, compliance, assignments, and performance tracking.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="ronyx-input"
              style={{ minWidth: 220 }}
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              disabled={loading}
            >
              {drivers.length === 0 && <option value="">No drivers found</option>}
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
            <button className="ronyx-action primary" onClick={saveProfile} disabled={saving || !selectedDriverId}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{statusMessage}</span>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>1. Driver Profile</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Full name</label>
              <input className="ronyx-input" value={profile.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Photo URL</label>
              <input className="ronyx-input" value={profile.photo_url} onChange={(e) => updateField("photo_url", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Date of birth</label>
              <input type="date" className="ronyx-input" value={profile.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Phone</label>
              <input className="ronyx-input" value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Email</label>
              <input className="ronyx-input" value={profile.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Address</label>
              <textarea className="ronyx-textarea" value={profile.address} onChange={(e) => updateField("address", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Emergency contact</label>
              <input className="ronyx-input" value={profile.emergency_contact_name} onChange={(e) => updateField("emergency_contact_name", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Emergency contact phone</label>
              <input className="ronyx-input" value={profile.emergency_contact_phone} onChange={(e) => updateField("emergency_contact_phone", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">License number</label>
              <input className="ronyx-input" value={profile.license_number} onChange={(e) => updateField("license_number", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">License state</label>
              <input className="ronyx-input" value={profile.license_state} onChange={(e) => updateField("license_state", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">License class</label>
              <input className="ronyx-input" value={profile.license_class} onChange={(e) => updateField("license_class", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">License expiration date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.license_expiration_date}
                onChange={(e) => updateField("license_expiration_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">CDL endorsements</label>
              <input className="ronyx-input" value={profile.cdl_endorsements} onChange={(e) => updateField("cdl_endorsements", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">CDL restrictions</label>
              <input className="ronyx-input" value={profile.cdl_restrictions} onChange={(e) => updateField("cdl_restrictions", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>2. Employment Information</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Hire date</label>
              <input type="date" className="ronyx-input" value={profile.hire_date} onChange={(e) => updateField("hire_date", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Status</label>
              <select className="ronyx-input" value={profile.status} onChange={(e) => updateField("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="terminated">Terminated</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Position / role</label>
              <input className="ronyx-input" value={profile.position_role} onChange={(e) => updateField("position_role", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Supervisor / fleet manager</label>
              <input className="ronyx-input" value={profile.supervisor_name} onChange={(e) => updateField("supervisor_name", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Pay rate</label>
              <input className="ronyx-input" value={profile.pay_rate} onChange={(e) => updateField("pay_rate", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Mileage rate</label>
              <input className="ronyx-input" value={profile.mileage_rate} onChange={(e) => updateField("mileage_rate", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>3. Documents</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">CDL copy</label>
              <input className="ronyx-input" value={profile.cdl_copy_url} onChange={(e) => updateField("cdl_copy_url", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Medical card (DOT physical)</label>
              <input className="ronyx-input" value={profile.medical_card_url} onChange={(e) => updateField("medical_card_url", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Social Security / work authorization</label>
              <input
                className="ronyx-input"
                value={profile.work_authorization_url}
                onChange={(e) => updateField("work_authorization_url", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Drug test results</label>
              <input
                className="ronyx-input"
                value={profile.drug_test_results_url}
                onChange={(e) => updateField("drug_test_results_url", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Background check / MVR reports</label>
              <input
                className="ronyx-input"
                value={profile.background_check_url}
                onChange={(e) => updateField("background_check_url", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Training certificates</label>
              <input
                className="ronyx-input"
                value={profile.training_certificates_url}
                onChange={(e) => updateField("training_certificates_url", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>4. Vehicle Assignment</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Current assigned truck number</label>
              <input
                className="ronyx-input"
                value={profile.assigned_truck_number}
                onChange={(e) => updateField("assigned_truck_number", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">VIN</label>
              <input className="ronyx-input" value={profile.vehicle_vin} onChange={(e) => updateField("vehicle_vin", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">License plate</label>
              <input className="ronyx-input" value={profile.license_plate} onChange={(e) => updateField("license_plate", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Equipment type</label>
              <input className="ronyx-input" value={profile.equipment_type} onChange={(e) => updateField("equipment_type", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Maintenance history</label>
              <textarea
                className="ronyx-textarea"
                value={profile.maintenance_history}
                onChange={(e) => updateField("maintenance_history", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>5. Logs & Compliance</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Hours of Service (HOS) logs</label>
              <textarea className="ronyx-textarea" value={profile.hos_logs} onChange={(e) => updateField("hos_logs", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">ELD records</label>
              <textarea className="ronyx-textarea" value={profile.eld_records} onChange={(e) => updateField("eld_records", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Inspection reports</label>
              <textarea
                className="ronyx-textarea"
                value={profile.inspection_reports}
                onChange={(e) => updateField("inspection_reports", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Violations</label>
              <textarea className="ronyx-textarea" value={profile.violations} onChange={(e) => updateField("violations", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>6. Training & Certifications</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div className="ronyx-row">
              <span>Orientation completion</span>
              <input
                type="checkbox"
                checked={profile.orientation_completed}
                onChange={(e) => updateField("orientation_completed", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Hazmat training</span>
              <input type="checkbox" checked={profile.hazmat_training} onChange={(e) => updateField("hazmat_training", e.target.checked)} />
            </div>
            <div>
              <label className="ronyx-label">Safety meetings attendance</label>
              <textarea
                className="ronyx-textarea"
                value={profile.safety_meetings_attendance}
                onChange={(e) => updateField("safety_meetings_attendance", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Certification renewal dates</label>
              <textarea
                className="ronyx-textarea"
                value={profile.certification_renewal_dates}
                onChange={(e) => updateField("certification_renewal_dates", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>7. Accidents & Incidents</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Summary</label>
              <textarea
                className="ronyx-textarea"
                value={profile.accidents_summary}
                onChange={(e) => updateField("accidents_summary", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Photos / reports</label>
              <input
                className="ronyx-input"
                value={profile.incident_photos_url}
                onChange={(e) => updateField("incident_photos_url", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Resolution / claim status</label>
              <textarea
                className="ronyx-textarea"
                value={profile.incident_resolution}
                onChange={(e) => updateField("incident_resolution", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>8. Maintenance / DVIR Reports</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Daily Vehicle Inspection Reports (DVIR)</label>
              <textarea className="ronyx-textarea" value={profile.dvir_reports} onChange={(e) => updateField("dvir_reports", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Repairs requested & completed</label>
              <textarea
                className="ronyx-textarea"
                value={profile.repairs_requested_completed}
                onChange={(e) => updateField("repairs_requested_completed", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Preventive maintenance schedule</label>
              <textarea
                className="ronyx-textarea"
                value={profile.preventive_maintenance_schedule}
                onChange={(e) => updateField("preventive_maintenance_schedule", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>9. Payroll / Settlements</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Miles driven</label>
              <input className="ronyx-input" value={profile.miles_driven} onChange={(e) => updateField("miles_driven", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Pay period earnings</label>
              <input
                className="ronyx-input"
                value={profile.pay_period_earnings}
                onChange={(e) => updateField("pay_period_earnings", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Deductions</label>
              <input className="ronyx-input" value={profile.deductions} onChange={(e) => updateField("deductions", e.target.value)} />
            </div>
            <div>
              <label className="ronyx-label">Bonuses or reimbursements</label>
              <input
                className="ronyx-input"
                value={profile.bonuses_reimbursements}
                onChange={(e) => updateField("bonuses_reimbursements", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>10. Performance & Safety</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Driver scorecard</label>
              <textarea
                className="ronyx-textarea"
                value={profile.driver_scorecard}
                onChange={(e) => updateField("driver_scorecard", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Disciplinary actions / warnings</label>
              <textarea
                className="ronyx-textarea"
                value={profile.disciplinary_actions}
                onChange={(e) => updateField("disciplinary_actions", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Recognition / awards</label>
              <textarea
                className="ronyx-textarea"
                value={profile.recognition_awards}
                onChange={(e) => updateField("recognition_awards", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>11. Notes / Comments</h2>
          <div className="ronyx-grid" style={{ rowGap: 20 }}>
            <div>
              <label className="ronyx-label">Supervisor notes</label>
              <textarea
                className="ronyx-textarea"
                value={profile.supervisor_notes}
                onChange={(e) => updateField("supervisor_notes", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Communication log</label>
              <textarea
                className="ronyx-textarea"
                value={profile.communication_log}
                onChange={(e) => updateField("communication_log", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Updates from HR or dispatch</label>
              <textarea
                className="ronyx-textarea"
                value={profile.hr_dispatch_updates}
                onChange={(e) => updateField("hr_dispatch_updates", e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
