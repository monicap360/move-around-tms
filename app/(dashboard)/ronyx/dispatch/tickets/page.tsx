"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus   = "new" | "in_review" | "pending_info" | "escalated" | "on_hold" | "resolved" | "closed" | "rejected";
type TicketCategory = "Completed Trip Proof" | "Driver No-Show" | "Customer Complaint" | "Damage Report" | "Receipt / Expense" | "Missing Document" | "Incident Report" | "Driver Issue" | "Billing Dispute" | "Compliance Issue" | "Fuel / Toll / Parking" | "Other";
type TicketPriority = "low" | "medium" | "high" | "critical";
type PayrollStatus  = "none" | "hold" | "pending_review" | "ready" | "approved";
type ScanType       = "trip_proof" | "damage" | "no_show" | "complaint" | "receipt" | "fuel" | "missing_proof" | "incident" | "other";

type Ticket = {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  source: string;
  impact: string[];
  related_job_id?: string;
  related_driver_id?: string;
  related_vehicle_id?: string;
  fast_scan_id?: string;
  scan_type?: string;
  payroll_impact: boolean;
  payroll_status: PayrollStatus;
  payroll_hold_reason?: string;
  estimated_driver_pay?: number;
  related_payroll_item_id?: string;
  assigned_to?: string;
  due_date?: string;
  resolved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

type FastScan = {
  id: string;
  file_url: string;
  file_name?: string;
  upload_status: string;
  scan_type?: string;
  detected_job_id?: string;
  detected_driver_id?: string;
  detected_amount?: number;
  extracted_text?: string;
  confidence_score?: number;
  creates_payroll_item?: boolean;
  payroll_action?: string;
  resulting_ticket_id?: string;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TICKET_CATEGORIES: TicketCategory[] = [
  "Completed Trip Proof", "Driver No-Show", "Customer Complaint", "Damage Report",
  "Receipt / Expense", "Missing Document", "Incident Report", "Driver Issue",
  "Billing Dispute", "Compliance Issue", "Fuel / Toll / Parking", "Other",
];

const PIPELINE: { key: TicketStatus; label: string; color: string; bg: string }[] = [
  { key: "new",          label: "New",           color: "#94a3b8", bg: "#f8fafc" },
  { key: "in_review",    label: "In Review",     color: "#3b82f6", bg: "#eff6ff" },
  { key: "pending_info", label: "Pending Info",  color: "#f59e0b", bg: "#fef3c7" },
  { key: "escalated",    label: "Escalated",     color: "#dc2626", bg: "#fee2e2" },
  { key: "on_hold",      label: "On Hold",       color: "#8b5cf6", bg: "#f5f3ff" },
  { key: "resolved",     label: "Resolved",      color: "#10b981", bg: "#f0fdf4" },
  { key: "closed",       label: "Closed",        color: "#16a34a", bg: "#f0fdf4" },
  { key: "rejected",     label: "Rejected",      color: "#64748b", bg: "#f1f5f9" },
];

const NEXT_STATUS: Partial<Record<TicketStatus, TicketStatus>> = {
  "new":          "in_review",
  "in_review":    "resolved",
  "pending_info": "in_review",
  "escalated":    "in_review",
  "on_hold":      "in_review",
  "resolved":     "closed",
};
const NEXT_LABEL: Partial<Record<TicketStatus, string>> = {
  "new":          "Start Review",
  "in_review":    "Mark Resolved",
  "pending_info": "Resume Review",
  "escalated":    "Resume Review",
  "on_hold":      "Resume Review",
  "resolved":     "Close",
};

const SCAN_TYPE_LABELS: Record<ScanType, string> = {
  trip_proof:    "Completed Trip Proof",
  damage:        "Damage Report",
  no_show:       "Driver No-Show",
  complaint:     "Customer Complaint",
  receipt:       "Receipt / Expense",
  fuel:          "Fuel / Toll / Parking",
  missing_proof: "Missing Document",
  incident:      "Incident Report",
  other:         "Other",
};

const SCAN_PAYROLL_PREVIEW: Record<ScanType, { action: string; color: string; detail: string }> = {
  trip_proof:    { action: "CREATE payroll item",          color: "#16a34a", detail: "Completed trip → payroll item created for driver" },
  damage:        { action: "HOLD payroll",                 color: "#dc2626", detail: "Damage report → payroll held pending manager review" },
  no_show:       { action: "HOLD → manager decides",       color: "#dc2626", detail: "No-show → payroll held until manager approves no-show pay" },
  complaint:     { action: "HOLD payroll",                 color: "#d97706", detail: "Complaint → payroll held pending dispute resolution" },
  receipt:       { action: "CREATE reimbursement request", color: "#3b82f6", detail: "Receipt → reimbursement request created" },
  fuel:          { action: "CREATE reimbursement request", color: "#3b82f6", detail: "Fuel/Toll → reimbursement request created" },
  missing_proof: { action: "HOLD until proof uploaded",    color: "#dc2626", detail: "Missing proof → payroll held until document received" },
  incident:      { action: "HOLD for incident review",     color: "#dc2626", detail: "Incident → payroll held pending review" },
  other:         { action: "No payroll impact",            color: "#64748b", detail: "Other scan → no automatic payroll action" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) { return !d ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function fmtDatetime(d?: string | null) { return !d ? "—" : new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function fmtPay(n?: number | null) { return !n ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`; }

const PRIORITY_STYLE: Record<TicketPriority, { bg: string; text: string }> = {
  low:      { bg: "#dcfce7", text: "#15803d" },
  medium:   { bg: "#fef9c3", text: "#92400e" },
  high:     { bg: "#fee2e2", text: "#991b1b" },
  critical: { bg: "#1e293b", text: "#f8fafc" },
};

const PAYROLL_STATUS_STYLE: Record<PayrollStatus, { bg: string; text: string; label: string }> = {
  none:           { bg: "#f1f5f9", text: "#64748b",   label: "No Impact" },
  hold:           { bg: "#fee2e2", text: "#dc2626",   label: "HOLD" },
  pending_review: { bg: "#fef3c7", text: "#92400e",   label: "Pending Review" },
  ready:          { bg: "#dcfce7", text: "#15803d",   label: "Ready" },
  approved:       { bg: "#dcfce7", text: "#15803d",   label: "Approved" },
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  new:          "#94a3b8",
  in_review:    "#3b82f6",
  pending_info: "#f59e0b",
  escalated:    "#dc2626",
  on_hold:      "#8b5cf6",
  resolved:     "#10b981",
  closed:       "#16a34a",
  rejected:     "#64748b",
};

function computePriority(category: TicketCategory, payrollImpact: boolean): TicketPriority {
  if (["Damage Report","Incident Report","Compliance Issue"].includes(category)) return "critical";
  if (["Customer Complaint","Driver No-Show","Missing Document"].includes(category) || payrollImpact) return "high";
  if (["Billing Dispute","Driver Issue"].includes(category)) return "medium";
  return "low";
}

function computePayrollImpact(scanType: ScanType): boolean {
  return !["other"].includes(scanType);
}

// ─── Ticket Card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onView, onAdvance, onUpdateStatus }: {
  ticket: Ticket;
  onView: (t: Ticket) => void;
  onAdvance: (t: Ticket) => void;
  onUpdateStatus: (t: Ticket, s: TicketStatus) => void;
}) {
  const ps  = PRIORITY_STYLE[ticket.priority];
  const prs = PAYROLL_STATUS_STYLE[ticket.payroll_status];
  const next = NEXT_STATUS[ticket.status];

  return (
    <div className={`tkt-card ${ticket.payroll_status === "hold" ? "payroll-hold" : ""}`}>
      <div className="tkt-card-head">
        <span className="tkt-num">{ticket.ticket_number}</span>
        <span className="tkt-priority" style={{ background: ps.bg, color: ps.text }}>{ticket.priority.toUpperCase()}</span>
        {ticket.source === "fast_scan" && <span className="tkt-source-badge">SCAN</span>}
        {ticket.payroll_impact && (
          <span className="tkt-payroll-badge" style={{ background: prs.bg, color: prs.text }}>{prs.label}</span>
        )}
      </div>

      <div className="tkt-category">{ticket.category}</div>
      <div className="tkt-title">{ticket.title}</div>

      <div className="tkt-meta">
        <div><span>Created</span><strong>{fmtDatetime(ticket.created_at)}</strong></div>
        {ticket.related_driver_id && <div><span>Driver</span><strong>{ticket.related_driver_id.slice(0, 8)}</strong></div>}
        {ticket.due_date && <div><span>Due</span><strong style={{ color: ticket.due_date < new Date().toISOString().slice(0, 10) ? "#dc2626" : "#334155" }}>{fmtDate(ticket.due_date)}</strong></div>}
      </div>

      {ticket.payroll_impact && (
        <div className="tkt-payroll-section">
          <div className="tkt-payroll-row">
            <span>Payroll Impact</span>
            <strong style={{ color: "#dc2626" }}>YES</strong>
          </div>
          <div className="tkt-payroll-row">
            <span>Payroll Status</span>
            <strong style={{ color: prs.text }}>{prs.label}</strong>
          </div>
          {ticket.estimated_driver_pay != null && (
            <div className="tkt-payroll-row">
              <span>Est. Driver Pay</span>
              <strong>{fmtPay(ticket.estimated_driver_pay)}</strong>
            </div>
          )}
          {ticket.payroll_hold_reason && (
            <div className="tkt-hold-reason">{ticket.payroll_hold_reason}</div>
          )}
        </div>
      )}

      {ticket.impact.length > 0 && (
        <div className="tkt-impact-badges">
          {ticket.impact.map(i => <span key={i} className="tkt-impact-pill">{i}</span>)}
        </div>
      )}

      <div className="tkt-actions">
        <button type="button" onClick={() => onView(ticket)} className="tkt-btn primary">View Detail</button>
        {next && NEXT_LABEL[ticket.status] && (
          <button type="button" onClick={() => onAdvance(ticket)} className="tkt-btn ghost">{NEXT_LABEL[ticket.status]}</button>
        )}
        <select className="tkt-status-sel" value={ticket.status} onChange={e => onUpdateStatus(ticket, e.target.value as TicketStatus)}>
          {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Fast Scan Strip ──────────────────────────────────────────────────────────

function FastScanStrip({ onScanSubmit }: { onScanSubmit: (scan: FastScan, ticket: Ticket) => void }) {
  const [expanded,      setExpanded]      = useState(false);
  const [scanType,      setScanType]      = useState<ScanType>("trip_proof");
  const [fileUrl,       setFileUrl]       = useState("");
  const [driverName,    setDriverName]    = useState("");
  const [jobNumber,     setJobNumber]     = useState("");
  const [estimatedPay,  setEstimatedPay]  = useState("");
  const [amount,        setAmount]        = useState("");
  const [notes,         setNotes]         = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [submitted,     setSubmitted]     = useState<{ scan: FastScan; ticket: Ticket } | null>(null);
  const [error,         setError]         = useState("");

  const preview = SCAN_PAYROLL_PREVIEW[scanType];
  const payrollImpact = computePayrollImpact(scanType);

  async function submitScan() {
    if (!fileUrl.trim()) { setError("Enter a file URL or upload path."); return; }
    setSubmitting(true); setError("");
    const res = await fetch("/api/ronyx/fast-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url:           fileUrl.trim(),
        scan_type:          scanType,
        driver_name:        driverName.trim() || null,
        job_number:         jobNumber.trim() || null,
        estimated_driver_pay: estimatedPay ? parseFloat(estimatedPay) : null,
        detected_amount:    amount ? parseFloat(amount) : null,
        extracted_text:     notes.trim() || null,
        title:              SCAN_TYPE_LABELS[scanType] + (driverName ? ` — ${driverName}` : "") + (jobNumber ? ` (Job ${jobNumber})` : ""),
        confidence_score:   0.85,
        uploaded_by:        "dispatcher",
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(d.error || "Scan failed"); return; }
    setSubmitted({ scan: d.scan, ticket: d.ticket });
    onScanSubmit(d.scan, d.ticket);
    // Reset
    setFileUrl(""); setDriverName(""); setJobNumber(""); setEstimatedPay(""); setAmount(""); setNotes("");
  }

  return (
    <div className="tkt-scan-strip">
      <div className="tkt-scan-header" onClick={() => setExpanded(e => !e)}>
        <div className="tkt-scan-header-left">
          <span className="tkt-scan-icon">📷</span>
          <div>
            <span className="tkt-scan-title">FAST SCAN INTAKE</span>
            <span className="tkt-scan-sub">Upload a scan → system auto-creates ticket + payroll action</span>
          </div>
        </div>
        <span className="tkt-scan-toggle">{expanded ? "Hide ▲" : "Open ▼"}</span>
      </div>

      {expanded && (
        <div className="tkt-scan-body">
          {submitted && (
            <div className="tkt-scan-success">
              ✅ Scan processed — <strong>{submitted.ticket.ticket_number}</strong> created · Payroll: <strong>{PAYROLL_STATUS_STYLE[submitted.ticket.payroll_status].label}</strong>
              <button type="button" onClick={() => setSubmitted(null)} style={{ marginLeft: 12, fontSize: 10, opacity: .7, cursor: "pointer", background: "none", border: "none", color: "inherit" }}>Dismiss</button>
            </div>
          )}

          {error && <div className="tkt-scan-error">{error}</div>}

          {/* Scan type selector */}
          <div className="tkt-scan-types">
            {(Object.entries(SCAN_TYPE_LABELS) as [ScanType, string][]).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setScanType(key)}
                className={`tkt-scan-type-btn ${scanType === key ? "active" : ""}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Payroll preview */}
          <div className="tkt-scan-payroll-preview">
            <span className="tkt-scan-payroll-action" style={{ color: preview.color }}>{preview.action}</span>
            <span className="tkt-scan-payroll-detail">{preview.detail}</span>
          </div>

          {/* Form */}
          <div className="tkt-scan-form">
            <div className="tkt-scan-form-row">
              <div className="tkt-scan-field">
                <label>File URL / Path *</label>
                <input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="/uploads/scan-001.jpg or https://..." className="tkt-scan-input" />
              </div>
              <div className="tkt-scan-field">
                <label>Driver Name</label>
                <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. Maria Lopez" className="tkt-scan-input" />
              </div>
              <div className="tkt-scan-field">
                <label>Job Number</label>
                <input value={jobNumber} onChange={e => setJobNumber(e.target.value)} placeholder="e.g. 1051" className="tkt-scan-input" />
              </div>
              {payrollImpact && (
                <div className="tkt-scan-field">
                  <label>{scanType === "trip_proof" ? "Est. Driver Pay ($)" : "Amount ($)"}</label>
                  <input value={estimatedPay || amount} onChange={e => { setEstimatedPay(e.target.value); setAmount(e.target.value); }} placeholder="85.00" className="tkt-scan-input" type="number" min="0" step="0.01" />
                </div>
              )}
            </div>
            <div className="tkt-scan-field">
              <label>Notes / Extracted Text</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="OCR text or manual notes…" className="tkt-scan-textarea" />
            </div>
            <div className="tkt-scan-footer">
              <div className="tkt-scan-flow">
                <span>Fast Scan</span><span>→</span>
                <span>Ticket Created</span><span>→</span>
                <span>Payroll Check</span><span>→</span>
                <span style={{ color: preview.color, fontWeight: 700 }}>{preview.action}</span>
              </div>
              <button type="button" onClick={submitScan} disabled={submitting} className="tkt-scan-submit">
                {submitting ? "Processing…" : "Process Scan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

function CreateTicketModal({ onClose, onSaved }: { onClose: () => void; onSaved: (t: Ticket) => void }) {
  const [title,       setTitle]       = useState("");
  const [category,    setCategory]    = useState<TicketCategory>("Completed Trip Proof");
  const [desc,        setDesc]        = useState("");
  const [driverName,  setDriverName]  = useState("");
  const [jobNumber,   setJobNumber]   = useState("");
  const [pay,         setPay]         = useState("");
  const [payrollImp,  setPayrollImp]  = useState(false);
  const [holding,     setHolding]     = useState(false);
  const [holdReason,  setHoldReason]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const computedPriority = computePriority(category, payrollImp);

  async function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/ronyx/ops-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:               title.trim(),
        description:         desc.trim() || null,
        category,
        priority:            computedPriority,
        source:              "manual",
        payroll_impact:      payrollImp,
        payroll_status:      holding ? "hold" : payrollImp ? "pending_review" : "none",
        payroll_hold_reason: holding ? holdReason : null,
        estimated_driver_pay: pay ? parseFloat(pay) : null,
        driver_name:         driverName || null,
        job_number:          jobNumber || null,
        impact:              payrollImp ? ["payroll"] : [],
        created_by:          "dispatcher",
      }),
    });
    const d = await res.json();
    setSaving(false);
    if (!res.ok) { setError(d.error || "Failed"); return; }
    onSaved(d.ticket);
    onClose();
  }

  return (
    <div className="mnt-modal-backdrop" onClick={onClose}>
      <div className="mnt-modal" onClick={e => e.stopPropagation()}>
        <p className="mnt-modal-sub">Create Ticket</p>
        <h2>New Operations Ticket</h2>
        {error && <div className="mnt-error">{error}</div>}

        <div className="mnt-form-grid">
          <div className="mnt-form-row full">
            <label className="mnt-form-label">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="mnt-form-input" placeholder="Brief issue description" />
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)} className="mnt-form-select">
              {TICKET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Priority (auto)</label>
            <div style={{ padding: "8px 11px", borderRadius: 7, ...PRIORITY_STYLE[computedPriority], fontWeight: 700, fontSize: 12 }}>{computedPriority.toUpperCase()}</div>
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Driver Name</label>
            <input value={driverName} onChange={e => setDriverName(e.target.value)} className="mnt-form-input" placeholder="Driver…" />
          </div>
          <div className="mnt-form-row">
            <label className="mnt-form-label">Job Number</label>
            <input value={jobNumber} onChange={e => setJobNumber(e.target.value)} className="mnt-form-input" placeholder="e.g. 1051" />
          </div>
          <div className="mnt-form-row full">
            <label className="mnt-form-label">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="mnt-form-textarea" rows={3} placeholder="Details…" />
          </div>
          <div className="mnt-form-row full">
            <label className="mnt-dispatch-hold-label">
              <input type="checkbox" checked={payrollImp} onChange={e => setPayrollImp(e.target.checked)} />
              <span>This ticket affects driver payroll</span>
            </label>
          </div>
          {payrollImp && (
            <>
              <div className="mnt-form-row">
                <label className="mnt-form-label">Estimated Driver Pay</label>
                <input value={pay} onChange={e => setPay(e.target.value)} className="mnt-form-input" type="number" min="0" step="0.01" placeholder="$0.00" />
              </div>
              <div className="mnt-form-row full">
                <label className="mnt-dispatch-hold-label">
                  <input type="checkbox" checked={holding} onChange={e => setHolding(e.target.checked)} />
                  <span>Place payroll on hold — requires manager approval before pay is released</span>
                </label>
              </div>
              {holding && (
                <div className="mnt-form-row full">
                  <label className="mnt-form-label">Hold Reason</label>
                  <input value={holdReason} onChange={e => setHoldReason(e.target.value)} className="mnt-form-input" placeholder="Reason for payroll hold…" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mnt-modal-footer">
          <button type="button" onClick={onClose} className="mnt-btn-ghost">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="mnt-btn-primary">{saving ? "Creating…" : "Create Ticket"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Ticket Detail Drawer ─────────────────────────────────────────────────────

function TicketDetailDrawer({ ticket, onClose, onStatusChange }: {
  ticket: Ticket;
  onClose: () => void;
  onStatusChange: (t: Ticket, s: TicketStatus) => void;
}) {
  const ps  = PRIORITY_STYLE[ticket.priority];
  const prs = PAYROLL_STATUS_STYLE[ticket.payroll_status];
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [payErr, setPayErr] = useState("");

  async function addNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const res = await fetch(`/api/ronyx/ops-tickets/${ticket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newNote, author: "dispatcher" }),
    });
    setSavingNote(false);
    if (!res.ok) { setPayErr("Note didn't save — try again."); return; }
    setNewNote("");
  }

  // Only flip the UI to the new payroll state if the save actually succeeded — otherwise
  // staff would believe payroll was approved/released when it wasn't.
  async function setPayrollStatus(status: string) {
    setPayErr("");
    const res = await fetch(`/api/ronyx/ops-tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payroll_status: status }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPayErr(d.error ? `Didn't save: ${d.error}` : "Payroll change didn't save — try again.");
      return;
    }
    onStatusChange({ ...ticket, payroll_status: status as Ticket["payroll_status"] }, ticket.status);
  }
  const approvePayroll     = () => setPayrollStatus("approved");
  const releasePayrollHold = () => setPayrollStatus("ready");

  const next = NEXT_STATUS[ticket.status];

  return (
    <div className="mnt-drawer-backdrop" onClick={onClose}>
      <div className="mnt-drawer" onClick={e => e.stopPropagation()}>
        <div className="mnt-drawer-head">
          <div>
            <p className="mnt-drawer-sub">Ticket Detail</p>
            <h2>{ticket.ticket_number}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <span className="tkt-priority" style={{ background: ps.bg, color: ps.text }}>{ticket.priority.toUpperCase()}</span>
              <span style={{ background: PIPELINE.find(p => p.key === ticket.status)?.bg || "#f1f5f9", color: STATUS_COLOR[ticket.status], fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5 }}>{ticket.status.replace(/_/g, " ").toUpperCase()}</span>
              {ticket.source === "fast_scan" && <span className="tkt-source-badge">FAST SCAN</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="mnt-btn-ghost mnt-btn-sm">×</button>
        </div>

        <div><p className="mnt-drawer-section-title">Category</p><p style={{ color: "#334155", fontWeight: 600 }}>{ticket.category}</p></div>
        <div><p className="mnt-drawer-section-title">Title</p><p style={{ color: "#0f172a", fontWeight: 700, fontSize: 14 }}>{ticket.title}</p></div>
        {ticket.description && <div><p className="mnt-drawer-section-title">Description</p><p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.6 }}>{ticket.description}</p></div>}

        <div className="mnt-drawer-grid">
          <div><span>Created</span><strong>{fmtDatetime(ticket.created_at)}</strong></div>
          <div><span>Source</span><strong>{ticket.source}</strong></div>
          {ticket.assigned_to && <div><span>Assigned To</span><strong>{ticket.assigned_to}</strong></div>}
          {ticket.due_date    && <div><span>Due Date</span><strong>{fmtDate(ticket.due_date)}</strong></div>}
        </div>

        {/* Payroll Impact Section */}
        {ticket.payroll_impact && (
          <div className="tkt-drawer-payroll">
            <p className="mnt-drawer-section-title">Payroll Impact</p>
            <div className="tkt-drawer-payroll-grid">
              <div><span>Impact</span><strong style={{ color: "#dc2626" }}>YES</strong></div>
              <div><span>Status</span><strong style={{ color: prs.text }}>{prs.label}</strong></div>
              {ticket.estimated_driver_pay != null && <div><span>Est. Driver Pay</span><strong>{fmtPay(ticket.estimated_driver_pay)}</strong></div>}
            </div>
            {ticket.payroll_hold_reason && (
              <div className="tkt-hold-banner">
                🔒 <strong>Hold Reason:</strong> {ticket.payroll_hold_reason}
              </div>
            )}
            {payErr && <div style={{ background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:8, padding:"7px 11px", fontSize:12, fontWeight:700, marginBottom:8 }}>⚠ {payErr}</div>}
            <div className="tkt-drawer-payroll-actions">
              {ticket.payroll_status === "hold" && (
                <button type="button" onClick={releasePayrollHold} className="mnt-btn-ghost mnt-btn-sm">Release Hold</button>
              )}
              {["pending_review","ready"].includes(ticket.payroll_status) && (
                <button type="button" onClick={approvePayroll} className="mnt-btn-primary mnt-btn-sm">Approve Pay</button>
              )}
              {ticket.related_payroll_item_id && (
                <a href="/ronyx/payroll" className="mnt-btn-ghost mnt-btn-sm">View Payroll Record</a>
              )}
            </div>
          </div>
        )}

        {ticket.impact.length > 0 && (
          <div><p className="mnt-drawer-section-title">Impact Areas</p>
            <div className="tkt-impact-badges">{ticket.impact.map(i => <span key={i} className="tkt-impact-pill">{i}</span>)}</div>
          </div>
        )}

        {/* Add Note */}
        <div>
          <p className="mnt-drawer-section-title">Add Comment</p>
          <div className="tkt-drawer-note">
            <textarea value={newNote} onChange={e => setNewNote(e.target.value)} className="mnt-form-textarea" rows={2} placeholder="Add a comment or note…" />
            <button type="button" onClick={addNote} disabled={!newNote.trim() || savingNote} className="mnt-btn-primary mnt-btn-sm">{savingNote ? "Saving…" : "Add"}</button>
          </div>
        </div>

        <div className="mnt-drawer-footer">
          {next && NEXT_LABEL[ticket.status] && (
            <button type="button" onClick={() => { onStatusChange(ticket, next); onClose(); }} className="mnt-btn-primary">
              {NEXT_LABEL[ticket.status]}
            </button>
          )}
          <select className="mnt-form-select" value={ticket.status} onChange={e => { onStatusChange(ticket, e.target.value as TicketStatus); }} style={{ fontSize: 12 }}>
            {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button type="button" onClick={onClose} className="mnt-btn-ghost">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = "board" | "payroll" | "scans" | "all";

export default function DispatchTicketsPage() {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [scans,    setScans]    = useState<FastScan[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<TabKey>("board");
  const [toast,    setToast]    = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing,  setViewing]  = useState<Ticket | null>(null);
  const [filterCat, setFilterCat] = useState("");
  const [filterPay, setFilterPay] = useState("");

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const loadAll = useCallback(async () => {
    const [tr, sr] = await Promise.all([
      fetch("/api/ronyx/ops-tickets"),
      fetch("/api/ronyx/fast-scan"),
    ]);
    const [td, sd] = await Promise.all([tr.json(), sr.json()]);
    setTickets(td.tickets || []);
    setScans(sd.scans || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function advanceTicket(ticket: Ticket) {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: next } : t));
    await fetch(`/api/ronyx/ops-tickets/${ticket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    showToast(`Ticket ${ticket.ticket_number} → ${next.replace(/_/g, " ")}`);
  }

  async function updateStatus(ticket: Ticket, status: TicketStatus) {
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status } : t));
    await fetch(`/api/ronyx/ops-tickets/${ticket.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function onScanCreated(scan: FastScan, ticket: Ticket) {
    setScans(prev => [scan, ...prev]);
    setTickets(prev => [ticket, ...prev]);
    showToast(`Scan processed → ${ticket.ticket_number} · Payroll: ${PAYROLL_STATUS_STYLE[ticket.payroll_status].label}`);
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filterCat && t.category !== filterCat) return false;
      if (filterPay && t.payroll_status !== filterPay) return false;
      return true;
    });
  }, [tickets, filterCat, filterPay]);

  const kpi = {
    total:       tickets.length,
    open:        tickets.filter(t => !["closed","rejected"].includes(t.status)).length,
    payrollHold: tickets.filter(t => t.payroll_status === "hold").length,
    critical:    tickets.filter(t => t.priority === "critical").length,
    fastScan:    scans.length,
    pendingPay:  tickets.filter(t => t.payroll_status === "pending_review").length,
    approved:    tickets.filter(t => t.payroll_status === "approved").length,
    readyPay:    tickets.filter(t => t.payroll_status === "ready").length,
  };

  return (
    <div className="mnt-root">
      {toast && <div className="mnt-toast">{toast}</div>}

      <div className="mnt-page-header">
        <div>
          <h1 className="mnt-page-title">RONYX OPERATIONS TICKETS</h1>
          <p className="mnt-page-subtitle">Fast Scan intake · Trip proof · Payroll triggers · Issue tracking · Dispute resolution</p>
        </div>
        <div className="mnt-header-actions">
          <button type="button" onClick={loadAll} className="mnt-btn-ghost mnt-btn-sm">Refresh</button>
          <a href="/ronyx/dispatch/board" className="mnt-btn-ghost mnt-btn-sm">Dispatch Board</a>
          <button type="button" onClick={() => setCreating(true)} className="mnt-btn-primary mnt-btn-sm">+ New Ticket</button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="mnt-kpi-grid">
        {[
          { label: "Total Tickets",      value: kpi.total,      dot: "#3b82f6",  bg: "#eff6ff" },
          { label: "Open",               value: kpi.open,       dot: kpi.open      > 0 ? "#f59e0b" : "#16a34a", bg: kpi.open      > 0 ? "#fef3c7" : "#f0fdf4" },
          { label: "Critical",           value: kpi.critical,   dot: kpi.critical  > 0 ? "#dc2626" : "#16a34a", bg: kpi.critical  > 0 ? "#fee2e2" : "#f0fdf4" },
          { label: "Payroll Hold",       value: kpi.payrollHold, dot: kpi.payrollHold > 0 ? "#dc2626" : "#16a34a", bg: kpi.payrollHold > 0 ? "#fee2e2" : "#f0fdf4" },
          { label: "Pending Payroll",    value: kpi.pendingPay, dot: kpi.pendingPay > 0 ? "#d97706" : "#16a34a", bg: kpi.pendingPay > 0 ? "#fef3c7" : "#f0fdf4" },
          { label: "Ready for Payroll",  value: kpi.readyPay,   dot: "#06b6d4",  bg: "#ecfeff" },
          { label: "Payroll Approved",   value: kpi.approved,   dot: "#16a34a",  bg: "#f0fdf4" },
          { label: "Fast Scan Uploads",  value: kpi.fastScan,   dot: "#8b5cf6",  bg: "#f5f3ff" },
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

      {/* ── Fast Scan Strip ── */}
      <FastScanStrip onScanSubmit={onScanCreated} />

      {/* ── Tabs ── */}
      <div className="mnt-tabs">
        {([
          { key: "board",   label: "Board",           count: kpi.open },
          { key: "payroll", label: "Payroll Review",  count: kpi.payrollHold + kpi.pendingPay },
          { key: "scans",   label: "Fast Scan Log",   count: scans.filter(s => s.upload_status === "processing").length },
          { key: "all",     label: "All Tickets",     count: 0 },
        ] as const).map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} className={`mnt-tab ${tab === t.key ? "active" : ""}`}>
            {t.label}{t.count > 0 && <span className="mnt-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      {(tab === "board" || tab === "all") && (
        <div className="tkt-filters">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="mnt-form-select" style={{ fontSize: 11 }}>
            <option value="">All Categories</option>
            {TICKET_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterPay} onChange={e => setFilterPay(e.target.value)} className="mnt-form-select" style={{ fontSize: 11 }}>
            <option value="">All Payroll Status</option>
            <option value="none">No Impact</option>
            <option value="hold">Hold</option>
            <option value="pending_review">Pending Review</option>
            <option value="ready">Ready</option>
            <option value="approved">Approved</option>
          </select>
          <button type="button" onClick={() => { setFilterCat(""); setFilterPay(""); }} className="mnt-btn-ghost mnt-btn-sm">Clear</button>
        </div>
      )}

      {/* ── Board Tab ── */}
      {tab === "board" && (
        loading ? <div className="mnt-loading">Loading tickets…</div> : (
          <div className="tkt-board">
            {PIPELINE.map(lane => {
              const laneTickets = filteredTickets.filter(t => t.status === lane.key);
              return (
                <div key={lane.key} className="mnt-lane">
                  <div className="mnt-lane-header" style={{ borderColor: lane.color, background: lane.bg }}>
                    <span className="mnt-lane-label" style={{ color: lane.color }}>{lane.label}</span>
                    <span className="mnt-lane-count" style={{ background: lane.color }}>{laneTickets.length}</span>
                  </div>
                  <div className="mnt-lane-cards">
                    {laneTickets.length === 0
                      ? <div className="mnt-lane-empty">No tickets</div>
                      : laneTickets.map(t => (
                          <TicketCard key={t.id} ticket={t}
                            onView={setViewing}
                            onAdvance={advanceTicket}
                            onUpdateStatus={updateStatus}
                          />
                        ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Payroll Review Tab ── */}
      {tab === "payroll" && (
        <div className="mnt-section">
          <h3 className="mnt-section-title">Payroll Review Queue</h3>
          <table className="mnt-table">
            <thead><tr><th>Ticket #</th><th>Category</th><th>Title</th><th>Driver</th><th>Est. Pay</th><th>Payroll Status</th><th>Hold Reason</th><th>Actions</th></tr></thead>
            <tbody>
              {tickets.filter(t => t.payroll_impact && t.payroll_status !== "none").map(t => {
                const prs = PAYROLL_STATUS_STYLE[t.payroll_status];
                return (
                  <tr key={t.id}>
                    <td className="mnt-table-unit">{t.ticket_number}</td>
                    <td>{t.category}</td>
                    <td>{t.title}</td>
                    <td>{t.related_driver_id?.slice(0,8) || "—"}</td>
                    <td>{fmtPay(t.estimated_driver_pay)}</td>
                    <td><span style={{ background: prs.bg, color: prs.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{prs.label}</span></td>
                    <td style={{ fontSize: 11, color: "#dc2626" }}>{t.payroll_hold_reason || "—"}</td>
                    <td className="mnt-table-actions">
                      <button type="button" onClick={() => setViewing(t)} className="mnt-table-btn">Review</button>
                      {t.payroll_status === "hold" && (
                        <button type="button" onClick={async () => {
                          const res = await fetch(`/api/ronyx/ops-tickets/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payroll_status: "ready" }) });
                          if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error ? `Couldn't release: ${d.error}` : "Release failed — not saved."); return; }
                          setTickets(prev => prev.map(x => x.id === t.id ? { ...x, payroll_status: "ready" } : x));
                          showToast("Payroll hold released");
                        }} className="mnt-table-btn primary">Release Hold</button>
                      )}
                      {["pending_review","ready"].includes(t.payroll_status) && (
                        <button type="button" onClick={async () => {
                          const res = await fetch(`/api/ronyx/ops-tickets/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payroll_status: "approved" }) });
                          if (!res.ok) { const d = await res.json().catch(() => ({})); showToast(d.error ? `Couldn't approve: ${d.error}` : "Approve failed — not saved."); return; }
                          setTickets(prev => prev.map(x => x.id === t.id ? { ...x, payroll_status: "approved" } : x));
                          showToast("Payroll approved");
                        }} className="mnt-table-btn primary">Approve Pay</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {tickets.filter(t => t.payroll_impact && t.payroll_status !== "none").length === 0 && (
                <tr><td colSpan={8} className="mnt-empty-state">No payroll items pending review</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Fast Scan Log Tab ── */}
      {tab === "scans" && (
        <div className="mnt-section">
          <h3 className="mnt-section-title">Fast Scan Upload Log</h3>
          <table className="mnt-table">
            <thead><tr><th>Scan ID</th><th>Type</th><th>File</th><th>Status</th><th>Payroll Action</th><th>Linked Ticket</th><th>Uploaded</th></tr></thead>
            <tbody>
              {scans.map(s => (
                <tr key={s.id}>
                  <td className="mnt-table-unit">{s.id.slice(0, 8).toUpperCase()}</td>
                  <td>{s.scan_type || "—"}</td>
                  <td style={{ fontSize: 11, color: "#64748b" }}>{s.file_name || s.file_url?.split("/").pop() || "—"}</td>
                  <td><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: s.upload_status === "linked" ? "#dcfce7" : s.upload_status === "processing" ? "#fef3c7" : "#f1f5f9", color: s.upload_status === "linked" ? "#15803d" : s.upload_status === "processing" ? "#92400e" : "#64748b" }}>{s.upload_status}</span></td>
                  <td style={{ fontSize: 11, fontWeight: 700, color: s.payroll_action === "hold" ? "#dc2626" : s.payroll_action === "create" ? "#16a34a" : "#64748b" }}>{s.payroll_action || "none"}</td>
                  <td>{s.resulting_ticket_id ? <a href="#" onClick={e => { e.preventDefault(); const t = tickets.find(x => x.id === s.resulting_ticket_id); if (t) setViewing(t); }} style={{ color: "#3b82f6", fontWeight: 700, fontSize: 11 }}>View Ticket</a> : "—"}</td>
                  <td style={{ fontSize: 11 }}>{fmtDatetime(s.created_at)}</td>
                </tr>
              ))}
              {scans.length === 0 && <tr><td colSpan={7} className="mnt-empty-state">No scans uploaded yet. Use Fast Scan above.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── All Tickets Tab ── */}
      {tab === "all" && (
        <div className="mnt-section">
          <h3 className="mnt-section-title">All Tickets</h3>
          <table className="mnt-table">
            <thead><tr><th>Ticket #</th><th>Category</th><th>Title</th><th>Priority</th><th>Status</th><th>Payroll</th><th>Source</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredTickets.map(t => {
                const ps  = PRIORITY_STYLE[t.priority];
                const prs = PAYROLL_STATUS_STYLE[t.payroll_status];
                return (
                  <tr key={t.id}>
                    <td className="mnt-table-unit">{t.ticket_number}</td>
                    <td style={{ fontSize: 11 }}>{t.category}</td>
                    <td>{t.title}</td>
                    <td><span style={{ background: ps.bg, color: ps.text, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{t.priority.toUpperCase()}</span></td>
                    <td><span style={{ color: STATUS_COLOR[t.status], fontSize: 11, fontWeight: 700 }}>{t.status.replace(/_/g, " ")}</span></td>
                    <td>{t.payroll_impact ? <span style={{ background: prs.bg, color: prs.text, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{prs.label}</span> : <span style={{ color: "#94a3b8", fontSize: 10 }}>—</span>}</td>
                    <td style={{ fontSize: 11, color: "#64748b" }}>{t.source}</td>
                    <td style={{ fontSize: 11 }}>{fmtDatetime(t.created_at)}</td>
                    <td className="mnt-table-actions">
                      <button type="button" onClick={() => setViewing(t)} className="mnt-table-btn">View</button>
                    </td>
                  </tr>
                );
              })}
              {filteredTickets.length === 0 && <tr><td colSpan={9} className="mnt-empty-state">No tickets found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {creating && (
        <CreateTicketModal
          onClose={() => setCreating(false)}
          onSaved={(t) => { setTickets(prev => [t, ...prev]); setCreating(false); showToast(`${t.ticket_number} created`); }}
        />
      )}

      {viewing && (
        <TicketDetailDrawer
          ticket={viewing}
          onClose={() => setViewing(null)}
          onStatusChange={(t, s) => { updateStatus(t, s); setViewing({ ...t, status: s }); }}
        />
      )}
    </div>
  );
}
