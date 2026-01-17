"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type DriverOption = {
  id: string;
  name: string;
};

type HrProfile = {
  cdl_copy_uploaded: boolean;
  medical_certificate_uploaded: boolean;
  drug_test_pre_employment: boolean;
  drug_test_random: boolean;
  drug_test_post_accident: boolean;
  safety_training_completed: boolean;
  safety_training_date: string;
  hos_training_date: string;
  hazmat_training_date: string;
  fmcsa_clearinghouse_consent: boolean;
  assigned_vehicle_vin: string;
  assigned_vehicle_unit: string;
  trailer_numbers: string;
  equipment_inspection_logs: string;
  mileage_reports: string;
  accident_report_history: string;
  pay_rate_type: string;
  pay_rate_amount: string;
  deductions: string;
  tax_info: string;
  overtime_tracking: boolean;
  benefits: string;
  paid_time_off: string;
  accident_details: string;
  tickets_violations: string;
  safety_meeting_attendance: string;
  corrective_actions: string;
  employment_contract_signed: boolean;
  non_compete_signed: boolean;
  background_check_completed: boolean;
  drug_policy_ack: boolean;
  handbook_ack: boolean;
  review_date: string;
  reviewer: string;
  driver_scorecard: string;
  improvement_plan: string;
  disciplinary_actions: string;
  application_date: string;
  referral_source: string;
  prehire_checklist_complete: boolean;
  orientation_date: string;
  orientation_trainer: string;
  road_test_result: string;
  road_test_date: string;
  termination_date: string;
  termination_reason: string;
  equipment_returned: string;
  exit_interview_notes: string;
  final_paycheck_issued: boolean;
};

const emptyProfile: HrProfile = {
  cdl_copy_uploaded: false,
  medical_certificate_uploaded: false,
  drug_test_pre_employment: false,
  drug_test_random: false,
  drug_test_post_accident: false,
  safety_training_completed: false,
  safety_training_date: "",
  hos_training_date: "",
  hazmat_training_date: "",
  fmcsa_clearinghouse_consent: false,
  assigned_vehicle_vin: "",
  assigned_vehicle_unit: "",
  trailer_numbers: "",
  equipment_inspection_logs: "",
  mileage_reports: "",
  accident_report_history: "",
  pay_rate_type: "",
  pay_rate_amount: "",
  deductions: "",
  tax_info: "",
  overtime_tracking: false,
  benefits: "",
  paid_time_off: "",
  accident_details: "",
  tickets_violations: "",
  safety_meeting_attendance: "",
  corrective_actions: "",
  employment_contract_signed: false,
  non_compete_signed: false,
  background_check_completed: false,
  drug_policy_ack: false,
  handbook_ack: false,
  review_date: "",
  reviewer: "",
  driver_scorecard: "",
  improvement_plan: "",
  disciplinary_actions: "",
  application_date: "",
  referral_source: "",
  prehire_checklist_complete: false,
  orientation_date: "",
  orientation_trainer: "",
  road_test_result: "",
  road_test_date: "",
  termination_date: "",
  termination_reason: "",
  equipment_returned: "",
  exit_interview_notes: "",
  final_paycheck_issued: false,
};

