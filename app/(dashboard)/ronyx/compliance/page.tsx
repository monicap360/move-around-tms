"use client";

import { useEffect, useState, useCallback } from "react";
import { useModuleAccess } from "@/app/hooks/useModuleAccess";
import ModuleUpgradeCard from "@/app/components/ronyx/ModuleUpgradeCard";

/* ─── Types ───────────────────────────────────────────────────────── */
type Driver = {
  id: string; full_name: string; phone?: string; email?: string;
  driver_type?: string; status?: string; assigned_truck_number?: string;
  company_name?: string; job_assignment?: string;
  license_number?: string; license_state?: string; license_expiration_date?: string;
  medical_card_expiration?: string; medical_card_number?: string;
  mvr_expiration?: string; drug_test_expiration?: string;
  background_check_status?: string; hire_date?: string;
  dispatch_eligible?: boolean; payroll_eligible?: boolean;
  compliance_flags?: string[]; notes?: string;
};

type WorkItem = {
  id: string; entity_type?: string; entity_id?: string; entity_name?: string;
  issue_type: string; priority: string; status: string;
  assigned_to_name?: string; due_date?: string; days_remaining?: number; days_overdue?: number;
  dispatch_blocked?: boolean; payroll_blocked?: boolean; required_action?: string;
  last_reminder_at?: string; snoozed_until?: string; owner_review_required?: boolean;
  notes?: string; created_at?: string;
};

type Block = {
  id: string; entity_type: string; entity_id: string; entity_name?: string;
  block_type: string; reason: string; status: string;
  blocked_by_name?: string; blocked_at?: string;
  override_used?: boolean; override_reason?: string;
};

type UploadModalState = {
  open: boolean; entity_type: string; entity_id: string; entity_name: string; doc_type: string;
};

type ReminderModalState = {
  open: boolean; entity_id: string; entity_name: string; entity_type: string;
  contact: string; issue: string; work_item_id?: string;
};

type SnoozeTarget = { id: string; name: string } | null;

/* ─── Helpers ─────────────────────────────────────────────────────── */
function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function priorityFromDays(days: number | null): string {
  if (days === null || days < 0) return "stop_now";
  if (days <= 7)  return "stop_now";
  if (days <= 14) return "fix_today";
  if (days <= 30) return "this_week";
  if (days <= 60) return "upcoming";
  return "upcoming";
}

type PriorityKey = "stop_now" | "fix_today" | "this_week" | "upcoming" | "waiting" | "complete";
const PRIORITY_LABEL: Record<PriorityKey, string> = {
  stop_now: "Stop Now", fix_today: "Fix Today", this_week: "This Week",
  upcoming: "Upcoming",  waiting: "Waiting",     complete: "Complete",
};
const PRIORITY_COLOR: Record<PriorityKey, [string, string]> = {
  stop_now:  ["#7f1d1d", "#fef2f2"],
  fix_today: ["#dc2626", "#fff1f2"],
  this_week: ["#ea580c", "#fff7ed"],
  upcoming:  ["#2563eb", "#eff6ff"],
  waiting:   ["#9333ea", "#faf5ff"],
  complete:  ["#16a34a", "#f0fdf4"],
};

function getBadge(priority: string): [string, string] {
  return PRIORITY_COLOR[priority as PriorityKey] || ["#64748b", "#f8fafc"];
}

function computeDriverIssues(d: Driver): { issue: string; days: number | null; priority: string; required_action: string }[] {
  const issues: { issue: string; days: number | null; priority: string; required_action: string }[] = [];
  const now = Date.now();

  const cdlDays = daysUntil(d.license_expiration_date);
  if (!d.license_expiration_date) {
    issues.push({ issue: "CDL Expiration Missing", days: null, priority: "fix_today", required_action: "Upload CDL copy and enter expiration date" });
  } else if (cdlDays !== null && cdlDays <= 90) {
    issues.push({ issue: `CDL ${cdlDays < 0 ? `Expired ${Math.abs(cdlDays)}d ago` : `Expires in ${cdlDays}d`}`, days: cdlDays, priority: priorityFromDays(cdlDays), required_action: "Request CDL renewal from driver" });
  }

  const medDays = daysUntil(d.medical_card_expiration);
  if (!d.medical_card_expiration) {
    issues.push({ issue: "Medical Card Missing", days: null, priority: "fix_today", required_action: "Schedule DOT physical or request medical card copy" });
  } else if (medDays !== null && medDays <= 90) {
    issues.push({ issue: `Medical Card ${medDays < 0 ? `Expired ${Math.abs(medDays)}d ago` : `Expires in ${medDays}d`}`, days: medDays, priority: priorityFromDays(medDays), required_action: "Schedule DOT physical appointment" });
  }

  const mvrDays = daysUntil(d.mvr_expiration);
  if (!d.mvr_expiration) {
    issues.push({ issue: "MVR Missing", days: null, priority: "this_week", required_action: "Request MVR from state DMV" });
  } else if (mvrDays !== null && mvrDays <= 90) {
    issues.push({ issue: `MVR ${mvrDays < 0 ? `Expired ${Math.abs(mvrDays)}d ago` : `Expires in ${mvrDays}d`}`, days: mvrDays, priority: priorityFromDays(mvrDays), required_action: "Order new MVR from state DMV" });
  }

  // Drug testing and background checks are handled by the subcontractor's company — not tracked here.

  return issues;
}

function dispatchStatusText(d: Driver): string {
  if (d.dispatch_eligible === false) return "Cannot be dispatched";
  const issues = computeDriverIssues(d).filter(i => i.priority === "stop_now" || i.priority === "fix_today");
  if (issues.length) return `Has ${issues.length} issue${issues.length > 1 ? "s" : ""} — review required`;
  return "Dispatch eligible";
}

function compliance_score(d: Driver): number {
  let score = 100;
  if (!d.license_expiration_date) score -= 25;
  else { const days = daysUntil(d.license_expiration_date); if (days !== null && days < 0) score -= 25; else if (days !== null && days < 30) score -= 15; }
  if (!d.medical_card_expiration) score -= 25;
  else { const days = daysUntil(d.medical_card_expiration); if (days !== null && days < 0) score -= 25; else if (days !== null && days < 30) score -= 15; }
  if (!d.mvr_expiration) score -= 15;
  // Drug testing and background checks handled by subcontractor's company — not factored in score.
  return Math.max(0, score);
}

