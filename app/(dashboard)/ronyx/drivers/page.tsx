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
  const [activeTab, setActiveTab] = useState<
    "compliance" | "performance" | "financials" | "history"
  >("compliance");
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
  const [payRates, setPayRates] = useState<any[]>([]);
  const [rateForm, setRateForm] = useState({
    rate_name: "",
    rate_type: "PER_TON",
    rate_value: "",
    material_type: "",
    customer_id: "",
    job_id: "",
    equipment_type: "",
    is_default: false,
    effective_date: "",
  });

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    if (!selectedDriverId) return;
    void loadProfile(selectedDriverId);
    void loadDocuments(selectedDriverId);
    void loadAssignedLoad();
    void loadPayRates(selectedDriverId);
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

  async function loadPayRates(driverId: string) {
    try {
      const res = await fetch(`/api/ronyx/drivers/${driverId}/pay-rates`);
      const data = await res.json();
      setPayRates(data.rates || []);
    } catch (err) {
      console.error("Failed to load pay rates", err);
      setPayRates([]);
    }
  }

  async function savePayRate() {
    if (!selectedDriverId) return;
    if (!rateForm.rate_name || !rateForm.rate_value) {
      setStatusMessage("Rate name and value are required.");
      return;
    }
    const payload = {
      ...rateForm,
      rate_value: Number(rateForm.rate_value),
      customer_id: rateForm.customer_id || null,
      job_id: rateForm.job_id || null,
      material_type: rateForm.material_type || null,
      equipment_type: rateForm.equipment_type || null,
      effective_date: rateForm.effective_date || new Date().toISOString().slice(0, 10),
    };
    const res = await fetch(`/api/ronyx/drivers/${selectedDriverId}/pay-rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setStatusMessage("Failed to save pay rate.");
      return;
    }
    setRateForm({
      rate_name: "",
      rate_type: "PER_TON",
      rate_value: "",
      material_type: "",
      customer_id: "",
      job_id: "",
      equipment_type: "",
      is_default: false,
      effective_date: "",
    });
    setStatusMessage("Pay rate saved.");
    void loadPayRates(selectedDriverId);
  }

  async function setDefaultRate(rateId: string) {
    if (!selectedDriverId) return;
    const res = await fetch(
      `/api/ronyx/drivers/${selectedDriverId}/pay-rates/${rateId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      },
    );
    if (!res.ok) {
      setStatusMessage("Failed to update default rate.");
      return;
    }
    setStatusMessage("Default rate updated.");
    void loadPayRates(selectedDriverId);
  }

  async function deleteRate(rateId: string) {
    if (!selectedDriverId) return;
    const res = await fetch(
      `/api/ronyx/drivers/${selectedDriverId}/pay-rates/${rateId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setStatusMessage("Failed to delete rate.");
      return;
    }
    setStatusMessage("Pay rate removed.");
    void loadPayRates(selectedDriverId);
  }

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
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>
              Fleet Productivity Hub
            </h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Actionable compliance, performance, financials, and history for each driver.
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <span className="ronyx-pill">
              Hire: {profile.hire_date || "05/15/2018"}
            </span>
            <span className="ronyx-pill">
              Status: {profile.status ? profile.status.toUpperCase() : "ACTIVE"}
            </span>
            <span className="ronyx-pill">
              Score: {profile.driver_scorecard || "92/100"}
            </span>
            <span className="ronyx-pill">
              2024 Miles: {profile.miles_driven || "14,287"}
            </span>
            <span className="ronyx-pill">
              Driver: {profile.full_name || "Jimmy \"Bull\" Hauler"} #{profile.assigned_truck_number || "245"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Link href="/ronyx/loads" className="ronyx-action">
              Assign Load
            </Link>
            {profile.email ? (
              <a className="ronyx-action" href={`mailto:${profile.email}`}>
                Send Message
              </a>
            ) : (
              <button className="ronyx-action" onClick={() => setStatusMessage("Message queued (demo)")}>
                Send Message
              </button>
            )}
            <button className="ronyx-action" onClick={() => setStatusMessage("Incident logged (demo)")}>
              Log Incident
            </button>
            <Link href="/ronyx/payroll" className="ronyx-action">
              Run Settlement
            </Link>
            <button className="ronyx-action" onClick={() => setStatusMessage("Export queued (demo)")}>
              Export Profile
            </button>
          </div>
          {statusMessage && (
            <div style={{ marginTop: 8, color: "rgba(15,23,42,0.6)", fontSize: "0.85rem" }}>
              {statusMessage}
            </div>
          )}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { id: "compliance", label: "Compliance & Safety" },
              { id: "performance", label: "Assignment & Performance" },
              { id: "financials", label: "Financials" },
              { id: "history", label: "Full History" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`ronyx-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "compliance" && (
          <section className="ronyx-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
              Compliance & Safety
            </h2>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Critical Alerts</div>
              <ul style={{ paddingLeft: 18, color: "rgba(15,23,42,0.75)" }}>
                <li>
                  ⚠️ Medical card expires in 14 days (05/30/2024){" "}
                  <button className="btn-sm btn-warning">Upload Renewal</button>
                </li>
                <li>
                  ⚠️ Tanker endorsement renewal due in 30 days{" "}
                  <button className="btn-sm btn-warning">Schedule Training</button>
                </li>
                <li>✅ All other documents are current.</li>
              </ul>
            </div>
            <div className="ronyx-grid" style={{ rowGap: 14 }}>
              <div className="ronyx-card">
                <h3>Live Compliance Metrics</h3>
                <p className="ronyx-muted">HOS Current Week: 38/70 hrs</p>
                <p className="ronyx-muted">34‑Hr Restart: Complete</p>
                <p className="ronyx-muted">7‑Day CSA Score: 72 (↓2)</p>
                <p className="ronyx-muted">Last DVIR: 05/16/2024 • Repaired ✅</p>
              </div>
              <div className="ronyx-card">
                <h3>Document Vault</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {[
                    { label: "CDL Copy", url: profile.cdl_copy_url },
                    { label: "Medical Card", url: profile.medical_card_url },
                    { label: "Drug Test", url: profile.drug_test_results_url },
                    { label: "MVR Report", url: profile.background_check_url },
                    { label: "Training Certs", url: profile.training_certificates_url },
                  ].map((doc) =>
                    doc.url ? (
                      <a key={doc.label} className="ronyx-action" href={doc.url} target="_blank" rel="noreferrer">
                        {doc.label}
                      </a>
                    ) : (
                      <button key={doc.label} className="ronyx-action" onClick={() => setStatusMessage("No file on record")}>
                        {doc.label}
                      </button>
                    ),
                  )}
                </div>
                <p className="ronyx-muted" style={{ marginTop: 10 }}>
                  Documents are OCR-searchable and auto-tagged with expiry dates.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "performance" && (
          <section className="ronyx-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
              Assignment & Performance
            </h2>
            <div className="ronyx-grid" style={{ rowGap: 14 }}>
              <div className="ronyx-card">
                <h3>Current Assignment & Equipment</h3>
                <p className="ronyx-muted">
                  Assigned Truck: {profile.assigned_truck_number || "245"} • {profile.equipment_type || "Dump Trailer"}
                </p>
                <p className="ronyx-muted">
                  Status: {assignedLoad?.status || "AT PIT"} • Load {assignedLoad?.load_number || "#14287"}
                </p>
                <p className="ronyx-muted">
                  Material: {assignedLoad?.material || "#57 Gravel"} • Job Site: {assignedLoad?.job_site || "Oak Street"}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <Link href="/ronyx/tracking" className="ronyx-action">
                    View Live Location
                  </Link>
                  <Link href="/ronyx/loads" className="ronyx-action">
                    View Load Details
                  </Link>
                </div>
              </div>
              <div className="ronyx-card">
                <h3>Performance (Last 30 Days)</h3>
                <p className="ronyx-muted">Loads Completed: 42 • Avg Tons/Load: 21.5</p>
                <p className="ronyx-muted">Avg Cycle Time: 3.9h • On‑Time %: 96.7%</p>
                <p className="ronyx-muted">Deadhead %: 12 • Fuel Efficiency: 6.2 MPG</p>
                <p className="ronyx-muted">Scorecard: {profile.driver_scorecard || "92/100"} • Rank #3/24</p>
              </div>
              <div className="ronyx-card">
                <h3>Training & Coaching Queue</h3>
                <ul style={{ paddingLeft: 18, color: "rgba(15,23,42,0.75)" }}>
                  <li>Scheduled: Monthly Safety Meeting (06/01/2024)</li>
                  <li>Recommended: Defensive Driving Refresher</li>
                </ul>
                <button className="ronyx-action" onClick={() => setStatusMessage("Training assigned (demo)")}>
                  Assign Training Module
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "financials" && (
          <section className="ronyx-card" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
              Financials
            </h2>
            <div className="ronyx-grid" style={{ rowGap: 14 }}>
              <div className="ronyx-card">
                <h3>Current Pay Period (05/01 - 05/15)</h3>
                <p className="ronyx-muted">Miles: {profile.miles_driven || "1,842"} • Loads: 21 • Tonnage: 451.5</p>
                <p className="ronyx-muted">
                  Gross: {profile.pay_period_earnings || "$6,528.75"} • Deductions: {profile.deductions || "$1,305.75"}
                </p>
                <p className="ronyx-muted">Net Pay: $4,723.00</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/ronyx/payroll" className="ronyx-action">
                    Preview Settlement
                  </Link>
                  <Link href="/ronyx/payroll" className="ronyx-action">
                    Export for Payroll
                  </Link>
                </div>
              </div>
              <div className="ronyx-card">
                <h3>Cost & Reimbursement Tracker</h3>
                <p className="ronyx-muted">Fuel Spend: $2,112 • Avg MPG: 6.2</p>
                <p className="ronyx-muted">Tolls: $84.50 • Permits: $150</p>
                <p className="ronyx-muted">Pending Reimbursements: $47.25</p>
                <button className="ronyx-action" onClick={() => setStatusMessage("Reimbursement processed (demo)")}>
                  Process Reimbursement
                </button>
              </div>
            </div>
            <div style={{ marginTop: 16 }} className="ronyx-card">
              <h3>Settlement Week: May 20-24, 2024</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                <span className="ronyx-pill">WTD Haul Pay: $1,428.50</span>
                <span className="ronyx-pill">WTD Tons: 312.5</span>
                <span className="ronyx-pill">Avg Rate/Ton: $4.57</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="ronyx-action" onClick={() => setStatusMessage("Bonus added (demo)")}>
                  Add Bonus
                </button>
                <button className="ronyx-action" onClick={() => setStatusMessage("Deduction added (demo)")}>
                  Add Deduction
                </button>
                <button className="ronyx-action" onClick={() => setStatusMessage("Week locked (demo)")}>
                  Lock Week
                </button>
                <Link href="/ronyx/payroll" className="ronyx-action">
                  Run Payroll
                </Link>
                <button className="ronyx-action" onClick={() => setStatusMessage("Exported settlement (demo)")}>
                  Export
                </button>
              </div>
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                      <th style={{ padding: "8px 6px" }}>Date</th>
                      <th style={{ padding: "8px 6px" }}>Ticket #</th>
                      <th style={{ padding: "8px 6px" }}>Load #</th>
                      <th style={{ padding: "8px 6px" }}>Material</th>
                      <th style={{ padding: "8px 6px" }}>Net Tons</th>
                      <th style={{ padding: "8px 6px" }}>Rate</th>
                      <th style={{ padding: "8px 6px" }}>Amount</th>
                      <th style={{ padding: "8px 6px" }}>Status</th>
                      <th style={{ padding: "8px 6px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        date: "05/20/2024",
                        ticket: "VTK77891",
                        load: "#14287",
                        material: "#57 Gravel",
                        tons: "22.0",
                        rate: "$4.50/Ton",
                        amount: "$99.00",
                        status: "VERIFIED",
                        action: "View Ticket",
                      },
                      {
                        date: "05/20/2024",
                        ticket: "VTK77894",
                        load: "#14288",
                        material: "Fill Sand",
                        tons: "18.5",
                        rate: "$4.25/Ton",
                        amount: "$78.63",
                        status: "VERIFIED",
                        action: "View Ticket",
                      },
                      {
                        date: "05/21/2024",
                        ticket: "VTK77902",
                        load: "#14290",
                        material: "Crushed Rock",
                        tons: "24.0",
                        rate: "$5.00/Ton",
                        amount: "$120.00",
                        status: "VERIFIED",
                        action: "Adjust Rate",
                      },
                      {
                        date: "05/22/2024",
                        ticket: "--------",
                        load: "#14295",
                        material: "Topsoil",
                        tons: "--",
                        rate: "$4.75/Ton",
                        amount: "--",
                        status: "NO TICKET",
                        action: "Send Reminder",
                      },
                    ].map((row) => (
                      <tr key={`${row.ticket}-${row.load}`} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                        <td style={{ padding: "8px 6px" }}>{row.date}</td>
                        <td style={{ padding: "8px 6px" }}>{row.ticket}</td>
                        <td style={{ padding: "8px 6px" }}>{row.load}</td>
                        <td style={{ padding: "8px 6px" }}>{row.material}</td>
                        <td style={{ padding: "8px 6px" }}>{row.tons}</td>
                        <td style={{ padding: "8px 6px" }}>{row.rate}</td>
                        <td style={{ padding: "8px 6px" }}>{row.amount}</td>
                        <td style={{ padding: "8px 6px", fontWeight: 600 }}>{row.status}</td>
                        <td style={{ padding: "8px 6px" }}>
                          <button
                            className="btn-sm btn-secondary"
                            onClick={() => setStatusMessage(`${row.action} (demo)`)}
                          >
                            {row.action}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn-sm btn-secondary" onClick={() => setStatusMessage("Adjustment added (demo)")}>
                  Add Adjustment
                </button>
                <button className="btn-sm btn-secondary" onClick={() => setStatusMessage("Exported weekly settlement (demo)")}>
                  Export This Week
                </button>
                <button className="btn-sm btn-primary" onClick={() => setStatusMessage("Settlement locked and finalized (demo)")}>
                  Lock & Finalize
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Weekly Adjustments</div>
                <ul style={{ paddingLeft: 18, color: "rgba(15,23,42,0.75)" }}>
                  <li>05/21: Safety Bonus - $50.00 (Perfect DVIR week)</li>
                  <li>05/22: Deduction - $15.00 (Reimbursed toll)</li>
                </ul>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  Weekly Total (Current): $1,582.13
                </div>
                <div className="ronyx-muted">Breakdown: Haul $1,297.63 + Bonus $50 - Deduct $15</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }} className="ronyx-card">
              <h3>Ticket → Settlement Flow</h3>
              <pre
                style={{
                  background: "rgba(15, 23, 42, 0.06)",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: "0.85rem",
                  color: "rgba(15,23,42,0.8)",
                  overflowX: "auto",
                }}
              >
{`flowchart TD
  A["Driver Captures Scale Ticket Photo"] --> B{"System Processes Image via OCR and Validation"}
  B --> C["Data Posted to Office Dashboard Load Queue"]
  B --> D["Data Logged to Driver Settlement Record"]

  C --> E["Office Generates Customer Invoice"]
  D --> F["Friday Auto-Generate Driver Settlement"]

  E --> G["Faster Customer Payment"]
  F --> H["Accurate, Undisputed Driver Pay"]`}
              </pre>
            </div>
            <div style={{ marginTop: 16 }} className="ronyx-card">
              <h3>Friday Payroll Execution Flow</h3>
              <pre
                style={{
                  background: "rgba(15, 23, 42, 0.06)",
                  borderRadius: 12,
                  padding: 16,
                  fontSize: "0.85rem",
                  color: "rgba(15,23,42,0.8)",
                  overflowX: "auto",
                }}
              >
{`flowchart TD
  A["Thursday EOD\\nSystem Generates\\nSettlement Previews"] --> B["Friday 8 AM\\nOffice Reviews and\\nResolves Disputes"]

  B --> C{"For Each Driver\\nClick 'LOCK & PAY'"}
  C --> D["System Locks Items\\nCreates ACH/Check File\\nPosts to Accounting"]

  D --> E["Driver Notified\\nPayslip Available in App"]
  E --> F["Bank Processes\\nDirect Deposit"]`}
              </pre>
            </div>
            <div style={{ marginTop: 16 }} className="ronyx-card">
              <h3>Pay Rate Management</h3>
              <div className="ronyx-grid" style={{ rowGap: 16 }}>
                <div>
                  <label className="ronyx-label">Rate Name</label>
                  <input
                    className="ronyx-input"
                    value={rateForm.rate_name}
                    onChange={(e) => setRateForm({ ...rateForm, rate_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Rate Type</label>
                  <select
                    className="ronyx-input"
                    value={rateForm.rate_type}
                    onChange={(e) => setRateForm({ ...rateForm, rate_type: e.target.value })}
                  >
                    <option value="PER_TON">PER_TON</option>
                    <option value="PER_LOAD">PER_LOAD</option>
                    <option value="PER_MILE">PER_MILE</option>
                    <option value="PER_HOUR">PER_HOUR</option>
                  </select>
                </div>
                <div>
                  <label className="ronyx-label">Rate Value</label>
                  <input
                    className="ronyx-input"
                    type="number"
                    step="0.01"
                    value={rateForm.rate_value}
                    onChange={(e) => setRateForm({ ...rateForm, rate_value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Material Type</label>
                  <input
                    className="ronyx-input"
                    value={rateForm.material_type}
                    onChange={(e) => setRateForm({ ...rateForm, material_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Customer ID</label>
                  <input
                    className="ronyx-input"
                    value={rateForm.customer_id}
                    onChange={(e) => setRateForm({ ...rateForm, customer_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Job ID</label>
                  <input
                    className="ronyx-input"
                    value={rateForm.job_id}
                    onChange={(e) => setRateForm({ ...rateForm, job_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Equipment Type</label>
                  <input
                    className="ronyx-input"
                    value={rateForm.equipment_type}
                    onChange={(e) => setRateForm({ ...rateForm, equipment_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="ronyx-label">Effective Date</label>
                  <input
                    type="date"
                    className="ronyx-input"
                    value={rateForm.effective_date}
                    onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                  />
                </div>
                <div className="ronyx-row">
                  <span>Default Rate</span>
                  <input
                    type="checkbox"
                    checked={rateForm.is_default}
                    onChange={(e) => setRateForm({ ...rateForm, is_default: e.target.checked })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button className="ronyx-action" onClick={savePayRate}>
                  Save Rate
                </button>
                <button
                  className="ronyx-action"
                  onClick={() =>
                    setRateForm({
                      rate_name: "",
                      rate_type: "PER_TON",
                      rate_value: "",
                      material_type: "",
                      customer_id: "",
                      job_id: "",
                      equipment_type: "",
                      is_default: false,
                      effective_date: "",
                    })
                  }
                >
                  Clear
                </button>
              </div>
              <div style={{ marginTop: 16, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(15,23,42,0.12)" }}>
                      <th style={{ padding: "8px 6px" }}>Name</th>
                      <th style={{ padding: "8px 6px" }}>Type</th>
                      <th style={{ padding: "8px 6px" }}>Value</th>
                      <th style={{ padding: "8px 6px" }}>Material</th>
                      <th style={{ padding: "8px 6px" }}>Customer</th>
                      <th style={{ padding: "8px 6px" }}>Job</th>
                      <th style={{ padding: "8px 6px" }}>Equipment</th>
                      <th style={{ padding: "8px 6px" }}>Default</th>
                      <th style={{ padding: "8px 6px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payRates.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ padding: "10px 6px" }}>
                          No pay rates yet.
                        </td>
                      </tr>
                    )}
                    {payRates.map((rate) => (
                      <tr key={rate.id} style={{ borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                        <td style={{ padding: "8px 6px" }}>{rate.rate_name}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.rate_type}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.rate_value}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.material_type || "--"}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.customer_id || "--"}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.job_id || "--"}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.equipment_type || "--"}</td>
                        <td style={{ padding: "8px 6px" }}>{rate.is_default ? "✅" : "--"}</td>
                        <td style={{ padding: "8px 6px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {!rate.is_default && (
                            <button className="btn-sm btn-secondary" onClick={() => setDefaultRate(rate.id)}>
                              Set Default
                            </button>
                          )}
                          <button className="btn-sm btn-warning" onClick={() => deleteRate(rate.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section className="ronyx-card">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
              Full History & Notes
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {[
                "05/16/2024 07:15 • DVIR Submitted - Minor: Marker light out. Repaired 05/17.",
                "05/10/2024 • Performance Review - Score 92/100. Excellent customer feedback.",
                "04/22/2024 • Incident Report #442 - Minor backing incident. Coaching completed.",
                "03/15/2024 • Training Completed - Winter Driving Safety.",
              ].map((row) => (
                <div key={row} className="ronyx-row">
                  {row}
                </div>
              ))}
              <div className="ronyx-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Supervisor Notes</div>
                  <div className="ronyx-muted">{profile.supervisor_notes || "No notes yet."}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn-sm btn-secondary" onClick={() => setStatusMessage("Note added (demo)")}>
                    Add New Note
                  </button>
                  <button className="btn-sm btn-secondary" onClick={() => setStatusMessage("Call logged (demo)")}>
                    Log Phone Call
                  </button>
                </div>
              </div>
              <div className="ronyx-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Comms Log</div>
                  <div className="ronyx-muted">{profile.communication_log || "No recent communications."}</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