export default function RonyxHrCompliancePage() {
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [profile, setProfile] = useState<HrProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    void loadDrivers();
  }, []);

  useEffect(() => {
    if (!selectedDriverId) return;
    void loadProfile(selectedDriverId);
  }, [selectedDriverId]);

  async function loadDrivers() {
    setLoading(true);
    try {
      const res = await fetch("/api/ronyx/hr/drivers");
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
  }

  async function loadProfile(driverId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/ronyx/hr/profile?driverId=${driverId}`);
      const data = await res.json();
      setProfile({ ...emptyProfile, ...(data.profile || {}) });
    } catch (err) {
      console.error("Failed to load HR profile", err);
      setProfile(emptyProfile);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (!selectedDriverId) return;
    setSaving(true);
    setStatusMessage("");
    try {
      const res = await fetch(`/api/ronyx/hr/profile?driverId=${selectedDriverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setProfile({ ...emptyProfile, ...(data.profile || {}) });
      setStatusMessage("Saved");
    } catch (err) {
      console.error("Failed to save HR profile", err);
      setStatusMessage("Save failed. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage(""), 3000);
    }
  }

  const updateField = (field: keyof HrProfile, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --ronyx-success: #16a34a;
          --ronyx-warning: #f59e0b;
          --ronyx-danger: #ef4444;
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
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
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
        .status {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
        }
        .status.good {
          color: var(--ronyx-success);
          background: rgba(22, 163, 74, 0.12);
        }
        .status.warn {
          color: var(--ronyx-warning);
          background: rgba(245, 158, 11, 0.12);
        }
        .status.bad {
          color: var(--ronyx-danger);
          background: rgba(239, 68, 68, 0.12);
        }
        .ronyx-checklist {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ronyx-check {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .ronyx-check label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }
        .ronyx-check input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--ronyx-accent);
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16 }}>
          <div>
            <p className="ronyx-pill">Ronyx TMS</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>HR & TXDOT Compliance</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Track driver qualification files, TXDOT/FMCSA compliance, and document expirations.
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

        <section className="ronyx-grid" style={{ marginBottom: 20 }}>
          {[
            { label: "Compliant Drivers", value: "42", status: "good" },
            { label: "Expiring Soon", value: "6", status: "warn" },
            { label: "Missing Docs", value: "3", status: "bad" },
            { label: "TXDOT Audits Ready", value: "100%", status: "good" },
          ].map((stat) => (
            <div key={stat.label} className="ronyx-card">
              <div style={{ fontSize: "0.75rem", color: "rgba(15,23,42,0.6)", textTransform: "uppercase" }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "1.9rem", fontWeight: 800, marginTop: 6 }}>{stat.value}</div>
              <span className={`status ${stat.status}`} style={{ marginTop: 8, display: "inline-flex" }}>
                {stat.status === "good" ? "Compliant" : stat.status === "warn" ? "Expiring" : "Missing"}
              </span>
            </div>
          ))}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Driver Profile Information</h2>
          <div className="ronyx-grid">
            {[
              "Driver Name",
              "Employee / Contractor ID",
              "Status (Active / Inactive / Pending)",
              "Hire Date / Termination Date",
              "Position / Role",
              "License Number & Class",
              "License Expiration Date",
              "State of Issuance",
              "Endorsements / Restrictions",
              "Driver Contact Info",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span className="status good">Tracked</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Required Driver Documents</h2>
          <div className="ronyx-grid">
            {[
              "Driver License (Front & Back)",
              "DOT Medical Card",
              "MVR (Motor Vehicle Record)",
              "Social Security / ID Copy",
              "TWIC Card",
              "Passport / Work Authorization",
              "W‑2 or 1099 Uploads",
              "Employment Application & Resume",
              "Driver File Checklist",
              "Signature Forms (Drug/Alcohol, Handbook)",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">Upload</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>
            TXDOT / FMCSA Compliance Documents
          </h2>
          <div className="ronyx-grid">
            {[
              "DQF Checklist",
              "Annual MVR Review",
              "Road Test Certificate",
              "Previous Employment Verification",
              "Drug & Alcohol Clearinghouse Results",
              "Pre‑Employment Drug Test",
              "Random / Post‑Accident Logs",
              "HOS Violations / Training Logs",
              "Incident / Accident Reports",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">View</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Training & Certifications</h2>
          <div className="ronyx-grid">
            {[
              "Orientation Status",
              "Safety Training Records",
              "HazMat Training Certificate",
              "ELD / Logbook Training",
              "Annual Refresher Dates",
              "Trainer Signature",
              "Upload Training Certificates",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">Manage</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Document Management & Tracking</h2>
          <div className="ronyx-grid">
            {[
              "Upload Button for each category",
              "Document Expiration Tracker",
              "Compliance Status Bar (Green/Yellow/Red)",
              "Auto Alerts for Renewals",
              "Search & Filter by Driver/Expiration/Type",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span className="status good">Enabled</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Reports & Export Options</h2>
          <div className="ronyx-grid">
            {[
              "Driver Compliance Summary Report",
              "Upcoming Expiration Report",
              "Non‑Compliant Driver List",
              "Export to PDF / Excel",
              "Audit‑Ready Folder Download",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <button className="ronyx-action">Generate</button>
              </div>
            ))}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>CDL & Medical Compliance</h2>
          <div className="ronyx-grid">
            <div className="ronyx-row">
              <span>CDL copy uploaded</span>
              <input
                type="checkbox"
                checked={profile.cdl_copy_uploaded}
                onChange={(e) => updateField("cdl_copy_uploaded", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Medical examiner’s certificate uploaded</span>
              <input
                type="checkbox"
                checked={profile.medical_certificate_uploaded}
                onChange={(e) => updateField("medical_certificate_uploaded", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Drug test (pre-employment)</span>
              <input
                type="checkbox"
                checked={profile.drug_test_pre_employment}
                onChange={(e) => updateField("drug_test_pre_employment", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Drug test (random)</span>
              <input
                type="checkbox"
                checked={profile.drug_test_random}
                onChange={(e) => updateField("drug_test_random", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Drug test (post-accident)</span>
              <input
                type="checkbox"
                checked={profile.drug_test_post_accident}
                onChange={(e) => updateField("drug_test_post_accident", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Safety training completed</span>
              <input
                type="checkbox"
                checked={profile.safety_training_completed}
                onChange={(e) => updateField("safety_training_completed", e.target.checked)}
              />
            </div>
            <div>
              <label className="ronyx-label">Safety training date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.safety_training_date}
                onChange={(e) => updateField("safety_training_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">HOS training date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.hos_training_date}
                onChange={(e) => updateField("hos_training_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Hazmat training date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.hazmat_training_date}
                onChange={(e) => updateField("hazmat_training_date", e.target.value)}
              />
            </div>
            <div className="ronyx-row">
              <span>FMCSA Clearinghouse consent record</span>
              <input
                type="checkbox"
                checked={profile.fmcsa_clearinghouse_consent}
                onChange={(e) => updateField("fmcsa_clearinghouse_consent", e.target.checked)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Equipment & Assignment Tracking</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Assigned vehicle VIN</label>
              <input
                className="ronyx-input"
                value={profile.assigned_vehicle_vin}
                onChange={(e) => updateField("assigned_vehicle_vin", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Assigned vehicle unit</label>
              <input
                className="ronyx-input"
                value={profile.assigned_vehicle_unit}
                onChange={(e) => updateField("assigned_vehicle_unit", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Trailer numbers</label>
              <input
                className="ronyx-input"
                value={profile.trailer_numbers}
                onChange={(e) => updateField("trailer_numbers", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Equipment inspection logs</label>
              <textarea
                className="ronyx-textarea"
                value={profile.equipment_inspection_logs}
                onChange={(e) => updateField("equipment_inspection_logs", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Mileage reports (IFTA / maintenance)</label>
              <textarea
                className="ronyx-textarea"
                value={profile.mileage_reports}
                onChange={(e) => updateField("mileage_reports", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Accident / incident report history</label>
              <textarea
                className="ronyx-textarea"
                value={profile.accident_report_history}
                onChange={(e) => updateField("accident_report_history", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Payroll & Benefits</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Pay rate type</label>
              <select
                className="ronyx-input"
                value={profile.pay_rate_type}
                onChange={(e) => updateField("pay_rate_type", e.target.value)}
              >
                <option value="">Select</option>
                <option value="cents_per_mile">Cents per mile</option>
                <option value="load_percent">Load %</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
            <div>
              <label className="ronyx-label">Pay rate amount</label>
              <input
                className="ronyx-input"
                type="number"
                value={profile.pay_rate_amount}
                onChange={(e) => updateField("pay_rate_amount", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Deductions</label>
              <textarea
                className="ronyx-textarea"
                value={profile.deductions}
                onChange={(e) => updateField("deductions", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Tax info (W-4, 1099)</label>
              <textarea
                className="ronyx-textarea"
                value={profile.tax_info}
                onChange={(e) => updateField("tax_info", e.target.value)}
              />
            </div>
            <div className="ronyx-row">
              <span>Overtime tracking</span>
              <input
                type="checkbox"
                checked={profile.overtime_tracking}
                onChange={(e) => updateField("overtime_tracking", e.target.checked)}
              />
            </div>
            <div>
              <label className="ronyx-label">Benefits (medical, dental, 401k)</label>
              <textarea
                className="ronyx-textarea"
                value={profile.benefits}
                onChange={(e) => updateField("benefits", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Paid time off (vacation, sick days)</label>
              <textarea
                className="ronyx-textarea"
                value={profile.paid_time_off}
                onChange={(e) => updateField("paid_time_off", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Safety & Incident Records</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Accident report details</label>
              <textarea
                className="ronyx-textarea"
                value={profile.accident_details}
                onChange={(e) => updateField("accident_details", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Tickets / violations</label>
              <textarea
                className="ronyx-textarea"
                value={profile.tickets_violations}
                onChange={(e) => updateField("tickets_violations", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Safety meeting attendance</label>
              <textarea
                className="ronyx-textarea"
                value={profile.safety_meeting_attendance}
                onChange={(e) => updateField("safety_meeting_attendance", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Corrective actions taken</label>
              <textarea
                className="ronyx-textarea"
                value={profile.corrective_actions}
                onChange={(e) => updateField("corrective_actions", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Legal & Compliance Documents</h2>
          <div className="ronyx-grid">
            <div className="ronyx-row">
              <span>Signed employment contract</span>
              <input
                type="checkbox"
                checked={profile.employment_contract_signed}
                onChange={(e) => updateField("employment_contract_signed", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Non-compete / confidentiality agreements</span>
              <input
                type="checkbox"
                checked={profile.non_compete_signed}
                onChange={(e) => updateField("non_compete_signed", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Background check completion</span>
              <input
                type="checkbox"
                checked={profile.background_check_completed}
                onChange={(e) => updateField("background_check_completed", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Drug/alcohol policy acknowledgment</span>
              <input
                type="checkbox"
                checked={profile.drug_policy_ack}
                onChange={(e) => updateField("drug_policy_ack", e.target.checked)}
              />
            </div>
            <div className="ronyx-row">
              <span>Driver handbook acknowledgment</span>
              <input
                type="checkbox"
                checked={profile.handbook_ack}
                onChange={(e) => updateField("handbook_ack", e.target.checked)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Performance & Reviews</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Review date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.review_date}
                onChange={(e) => updateField("review_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Reviewer (manager / supervisor)</label>
              <input
                className="ronyx-input"
                value={profile.reviewer}
                onChange={(e) => updateField("reviewer", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Driver scorecard</label>
              <textarea
                className="ronyx-textarea"
                value={profile.driver_scorecard}
                onChange={(e) => updateField("driver_scorecard", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Training or improvement plan</label>
              <textarea
                className="ronyx-textarea"
                value={profile.improvement_plan}
                onChange={(e) => updateField("improvement_plan", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Disciplinary actions</label>
              <textarea
                className="ronyx-textarea"
                value={profile.disciplinary_actions}
                onChange={(e) => updateField("disciplinary_actions", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Recruiting & Onboarding</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Application date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.application_date}
                onChange={(e) => updateField("application_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Referral source</label>
              <input
                className="ronyx-input"
                value={profile.referral_source}
                onChange={(e) => updateField("referral_source", e.target.value)}
              />
            </div>
            <div className="ronyx-row">
              <span>Pre-hire checklist complete</span>
              <input
                type="checkbox"
                checked={profile.prehire_checklist_complete}
                onChange={(e) => updateField("prehire_checklist_complete", e.target.checked)}
              />
            </div>
            <div>
              <label className="ronyx-label">Orientation date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.orientation_date}
                onChange={(e) => updateField("orientation_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Orientation trainer name</label>
              <input
                className="ronyx-input"
                value={profile.orientation_trainer}
                onChange={(e) => updateField("orientation_trainer", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Road test result</label>
              <input
                className="ronyx-input"
                value={profile.road_test_result}
                onChange={(e) => updateField("road_test_result", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Road test date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.road_test_date}
                onChange={(e) => updateField("road_test_date", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Offboarding</h2>
          <div className="ronyx-grid">
            <div>
              <label className="ronyx-label">Termination date</label>
              <input
                type="date"
                className="ronyx-input"
                value={profile.termination_date}
                onChange={(e) => updateField("termination_date", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Termination reason</label>
              <input
                className="ronyx-input"
                value={profile.termination_reason}
                onChange={(e) => updateField("termination_reason", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Equipment returned</label>
              <textarea
                className="ronyx-textarea"
                value={profile.equipment_returned}
                onChange={(e) => updateField("equipment_returned", e.target.value)}
              />
            </div>
            <div>
              <label className="ronyx-label">Exit interview notes</label>
              <textarea
                className="ronyx-textarea"
                value={profile.exit_interview_notes}
                onChange={(e) => updateField("exit_interview_notes", e.target.value)}
              />
            </div>
            <div className="ronyx-row">
              <span>Final paycheck issued</span>
              <input
                type="checkbox"
                checked={profile.final_paycheck_issued}
                onChange={(e) => updateField("final_paycheck_issued", e.target.checked)}
              />
            </div>
          </div>
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Optional Add‑Ons</h2>
          <div className="ronyx-grid">
            {[
              "Link to TXDOT Portal / Clearinghouse",
              "Digital Signature Support",
              "Auto‑Reminders 30/60/90 days before expiration",
              "HR Notes / Disciplinary Actions Log",
              "Driver Pay Rate / Classification Record",
            ].map((item) => (
              <div key={item} className="ronyx-row">
                <span>{item}</span>
                <span className="status warn">Optional</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