/* ─── Style constants ─────────────────────────────────────────────── */
const S = {
  btn: (bg: string, color = "#fff"): React.CSSProperties => ({
    background: bg, color, border: "none", borderRadius: 8, padding: "7px 14px",
    fontWeight: 700, cursor: "pointer", fontSize: "0.78rem", whiteSpace: "nowrap" as const,
  }),
  ghost: { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer", whiteSpace: "nowrap" as const } as React.CSSProperties,
  label: { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 } as React.CSSProperties,
  inp: { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", background: "#fff", outline: "none", boxSizing: "border-box" as const } as React.CSSProperties,
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16 } as React.CSSProperties,
};

const TABS = [
  { key: "queue",     label: "Action Queue" },
  { key: "drivers",   label: "Drivers" },
  { key: "vehicles",  label: "Vehicles" },
  { key: "oo",        label: "Owner Operators" },
  { key: "docs",      label: "Docs to Review" },
  { key: "expiring",  label: "Expiring Soon" },
  { key: "blocked",   label: "Blocked" },
  { key: "cabcards",  label: "Cab Cards" },
  { key: "ifta",      label: "IFTA / Fuel Tax" },
  { key: "audit",     label: "Audit Packet" },
  { key: "backup",    label: "Backup Data" },
  { key: "trail",     label: "Audit Trail" },
] as const;

type TabKey = typeof TABS[number]["key"];

const DOC_TYPES = [
  "CDL / License", "Medical Certificate", "MVR",
  "Auto Insurance", "General Liability", "Cargo Insurance", "W9", "Contract",
  "Cab Card", "Vehicle Registration", "Vehicle Insurance", "Inspection Report",
  "IFTA Decal", "Other",
];

/* ─────────────────────────────────────────────────────────────────── */
/*  UPLOAD MODAL                                                        */
/* ─────────────────────────────────────────────────────────────────── */
function UploadModal({ state, onClose, onToast }: {
  state: UploadModalState;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [form, setForm] = useState({
    doc_type: state.doc_type || "",
    doc_number: "", issue_date: "", expiration_date: "", notes: "", file: null as File | null,
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.doc_type) { onToast("Select a document type."); return; }
    await fetch("/api/ronyx/compliance/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: state.entity_type, entity_id: state.entity_id,
        recipient_name: state.entity_name, message: `Document uploaded: ${form.doc_type}`,
        reminder_type: "document_upload",
      }),
    });
    onToast(`Document '${form.doc_type}' upload logged for ${state.entity_name}. Attach file in Documents tab.`);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>Upload Compliance Document</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{state.entity_name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#94a3b8" }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={S.label}>Document Type *</label>
            <select style={S.inp} value={form.doc_type} onChange={e => set("doc_type", e.target.value)}>
              <option value="">Select type…</option>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={S.label}>Issue Date</label>
              <input type="date" style={S.inp} value={form.issue_date} onChange={e => set("issue_date", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Expiration Date</label>
              <input type="date" style={S.inp} value={form.expiration_date} onChange={e => set("expiration_date", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={S.label}>Document Number</label>
            <input style={S.inp} placeholder="Policy # / CDL # / etc." value={form.doc_number} onChange={e => set("doc_number", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Upload File</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} style={{ ...S.inp, padding: "6px" }} />
          </div>
          <div>
            <label style={S.label}>Notes</label>
            <textarea style={{ ...S.inp, minHeight: 60, resize: "vertical" }} placeholder="Optional notes…" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button style={S.ghost} onClick={onClose}>Cancel</button>
          <button style={S.btn("#1d4ed8")} onClick={submit}>Upload Document</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  REMINDER MODAL                                                      */
/* ─────────────────────────────────────────────────────────────────── */
function ReminderModal({ state, onClose, onToast }: {
  state: ReminderModalState;
  onClose: () => void;
  onToast: (m: string) => void;
}) {
  const [msg, setMsg] = useState(
    `Hi ${state.entity_name}, your ${state.issue} needs immediate attention. Please contact the office today so your dispatch/payroll eligibility is not affected. Thank you.`
  );
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    await fetch("/api/ronyx/compliance/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: state.entity_type, entity_id: state.entity_id,
        recipient_name: state.entity_name, recipient_contact: state.contact,
        message: msg, reminder_type: "manual", work_item_id: state.work_item_id,
      }),
    });
    onToast(`Reminder logged for ${state.entity_name}.`);
    setSending(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>Send Reminder</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#94a3b8" }}>✕</button>
        </div>
        <div style={{ fontSize: "0.83rem", color: "#475569", marginBottom: 12 }}>
          To: <strong>{state.entity_name}</strong>{state.contact ? ` · ${state.contact}` : ""}
        </div>
        <div style={{ marginBottom: 6 }}>
          <label style={S.label}>Message</label>
          <textarea style={{ ...S.inp, minHeight: 100, resize: "vertical" }} value={msg} onChange={e => setMsg(e.target.value)} />
        </div>
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 16 }}>
          This reminder will be logged in the audit trail. SMS/email integration coming soon.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={S.ghost} onClick={onClose}>Cancel</button>
          <button style={S.btn("#7c3aed")} onClick={send} disabled={sending}>{sending ? "Logging…" : "Log Reminder"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  SNOOZE MODAL                                                        */
/* ─────────────────────────────────────────────────────────────────── */
function SnoozeModal({ target, onClose, onSnooze }: {
  target: SnoozeTarget;
  onClose: () => void;
  onSnooze: (id: string, until: string) => void;
}) {
  const [option, setOption] = useState("3d");
  const [custom, setCustom] = useState("");

  function getDate() {
    const d = new Date();
    if (option === "1d") d.setDate(d.getDate() + 1);
    else if (option === "3d") d.setDate(d.getDate() + 3);
    else if (option === "7d") d.setDate(d.getDate() + 7);
    else return custom;
    return d.toISOString().slice(0, 10);
  }

  if (!target) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 380 }}>
        <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a", marginBottom: 8 }}>Snooze Item</div>
        <div style={{ fontSize: "0.83rem", color: "#64748b", marginBottom: 16 }}>{target.name}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {[["1d","Tomorrow"], ["3d","3 days"], ["7d","7 days"], ["custom","Custom date"]].map(([v, l]) => (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.88rem" }}>
              <input type="radio" name="snooze" value={v} checked={option === v} onChange={() => setOption(v)} />
              {l}
            </label>
          ))}
          {option === "custom" && <input type="date" style={{ ...S.inp, marginTop: 4 }} value={custom} onChange={e => setCustom(e.target.value)} />}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={S.ghost} onClick={onClose}>Cancel</button>
          <button style={S.btn("#9333ea")} onClick={() => { const d = getDate(); if (d) onSnooze(target.id, d); }}>Snooze</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  BLOCK MODAL                                                         */
/* ─────────────────────────────────────────────────────────────────── */
function BlockModal({ entity, block_type, onClose, onToast, onRefresh }: {
  entity: { id: string; name: string; type: string };
  block_type: "dispatch" | "payroll";
  onClose: () => void;
  onToast: (m: string) => void;
  onRefresh: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason.trim()) { onToast("Enter a reason for the block."); return; }
    setSaving(true);
    await fetch("/api/ronyx/compliance/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_id: entity.id, entity_name: entity.name, entity_type: entity.type, block_type, reason }),
    });
    onToast(`${block_type === "dispatch" ? "Dispatch" : "Payroll"} block placed on ${entity.name}.`);
    onRefresh();
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 420 }}>
        <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a", marginBottom: 6 }}>
          {block_type === "dispatch" ? "Block Dispatch" : "Add Payroll Hold"}
        </div>
        <div style={{ fontSize: "0.83rem", color: "#64748b", marginBottom: 16 }}>{entity.name}</div>
        <label style={S.label}>Reason *</label>
        <textarea style={{ ...S.inp, minHeight: 80, resize: "vertical", marginBottom: 16 }} placeholder="Why is this block being placed?" value={reason} onChange={e => setReason(e.target.value)} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button style={S.ghost} onClick={onClose}>Cancel</button>
          <button style={S.btn("#dc2626")} onClick={submit} disabled={saving}>{saving ? "Saving…" : `Block ${block_type === "dispatch" ? "Dispatch" : "Payroll"}`}</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  DRIVER CARD (used in Drivers tab)                                   */
/* ─────────────────────────────────────────────────────────────────── */
function DriverCard({ d, onUpload, onRemind, onBlock }: {
  d: Driver;
  onUpload: (entity_type: string, entity_id: string, entity_name: string, doc_type: string) => void;
  onRemind: (entity_id: string, entity_name: string, entity_type: string, contact: string, issue: string) => void;
  onBlock:  (entity: { id: string; name: string; type: string }, block_type: "dispatch" | "payroll") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const issues = computeDriverIssues(d);
  const score  = compliance_score(d);
  const blocked = d.dispatch_eligible === false;
  const payHold = d.payroll_eligible  === false;
  const topIssue = issues[0];

  const scoreColor = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${blocked ? "#dc2626" : score >= 80 ? "#16a34a" : "#d97706"}`, marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        {/* Avatar + name */}
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: blocked ? "#fee2e2" : "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.9rem", color: blocked ? "#dc2626" : "#1d4ed8", flexShrink: 0 }}>
          {(d.full_name || "?").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{d.full_name}</span>
            {blocked && <span style={{ background: "#7f1d1d", color: "#fef2f2", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>DISPATCH BLOCKED</span>}
            {payHold && <span style={{ background: "#dc2626", color: "#fff", fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>PAYROLL HOLD</span>}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
            {d.assigned_truck_number ? `Truck ${d.assigned_truck_number}` : "No truck assigned"} · {d.phone || d.email || "No contact"} · {d.driver_type || "Driver"}
          </div>
          {topIssue && (
            <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
              ⚠ {topIssue.issue} — {topIssue.required_action}
            </div>
          )}
          {!topIssue && <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>✓ Driver is audit-ready</div>}
        </div>

        {/* Score + buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: "1.3rem", color: scoreColor, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700 }}>SCORE</div>
          </div>
          <button style={S.btn("#7c3aed", "#fff")} onClick={() => onRemind(d.id, d.full_name, "driver", d.phone || d.email || "", topIssue?.issue || "compliance document")}>
            Remind
          </button>
          <button style={S.btn("#1d4ed8", "#fff")} onClick={() => onUpload("driver", d.id, d.full_name, "")}>
            Upload
          </button>
          <button style={S.ghost} onClick={() => setExpanded(e => !e)}>{expanded ? "▲ Hide" : "▼ Detail"}</button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
          {/* Doc status grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8, marginBottom: 12 }}>
            {[
              { label: "CDL", value: d.license_expiration_date, missing: !d.license_expiration_date },
              { label: "Medical Card", value: d.medical_card_expiration, missing: !d.medical_card_expiration },
              { label: "MVR", value: d.mvr_expiration, missing: !d.mvr_expiration },
            ].map(item => {
              const days = item.value && item.value.match(/^\d{4}/) ? daysUntil(item.value) : null;
              const expired = days !== null && days < 0;
              const critical = days !== null && days <= 14 && !expired;
              return (
                <div key={item.label} style={{ background: item.missing ? "#fff7ed" : expired ? "#fff1f2" : critical ? "#fffbeb" : "#f0fdf4", border: `1px solid ${item.missing ? "#fed7aa" : expired ? "#fca5a5" : critical ? "#fde68a" : "#86efac"}`, borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: item.missing ? "#d97706" : expired ? "#dc2626" : "#0f172a", marginTop: 2 }}>
                    {item.missing ? "Missing" : expired ? `Expired (${fmtDate(item.value)})` : fmtDate(item.value)}
                  </div>
                  {days !== null && !expired && <div style={{ fontSize: "0.68rem", color: critical ? "#d97706" : "#64748b" }}>{days}d remaining</div>}
                </div>
              );
            })}
          </div>

          {/* Quick upload buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {["CDL / License", "Medical Certificate", "MVR"].map(t => (
              <button key={t} style={S.ghost} onClick={() => onUpload("driver", d.id, d.full_name, t)}>
                Upload {t.split(" / ")[0]}
              </button>
            ))}
          </div>

          {/* Block buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!blocked
              ? <button style={S.btn("#7f1d1d")} onClick={() => onBlock({ id: d.id, name: d.full_name, type: "driver" }, "dispatch")}>Block Dispatch</button>
              : <button style={S.btn("#16a34a")} onClick={async () => {
                  const res = await fetch("/api/ronyx/compliance/blocks", { method: "GET" });
                  alert("Contact admin to restore dispatch — check Blocked tab for override options.");
                }}>Restore Dispatch</button>
            }
            {!payHold
              ? <button style={S.btn("#dc2626")} onClick={() => onBlock({ id: d.id, name: d.full_name, type: "driver" }, "payroll")}>Payroll Hold</button>
              : <button style={S.btn("#16a34a")} onClick={async () => {
                  alert("Contact admin to clear payroll hold — check Blocked tab for override options.");
                }}>Clear Payroll Hold</button>
            }
            <button style={S.ghost} onClick={() => window.open(`/ronyx/drivers?id=${d.id}`, "_blank")}>Open Profile</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  STAFF TODAY PANEL                                                   */
/* ─────────────────────────────────────────────────────────────────── */
function StaffTodayPanel({ drivers, onRemind, onUpload }: {
  drivers: Driver[];
  onRemind: (entity_id: string, entity_name: string, entity_type: string, contact: string, issue: string) => void;
  onUpload: (entity_type: string, entity_id: string, entity_name: string, doc_type: string) => void;
}) {
  const mustFix = drivers.filter(d => {
    const issues = computeDriverIssues(d);
    return issues.some(i => i.priority === "stop_now" || i.priority === "fix_today") || d.dispatch_eligible === false;
  });

  const needsCall = drivers.filter(d => {
    const issues = computeDriverIssues(d);
    return issues.some(i => ["CDL Expiration Missing", "Medical Card Missing", "MVR Missing"].some(x => i.issue.includes(x.split(" ")[0])));
  });

  const waitingOwner = drivers.filter(d => d.dispatch_eligible === false || d.payroll_eligible === false);

  const readyClear = drivers.filter(d => {
    const issues = computeDriverIssues(d);
    return issues.length === 0 && (d.dispatch_eligible === false || d.payroll_eligible === false);
  });

  const BUCKETS = [
    {
      title: "Must Fix Today",
      icon: "🚨",
      bg: "#fff1f2",
      border: "#fca5a5",
      accent: "#dc2626",
      items: mustFix.slice(0, 5),
      total: mustFix.length,
      sub: "Expired or blocking dispatch/payroll",
    },
    {
      title: "Call / Text Driver",
      icon: "📞",
      bg: "#fff7ed",
      border: "#fed7aa",
      accent: "#ea580c",
      items: needsCall.slice(0, 5),
      total: needsCall.length,
      sub: "Missing documents — contact driver",
    },
    {
      title: "Waiting on Owner",
      icon: "🔐",
      bg: "#faf5ff",
      border: "#d8b4fe",
      accent: "#9333ea",
      items: waitingOwner.slice(0, 5),
      total: waitingOwner.length,
      sub: "Requires approval or manager decision",
    },
    {
      title: "Ready to Clear",
      icon: "✅",
      bg: "#f0fdf4",
      border: "#86efac",
      accent: "#16a34a",
      items: readyClear.slice(0, 5),
      total: readyClear.length,
      sub: "Documents ready — mark reviewed",
    },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#0f172a" }}>Staff Today</div>
        <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Your compliance work queue for right now</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {BUCKETS.map(bucket => (
          <div key={bucket.title} style={{ background: bucket.bg, border: `1px solid ${bucket.border}`, borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "1.1rem" }}>{bucket.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{bucket.title}</div>
                <div style={{ fontSize: "0.68rem", color: "#64748b" }}>{bucket.sub}</div>
              </div>
              <div style={{ marginLeft: "auto", background: bucket.accent, color: "#fff", borderRadius: 20, padding: "2px 10px", fontWeight: 900, fontSize: "0.9rem" }}>{bucket.total}</div>
            </div>
            {bucket.items.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", padding: "8px 0" }}>All clear — nothing here.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {bucket.items.map(d => {
                  const issues = computeDriverIssues(d);
                  const top = issues[0];
                  return (
                    <div key={d.id} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: `1px solid ${bucket.border}` }}>
                      <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#0f172a" }}>{d.full_name}</div>
                      {top && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{top.issue}</div>}
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {(d.phone || d.email) && (
                          <button style={{ ...S.btn("#7c3aed"), fontSize: "0.68rem", padding: "3px 8px" }}
                            onClick={() => onRemind(d.id, d.full_name, "driver", d.phone || d.email || "", top?.issue || "compliance")}>
                            Remind
                          </button>
                        )}
                        <button style={{ ...S.btn("#1d4ed8"), fontSize: "0.68rem", padding: "3px 8px" }}
                          onClick={() => onUpload("driver", d.id, d.full_name, "")}>
                          Upload
                        </button>
                        <button style={{ ...S.ghost, fontSize: "0.68rem", padding: "3px 8px" }}
                          onClick={() => window.open(`/ronyx/drivers?id=${d.id}`, "_blank")}>
                          Open
                        </button>
                      </div>
                    </div>
                  );
                })}
                {bucket.total > 5 && (
                  <div style={{ fontSize: "0.72rem", color: bucket.accent, fontWeight: 700, marginTop: 2 }}>+{bucket.total - 5} more — view Drivers tab</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  STAFF ASSISTANT PANEL                                               */
/* ─────────────────────────────────────────────────────────────────── */
function StaffAssistantPanel({ drivers, onToast, onUpload, onRemind, setTab }: {
  drivers: Driver[];
  onToast: (m: string) => void;
  onUpload: (entity_type: string, entity_id: string, entity_name: string, doc_type: string) => void;
  onRemind: (entity_id: string, entity_name: string, entity_type: string, contact: string, issue: string) => void;
  setTab: (t: TabKey) => void;
}) {
  const urgent = drivers.filter(d => computeDriverIssues(d).some(i => i.priority === "stop_now"));
  const top = urgent[0];

  function exportComplianceCSV() {
    const rows = [
      ["Driver", "Status", "CDL Exp", "Medical Exp", "MVR Exp", "Score"],
      ...drivers.map(d => [
        d.full_name, d.status || "active",
        d.license_expiration_date || "", d.medical_card_expiration || "",
        d.mvr_expiration || "", String(compliance_score(d)),
      ]),
    ].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    a.download = `compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    onToast("Compliance CSV exported.");
  }

  async function sendAllCriticalReminders() {
    const critical = drivers.filter(d => computeDriverIssues(d).some(i => i.priority === "stop_now") && (d.phone || d.email));
    for (const d of critical) {
      const issue = computeDriverIssues(d)[0]?.issue || "compliance document";
      await fetch("/api/ronyx/compliance/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "driver", entity_id: d.id,
          recipient_name: d.full_name, recipient_contact: d.phone || d.email,
          message: `Hi ${d.full_name}, your ${issue} needs immediate attention. Please contact the office today.`,
          reminder_type: "bulk",
        }),
      });
    }
    onToast(`${critical.length} critical reminders logged.`);
  }

  return (
    <div style={{ position: "sticky", top: 16, width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Today's priority */}
      <div style={{ background: "#0f172a", borderRadius: 14, padding: 16, color: "#fff" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Staff Assistant</div>
        {top ? (
          <>
            <div style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: 4 }}>Most urgent right now:</div>
            <div style={{ fontSize: "0.82rem", color: "#fca5a5", marginBottom: 10 }}>{top.full_name} — {computeDriverIssues(top)[0]?.issue}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ ...S.btn("#dc2626"), fontSize: "0.75rem" }} onClick={() => onRemind(top.id, top.full_name, "driver", top.phone || top.email || "", computeDriverIssues(top)[0]?.issue || "")}>Remind</button>
              <button style={{ ...S.btn("#1d4ed8"), fontSize: "0.75rem" }} onClick={() => onUpload("driver", top.id, top.full_name, "")}>Upload</button>
            </div>
          </>
        ) : (
          <div style={{ fontSize: "0.85rem", color: "#86efac", fontWeight: 700 }}>✓ No critical items today.</div>
        )}
      </div>

      {/* Quick stats */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Quick Stats</div>
        {[
          { label: "Drivers tracked",   value: drivers.length,                                    color: "#1d4ed8" },
          { label: "Stop Now",          value: drivers.filter(d => computeDriverIssues(d).some(i => i.priority === "stop_now")).length,   color: "#7f1d1d" },
          { label: "Dispatch blocked",  value: drivers.filter(d => d.dispatch_eligible === false).length,  color: "#dc2626" },
          { label: "Payroll hold",      value: drivers.filter(d => d.payroll_eligible  === false).length,  color: "#ea580c" },
          { label: "Audit-ready",       value: drivers.filter(d => computeDriverIssues(d).length === 0).length, color: "#16a34a" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: "0.78rem", color: "#475569" }}>{s.label}</span>
            <span style={{ fontWeight: 900, color: s.color, fontSize: "0.88rem" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Quick Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <button style={{ ...S.btn("#dc2626"), textAlign: "left" }} onClick={sendAllCriticalReminders}>Send All Critical Reminders</button>
          <button style={{ ...S.btn("#1d4ed8"), textAlign: "left" }} onClick={exportComplianceCSV}>Export Today's Compliance List</button>
          <button style={{ ...S.btn("#7c3aed"), textAlign: "left" }} onClick={() => onUpload("driver", "", "", "")}>Upload Document</button>
          <button style={{ ...S.btn("#0f172a"), textAlign: "left" }} onClick={() => setTab("audit")}>Build Audit Packet</button>
          <button style={{ ...S.btn("#16a34a"), textAlign: "left" }} onClick={() => setTab("backup")}>Backup Data</button>
        </div>
      </div>

      {/* Reminder templates */}
      <div style={{ background: "#faf5ff", border: "1px solid #d8b4fe", borderRadius: 14, padding: 14 }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Reminder Templates</div>
        {[
          "Medical card expired — schedule DOT physical today",
          "CDL renewal needed — send new copy to office",
          "MVR missing — request from state DMV",
          "Insurance expiring — request updated cert from carrier",
        ].map((t, i) => (
          <div key={i} style={{ fontSize: "0.73rem", color: "#475569", padding: "5px 0", borderBottom: i < 3 ? "1px solid #ede9fe" : "none" }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  AUDIT TRAIL TAB                                                     */
/* ─────────────────────────────────────────────────────────────────── */
function AuditTrailTab() {
  const [logs, setLogs] = useState<{ id: string; action: string; description: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ronyx/audit-log")
      .then(r => r.ok ? r.json() : { logs: [] })
      .then(d => { setLogs((d.logs || []).filter((l: { action: string }) => l.action?.startsWith("compliance"))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#94a3b8", padding: 30, textAlign: "center" }}>Loading audit trail…</div>;

  if (!logs.length) return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📋</div>
      <div style={{ fontWeight: 700 }}>No compliance audit events yet.</div>
      <div style={{ fontSize: "0.8rem", marginTop: 4 }}>Actions like reminders, uploads, blocks, and assignments will appear here.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {logs.map(log => (
        <div key={log.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7c3aed", marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#0f172a" }}>{log.action.replace(/_/g, " ").toUpperCase()}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{log.description}</div>
          </div>
          <div style={{ fontSize: "0.7rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtDate(log.created_at)}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  EXPIRING SOON TAB                                                   */
/* ─────────────────────────────────────────────────────────────────── */
function ExpiringSoonTab({ drivers, onRemind, onUpload }: {
  drivers: Driver[];
  onRemind: (entity_id: string, entity_name: string, entity_type: string, contact: string, issue: string) => void;
  onUpload: (entity_type: string, entity_id: string, entity_name: string, doc_type: string) => void;
}) {
  type ExpiryItem = { driver: Driver; issue: string; days: number; docType: string };
  const items: ExpiryItem[] = [];
  drivers.forEach(d => {
    const pairs: [string | undefined, string, string][] = [
      [d.license_expiration_date, "CDL", "CDL / License"],
      [d.medical_card_expiration, "Medical Card", "Medical Certificate"],
      [d.mvr_expiration,          "MVR", "MVR"],
    ];
    pairs.forEach(([date, issue, docType]) => {
      const days = daysUntil(date);
      if (days !== null && days <= 90) items.push({ driver: d, issue, days, docType });
    });
  });
  items.sort((a, b) => a.days - b.days);

  const groups = [
    { label: "Expired / 0–7 days",  color: "#dc2626", bg: "#fff1f2", items: items.filter(i => i.days <= 7) },
    { label: "8–14 days",           color: "#ea580c", bg: "#fff7ed", items: items.filter(i => i.days > 7  && i.days <= 14) },
    { label: "15–30 days",          color: "#d97706", bg: "#fffbeb", items: items.filter(i => i.days > 14 && i.days <= 30) },
    { label: "31–60 days",          color: "#2563eb", bg: "#eff6ff", items: items.filter(i => i.days > 30 && i.days <= 60) },
    { label: "61–90 days",          color: "#0891b2", bg: "#ecfeff", items: items.filter(i => i.days > 60 && i.days <= 90) },
  ].filter(g => g.items.length > 0);

  if (!groups.length) return (
    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#16a34a" }}>
      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>✅</div>
      <div style={{ fontWeight: 700 }}>No expiring documents in the next 90 days.</div>
    </div>
  );

  return (
    <div>
      {groups.map(g => (
        <div key={g.label} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: g.color }} />
            <span style={{ fontWeight: 800, fontSize: "0.9rem", color: g.color }}>{g.label}</span>
            <span style={{ background: g.color, color: "#fff", borderRadius: 20, padding: "1px 9px", fontSize: "0.72rem", fontWeight: 700 }}>{g.items.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {g.items.map((item, idx) => (
              <div key={idx} style={{ background: g.bg, border: `1px solid ${g.color}30`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{item.driver.full_name}</span>
                  <span style={{ marginLeft: 10, fontSize: "0.78rem", color: g.color, fontWeight: 600 }}>{item.issue} — {item.days < 0 ? `Expired ${Math.abs(item.days)}d ago` : `${item.days}d remaining`}</span>
                  {item.driver.phone && <span style={{ marginLeft: 8, fontSize: "0.72rem", color: "#64748b" }}>{item.driver.phone}</span>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={{ ...S.btn("#7c3aed"), fontSize: "0.72rem", padding: "4px 10px" }}
                    onClick={() => onRemind(item.driver.id, item.driver.full_name, "driver", item.driver.phone || item.driver.email || "", `${item.issue} expiration`)}>
                    Remind
                  </button>
                  <button style={{ ...S.btn("#1d4ed8"), fontSize: "0.72rem", padding: "4px 10px" }}
                    onClick={() => onUpload("driver", item.driver.id, item.driver.full_name, item.docType)}>
                    Upload
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  BLOCKED TAB                                                         */
/* ─────────────────────────────────────────────────────────────────── */
function BlockedTab({ drivers, blocks, onToast, onRefresh }: {
  drivers: Driver[];
  blocks: Block[];
  onToast: (m: string) => void;
  onRefresh: () => void;
}) {
  const [overrideTarget, setOverrideTarget] = useState<Block | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [clearing, setClearing] = useState<string | null>(null);

  const dispatchBlocked = drivers.filter(d => d.dispatch_eligible === false);
  const payrollBlocked  = drivers.filter(d => d.payroll_eligible  === false);

  async function clearBlock(block: Block, override = false) {
    if (override && !overrideReason.trim()) { onToast("Enter override reason."); return; }
    setClearing(block.id);
    await fetch("/api/ronyx/compliance/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: block.id, override_used: override, override_reason: overrideReason, cleared_by_name: "Staff" }),
    });
    onToast(`Block cleared for ${block.entity_name}.`);
    setOverrideTarget(null);
    setOverrideReason("");
    onRefresh();
    setClearing(null);
  }

  return (
    <div>
      {overrideTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a", marginBottom: 6 }}>Manager Override — Clear Block</div>
            <div style={{ fontSize: "0.83rem", color: "#64748b", marginBottom: 14 }}>{overrideTarget.entity_name} · {overrideTarget.reason}</div>
            <label style={S.label}>Override Reason *</label>
            <textarea style={{ ...S.inp, minHeight: 80, resize: "vertical", marginBottom: 16 }} placeholder="Explain why you are overriding this compliance block…" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, padding: 10, marginBottom: 16, fontSize: "0.78rem", color: "#92400e" }}>
              ⚠ Manager override will be logged permanently in the audit trail.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={S.ghost} onClick={() => { setOverrideTarget(null); setOverrideReason(""); }}>Cancel</button>
              <button style={S.btn("#dc2626")} onClick={() => clearBlock(overrideTarget, true)}>Override & Clear Block</button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch blocked from drivers table */}
      {dispatchBlocked.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#7f1d1d", marginBottom: 10 }}>🚫 Dispatch Blocked ({dispatchBlocked.length})</div>
          {dispatchBlocked.map(d => {
            const activeBlock = blocks.find(b => b.entity_id === d.id && b.block_type === "dispatch" && b.status === "active");
            return (
              <div key={d.id} style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{d.full_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#dc2626", marginTop: 2 }}>
                    {activeBlock ? activeBlock.reason : "Dispatch ineligible — compliance issue"}
                  </div>
                  {activeBlock && <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>Blocked by {activeBlock.blocked_by_name} · {fmtDate(activeBlock.blocked_at)}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {activeBlock && (
                    <>
                      <button style={S.btn("#16a34a")} disabled={clearing === activeBlock.id} onClick={() => clearBlock(activeBlock)}>
                        {clearing === activeBlock.id ? "Clearing…" : "Clear Block"}
                      </button>
                      <button style={S.btn("#9333ea")} onClick={() => setOverrideTarget(activeBlock)}>Override</button>
                    </>
                  )}
                  {!activeBlock && (
                    <button style={S.ghost} onClick={() => window.open(`/ronyx/drivers?id=${d.id}`, "_blank")}>Open Profile</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payroll blocked */}
      {payrollBlocked.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#dc2626", marginBottom: 10 }}>💰 Payroll Hold ({payrollBlocked.length})</div>
          {payrollBlocked.map(d => {
            const activeBlock = blocks.find(b => b.entity_id === d.id && b.block_type === "payroll" && b.status === "active");
            return (
              <div key={d.id} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a" }}>{d.full_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#d97706", marginTop: 2 }}>
                    {activeBlock ? activeBlock.reason : "Payroll hold — compliance issue"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {activeBlock && (
                    <>
                      <button style={S.btn("#16a34a")} onClick={() => clearBlock(activeBlock)}>Clear Hold</button>
                      <button style={S.btn("#9333ea")} onClick={() => setOverrideTarget(activeBlock)}>Override</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dispatchBlocked.length === 0 && payrollBlocked.length === 0 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#16a34a" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>✅</div>
          <div style={{ fontWeight: 700 }}>No blocked drivers or payroll holds.</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  AUDIT PACKET TAB                                                    */
/* ─────────────────────────────────────────────────────────────────── */
function AuditPacketTab({ drivers }: { drivers: Driver[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [built, setBuilt]       = useState(false);

  function toggleDriver(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  function buildPacket() {
    if (!selected.length) return;
    const selectedDrivers = drivers.filter(d => selected.includes(d.id));
    const rows = [
      ["Driver Name", "CDL Exp", "Medical Card Exp", "MVR Exp", "Dispatch Eligible", "Payroll Eligible", "Score"],
      ...selectedDrivers.map(d => [
        d.full_name,
        d.license_expiration_date || "MISSING",
        d.medical_card_expiration || "MISSING",
        d.mvr_expiration          || "MISSING",
        d.dispatch_eligible !== false ? "Yes" : "No",
        d.payroll_eligible  !== false ? "Yes" : "No",
        String(compliance_score(d)),
      ]),
    ].map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    a.download = `audit-packet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setBuilt(true);
  }

  return (
    <div>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1d4ed8", marginBottom: 6 }}>Build Audit Packet</div>
        <div style={{ fontSize: "0.82rem", color: "#475569", marginBottom: 12 }}>Select drivers to include in the compliance audit packet. The packet will include CDL, medical card, MVR, eligibility status, and compliance score.</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button style={S.btn("#1d4ed8")} onClick={() => setSelected(drivers.map(d => d.id))}>Select All</button>
          <button style={S.ghost} onClick={() => setSelected([])}>Clear</button>
          <button style={{ ...S.btn("#16a34a"), marginLeft: "auto" }} onClick={buildPacket} disabled={!selected.length}>
            Download Audit Packet ({selected.length} drivers)
          </button>
        </div>
        {built && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 10, fontSize: "0.82rem", color: "#16a34a", fontWeight: 700 }}>✓ Audit packet downloaded.</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {drivers.map(d => {
          const issues = computeDriverIssues(d);
          const score = compliance_score(d);
          const sel = selected.includes(d.id);
          return (
            <div key={d.id} style={{ background: sel ? "#eff6ff" : "#fff", border: `1px solid ${sel ? "#93c5fd" : "#e2e8f0"}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => toggleDriver(d.id)}>
              <input type="checkbox" checked={sel} onChange={() => toggleDriver(d.id)} onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>{d.full_name}</span>
                {issues.length > 0 && <span style={{ marginLeft: 10, fontSize: "0.72rem", color: "#dc2626" }}>{issues.length} issue{issues.length > 1 ? "s" : ""}</span>}
              </div>
              <div style={{ fontWeight: 800, color: score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626", fontSize: "0.9rem" }}>{score}/100</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  BACKUP DATA TAB                                                     */
/* ─────────────────────────────────────────────────────────────────── */
function BackupDataTab({ drivers }: { drivers: Driver[] }) {
  function exportSection(label: string, rows: string[][]) {
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${label.replace(/ /g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function exportDriverCompliance() {
    exportSection("driver-compliance-backup", [
      ["ID", "Name", "Phone", "Email", "Type", "Status", "CDL #", "CDL State", "CDL Exp", "Medical Card Exp", "MVR Exp", "Truck #", "Company", "Dispatch Eligible", "Payroll Eligible", "Score", "Compliance Flags"],
      ...drivers.map(d => [
        d.id, `"${d.full_name}"`, d.phone || "", d.email || "",
        d.driver_type || "", d.status || "active",
        d.license_number || "", d.license_state || "", d.license_expiration_date || "",
        d.medical_card_expiration || "", d.mvr_expiration || "",
        d.assigned_truck_number || "", `"${d.company_name || ""}"`,
        d.dispatch_eligible !== false ? "Yes" : "No",
        d.payroll_eligible  !== false ? "Yes" : "No",
        String(compliance_score(d)),
        `"${(d.compliance_flags || []).join("; ")}"`,
      ]),
    ]);
  }

  return (
    <div>
      <div style={{ background: "#0f172a", borderRadius: 14, padding: 20, color: "#fff", marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 }}>Compliance Backup Center</div>
        <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>All exports read live data from Supabase. These are point-in-time snapshots.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {[
          {
            title: "Driver Compliance Backup",
            desc: `${drivers.length} active drivers — CDL, medical, MVR, eligibility`,
            icon: "🪪",
            action: exportDriverCompliance,
            label: "Export Driver Compliance Excel",
          },
          {
            title: "Missing Documents Report",
            desc: "Drivers with any missing required compliance document",
            icon: "📄",
            action: () => exportSection("missing-documents-report", [
              ["Driver", "Phone", "Missing Documents"],
              ...drivers
                .filter(d => computeDriverIssues(d).length > 0)
                .map(d => [`"${d.full_name}"`, d.phone || "", `"${computeDriverIssues(d).map(i => i.issue).join("; ")}"`]),
            ]),
            label: "Export Missing Docs Report",
          },
          {
            title: "Blocked Drivers Report",
            desc: "All drivers with dispatch or payroll blocks active",
            icon: "🚫",
            action: () => exportSection("blocked-drivers-report", [
              ["Driver", "Phone", "Dispatch Blocked", "Payroll Blocked"],
              ...drivers
                .filter(d => d.dispatch_eligible === false || d.payroll_eligible === false)
                .map(d => [`"${d.full_name}"`, d.phone || "", d.dispatch_eligible === false ? "Yes" : "No", d.payroll_eligible === false ? "Yes" : "No"]),
            ]),
            label: "Export Blocked Report",
          },
          {
            title: "Expiring in 30 Days",
            desc: "All documents expiring within 30 days",
            icon: "⏰",
            action: () => {
              type ExpiryRow = [string, string, string, string];
              const rows: ExpiryRow[] = [["Driver", "Document", "Expiration", "Days Remaining"]];
              drivers.forEach(d => {
                const pairs: [string | undefined, string][] = [
                  [d.license_expiration_date, "CDL"],
                  [d.medical_card_expiration, "Medical Card"],
                  [d.mvr_expiration, "MVR"],
                ];
                pairs.forEach(([date, doc]) => {
                  const days = daysUntil(date);
                  if (days !== null && days <= 30) rows.push([`"${d.full_name}"`, doc, date || "", String(days)] as ExpiryRow);
                });
              });
              exportSection("expiring-30-days", rows);
            },
            label: "Export Expiring 30 Days",
          },
        ].map(section => (
          <div key={section.title} style={{ ...S.card }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{section.icon}</div>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a", marginBottom: 4 }}>{section.title}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>{section.desc}</div>
            <button style={S.btn("#1d4ed8")} onClick={section.action}>{section.label}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                           */
/* ═══════════════════════════════════════════════════════════════════ */
export default function ComplianceWorkCenterPage() {
  const { blocked: moduleBlocked, loading: moduleLoading } = useModuleAccess("compliance");
  const [drivers, setDrivers]       = useState<Driver[]>([]);
  const [workItems, setWorkItems]   = useState<WorkItem[]>([]);
  const [blocks, setBlocks]         = useState<Block[]>([]);
  const [activeTab, setActiveTab]   = useState<TabKey>("queue");
  const [toast, setToast]           = useState("");
  const [loading, setLoading]       = useState(true);

  const [uploadModal, setUploadModal]   = useState<UploadModalState>({ open: false, entity_type: "driver", entity_id: "", entity_name: "", doc_type: "" });
  const [reminderModal, setReminderModal] = useState<ReminderModalState>({ open: false, entity_id: "", entity_name: "", entity_type: "driver", contact: "", issue: "" });
  const [snoozeTarget, setSnoozeTarget]   = useState<SnoozeTarget>(null);
  const [blockModal, setBlockModal]       = useState<{ open: boolean; entity: { id: string; name: string; type: string }; block_type: "dispatch" | "payroll" } | null>(null);

  const [queueFilter, setQueueFilter] = useState("all");
  const [driverSearch, setDriverSearch] = useState("");

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 4000); }

  const fetchData = useCallback(async () => {
    const [driversRes, itemsRes, blocksRes] = await Promise.all([
      fetch("/api/ronyx/drivers/list").then(r => r.ok ? r.json() : { drivers: [] }).catch(() => ({ drivers: [] })),
      fetch("/api/ronyx/compliance/work-items").then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch("/api/ronyx/compliance/blocks").then(r => r.ok ? r.json() : { blocks: [] }).catch(() => ({ blocks: [] })),
    ]);
    setDrivers(driversRes.drivers || []);
    setWorkItems(itemsRes.items || []);
    setBlocks(blocksRes.blocks || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openUpload(entity_type: string, entity_id: string, entity_name: string, doc_type: string) {
    setUploadModal({ open: true, entity_type, entity_id, entity_name, doc_type });
  }
  function openRemind(entity_id: string, entity_name: string, entity_type: string, contact: string, issue: string, work_item_id?: string) {
    setReminderModal({ open: true, entity_id, entity_name, entity_type, contact, issue, work_item_id });
  }
  function openBlock(entity: { id: string; name: string; type: string }, block_type: "dispatch" | "payroll") {
    setBlockModal({ open: true, entity, block_type });
  }

  /* ── KPI calculations ─────────────────────────────────────────── */
  const kpis = {
    dispatchBlocked: drivers.filter(d => d.dispatch_eligible === false).length,
    payrollBlocked:  drivers.filter(d => d.payroll_eligible  === false).length,
    critical:        drivers.filter(d => computeDriverIssues(d).some(i => i.priority === "stop_now")).length,
    thisWeek:        drivers.filter(d => computeDriverIssues(d).some(i => i.priority === "fix_today" || i.priority === "this_week")).length,
    missing:         drivers.filter(d => computeDriverIssues(d).some(i => i.issue.includes("Missing"))).length,
    expiring30:      (() => {
      let n = 0;
      drivers.forEach(d => {
        [d.license_expiration_date, d.medical_card_expiration, d.mvr_expiration].forEach(date => {
          const days = daysUntil(date);
          if (days !== null && days >= 0 && days <= 30) n++;
        });
      });
      return n;
    })(),
    auditReady:      drivers.filter(d => compliance_score(d) === 100).length,
    ownerReview:     workItems.filter(w => w.owner_review_required).length,
    driversTracked:  drivers.length,
    docsReview:      workItems.filter(w => w.status === "document_uploaded" || w.status === "ready_to_review").length,
  };

  /* ── Urgent action strip ──────────────────────────────────────── */
  const urgentCount = kpis.critical + kpis.dispatchBlocked;
  const showStrip   = urgentCount > 0 || kpis.payrollBlocked > 0 || kpis.expiring30 > 0;

  /* ── Queue items (computed from drivers + work items) ─────────── */
  const queueItems: WorkItem[] = [
    ...drivers.flatMap(d => computeDriverIssues(d).map((issue, idx) => ({
      id:              `driver-${d.id}-${idx}`,
      entity_type:     "driver",
      entity_id:       d.id,
      entity_name:     d.full_name,
      issue_type:      issue.issue,
      priority:        issue.priority,
      status:          issue.days !== null && issue.days < 0 ? "open" : "open",
      dispatch_blocked: d.dispatch_eligible === false,
      payroll_blocked:  d.payroll_eligible  === false,
      required_action:  issue.required_action,
      days_remaining:   issue.days !== null && issue.days >= 0 ? issue.days : undefined,
      days_overdue:     issue.days !== null && issue.days < 0  ? Math.abs(issue.days) : undefined,
    } as WorkItem))),
    ...workItems,
  ];

  const filteredQueue = queueItems.filter(item => {
    if (queueFilter === "all")          return item.status !== "resolved";
    if (queueFilter === "stop_now")     return item.priority === "stop_now";
    if (queueFilter === "fix_today")    return item.priority === "fix_today";
    if (queueFilter === "waiting")      return item.status === "waiting_on_driver" || item.status === "waiting_on_owner";
    if (queueFilter === "blocked")      return item.dispatch_blocked || item.payroll_blocked;
    if (queueFilter === "owner")        return item.owner_review_required;
    return true;
  }).sort((a, b) => {
    const order: Record<string, number> = { stop_now: 0, fix_today: 1, this_week: 2, upcoming: 3, waiting: 4, complete: 5 };
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });

  const filteredDrivers = drivers.filter(d =>
    !driverSearch || d.full_name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    (d.phone || "").includes(driverSearch) || (d.company_name || "").toLowerCase().includes(driverSearch.toLowerCase())
  );

  async function snoozeItem(id: string, until: string) {
    setWorkItems(prev => prev.map(w => w.id === id ? { ...w, snoozed_until: until, status: "snoozed" } : w));
    await fetch(`/api/ronyx/compliance/work-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "snoozed", snoozed_until: until }),
    });
    flash(`Item snoozed until ${fmtDate(until)}.`);
    setSnoozeTarget(null);
  }

  async function assignToMe(itemId: string) {
    await fetch(`/api/ronyx/compliance/work-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "assigned", assigned_to_name: "Staff", assigned_at: new Date().toISOString() }),
    });
    flash("Item assigned to you.");
    fetchData();
  }

  if (moduleLoading) return null;
  if (moduleBlocked) return <ModuleUpgradeCard moduleSlug="compliance" />;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "14px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {uploadModal.open  && <UploadModal  state={uploadModal}  onClose={() => setUploadModal(s => ({ ...s, open: false }))}  onToast={flash} />}
      {reminderModal.open && <ReminderModal state={reminderModal} onClose={() => setReminderModal(s => ({ ...s, open: false }))} onToast={flash} />}
      {snoozeTarget && <SnoozeModal target={snoozeTarget} onClose={() => setSnoozeTarget(null)} onSnooze={snoozeItem} />}
      {blockModal?.open && (
        <BlockModal
          entity={blockModal.entity}
          block_type={blockModal.block_type}
          onClose={() => setBlockModal(null)}
          onToast={flash}
          onRefresh={fetchData}
        />
      )}

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", padding: "28px 28px 24px", marginBottom: 0 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>MoveAround TMS</div>
          <h1 style={{ margin: "0 0 6px", fontSize: "1.7rem", fontWeight: 900, color: "#fff" }}>HR / DOT Compliance Work Center</h1>
          <p style={{ margin: "0 0 20px", color: "#94a3b8", fontSize: "0.83rem" }}>
            CDL · Medical Cards · MVR · Insurance · Cab Cards · IFTA · Registration — staff work queue, eligibility controls, audit backup, and one-click action center. Drug testing &amp; background checks are handled by the subcontractor&apos;s company.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Upload Document",      action: () => openUpload("driver", "", "", ""),  color: "#1d4ed8" },
              { label: "Import Driver Sheet",  action: () => window.open("/ronyx/drivers", "_blank"), color: "#7c3aed" },
              { label: "Run Compliance Audit", action: () => setActiveTab("audit"),              color: "#0f172a" },
              { label: "Build Audit Packet",   action: () => setActiveTab("audit"),              color: "#0f172a" },
              { label: "Export Backup",        action: () => setActiveTab("backup"),             color: "#16a34a" },
            ].map(b => (
              <button key={b.label} onClick={b.action} style={{ ...S.btn(b.color), padding: "9px 16px", fontSize: "0.82rem" }}>{b.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CRITICAL ACTION STRIP ─────────────────────────────────── */}
      {showStrip && (
        <div style={{ background: "#7f1d1d", padding: "10px 28px", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "#fef2f2", fontWeight: 800, fontSize: "0.85rem" }}>
              🚨 {urgentCount + kpis.payrollBlocked + kpis.expiring30} compliance items need attention
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {kpis.critical > 0         && <button onClick={() => { setQueueFilter("stop_now"); setActiveTab("queue"); }} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 20, padding: "3px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.73rem" }}>{kpis.critical} Critical / Expired</button>}
              {kpis.dispatchBlocked > 0  && <button onClick={() => setActiveTab("blocked")}                                style={{ background: "#991b1b", color: "#fff", border: "none", borderRadius: 20, padding: "3px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.73rem" }}>{kpis.dispatchBlocked} Dispatch Blocked</button>}
              {kpis.payrollBlocked > 0   && <button onClick={() => setActiveTab("blocked")}                                style={{ background: "#ea580c", color: "#fff", border: "none", borderRadius: 20, padding: "3px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.73rem" }}>{kpis.payrollBlocked} Payroll Hold</button>}
              {kpis.expiring30 > 0       && <button onClick={() => { setQueueFilter("all"); setActiveTab("expiring"); }}  style={{ background: "#d97706", color: "#fff", border: "none", borderRadius: 20, padding: "3px 10px", fontWeight: 700, cursor: "pointer", fontSize: "0.73rem" }}>{kpis.expiring30} Expiring 30d</button>}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 28px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>⏳</div>
            <div style={{ fontWeight: 700 }}>Loading compliance data…</div>
          </div>
        ) : (
          <>
            {/* ── STAFF TODAY PANEL ───────────────────────────────── */}
            <StaffTodayPanel drivers={drivers} onRemind={openRemind} onUpload={openUpload} />

            {/* ── KPI CARDS ───────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Dispatch Blocked", value: kpis.dispatchBlocked, bg: "#fef2f2", color: "#7f1d1d",  action: () => setActiveTab("blocked") },
                { label: "Payroll Hold",     value: kpis.payrollBlocked,  bg: "#fff7ed", color: "#dc2626",  action: () => setActiveTab("blocked") },
                { label: "Critical / Expired", value: kpis.critical,      bg: "#fff1f2", color: "#dc2626",  action: () => { setQueueFilter("stop_now"); setActiveTab("queue"); } },
                { label: "Docs to Review",   value: kpis.docsReview,      bg: "#faf5ff", color: "#7c3aed",  action: () => setActiveTab("docs") },
                { label: "Missing Docs",     value: kpis.missing,         bg: "#fff7ed", color: "#ea580c",  action: () => setActiveTab("drivers") },
                { label: "Expiring 30d",     value: kpis.expiring30,      bg: "#fffbeb", color: "#d97706",  action: () => setActiveTab("expiring") },
                { label: "Audit Ready",      value: kpis.auditReady,      bg: "#f0fdf4", color: "#16a34a",  action: () => setActiveTab("audit") },
                { label: "Owner Review",     value: kpis.ownerReview,     bg: "#eff6ff", color: "#2563eb",  action: () => setQueueFilter("owner") },
                { label: "Drivers Tracked",  value: kpis.driversTracked,  bg: "#ecfeff", color: "#0891b2",  action: () => setActiveTab("drivers") },
                { label: "This Week",        value: kpis.thisWeek,        bg: "#fefce8", color: "#ca8a04",  action: () => { setQueueFilter("fix_today"); setActiveTab("queue"); } },
              ].map(k => (
                <div key={k.label} onClick={k.action} style={{ background: k.bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 12px", cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* ── MAIN CONTENT (tabs + assistant) ─────────────────── */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

              {/* Work queue area */}
              <div style={{ flex: 1, minWidth: 0 }}>

                {/* Tab bar */}
                <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 20, overflowX: "auto", paddingBottom: 0 }}>
                  {TABS.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      style={{ padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: activeTab === tab.key ? 800 : 500, color: activeTab === tab.key ? "#1d4ed8" : "#64748b", borderBottom: activeTab === tab.key ? "2px solid #1d4ed8" : "2px solid transparent", marginBottom: -2, whiteSpace: "nowrap", transition: "all 0.15s" }}>
                      {tab.label}
                      {tab.key === "queue" && filteredQueue.length > 0 && (
                        <span style={{ marginLeft: 6, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: "0.65rem", fontWeight: 900 }}>{filteredQueue.length}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── ACTION QUEUE TAB ────────────────────────────── */}
                {activeTab === "queue" && (
                  <div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                      {[
                        { key: "all",       label: "All Open" },
                        { key: "stop_now",  label: "Stop Now" },
                        { key: "fix_today", label: "Fix Today" },
                        { key: "blocked",   label: "Blocked" },
                        { key: "waiting",   label: "Waiting" },
                        { key: "owner",     label: "Owner Review" },
                      ].map(f => (
                        <button key={f.key} onClick={() => setQueueFilter(f.key)}
                          style={{ padding: "6px 14px", border: "none", borderRadius: 20, fontWeight: queueFilter === f.key ? 700 : 500, background: queueFilter === f.key ? "#0f172a" : "#f1f5f9", color: queueFilter === f.key ? "#fff" : "#475569", cursor: "pointer", fontSize: "0.78rem" }}>
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {filteredQueue.length === 0 ? (
                      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#16a34a" }}>
                        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>✅</div>
                        <div style={{ fontWeight: 700 }}>No items in this queue — all clear!</div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {filteredQueue.map(item => {
                          const [badgeColor, badgeBg] = getBadge(item.priority);
                          return (
                            <div key={item.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", borderLeft: `4px solid ${badgeColor}` }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                                <div style={{ background: badgeBg, color: badgeColor, fontSize: "0.65rem", fontWeight: 800, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0, marginTop: 2 }}>
                                  {PRIORITY_LABEL[item.priority as PriorityKey] || item.priority}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>{item.entity_name}</span>
                                    {item.dispatch_blocked && <span style={{ background: "#7f1d1d", color: "#fef2f2", fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>DISPATCH BLOCKED</span>}
                                    {item.payroll_blocked  && <span style={{ background: "#dc2626", color: "#fff",    fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>PAYROLL HOLD</span>}
                                    {item.owner_review_required && <span style={{ background: "#9333ea", color: "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>OWNER REVIEW</span>}
                                  </div>
                                  <div style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: 600, marginTop: 3 }}>{item.issue_type}</div>
                                  {item.required_action && <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 3 }}>Required: {item.required_action}</div>}
                                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3, display: "flex", gap: 12 }}>
                                    {item.days_overdue ? <span style={{ color: "#dc2626", fontWeight: 700 }}>⚠ {item.days_overdue}d overdue</span> : null}
                                    {item.days_remaining !== undefined ? <span>{item.days_remaining}d remaining</span> : null}
                                    {item.assigned_to_name && <span>Assigned: {item.assigned_to_name}</span>}
                                    {item.last_reminder_at && <span>Last reminder: {fmtDate(item.last_reminder_at)}</span>}
                                  </div>
                                </div>

                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  <button style={{ ...S.btn("#1d4ed8"), fontSize: "0.72rem", padding: "4px 10px" }}
                                    onClick={() => openUpload(item.entity_type || "driver", item.entity_id || "", item.entity_name || "", "")}>
                                    Upload
                                  </button>
                                  <button style={{ ...S.btn("#7c3aed"), fontSize: "0.72rem", padding: "4px 10px" }}
                                    onClick={() => {
                                      const d = drivers.find(x => x.id === item.entity_id);
                                      openRemind(item.entity_id || "", item.entity_name || "", item.entity_type || "driver", d?.phone || d?.email || "", item.issue_type, item.id);
                                    }}>
                                    Remind
                                  </button>
                                  {!item.id.startsWith("driver-") && (
                                    <>
                                      <button style={{ ...S.ghost, fontSize: "0.72rem", padding: "4px 10px" }}
                                        onClick={() => assignToMe(item.id)}>
                                        Assign to Me
                                      </button>
                                      <button style={{ ...S.ghost, fontSize: "0.72rem", padding: "4px 10px" }}
                                        onClick={() => setSnoozeTarget({ id: item.id, name: `${item.entity_name} — ${item.issue_type}` })}>
                                        Snooze
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── DRIVERS TAB ─────────────────────────────────── */}
                {activeTab === "drivers" && (
                  <div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                      <input style={{ ...S.inp, maxWidth: 280 }} placeholder="Search drivers…" value={driverSearch} onChange={e => setDriverSearch(e.target.value)} />
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "auto" }}>{filteredDrivers.length} drivers</div>
                    </div>
                    {filteredDrivers.length === 0 ? (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontWeight: 700 }}>No drivers found.</div>
                        <div style={{ fontSize: "0.8rem", marginTop: 4 }}>Import drivers or check your search.</div>
                      </div>
                    ) : (
                      filteredDrivers.map(d => (
                        <DriverCard key={d.id} d={d} onUpload={openUpload} onRemind={openRemind} onBlock={openBlock} />
                      ))
                    )}
                  </div>
                )}

                {/* ── VEHICLES TAB ────────────────────────────────── */}
                {activeTab === "vehicles" && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "32px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>🚛</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 6 }}>Vehicle Compliance</div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 16 }}>Registration, insurance, cab cards, and inspection tracking for all fleet vehicles.</div>
                    <button style={S.btn("#1d4ed8")} onClick={() => window.open("/ronyx/fleet", "_blank")}>Open Fleet Page</button>
                    <div style={{ marginTop: 12, fontSize: "0.75rem", color: "#94a3b8" }}>Vehicle compliance details and cab card tracking are in the Cab Cards tab.</div>
                  </div>
                )}

                {/* ── OWNER OPERATORS TAB ─────────────────────────── */}
                {activeTab === "oo" && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "32px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>🤝</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a", marginBottom: 6 }}>Owner Operator Compliance</div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginBottom: 16 }}>Auto insurance, GL, cargo, W9, contract, and RMIS certification status.</div>
                    <button style={S.btn("#1d4ed8")} onClick={() => window.open("/ronyx/owner-operators", "_blank")}>Open Owner Operators</button>
                    <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, textAlign: "left" }}>
                      {["Auto Insurance", "General Liability", "Cargo Insurance", "Contract", "W9"].map(doc => (
                        <div key={doc} style={{ ...S.card, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} />
                          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>{doc}</span>
                          <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#d97706", fontWeight: 700 }}>Track</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── DOCS TO REVIEW TAB ──────────────────────────── */}
                {activeTab === "docs" && (
                  <div>
                    <div style={{ background: "#faf5ff", border: "1px solid #d8b4fe", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: "0.82rem", color: "#7c3aed" }}>
                      Documents uploaded by drivers or staff will appear here for review. Approve to update compliance status.
                    </div>
                    {workItems.filter(w => w.status === "document_uploaded" || w.status === "ready_to_review").length === 0 ? (
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>
                        <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📁</div>
                        <div style={{ fontWeight: 700 }}>No documents waiting for review.</div>
                        <div style={{ fontSize: "0.8rem", marginTop: 4 }}>Use Upload Document to add docs, then review them here.</div>
                      </div>
                    ) : (
                      workItems
                        .filter(w => w.status === "document_uploaded" || w.status === "ready_to_review")
                        .map(item => (
                          <div key={item.id} style={{ ...S.card, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{item.entity_name}</div>
                              <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>{item.issue_type}</div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button style={S.btn("#16a34a")} onClick={async () => {
                                await fetch(`/api/ronyx/compliance/work-items/${item.id}`, {
                                  method: "PATCH", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "resolved", resolved_at: new Date().toISOString() }),
                                });
                                flash("Document approved."); fetchData();
                              }}>Approve</button>
                              <button style={S.btn("#dc2626")} onClick={async () => {
                                await fetch(`/api/ronyx/compliance/work-items/${item.id}`, {
                                  method: "PATCH", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "open" }),
                                });
                                flash("Document rejected — item re-opened."); fetchData();
                              }}>Reject</button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* ── EXPIRING SOON TAB ────────────────────────────── */}
                {activeTab === "expiring" && <ExpiringSoonTab drivers={drivers} onRemind={openRemind} onUpload={openUpload} />}

                {/* ── BLOCKED TAB ─────────────────────────────────── */}
                {activeTab === "blocked" && <BlockedTab drivers={drivers} blocks={blocks} onToast={flash} onRefresh={fetchData} />}

                {/* ── CAB CARDS TAB ───────────────────────────────── */}
                {activeTab === "cabcards" && (
                  <div>
                    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: "0.82rem", color: "#1d4ed8" }}>
                      Cab cards are tracked per vehicle. Add cab cards and set expiration dates to get alerts.
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                      <button style={S.btn("#1d4ed8")} onClick={() => openUpload("vehicle", "", "", "Cab Card")}>Add / Upload Cab Card</button>
                      <button style={S.ghost} onClick={() => window.open("/ronyx/fleet", "_blank")}>Open Fleet</button>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "32px 0", textAlign: "center", color: "#94a3b8" }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>🪪</div>
                      <div style={{ fontWeight: 700 }}>Cab card tracking coming from Fleet data.</div>
                      <div style={{ fontSize: "0.8rem", marginTop: 4 }}>Add cab card expiration dates to each truck in the Fleet page to see them here.</div>
                    </div>
                  </div>
                )}

                {/* ── IFTA TAB ────────────────────────────────────── */}
                {activeTab === "ifta" && (
                  <div>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: "0.82rem", color: "#92400e" }}>
                      IFTA / Fuel Tax tracking — quarterly reports, fuel receipts, mileage logs, and state filings.
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                      <button style={S.btn("#d97706", "#fff")} onClick={() => openUpload("company", "", "Company", "IFTA Decal")}>Upload IFTA Decal</button>
                      <button style={S.ghost} onClick={() => window.open("/ronyx/ifta-fuel", "_blank")}>Open IFTA / Fuel Page</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                      {["Q1 2026", "Q4 2025", "Q3 2025"].map(q => (
                        <div key={q} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontWeight: 900, color: "#d97706" }}>{q}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>IFTA Filing</div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Not filed</div>
                          </div>
                          <button style={{ ...S.ghost, fontSize: "0.72rem", padding: "4px 10px" }}>Open</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── AUDIT PACKET TAB ────────────────────────────── */}
                {activeTab === "audit" && <AuditPacketTab drivers={drivers} />}

                {/* ── BACKUP DATA TAB ─────────────────────────────── */}
                {activeTab === "backup" && <BackupDataTab drivers={drivers} />}

                {/* ── AUDIT TRAIL TAB ─────────────────────────────── */}
                {activeTab === "trail" && <AuditTrailTab />}
              </div>

              {/* Staff Assistant Panel */}
              <StaffAssistantPanel
                drivers={drivers}
                onToast={flash}
                onUpload={openUpload}
                onRemind={openRemind}
                setTab={setActiveTab}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
