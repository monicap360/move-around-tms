"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AlertSeverity = "expired" | "critical" | "high" | "warning";

type ComplianceAlert = {
  driver_id: string;
  driver_name: string;
  driver_email: string | null;
  driver_phone: string | null;
  document_type: string;
  expires_on: string;
  days_left: number;
  severity: AlertSeverity;
  dispatch_eligible: boolean;
};

type ComplianceStatus =
  | "Compliant"
  | "Needs Review"
  | "Expiring Soon"
  | "Expired"
  | "Missing"
  | "Suspended";

type DriverType = "W2" | "1099" | "Owner Operator";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";

type ComplianceRecord = {
  id: string;
  driverId: string;
  driver: string;
  driverType: DriverType;
  phone: string;
  email: string;
  truck: string;
  hireDate: string;
  status: ComplianceStatus;
  risk: RiskLevel;
  dispatchEligible: boolean;
  payrollEligible: boolean;
  dqxScore: number;
  cdlExp: string;
  mvrExp: string;
  medicalCardExp: string;
  drugTestStatus: ComplianceStatus;
  backgroundCheck: ComplianceStatus;
  insuranceStatus: ComplianceStatus;
  txdotFileStatus: ComplianceStatus;
  missingDocs: number;
  expiringDocs: number;
  lastAudit: string;
  nextReview: string;
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function isExpired(d: string | null | undefined): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

function isExpiringSoon(d: string | null | undefined, days = 60): boolean {
  if (!d) return false;
  const exp = new Date(d);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);
  return exp > new Date() && exp <= cutoff;
}

function mapDocStatus(raw: string | null | undefined, expDate?: string | null): ComplianceStatus {
  if (!raw && !expDate) return "Missing";
  if (isExpired(expDate)) return "Expired";
  if (isExpiringSoon(expDate)) return "Expiring Soon";
  const s = (raw || "").toLowerCase();
  if (s === "compliant" || s === "pass" || s === "clear" || s === "active") return "Compliant";
  if (s === "expired") return "Expired";
  if (s === "missing" || s === "") return "Missing";
  if (s === "suspended") return "Suspended";
  return "Needs Review";
}

function mapApiDriver(d: any): ComplianceRecord {
  const cdlExp       = d.license_expiration_date || d.cdl_expiry  || null;
  const mvrExp       = d.mvr_expiration          || d.mvr_expiry  || null;
  const medExp       = d.medical_card_expiration || d.medical_card_expiry || null;

  const expired  = [cdlExp, mvrExp, medExp].filter(isExpired).length;
  const expiring = [cdlExp, mvrExp, medExp].filter((x) => isExpiringSoon(x)).length;
  const missing  = (cdlExp ? 0 : 1) + (mvrExp ? 0 : 1) + (medExp ? 0 : 1);

  const txdotStatus = mapDocStatus(d.txdot_file_status, null);
  const drugStatus  = mapDocStatus(d.drug_test_status, null);
  const bgStatus    = mapDocStatus(d.background_check_status, null);
  const insStatus   = mapDocStatus(d.insurance_status, null);

  const rawRisk = (d.risk_level || "").toLowerCase();
  const risk: RiskLevel =
    rawRisk === "critical" || expired >= 2 || missing >= 3 ? "Critical"
    : rawRisk === "high"   || expired >= 1 || missing >= 2 ? "High"
    : rawRisk === "medium" || expiring >= 1 || missing >= 1 ? "Medium"
    : "Low";

  const rawStatus = (d.compliance_status || d.status || "").toLowerCase();
  const status: ComplianceStatus =
    rawStatus === "suspended" || (d.dispatch_eligible === false && risk === "Critical") ? "Suspended"
    : rawStatus === "compliant" && risk === "Low" ? "Compliant"
    : expired > 0 ? "Expired"
    : expiring > 0 ? "Expiring Soon"
    : missing > 0 ? "Needs Review"
    : "Compliant";

  const score = d.dqx_score ?? d.compliance_score ??
    Math.max(0, 100 - (expired * 20) - (missing * 15) - (expiring * 5));

  const name: string = d.full_name || d.name || d.driver_name || "Unknown Driver";

  return {
    id:              `HR-${(d.id || "").toString().slice(-6).toUpperCase()}`,
    driverId:        d.id || "",
    driver:          name,
    driverType:      (d.driver_type as DriverType) || "1099",
    phone:           d.phone || "—",
    email:           d.email || "—",
    truck:           d.assigned_truck_number || d.truck_number || "—",
    hireDate:        fmtDate(d.hire_date || d.start_date),
    status,
    risk,
    dispatchEligible: d.dispatch_eligible ?? true,
    payrollEligible:  d.payroll_eligible  ?? true,
    dqxScore:         Math.round(score),
    cdlExp:           cdlExp ? (isExpired(cdlExp) ? "Expired" : fmtDate(cdlExp)) : "—",
    mvrExp:           mvrExp ? (isExpired(mvrExp) ? "Expired" : fmtDate(mvrExp)) : "—",
    medicalCardExp:   medExp ? (isExpired(medExp) ? "Expired" : fmtDate(medExp)) : "—",
    drugTestStatus:   drugStatus,
    backgroundCheck:  bgStatus,
    insuranceStatus:  insStatus,
    txdotFileStatus:  txdotStatus,
    missingDocs:      missing,
    expiringDocs:     expiring,
    lastAudit:        fmtDate(d.last_audit_date),
    nextReview:       expired > 0 ? "Immediate" : fmtDate(d.next_review_date),
  };
}

