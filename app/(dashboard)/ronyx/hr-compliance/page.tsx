"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

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
  const [complianceSearch, setComplianceSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [wizardStep, setWizardStep] = useState(1);
  const [driverType, setDriverType] = useState("company");
  const [docChecklist, setDocChecklist] = useState<Record<string, boolean>>({
    cdl: false,
    medical: false,
    mvr: false,
    drug: false,
    training: false,
  });
  const [showMissingDocs, setShowMissingDocs] = useState(false);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [batchAction, setBatchAction] = useState("");
  const [bulkQueue, setBulkQueue] = useState<
    { name: string; status: string; action?: string }[]
  >([{ name: "perez_medical_card.jpg", status: "Matched: D. Perez (Driver #12)", action: "Approve" }]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [auditOptions, setAuditOptions] = useState({
    full: true,
    single: false,
    dateRange: false,
    driver: "",
    startDate: "2024-01-01",
    endDate: "2024-05-17",
  });
  const [auditStatus, setAuditStatus] = useState("");
  const [qrStatus, setQrStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [importType, setImportType] = useState("excel");
  const [inviteStatus, setInviteStatus] = useState("");
  const [batchStatus, setBatchStatus] = useState("");
  const [complianceActionMessage, setComplianceActionMessage] = useState("");
  const [cameraDocType, setCameraDocType] = useState("");
  const bulkInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const complianceRows = [
    {
      driver: "D. Perez",
      cdl: { label: "VALID", expires: "06/15", status: "good" },
      medical: { label: "EXPIRED", expires: "05/17", status: "expired" },
      mvr: { label: "VALID", expires: "", status: "good" },
      drug: { label: "CLEAR", expires: "", status: "good" },
      training: { label: "DUE", expires: "", status: "warning" },
      overall: "NON-COMPLIANT",
      tag: "SUSPENDED",
      status: "non-compliant",
    },
    {
      driver: "J. Smith",
      cdl: { label: "5 DAYS", expires: "05/22", status: "expiring" },
      medical: { label: "VALID", expires: "", status: "good" },
      mvr: { label: "VALID", expires: "", status: "good" },
      drug: { label: "CLEAR", expires: "", status: "good" },
      training: { label: "CURRENT", expires: "", status: "good" },
      overall: "EXPIRING",
      tag: "",
      status: "expiring",
    },
    {
      driver: "L. Owens",
      cdl: { label: "VALID", expires: "09/14", status: "good" },
      medical: { label: "VALID", expires: "12/10", status: "good" },
      mvr: { label: "VALID", expires: "11/21", status: "good" },
      drug: { label: "CLEAR", expires: "", status: "good" },
      training: { label: "CURRENT", expires: "", status: "good" },
      overall: "COMPLIANT",
      tag: "",
      status: "compliant",
    },
  ];

  const filteredComplianceRows = complianceRows.filter((row) => {
    const matchesSearch = row.driver.toLowerCase().includes(complianceSearch.toLowerCase());
    const matchesFilter =
      complianceFilter === "all" ? true : complianceFilter === row.status;
    return matchesSearch && matchesFilter;
  });

  const setComplianceView = (nextFilter: string) => {
    setComplianceFilter(nextFilter);
  };

  const nextWizardStep = (nextStep: number) => {
    if (wizardStep === 2 && (!docChecklist.cdl || !docChecklist.medical)) {
      setShowMissingDocs(true);
      return;
    }
    setShowMissingDocs(false);
    setWizardStep(nextStep);
  };

  const prevWizardStep = (prevStep: number) => {
    setShowMissingDocs(false);
    setWizardStep(prevStep);
  };

  const toggleDoc = (key: string) => {
    setDocChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllDrivers = () => {
    setSelectedDrivers(["D. Perez", "J. Smith", "S. Grant", "L. Owens"]);
  };

  const selectNonCompliantDrivers = () => {
    setSelectedDrivers(["D. Perez"]);
  };

  const selectExpiringDrivers = () => {
    setSelectedDrivers(["J. Smith"]);
  };

  const clearSelectedDrivers = () => {
    setSelectedDrivers([]);
  };

  const handleBulkFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    await fetch("/api/ronyx/compliance/bulk-upload", {
      method: "POST",
      body: formData,
    });
    const newItems = Array.from(files).map((file) => ({
      name: file.name,
      status: "Queued for OCR + matching",
      action: "Approve",
    }));
    setBulkQueue((prev) => [...newItems, ...prev]);
    setBulkMessage(`Queued ${files.length} file(s) for processing.`);
  };

  const handleAuditPackage = async () => {
    await fetch("/api/ronyx/compliance/audit-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(auditOptions),
    });
    setAuditStatus("Audit package generation started.");
  };

  const handleQrCheckIn = async () => {
    await fetch("/api/ronyx/compliance/qr-checkin", { method: "POST" });
    setQrStatus("QR check-in session opened.");
  };

  const handleImport = async (type: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", files[0]);
    await fetch("/api/ronyx/compliance/import", {
      method: "POST",
      body: formData,
    });
    setImportStatus(`Import queued for ${type.toUpperCase()} data.`);
  };

  const handleInviteDrivers = async () => {
    await fetch("/api/ronyx/compliance/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drivers: selectedDrivers }),
    });
    setInviteStatus(`Invites sent to ${selectedDrivers.length || 0} driver(s).`);
  };

  const handleBatchExecute = async () => {
    if (!batchAction || selectedDrivers.length === 0) return;
    await fetch("/api/ronyx/compliance/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: batchAction, drivers: selectedDrivers }),
    });
    setBatchStatus(`Batch action "${batchAction}" queued for ${selectedDrivers.length} driver(s).`);
  };

  const handleDriverAction = (driver: string, action: string) => {
    setComplianceActionMessage(`${action} action queued for ${driver}.`);
  };

  const openCameraCapture = (docType: string) => {
    setCameraDocType(docType);
    cameraInputRef.current?.click();
  };

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    if (!selectedDriverId) return;
    void loadProfile(selectedDriverId);
  }, [selectedDriverId]);

  const loadDrivers = useCallback(async () => {
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
  }, [selectedDriverId]);

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
          --ronyx-black: #0f172a;
          --ronyx-carbon: #111827;
          --ronyx-steel: #1f2937;
          --ronyx-border: rgba(59, 130, 246, 0.35);
          --ronyx-accent: #3b82f6;
          --ronyx-success: #22c55e;
          --ronyx-warning: #f59e0b;
          --ronyx-danger: #ef4444;
          --ronyx-panel: #0b1220;
          --ronyx-panel-light: #0f172a;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(59, 130, 246, 0.22), transparent 55%), #0b1020;
          color: #e2e8f0;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.98));
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.35), inset 0 0 0 1px rgba(148, 163, 184, 0.08);
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.6);
          font-size: 0.8rem;
          color: #1d4ed8;
          background: rgba(59, 130, 246, 0.12);
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(59, 130, 246, 0.2);
          color: #0f172a;
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.4);
          color: #0f172a;
          text-decoration: none;
          font-weight: 700;
          background: rgba(59, 130, 246, 0.12);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
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
        .compliance-header {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 18px;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
          margin-bottom: 20px;
          display: grid;
          gap: 12px;
        }
        .compliance-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .compliance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .metric-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 16px;
          display: grid;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
        }
        .metric-card.critical {
          border-color: rgba(239, 68, 68, 0.45);
        }
        .metric-card.warning {
          border-color: rgba(245, 158, 11, 0.45);
        }
        .metric-card.good {
          border-color: rgba(22, 163, 74, 0.45);
        }
        .metric-card.audit {
          border-color: rgba(29, 78, 216, 0.4);
        }
        .metric-value {
          font-size: 2rem;
          font-weight: 800;
        }
        .alerts-panel {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid var(--ronyx-border);
          padding: 16px;
          margin-bottom: 20px;
          display: grid;
          gap: 12px;
        }
        .alert-item {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          background: #f8fafc;
        }
        .alert-item.critical {
          border-color: rgba(239, 68, 68, 0.45);
        }
        .alert-item.warning {
          border-color: rgba(245, 158, 11, 0.45);
        }
        .badge-danger {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .matrix-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          align-items: center;
        }
        .matrix-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .matrix-table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(15, 23, 42, 0.08);
        }
        .matrix-table th,
        .matrix-table td {
          padding: 12px 10px;
          text-align: left;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }
        .status-badge {
          display: inline-flex;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .status-badge.good {
          background: rgba(22, 163, 74, 0.12);
          color: #166534;
        }
        .status-badge.expired {
          background: rgba(239, 68, 68, 0.12);
          color: #b91c1c;
        }
        .status-badge.expiring {
          background: rgba(245, 158, 11, 0.14);
          color: #92400e;
        }
        .status-badge.warning {
          background: rgba(245, 158, 11, 0.12);
          color: #92400e;
        }
        .status-overall.bad {
          color: #b91c1c;
          font-weight: 700;
        }
        .status-overall.warning {
          color: #92400e;
          font-weight: 700;
        }
        .status-overall.good {
          color: #166534;
          font-weight: 700;
        }
        .bulk-upload {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(226, 232, 240, 0.9));
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 16px;
          margin-bottom: 20px;
          display: grid;
          gap: 12px;
        }
        .upload-zone {
          border: 1px dashed rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          background: #ffffff;
        }
        .processing-queue {
          display: grid;
          gap: 8px;
        }
        .queue-item {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(59, 130, 246, 0.22);
          border-radius: 12px;
          padding: 10px 12px;
          background: #ffffff;
        }
        .audit-generator {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(226, 232, 240, 0.9));
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 16px;
          margin-bottom: 20px;
        }
        .audit-options {
          display: grid;
          gap: 10px;
          margin-bottom: 12px;
        }
        .audit-option {
          display: grid;
          gap: 6px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.25);
          background: #ffffff;
        }
        .compliance-rules {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(226, 232, 240, 0.9));
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 16px;
          margin-bottom: 20px;
        }
        .rule-item {
          display: grid;
          gap: 6px;
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 8px;
          background: #ffffff;
        }
        .compliance-mobile {
          background: #ffffff;
          color: #0f172a;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
        }
        .onboarding-wizard,
        .mobile-capture,
        .data-import,
        .ai-assist,
        .self-service,
        .batch-operations,
        .validation-rules {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(226, 232, 240, 0.9));
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.35);
          padding: 16px;
          margin-bottom: 20px;
          display: grid;
          gap: 12px;
        }
        .progress-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 8px;
        }
        .progress-step {
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.25);
          font-size: 0.75rem;
          text-align: center;
          color: #334155;
        }
        .progress-step.active {
          background: rgba(29, 78, 216, 0.12);
          border-color: rgba(29, 78, 216, 0.4);
          font-weight: 700;
        }
        .wizard-step {
          display: none;
        }
        .wizard-step.active {
          display: grid;
          gap: 12px;
        }
        .document-checklist {
          display: grid;
          gap: 10px;
        }
        .checklist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.25);
          background: rgba(15, 23, 42, 0.75);
        }
        .doc-actions {
          display: flex;
          gap: 8px;
        }
        .completion-warning {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.16);
          color: #92400e;
        }
        .qr-section,
        .photo-upload,
        .import-options,
        .import-template,
        .portal-preview,
        .invite-system,
        .validation-log {
          display: grid;
          gap: 10px;
        }
        .import-options {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        .import-card {
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.25);
          padding: 12px;
          background: rgba(15, 23, 42, 0.75);
          cursor: pointer;
        }
        .ai-feature {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
        }
        .permission-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }
        .batch-select,
        .batch-actions {
          border-radius: 12px;
          border: 1px solid rgba(15, 23, 42, 0.12);
          padding: 12px;
          background: #f8fafc;
          display: grid;
          gap: 10px;
        }
        .validation-rules .rule-list {
          display: grid;
          gap: 8px;
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

        <section className="compliance-header">
          <div className="compliance-header-top">
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>
                TXDOT/FMCSA Compliance Command Center
              </h2>
              <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
                Live Status: 🟢 42 Compliant | 🟡 6 Expiring Soon | 🔴 3 Non-Compliant
              </p>
            </div>
            <button className="ronyx-action primary">Run Audit Scan</button>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "rgba(15,23,42,0.7)" }}>
            <span>Last Scan: Today 06:00 AM</span>
            <span>Next Audit Due: 07/15/2024</span>
            <span>⚠️ Active Alerts: 2 drivers suspended, 1 medical card expired TODAY</span>
          </div>
        </section>

        <section className="compliance-grid">
          <div className="metric-card critical" onClick={() => setComplianceView("non-compliant")}>
            <div className="metric-icon">🔴</div>
            <div className="metric-value">3</div>
            <div className="metric-label">NON-COMPLIANT</div>
            <div className="metric-sub">CANNOT DRIVE</div>
          </div>
          <div className="metric-card warning" onClick={() => setComplianceView("expiring")}>
            <div className="metric-icon">🟡</div>
            <div className="metric-value">6</div>
            <div className="metric-label">EXPIRING ≤7 DAYS</div>
            <div className="metric-sub">2 Medical, 3 CDL, 1 MVR</div>
          </div>
          <div className="metric-card good" onClick={() => setComplianceView("compliant")}>
            <div className="metric-icon">🟢</div>
            <div className="metric-value">42</div>
            <div className="metric-label">FULLY COMPLIANT</div>
            <div className="metric-sub">Good to drive</div>
          </div>
          <div className="metric-card audit">
            <div className="metric-icon">📋</div>
            <div className="metric-value">100%</div>
            <div className="metric-label">AUDIT READY</div>
            <button className="ronyx-action primary" onClick={handleAuditPackage}>
              Generate Package
            </button>
          </div>
        </section>

        <section className="alerts-panel">
          <h3>🚨 Required Actions (Today)</h3>
          <div className="alert-item critical">
            <div className="alert-icon">⛔</div>
            <div className="alert-content">
              <strong>D. Perez - Medical Card Expired</strong>
              <p>
                Medical card expired 05/17/2024. Driver is{" "}
                <span className="badge-danger">SUSPENDED</span>.
              </p>
              <div className="alert-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ronyx-action">Suspend from Dispatch</button>
                <button className="ronyx-action primary">Upload New Card</button>
                <button className="ronyx-action">Contact Driver</button>
              </div>
            </div>
          </div>
          <div className="alert-item warning">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <strong>J. Smith - CDL Expires in 5 Days</strong>
              <p>CDL expires 05/22/2024. Renewal not started.</p>
              <div className="alert-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ronyx-action">Send Reminder</button>
                <button className="ronyx-action">Schedule Renewal</button>
              </div>
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <div className="matrix-header">
            <h3>Driver Compliance Status</h3>
            <div className="matrix-controls">
              <input
                className="ronyx-input"
                placeholder="Search drivers..."
                value={complianceSearch}
                onChange={(event) => setComplianceSearch(event.target.value)}
              />
              <select
                className="ronyx-input"
                value={complianceFilter}
                onChange={(event) => setComplianceFilter(event.target.value)}
              >
                <option value="all">All Status</option>
                <option value="non-compliant">Non-Compliant</option>
                <option value="expiring">Expiring Soon</option>
                <option value="compliant">Compliant</option>
              </select>
              <button className="ronyx-action">Export to Excel</button>
            </div>
          </div>
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>CDL</th>
                <th>Medical</th>
                <th>MVR</th>
                <th>Drug Test</th>
                <th>Training</th>
                <th>Overall</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplianceRows.map((row) => (
                <tr key={row.driver} className={row.status}>
                  <td>
                    {row.driver} {row.tag ? <span className="badge-danger">{row.tag}</span> : null}
                  </td>
                  <td>
                    <span className={`status-badge ${row.cdl.status}`}>{row.cdl.label}</span>
                    <br />
                    <small>{row.cdl.expires ? `Exp: ${row.cdl.expires}` : ""}</small>
                  </td>
                  <td>
                    <span className={`status-badge ${row.medical.status}`}>{row.medical.label}</span>
                    <br />
                    <small>{row.medical.expires}</small>
                  </td>
                  <td>
                    <span className={`status-badge ${row.mvr.status}`}>{row.mvr.label}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${row.drug.status}`}>{row.drug.label}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${row.training.status}`}>{row.training.label}</span>
                  </td>
                  <td>
                    <span
                      className={`status-overall ${
                        row.status === "non-compliant"
                          ? "bad"
                          : row.status === "expiring"
                          ? "warning"
                          : "good"
                      }`}
                    >
                      {row.overall}
                    </span>
                  </td>
                  <td>
                    <button className="ronyx-action" onClick={() => handleDriverAction(row.driver, "Suspend")}>
                      Suspend
                    </button>
                    <button
                      className="ronyx-action primary"
                      style={{ marginLeft: 6 }}
                      onClick={() => handleDriverAction(row.driver, "Fix")}
                    >
                      Fix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {complianceActionMessage && (
            <div className="ronyx-tag" style={{ marginTop: 12 }}>
              {complianceActionMessage}
            </div>
          )}
        </section>

        <section className="bulk-upload">
          <h3>📁 Bulk Document Processing</h3>
          <div
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void handleBulkFiles(e.dataTransfer.files);
            }}
          >
            <div className="upload-icon">📤</div>
            <h4>Drag & Drop Driver Documents Here</h4>
            <p>The system will automatically:</p>
            <ul style={{ textAlign: "left", margin: "0 auto", maxWidth: 360 }}>
              <li>✅ Identify document type (CDL, Medical, MVR, etc.)</li>
              <li>✅ Extract expiration dates with OCR</li>
              <li>✅ Match to correct driver</li>
              <li>✅ Update compliance status automatically</li>
            </ul>
            <button
              className="ronyx-action primary"
              style={{ marginTop: 8 }}
              onClick={() => bulkInputRef.current?.click()}
            >
              Select Files
            </button>
            <p className="upload-note">Supports: PDF, JPG, PNG. Max 50 files, 10MB each.</p>
          </div>
          <input
            ref={bulkInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              void handleBulkFiles(e.target.files);
              if (bulkInputRef.current) bulkInputRef.current.value = "";
            }}
          />
          {bulkMessage && <div className="ronyx-tag">{bulkMessage}</div>}
          <div className="processing-queue">
            <h4>Processing Queue ({bulkQueue.length} files)</h4>
            {bulkQueue.map((item) => (
              <div key={item.name} className="queue-item">
                <span className="file-name">{item.name}</span>
                <span className="file-status">→ {item.status}</span>
                <span className="file-action">
                  <button
                    className="ronyx-action primary"
                    onClick={() =>
                      setBulkQueue((prev) =>
                        prev.map((entry) =>
                          entry.name === item.name ? { ...entry, status: "Approved & posted" } : entry,
                        ),
                      )
                    }
                  >
                    {item.action || "Approve"}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="audit-generator">
          <h3>📋 One-Click Audit Package</h3>
          <div className="audit-options">
            <div className="audit-option">
              <label>
                <input
                  type="checkbox"
                  checked={auditOptions.full}
                  onChange={(e) => setAuditOptions((prev) => ({ ...prev, full: e.target.checked }))}
                />{" "}
                Full TXDOT Audit Package
              </label>
              <span className="audit-desc">All drivers, all documents, 6-month HOS logs</span>
            </div>
            <div className="audit-option">
              <label>
                <input
                  type="checkbox"
                  checked={auditOptions.single}
                  onChange={(e) => setAuditOptions((prev) => ({ ...prev, single: e.target.checked }))}
                />{" "}
                Single Driver Package
              </label>
              <select
                className="ronyx-input"
                value={auditOptions.driver}
                onChange={(e) => setAuditOptions((prev) => ({ ...prev, driver: e.target.value }))}
              >
                <option>Select driver...</option>
                <option>D. Perez</option>
                <option>J. Smith</option>
              </select>
            </div>
            <div className="audit-option">
              <label>
                <input
                  type="checkbox"
                  checked={auditOptions.dateRange}
                  onChange={(e) => setAuditOptions((prev) => ({ ...prev, dateRange: e.target.checked }))}
                />{" "}
                Date Range
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="ronyx-input"
                  type="date"
                  value={auditOptions.startDate}
                  onChange={(e) => setAuditOptions((prev) => ({ ...prev, startDate: e.target.value }))}
                />
                <input
                  className="ronyx-input"
                  type="date"
                  value={auditOptions.endDate}
                  onChange={(e) => setAuditOptions((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <button className="ronyx-action primary" style={{ padding: "10px 18px" }} onClick={handleAuditPackage}>
            🚀 Generate Audit Package (PDF + ZIP)
          </button>
          {auditStatus && <div className="ronyx-tag" style={{ marginTop: 8 }}>{auditStatus}</div>}
          <div className="audit-preview" style={{ marginTop: 12 }}>
            <h4>Package will include:</h4>
            <ul>
              <li>📄 Cover sheet with compliance summary</li>
              <li>👤 Per-driver compliance checklists (42 drivers)</li>
              <li>🩺 Medical certificates with expiration dates</li>
              <li>🪪 CDL copies with verification stamps</li>
              <li>📊 6-month HOS logs for each driver</li>
              <li>🧪 Drug test results (pre-employment & random)</li>
              <li>📈 Training certificates and completion dates</li>
              <li>🔗 Digital verification links for each document</li>
            </ul>
          </div>
        </section>

        <section className="compliance-rules">
          <h3>⚙️ Compliance Rules Engine</h3>
          <div className="rule-item active">
            <label>
              <input type="checkbox" defaultChecked /> <strong>Medical Card Expiration</strong>
            </label>
            <span className="rule-desc">Suspend driver if medical card expires</span>
            <span className="rule-actions">Alert at: 90, 30, 14, 7, 1 days</span>
          </div>
          <div className="rule-item active">
            <label>
              <input type="checkbox" defaultChecked /> <strong>Annual MVR Check</strong>
            </label>
            <span className="rule-desc">Require new MVR every 12 months</span>
            <span className="rule-actions">Alert at: 11 months, suspend at 12</span>
          </div>
        </section>

        <section className="compliance-mobile">
          <h3>Driver Compliance Mobile</h3>
          <p>⚠️ 3 non-compliant drivers</p>
          <p>🟡 6 expiring this week</p>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="ronyx-action primary">View Critical</button>
            <button className="ronyx-action">Send Alerts</button>
            <button className="ronyx-action">Approve Docs</button>
          </div>
        </section>

        <section className="onboarding-wizard">
          <h3>🚀 New Driver Onboarding (Step {wizardStep} of 5)</h3>
          <div className="progress-bar">
            {["1. Basic Info", "2. Documents", "3. Training", "4. Equipment", "5. Final Review"].map((label, idx) => (
              <div
                key={label}
                className={`progress-step ${wizardStep === idx + 1 ? "active" : ""}`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className={`wizard-step ${wizardStep === 1 ? "active" : ""}`}>
            <h4>📝 Basic Driver Information</h4>
            <div className="ronyx-grid">
              <div>
                <label className="ronyx-label">Driver Type</label>
                <select className="ronyx-input" value={driverType} onChange={(e) => setDriverType(e.target.value)}>
                  <option value="company">Company Driver</option>
                  <option value="owner_op">Owner-Operator</option>
                  <option value="lease">Lease Operator</option>
                </select>
              </div>
              <div>
                <label className="ronyx-label">Hire Date</label>
                <input className="ronyx-input" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            {driverType !== "company" ? (
              <div>
                <h5>Owner-Operator Details</h5>
                <div className="ronyx-grid">
                  <input className="ronyx-input" placeholder="MC/DOT Number" />
                  <input className="ronyx-input" placeholder="Insurance Provider" />
                  <input className="ronyx-input" placeholder="Insurance Policy #" />
                </div>
              </div>
            ) : null}
            <button className="ronyx-action primary" onClick={() => nextWizardStep(2)}>
              Next: Documents →
            </button>
          </div>

          <div className={`wizard-step ${wizardStep === 2 ? "active" : ""}`}>
            <h4>📄 Required Documents</h4>
            <div className="document-checklist">
              {[
                { id: "cdl", label: "CDL License (Front & Back)" },
                { id: "medical", label: "Medical Card" },
                { id: "mvr", label: "MVR Report" },
                { id: "drug", label: "Drug Test Results" },
                { id: "training", label: "Safety Training Cert" },
              ].map((doc) => (
                <div key={doc.id} className="checklist-item">
                  <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={docChecklist[doc.id]} onChange={() => toggleDoc(doc.id)} />
                    <strong>{doc.label}</strong>
                  </label>
                  <div className="doc-actions">
                    <button className="ronyx-action" onClick={() => openCameraCapture(doc.id)}>
                      📸 Take Photo
                    </button>
                    <button className="ronyx-action">📁 Upload</button>
                  </div>
                </div>
              ))}
            </div>
            {showMissingDocs ? (
              <div className="completion-warning">
                ⚠️ <strong>Cannot proceed:</strong> CDL and Medical Card are required.
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ronyx-action" onClick={() => prevWizardStep(1)}>
                ← Back
              </button>
              <button className="ronyx-action primary" onClick={() => nextWizardStep(3)}>
                Next: Training →
              </button>
            </div>
          </div>
        </section>

        <section className="mobile-capture">
          <h3>📱 Mobile Data Capture</h3>
          <div className="qr-section">
            <h4>🔳 Driver QR Check-In</h4>
            <p>Drivers scan QR code at yard entrance to log arrival, verify docs, and view briefing.</p>
            <div className="ronyx-row">QR code preview placeholder</div>
            <button className="ronyx-action primary" onClick={handleQrCheckIn}>
              Open Check-In
            </button>
            {qrStatus && <div className="ronyx-tag">{qrStatus}</div>}
          </div>
          <div className="photo-upload">
            <h4>📸 Instant Document Capture</h4>
            <div className="ronyx-grid">
              <button className="ronyx-action primary" onClick={() => openCameraCapture("cdl")}>
                📷 Capture CDL
              </button>
              <button className="ronyx-action primary" onClick={() => openCameraCapture("medical")}>
                🩺 Capture Medical Card
              </button>
              <button className="ronyx-action primary" onClick={() => openCameraCapture("insurance")}>
                🛡️ Capture Insurance
              </button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  await fetch("/api/ronyx/compliance/capture", { method: "POST" });
                  if (cameraDocType === "cdl") {
                    updateField("cdl_copy_uploaded", true);
                    setDocChecklist((prev) => ({ ...prev, cdl: true }));
                  }
                  if (cameraDocType === "medical") {
                    updateField("medical_certificate_uploaded", true);
                    setDocChecklist((prev) => ({ ...prev, medical: true }));
                  }
                  if (cameraDocType === "mvr") {
                    setDocChecklist((prev) => ({ ...prev, mvr: true }));
                  }
                  setComplianceActionMessage(`Captured ${cameraDocType} document.`);
                }
                if (cameraInputRef.current) cameraInputRef.current.value = "";
              }}
            />
          </div>
        </section>

        <section className="data-import">
          <h3>📥 Import Existing Data</h3>
          <div className="import-options">
            {[
              { id: "excel", icon: "📊", title: "Excel/CSV Import", desc: "Driver lists, docs, expirations" },
              { id: "quickbooks", icon: "💰", title: "QuickBooks Import", desc: "Employee records, pay rates" },
              { id: "eld", icon: "🚛", title: "ELD System Import", desc: "Samsara, Geotab, KeepTruckin" },
              { id: "folder", icon: "📁", title: "Folder Sync", desc: "Watch folder auto-process" },
            ].map((item) => (
              <div
                key={item.id}
                className="import-card"
                onClick={() => {
                  setImportType(item.id);
                  importInputRef.current?.click();
                }}
              >
                <div>{item.icon}</div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => {
              void handleImport(importType, e.target.files);
              if (importInputRef.current) importInputRef.current.value = "";
            }}
          />
          <div className="import-template">
            <h4>📋 Excel Template</h4>
            <p>Download our template, fill it out, upload back:</p>
            <button className="ronyx-action" onClick={() => setImportStatus("Template download started.")}>
              ⬇️ Download Template
            </button>
            {importStatus && <div className="ronyx-tag">{importStatus}</div>}
          </div>
        </section>

        <section className="ai-assist">
          <h3>🤖 AI-Assisted Data Entry</h3>
          <div className="ai-feature">
            <h4>📄 Smart Document Processing</h4>
            <p>AI extracts license numbers, expiration dates, and driver data automatically.</p>
          </div>
          <div className="ai-feature">
            <h4>🔄 Pattern Recognition</h4>
            <p>Auto-suggests training, pay rates, and equipment based on similar drivers.</p>
            <button className="ronyx-action">Apply All</button>
          </div>
        </section>

        <section className="self-service">
          <h3>👤 Driver Self-Service Portal</h3>
          <div className="permission-grid">
            {["Address & Contact Info", "Emergency Contacts", "Upload Updated Documents"].map((perm) => (
              <label key={perm} className="ronyx-row">
                <input type="checkbox" defaultChecked /> {perm}
              </label>
            ))}
          </div>
          <div className="portal-preview">
            <h4>📱 Driver Portal Preview</h4>
            <div className="ronyx-row">
              <strong>⚠️ Action Required:</strong> Medical card expires in 14 days
            </div>
          </div>
          <div className="invite-system">
            <h4>📧 Invite Drivers to Portal</h4>
            <select
              multiple
              className="ronyx-input"
              value={selectedDrivers}
              onChange={(e) =>
                setSelectedDrivers(Array.from(e.target.selectedOptions).map((option) => option.value))
              }
            >
              {complianceRows.map((row) => (
                <option key={row.driver} value={row.driver}>
                  {row.driver}
                </option>
              ))}
            </select>
            <button className="ronyx-action primary" onClick={handleInviteDrivers}>
              📲 Send Invites (SMS + Email)
            </button>
            {inviteStatus && <div className="ronyx-tag">{inviteStatus}</div>}
          </div>
        </section>

        <section className="batch-operations">
          <h3>⚡ Batch Operations</h3>
          <div className="batch-select">
            <h4>1. Select Drivers</h4>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="ronyx-action" onClick={selectAllDrivers}>
                Select All (42)
              </button>
              <button className="ronyx-action" onClick={selectNonCompliantDrivers}>
                Select Non-Compliant (3)
              </button>
              <button className="ronyx-action" onClick={selectExpiringDrivers}>
                Select Expiring Soon (6)
              </button>
              <button className="ronyx-action" onClick={clearSelectedDrivers}>
                Clear Selection
              </button>
            </div>
            <div>
              <strong>Selected:</strong> {selectedDrivers.length} drivers
            </div>
          </div>
          <div className="batch-actions">
            <h4>2. Choose Action</h4>
            <select className="ronyx-input" value={batchAction} onChange={(e) => setBatchAction(e.target.value)}>
              <option value="">-- Choose action --</option>
              <option value="update_status">Update Status</option>
              <option value="schedule_training">Schedule Training</option>
              <option value="send_reminder">Send Document Reminder</option>
              <option value="update_pay">Update Pay Rate</option>
              <option value="assign_truck">Assign Trucks</option>
              <option value="export_data">Export Selected Data</option>
            </select>
            <button
              className="ronyx-action primary"
              disabled={selectedDrivers.length === 0 || !batchAction}
              onClick={handleBatchExecute}
            >
              Execute on {selectedDrivers.length} selected drivers
            </button>
            {batchStatus && <div className="ronyx-tag">{batchStatus}</div>}
          </div>
        </section>

        <section className="validation-rules">
          <h3>✅ Data Validation Rules</h3>
          <div className="rule-list">
            {[
              {
                title: "Date Logic Check",
                desc: "Prevent impossible date combinations and expired docs.",
              },
              {
                title: "CDL Format Validation",
                desc: "Validate CDL numbers match state formats.",
              },
              {
                title: "Duplicate Prevention",
                desc: "Warn on duplicate CDL, SSN, or contact info.",
              },
            ].map((rule) => (
              <div key={rule.title} className="rule-item">
                <strong>{rule.title}</strong>
                <span>{rule.desc}</span>
                <span className="ronyx-pill">ACTIVE</span>
              </div>
            ))}
          </div>
          <div className="validation-log">
            <h4>🔄 Recent Validation Checks</h4>
            <div className="ronyx-row">
              <span>Today 08:15</span>
              <span>Prevented duplicate CDL entry for D. Perez</span>
            </div>
            <div className="ronyx-row">
              <span>Today 07:30</span>
              <span>Flagged: Medical expiry before hire date</span>
            </div>
          </div>
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button className="ronyx-action primary" onClick={() => openCameraCapture("cdl")}>
              📷 Scan CDL
            </button>
            <button className="ronyx-action primary" onClick={() => openCameraCapture("medical")}>
              🩺 Scan Medical Card
            </button>
            <button className="ronyx-action primary" onClick={() => openCameraCapture("mvr")}>
              📄 Scan MVR
            </button>
          </div>
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