const dqxChecklist = [
  "Driver application",
  "CDL copy",
  "Medical examiner certificate",
  "MVR record",
  "Previous employer verification",
  "Road test or equivalent",
  "Drug and alcohol policy receipt",
  "Clearinghouse / drug test record",
  "Insurance / owner operator documents",
  "Annual review certification",
];

function Badge({ value }: { value: ComplianceStatus | DriverType | RiskLevel }) {
  const className =
    value === "Compliant" || value === "Low" || value === "1099"
      ? "hr-badge green"
      : value === "W2"
      ? "hr-badge blue"
      : value === "Owner Operator"
      ? "hr-badge purple"
      : value === "Needs Review" || value === "Expiring Soon" || value === "Medium"
      ? "hr-badge amber"
      : value === "High"
      ? "hr-badge orange"
      : "hr-badge red";

  return <span className={className}>{value}</span>;
}

function ScoreMeter({ score }: { score: number }) {
  const className = score >= 90 ? "good" : score >= 70 ? "warn" : "bad";
  return (
    <div className="hr-score-wrap">
      <div className="hr-score-top">
        <span>DQF / TXDOT Readiness</span>
        <strong>{score}%</strong>
      </div>
      <div className="hr-score-track">
        <div className={`hr-score-fill ${className}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function HRCompliancePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [records, setRecords]         = useState<ComplianceRecord[]>([]);
  const [alerts, setAlerts]           = useState<ComplianceAlert[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [blockingDispatch, setBlockingDispatch] = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState("");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [riskFilter, setRiskFilter]   = useState("All Risks");
  const [activityLog, setActivityLog] = useState<string[]>([
    "System ready: HR & TXDOT Compliance loaded.",
  ]);
  const [selectedDriver, setSelectedDriver] = useState<ComplianceRecord | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  function logAction(message: string) {
    setActivityLog((prev) => [`${new Date().toLocaleTimeString()} — ${message}`, ...prev]);
  }

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const [driversRes, alertsRes] = await Promise.all([
        fetch("/api/ronyx/drivers/list"),
        fetch("/api/ronyx/drivers/compliance-alerts"),
      ]);
      const [driversData, alertsData] = await Promise.all([driversRes.json(), alertsRes.json()]);
      const list: any[] = driversData.drivers || driversData.data || [];
      if (list.length > 0) setRecords(list.map(mapApiDriver));
      if (Array.isArray(alertsData.alerts)) setAlerts(alertsData.alerts);
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const sendReminder = useCallback(async (driverId: string, driverName: string, documentType?: string) => {
    setSendingReminder(driverId);
    try {
      await fetch(`/api/ronyx/drivers/${driverId}/send-reminder`, { method: "POST" });
      // Write audit log entry
      await fetch(`/api/ronyx/drivers/${driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_name:    driverName,
          audit_action:   "reminder_sent",
          audit_metadata: documentType ? { document_type: documentType } : null,
        }),
      });
      showToast(`Reminder sent to ${driverName} and admin`);
      logAction(`Reminder sent to ${driverName}${documentType ? ` (${documentType})` : ""}`);
    } catch {
      showToast("Failed to send reminder");
    } finally {
      setSendingReminder(null);
    }
  }, [showToast]);

  const blockDispatch = useCallback(async (driverId: string, driverName: string, documentType: string) => {
    setBlockingDispatch(driverId);
    try {
      const reason = `${documentType} expired`;
      await fetch(`/api/ronyx/drivers/${driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispatch_eligible:    false,
          dispatch_block_reason: reason,
          driver_name:          driverName,
          audit_action:         "dispatch_blocked",
          audit_metadata:       { document_type: documentType },
        }),
      });
      setRecords((prev) =>
        prev.map((r) => r.driverId === driverId ? { ...r, dispatchEligible: false } : r)
      );
      setAlerts((prev) =>
        prev.map((a) => a.driver_id === driverId ? { ...a, dispatch_eligible: false } : a)
      );
      showToast(`${driverName} dispatch blocked — ${reason}`);
      logAction(`Dispatch BLOCKED: ${driverName} — ${reason}`);
    } catch {
      showToast("Failed to block dispatch — check connection");
    } finally {
      setBlockingDispatch(null);
    }
  }, [showToast]);

  const toggleDispatchEligibility = useCallback(async (id: string) => {
    const rec = records.find((r) => r.id === id);
    if (!rec) return;
    const newVal = !rec.dispatchEligible;
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, dispatchEligible: newVal } : r));
    logAction(`Dispatch eligibility ${newVal ? "restored" : "blocked"} for ${rec.driver}.`);
    try {
      await fetch(`/api/ronyx/drivers/${rec.driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch_eligible: newVal }),
      });
      showToast(`${rec.driver} dispatch ${newVal ? "restored" : "blocked"}`);
    } catch {
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, dispatchEligible: !newVal } : r));
      showToast("Update failed — please retry");
    }
  }, [records, showToast]);

  const togglePayrollEligibility = useCallback(async (id: string) => {
    const rec = records.find((r) => r.id === id);
    if (!rec) return;
    const newVal = !rec.payrollEligible;
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, payrollEligible: newVal } : r));
    logAction(`Payroll eligibility ${newVal ? "restored" : "blocked"} for ${rec.driver}.`);
    try {
      await fetch(`/api/ronyx/drivers/${rec.driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payroll_eligible: newVal }),
      });
      showToast(`${rec.driver} payroll ${newVal ? "restored" : "blocked"}`);
    } catch {
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, payrollEligible: !newVal } : r));
      showToast("Update failed — please retry");
    }
  }, [records, showToast]);

  const markReviewed = useCallback(async (id: string) => {
    const rec = records.find((r) => r.id === id);
    if (!rec) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: "Compliant", risk: "Low", txdotFileStatus: "Compliant", missingDocs: 0, expiringDocs: 0, dqxScore: Math.max(r.dqxScore, 92), nextReview: "Next month" }
          : r
      )
    );
    logAction(`${rec.driver} marked reviewed and moved toward compliant status.`);
    try {
      await fetch(`/api/ronyx/drivers/${rec.driverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compliance_status: "compliant", last_audit_date: new Date().toISOString() }),
      });
      showToast(`${rec.driver} marked as reviewed`);
    } catch {
      showToast("Save failed — local state updated but not saved to DB");
    }
  }, [records, showToast]);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    logAction(`${files.length} compliance document(s) uploaded through Fast Scan intake.`);
    showToast(`Uploading ${files.length} document(s)…`);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      await fetch("/api/ronyx/drivers/documents", { method: "POST", body: form });
      showToast("Documents uploaded — processing via Fast Scan");
      setTimeout(loadDrivers, 2000);
    } catch {
      showToast("Upload failed — check connection");
    }
  }, [loadDrivers, showToast]);

  function uploadComplianceDocument() { fileInputRef.current?.click(); }

  function runComplianceAudit() {
    logAction("Compliance audit completed. Reviewing all driver files.");
    loadDrivers();
    showToast("Compliance audit refreshed");
  }

  function buildAuditPacket() {
    logAction("TXDOT/DOT audit packet builder opened. Connect this to document export next.");
    showToast("Audit packet feature — coming soon");
  }

  function exportComplianceReport() {
    const headers = ["Driver","Type","Status","Risk","Dispatch Eligible","Payroll Eligible","DQF Score","CDL Exp","MVR Exp","Medical Exp","Missing Docs","Expiring Docs"];
    const rows = records.map((r) =>
      [r.driver,r.driverType,r.status,r.risk,r.dispatchEligible?"Yes":"No",r.payrollEligible?"Yes":"No",`${r.dqxScore}%`,r.cdlExp,r.mvrExp,r.medicalCardExp,r.missingDocs,r.expiringDocs].join(",")
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ronyx-hr-txdot-compliance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
    logAction("Compliance CSV report exported.");
    showToast("Report exported");
  }

  const filteredRecords = useMemo(() => {
    const query = search.toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        r.driver.toLowerCase().includes(query) ||
        r.phone.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.truck.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All Statuses" || r.status === statusFilter;
      const matchesRisk   = riskFilter   === "All Risks"    || r.risk   === riskFilter;
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [records, search, statusFilter, riskFilter]);

  const totalDrivers     = records.length;
  const compliantDrivers = records.filter((r) => r.status === "Compliant").length;
  const reviewDrivers    = records.filter((r) => ["Needs Review", "Expiring Soon"].includes(r.status)).length;
  const suspendedDrivers = records.filter((r) => r.status === "Suspended").length;
  const dispatchEligible = records.filter((r) => r.dispatchEligible).length;
  const missingDocs      = records.reduce((t, r) => t + r.missingDocs, 0);
  const avgReadiness     = records.length > 0
    ? Math.round(records.reduce((t, r) => t + r.dqxScore, 0) / records.length)
    : 0;

  const auditAlerts = records
    .filter((r) => r.status !== "Compliant")
    .slice(0, 5)
    .map((r) => ({
      title:    r.status === "Suspended" ? "Dispatch Block Required" : r.status,
      driver:   r.driver,
      driverId: r.driverId,
      detail:   r.missingDocs > 0
        ? `${r.missingDocs} missing doc(s), ${r.expiringDocs} expiring. Resolve before dispatch.`
        : `${r.expiringDocs} expiring document(s) need renewal.`,
      level:    r.risk === "Critical" ? "critical" : r.risk === "High" ? "danger" : "warning",
    }));

  return (
    <main className="hr-page">
      {toast && <div className="hr-toast">{toast}</div>}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: "none" }}
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {alerts.length > 0 && (
        <section className="hr-compliance-strip">
          <div className="hr-strip-header">
            <span className="hr-strip-title">
              Compliance Alerts
              <span className="hr-strip-count">{alerts.length}</span>
            </span>
            <span className="hr-strip-sub">
              {alerts.filter(a => a.severity === "expired").length} expired &middot; {alerts.filter(a => a.severity !== "expired").length} expiring soon
            </span>
          </div>
          <div className="hr-strip-rows">
            {alerts.map((a, i) => (
              <div
                key={`${a.driver_id}-${a.document_type}-${i}`}
                className={`hr-strip-row hr-strip-${a.severity}`}
              >
                <div className="hr-strip-indicator" />
                <div className="hr-strip-info">
                  <strong>{a.driver_name}</strong>
                  <span>{a.document_type}</span>
                  {a.severity === "expired"
                    ? <span className="hr-strip-expiry">Expired {a.expires_on}</span>
                    : <span className="hr-strip-expiry">Expires {a.expires_on} ({a.days_left}d)</span>
                  }
                </div>
                <div className="hr-strip-badge">
                  {a.severity === "expired" ? "EXPIRED" : a.severity === "critical" ? "CRITICAL" : a.severity === "high" ? "HIGH" : "WARNING"}
                </div>
                <div className="hr-strip-actions">
                  <button
                    type="button"
                    disabled={sendingReminder === a.driver_id}
                    onClick={() => sendReminder(a.driver_id, a.driver_name)}
                  >
                    {sendingReminder === a.driver_id ? "Sending…" : "Send Reminder"}
                  </button>
                  <button
                    type="button"
                    disabled={!a.dispatch_eligible || blockingDispatch === a.driver_id}
                    onClick={() => blockDispatch(a.driver_id, a.driver_name, a.document_type)}
                  >
                    {blockingDispatch === a.driver_id
                      ? "Blocking…"
                      : a.dispatch_eligible
                      ? "Block Dispatch"
                      : "Dispatch Blocked"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="hr-hero">
        <div>
          <p className="hr-eyebrow">MoveAround TMS / HR &amp; TXDOT Compliance</p>
          <h1>Compliance Control Tower</h1>
          <p>
            Manage HR onboarding, driver qualification files, CDL, MVR, medical cards,
            drug test status, TXDOT audit readiness, dispatch eligibility, and payroll eligibility.
          </p>
        </div>

        <div className="hr-hero-actions">
          <button type="button" onClick={exportComplianceReport} className="hr-button ghost">Export Report</button>
          <button type="button" onClick={buildAuditPacket} className="hr-button dark">Build Audit Packet</button>
          <button type="button" onClick={uploadComplianceDocument} className="hr-button primary">+ Upload Document</button>
        </div>
      </section>

      <section className="hr-kpi-grid">
        <div className="hr-kpi"><span>Total Drivers</span><strong>{totalDrivers}</strong><p>Tracked in HR</p></div>
        <div className="hr-kpi success"><span>Compliant</span><strong>{compliantDrivers}</strong><p>Ready for audit</p></div>
        <div className="hr-kpi warning"><span>Needs Review</span><strong>{reviewDrivers}</strong><p>Expiring or incomplete</p></div>
        <div className="hr-kpi danger"><span>Suspended</span><strong>{suspendedDrivers}</strong><p>Dispatch blocked</p></div>
        <div className="hr-kpi blue"><span>Dispatch Eligible</span><strong>{dispatchEligible}</strong><p>Can be assigned</p></div>
        <div className="hr-kpi purple"><span>Readiness Score</span><strong>{avgReadiness}%</strong><p>Average DQF/TXDOT score</p></div>
        <div className="hr-kpi danger"><span>Missing Docs</span><strong>{missingDocs}</strong><p>Must be collected</p></div>
      </section>

      <section className="hr-layout">
        <div className="hr-main-column">
          <div className="hr-panel">
            <div className="hr-panel-header">
              <div>
                <p className="hr-eyebrow">Compliance Audit</p>
                <h2>Critical HR &amp; TXDOT Alerts</h2>
                <span>Compliance issues that can block dispatch, payroll, safety, or audit readiness.</span>
              </div>
              <button type="button" onClick={runComplianceAudit} className="hr-button ghost">Run Audit</button>
            </div>

            <div className="hr-alert-grid">
              {auditAlerts.length === 0 ? (
                <div className="hr-alert">
                  <strong>All Clear</strong>
                  <p>All drivers are compliant — no exceptions found.</p>
                </div>
              ) : (
                auditAlerts.map((alert) => (
                  <div
                    key={`${alert.title}-${alert.driver}`}
                    className={alert.level === "critical" ? "hr-alert critical" : alert.level === "danger" ? "hr-alert danger" : "hr-alert warning"}
                  >
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.driver}</p>
                      <span>{alert.detail}</span>
                    </div>
                    <button type="button" onClick={() => sendReminder(alert.driverId, alert.driver, alert.detail)}>Remind</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="hr-panel">
            <div className="hr-panel-header">
              <div>
                <p className="hr-eyebrow">Fast Scan Compliance Intake</p>
                <h2>Scan HR / TXDOT Documents</h2>
                <span>
                  Upload CDL, MVR, medical card, drug test, W9, insurance, and driver agreements.
                  Fast Scan extracts names, dates, expiration fields, and document type.
                </span>
              </div>
            </div>

            <div className="hr-scan-zone">
              <div className="hr-scan-icon">🗂️</div>
              <div>
                <h3>Drop compliance documents here</h3>
                <p>
                  Fast Scan should classify each file, attach it to the correct driver,
                  detect expiration dates, and update dispatch/payroll eligibility.
                </p>
              </div>
              <div className="hr-scan-actions">
                <button type="button" onClick={uploadComplianceDocument}>Upload Files</button>
                <button type="button" onClick={() => logAction("Camera scan opened.")}>Open Camera</button>
                <button type="button" onClick={() => logAction("Batch compliance scan started.")}>Batch Scan</button>
              </div>
            </div>
          </div>

          <div className="hr-panel">
            <div className="hr-panel-header">
              <div>
                <p className="hr-eyebrow">Driver Qualification Files</p>
                <h2>HR Compliance Records</h2>
                <span>Search, review, approve, suspend, and control dispatch/payroll eligibility.</span>
              </div>
            </div>

            <div className="hr-filter-bar">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search driver, phone, email, or truck..."
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All Statuses</option>
                <option>Compliant</option>
                <option>Needs Review</option>
                <option>Expiring Soon</option>
                <option>Expired</option>
                <option>Missing</option>
                <option>Suspended</option>
              </select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
                <option>All Risks</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>

            <div className="hr-record-list">
              {loading ? (
                <div className="hr-loading">Loading driver compliance records…</div>
              ) : filteredRecords.length === 0 ? (
                <div className="hr-empty">
                  {records.length === 0
                    ? "No driver records found — add drivers first."
                    : "No drivers match your filters."}
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <article className="hr-record-card" key={record.id}>
                    <div className="hr-record-top">
                      <div className="hr-driver-block">
                        <div className="hr-avatar">
                          {record.driver.split(" ").map((p) => p[0]).join("")}
                        </div>
                        <div>
                          <p className="hr-eyebrow">{record.id}</p>
                          <h3>{record.driver}</h3>
                          <span>{record.phone} · {record.email} · {record.truck}</span>
                        </div>
                      </div>
                      <div className="hr-badge-row">
                        <Badge value={record.status} />
                        <Badge value={record.risk} />
                        <Badge value={record.driverType} />
                      </div>
                    </div>

                    <div className="hr-eligibility-strip">
                      <button
                        type="button"
                        onClick={() => toggleDispatchEligibility(record.id)}
                        className={record.dispatchEligible ? "hr-eligibility good" : "hr-eligibility blocked"}
                      >
                        Dispatch: {record.dispatchEligible ? "Eligible" : "Blocked"}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePayrollEligibility(record.id)}
                        className={record.payrollEligible ? "hr-eligibility good" : "hr-eligibility blocked"}
                      >
                        Payroll: {record.payrollEligible ? "Eligible" : "Blocked"}
                      </button>
                      <div className="hr-eligibility neutral">Missing Docs: {record.missingDocs}</div>
                      <div className="hr-eligibility neutral">Expiring Docs: {record.expiringDocs}</div>
                    </div>

                    <div className="hr-data-grid">
                      <div><span>Hire Date</span><strong>{record.hireDate}</strong></div>
                      <div><span>CDL Expiration</span><strong>{record.cdlExp}</strong></div>
                      <div>
                        <span>MVR Expiration</span>
                        <strong className={record.mvrExp === "Expired" ? "hr-danger-text" : ""}>{record.mvrExp}</strong>
                      </div>
                      <div>
                        <span>Medical Card</span>
                        <strong className={record.medicalCardExp === "Expired" ? "hr-danger-text" : ""}>{record.medicalCardExp}</strong>
                      </div>
                      <div><span>Drug Test</span><strong>{record.drugTestStatus}</strong></div>
                      <div><span>Background Check</span><strong>{record.backgroundCheck}</strong></div>
                      <div><span>Insurance</span><strong>{record.insuranceStatus}</strong></div>
                      <div><span>TXDOT File</span><strong>{record.txdotFileStatus}</strong></div>
                      <div><span>Last Audit</span><strong>{record.lastAudit}</strong></div>
                      <div><span>Next Review</span><strong>{record.nextReview}</strong></div>
                    </div>

                    <ScoreMeter score={record.dqxScore} />

                    <div className="hr-card-footer">
                      <div className="hr-action-group">
                        <button type="button" onClick={() => setSelectedDriver(record)}>Open File</button>
                        <button type="button" onClick={uploadComplianceDocument}>Upload Docs</button>
                        <button type="button" onClick={() => sendReminder(record.driverId, record.driver)}>Send Reminder</button>
                        <button type="button" onClick={() => markReviewed(record.id)}>Mark Reviewed</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleDispatchEligibility(record.id)}
                        className={record.dispatchEligible ? "hr-danger-button" : "hr-approve-button"}
                      >
                        {record.dispatchEligible ? "Block Dispatch" : "Restore Dispatch"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="hr-side-column">
          <div className="hr-panel">
            <p className="hr-eyebrow">Quick Actions</p>
            <h2>HR Tools</h2>
            <div className="hr-quick-list">
              <button type="button" onClick={uploadComplianceDocument}>Upload Compliance Document</button>
              <button type="button" onClick={runComplianceAudit}>Run Compliance Audit</button>
              <button type="button" onClick={buildAuditPacket}>Build TXDOT Audit Packet</button>
              <button type="button" onClick={() => logAction("MVR renewal queue opened.")}>Review MVR Renewals</button>
              <button type="button" onClick={() => logAction("Medical card renewal queue opened.")}>Review Medical Cards</button>
              <button type="button" onClick={() => logAction("Drug test tracking opened.")}>Drug Test Tracking</button>
              <button type="button" onClick={() => logAction("Driver onboarding checklist opened.")}>Driver Onboarding</button>
              <button type="button" onClick={exportComplianceReport}>Export Compliance Report</button>
            </div>
          </div>

          <div className="hr-panel dark-hr-panel">
            <p className="hr-eyebrow">AI Compliance Auditor</p>
            <h2>Recommended Actions</h2>
            <p>
              {suspendedDrivers > 0
                ? `${suspendedDrivers} driver(s) are suspended — resolve expired docs before restoring dispatch eligibility.`
                : reviewDrivers > 0
                ? `${reviewDrivers} driver(s) have expiring or missing documents. Schedule renewals before next dispatch.`
                : "All drivers are compliant. Run audit to verify no documents have expired."}
            </p>
            <button type="button" onClick={runComplianceAudit} className="hr-button primary full">
              Run HR Compliance Review
            </button>
          </div>

          <div className="hr-panel">
            <p className="hr-eyebrow">DQF Checklist</p>
            <h2>Audit File Items</h2>
            <ul className="hr-feature-list">
              {dqxChecklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="hr-panel">
            <p className="hr-eyebrow">Activity Log</p>
            <h2>Button Actions</h2>
            <div className="hr-activity-log">
              {activityLog.map((item, index) => (
                <div key={`${item}-${index}`}>{item}</div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      {selectedDriver && (
        <div className="hr-modal-backdrop" onClick={() => setSelectedDriver(null)}>
          <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hr-modal-header">
              <div>
                <p className="hr-eyebrow">Driver Compliance File</p>
                <h2>{selectedDriver.driver}</h2>
              </div>
              <button type="button" onClick={() => setSelectedDriver(null)}>Close</button>
            </div>
            <div className="hr-modal-grid">
              <div><span>Status</span><strong>{selectedDriver.status}</strong></div>
              <div><span>Risk</span><strong>{selectedDriver.risk}</strong></div>
              <div><span>DQF Readiness</span><strong>{selectedDriver.dqxScore}%</strong></div>
              <div><span>TXDOT File</span><strong>{selectedDriver.txdotFileStatus}</strong></div>
              <div><span>Dispatch Eligible</span><strong>{selectedDriver.dispatchEligible ? "Yes" : "No"}</strong></div>
              <div><span>Payroll Eligible</span><strong>{selectedDriver.payrollEligible ? "Yes" : "No"}</strong></div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
