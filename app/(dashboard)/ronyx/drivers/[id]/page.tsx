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

type TicketStat = {
  total: number;
  verified: number;
  review: number;
  missingSignatures: number;
  duplicates: number;
  payrollHolds: number;
  exceptions: number;
  revenue: number;
  loadsThisWeek: number;
};

const TABS = ["Overview", "Documents", "Assignments", "Compensation", "Activity"] as const;
type Tab = (typeof TABS)[number];

const REQUIRED_DOCS = ["CDL", "MVR", "Medical Card", "Drug Test", "Background Check", "Insurance"];

/* ─── Helpers ────────────────────────────────────── */
function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ─── Readiness computation ──────────────────────── */
type Readiness = {
  score: number;
  dispatchEligible: boolean;
  dispatchBlocks: string[];
  payrollEligible: boolean;
  payrollIssues: string[];
  missingDocs: string[];
  expiringSoon: { label: string; days: number; date: string }[];
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  riskFactors: string[];
  nextAction: { action: string; urgency: string } | null;
};

function computeReadiness(profile: Profile, documents: Document[], tickets: TicketStat): Readiness {
  const cdlDays  = daysUntil(profile.license_expiration_date);
  const mvrDays  = daysUntil(profile.mvr_expiration);
  const medDays  = daysUntil(profile.medical_card_expiration);

  const cdlValid = cdlDays !== null && cdlDays > 0;
  const mvrValid = mvrDays !== null && mvrDays > 0;
  const medValid = medDays !== null && medDays > 0;

  const bgCleared   = profile.background_check_status === "cleared";
  const drugCleared = profile.drug_test_status === "cleared";

  const missingDocs = REQUIRED_DOCS.filter((t) => !documents.some((d) => d.doc_type === t));

  // Dispatch blocks
  const dispatchBlocks: string[] = [];
  if (!cdlValid)   dispatchBlocks.push(cdlDays === null ? "CDL Missing" : "CDL Expired");
  if (!medValid)   dispatchBlocks.push(medDays === null ? "Medical Card Missing" : "Medical Card Expired");
  if (!bgCleared)  dispatchBlocks.push("Background Check Not Cleared");
  if (!drugCleared) dispatchBlocks.push("Drug Test Not Cleared");

  // Payroll issues
  const payrollIssues: string[] = [];
  if (tickets.payrollHolds > 0)       payrollIssues.push(`${tickets.payrollHolds} payroll hold${tickets.payrollHolds > 1 ? "s" : ""}`);
  if (tickets.missingSignatures > 0)  payrollIssues.push(`${tickets.missingSignatures} ticket${tickets.missingSignatures > 1 ? "s" : ""} missing signatures`);
  if (missingDocs.length > 0)         payrollIssues.push("Driver documents incomplete");

  // Expiring soon (0–90 days)
  const expiringSoon: { label: string; days: number; date: string }[] = [];
  if (cdlDays  !== null && cdlDays  >= 0 && cdlDays  <= 90) expiringSoon.push({ label: "CDL",          days: cdlDays,  date: profile.license_expiration_date! });
  if (mvrDays  !== null && mvrDays  >= 0 && mvrDays  <= 90) expiringSoon.push({ label: "MVR",          days: mvrDays,  date: profile.mvr_expiration! });
  if (medDays  !== null && medDays  >= 0 && medDays  <= 90) expiringSoon.push({ label: "Medical Card", days: medDays,  date: profile.medical_card_expiration! });

  // Risk factors
  const riskFactors: string[] = [];
  if (!cdlValid)   riskFactors.push(cdlDays !== null && cdlDays <= 0 ? "CDL expired" : "CDL missing");
  if (!medValid)   riskFactors.push(medDays !== null && medDays <= 0 ? "Medical card expired" : "Medical card missing");
  if (!mvrValid)   riskFactors.push("MVR expired or missing");
  if (missingDocs.length > 0) riskFactors.push(`${missingDocs.length} required doc${missingDocs.length > 1 ? "s" : ""} missing`);
  if (!bgCleared)  riskFactors.push("Background check pending");
  if (!drugCleared) riskFactors.push("Drug test pending");
  if (cdlDays  !== null && cdlDays  > 0 && cdlDays  <= 30) riskFactors.push("CDL expiring in 30 days");
  if (medDays  !== null && medDays  > 0 && medDays  <= 30) riskFactors.push("Medical card expiring in 30 days");
  if (tickets.duplicates > 0)  riskFactors.push(`${tickets.duplicates} duplicate ticket${tickets.duplicates > 1 ? "s" : ""}`);
  if (tickets.exceptions > 3)  riskFactors.push(`${tickets.exceptions} ticket exceptions`);

  const riskLevel: "Low" | "Medium" | "High" | "Critical" =
    riskFactors.length === 0 ? "Low"
    : riskFactors.length <= 2 ? "Medium"
    : riskFactors.length <= 4 ? "High"
    : "Critical";

  // Readiness score (10 weighted factors)
  const factors = [cdlValid, mvrValid, medValid, bgCleared, drugCleared,
    !documents.find(d => d.doc_type === "CDL") ? false : true,
    !documents.find(d => d.doc_type === "MVR") ? false : true,
    !documents.find(d => d.doc_type === "Medical Card") ? false : true,
    !documents.find(d => d.doc_type === "Drug Test") ? false : true,
    tickets.payrollHolds === 0];
  const score = Math.round((factors.filter(Boolean).length / factors.length) * 100);

  // Next action
  let nextAction: { action: string; urgency: string } | null = null;
  if (!medValid)           nextAction = { action: "Request Updated Medical Card", urgency: medDays !== null && medDays < 0 ? "Expired" : "Missing" };
  else if (!cdlValid)      nextAction = { action: "Renew CDL", urgency: cdlDays !== null && cdlDays < 0 ? "Expired" : "Missing" };
  else if (!mvrValid)      nextAction = { action: "Run MVR Check", urgency: "Missing or expired" };
  else if (!bgCleared)     nextAction = { action: "Clear Background Check", urgency: "Pending" };
  else if (!drugCleared)   nextAction = { action: "Clear Drug Test", urgency: "Pending" };
  else if (medDays !== null && medDays <= 30) nextAction = { action: "Renew Medical Card", urgency: `Expires in ${medDays} days` };
  else if (cdlDays !== null && cdlDays <= 60)  nextAction = { action: "Renew CDL", urgency: `Expires in ${cdlDays} days` };
  else if (missingDocs.length > 0) nextAction = { action: `Upload ${missingDocs[0]}`, urgency: "Missing document" };

  return { score, dispatchEligible: dispatchBlocks.length === 0, dispatchBlocks, payrollEligible: payrollIssues.length === 0, payrollIssues, missingDocs, expiringSoon, riskLevel, riskFactors, nextAction };
}

/* ─── Sub-components ─────────────────────────────── */
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

function EligBadge({ ok, label, blocks }: { ok: boolean; label: string; blocks: string[] }) {
  return (
    <div style={{ background: ok ? "#f0fdf4" : "#fff1f2", border: `1.5px solid ${ok ? "#86efac" : "#fda4af"}`, borderRadius: 14, padding: "16px 18px", minWidth: 180 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: blocks.length > 0 ? 8 : 0 }}>
        <span style={{ fontSize: "1.1rem" }}>{ok ? "🟢" : "🔴"}</span>
        <span style={{ fontWeight: 800, fontSize: "1rem", color: ok ? "#15803d" : "#dc2626" }}>{ok ? "Eligible" : "Blocked"}</span>
      </div>
      {blocks.map((b, i) => (
        <div key={i} style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 3 }}>• {b}</div>
      ))}
    </div>
  );
}

function RiskBadge({ level, factors }: { level: string; factors: string[] }) {
  const colors: Record<string, [string, string, string]> = {
    Low:      ["#f0fdf4", "#86efac", "#15803d"],
    Medium:   ["#fefce8", "#fde68a", "#92400e"],
    High:     ["#fff7ed", "#fdba74", "#c2410c"],
    Critical: ["#fff1f2", "#fda4af", "#be123c"],
  };
  const [bg, border, text] = colors[level] ?? colors.Low;
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: "16px 18px", minWidth: 160 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Driver Risk</div>
      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: text, marginBottom: factors.length > 0 ? 8 : 0 }}>{level}</div>
      {factors.slice(0, 3).map((f, i) => (
        <div key={i} style={{ fontSize: "0.7rem", color: text, fontWeight: 600, marginTop: 2 }}>• {f}</div>
      ))}
    </div>
  );
}

function ScoreBanner({ score, dispatchOk, payrollOk, complianceOk }: { score: number; dispatchOk: boolean; payrollOk: boolean; complianceOk: boolean }) {
  const color = score >= 80 ? "#15803d" : score >= 60 ? "#d97706" : "#dc2626";
  const bg    = score >= 80 ? "#f0fdf4" : score >= 60 ? "#fefce8" : "#fff1f2";
  const label = score >= 80 ? "DRIVER READY" : score >= 60 ? "REVIEW REQUIRED" : "DRIVER BLOCKED";
  return (
    <div style={{ background: bg, border: `2px solid ${color}`, borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <div style={{ textAlign: "center", minWidth: 80 }}>
        <div style={{ fontSize: "2.2rem", fontWeight: 900, color, lineHeight: 1 }}>{score}%</div>
        <div style={{ fontSize: "0.65rem", fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
      </div>
      <div style={{ width: 1, background: color, opacity: 0.25, alignSelf: "stretch", minHeight: 40 }} />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {[
          { ok: dispatchOk,   label: "Dispatch Eligible" },
          { ok: payrollOk,    label: "Payroll Eligible" },
          { ok: complianceOk, label: "Compliance Current" },
        ].map(({ ok, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>{ok ? "✅" : "❌"}</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: ok ? "#15803d" : "#dc2626" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color = "#0f172a" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1.1, margin: "6px 0 2px" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function ExpiringPanel({ items }: { items: { label: string; days: number; date: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>⚠ Expiring Soon</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {items.map(({ label, days, date }) => {
          const c = days <= 14 ? "#dc2626" : days <= 30 ? "#d97706" : "#f59e0b";
          const bg = days <= 14 ? "#fff1f2" : days <= 30 ? "#fff7ed" : "#fefce8";
          return (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: "10px 14px", minWidth: 120, textAlign: "center" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: c, textTransform: "uppercase" }}>{label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c, lineHeight: 1.1 }}>{days}</div>
              <div style={{ fontSize: "0.68rem", color: c, fontWeight: 600 }}>days</div>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 4 }}>{fmtDate(date)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MissingPanel({ missing, onUpload, uploading }: {
  missing: string[];
  onUpload: (docType: string, file: File) => void;
  uploading: boolean;
}) {
  if (missing.length === 0) return null;
  return (
    <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#be123c", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>🔴 Action Required — Missing Documents</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {missing.map((doc) => (
          <label key={doc} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #fda4af", borderRadius: 8, padding: "8px 14px", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1, fontWeight: 700, fontSize: "0.82rem", color: "#be123c" }}>
            <span>↑ {doc}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ display: "none" }} disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(doc, f); }} />
          </label>
        ))}
      </div>
    </div>
  );
}

function EquipmentPanel({ truck, onFlash }: { truck?: string; onFlash: (msg: string) => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Assigned Equipment</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={statLbl}>Primary Truck</div>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>{truck || "—"}</div>
        </div>
        <div>
          <div style={statLbl}>Trailer</div>
          <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.9rem" }}>—</div>
        </div>
        <div>
          <div style={statLbl}>Last Used</div>
          <div style={{ fontWeight: 600, color: "#64748b", fontSize: "0.85rem" }}>—</div>
        </div>
        <div>
          <div style={statLbl}>Inspection Status</div>
          <div style={{ fontWeight: 700, color: "#15803d", fontSize: "0.85rem" }}>—</div>
        </div>
      </div>
      <button onClick={() => onFlash("Truck assignment — edit in the Assignments tab.")} style={{ marginTop: 12, ...ghostBtn }}>
        Change Assignment →
      </button>
    </div>
  );
}

function CommPanel({ profile }: { profile: Profile }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Communication</div>
      <div style={{ marginBottom: 8 }}>
        <div style={statLbl}>Phone</div>
        <div style={{ fontWeight: 700, color: "#0f172a" }}>{profile.phone || "—"}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={statLbl}>Email</div>
        <div style={{ fontWeight: 600, color: "#475569", fontSize: "0.85rem" }}>{profile.email || "—"}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={statLbl}>Preferred Method</div>
        <div style={{ fontWeight: 600, color: "#475569", fontSize: "0.85rem" }}>Text</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {profile.phone && (
          <a href={`tel:${profile.phone}`} style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>📞 Call</a>
        )}
        {profile.email && (
          <a href={`mailto:${profile.email}`} style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>✉ Email</a>
        )}
      </div>
    </div>
  );
}

function ComplianceAssistant({ nextAction, onFlash }: { nextAction: { action: string; urgency: string } | null; onFlash: (msg: string) => void }) {
  if (!nextAction) {
    return (
      <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>✅ Compliance Assistant</div>
        <div style={{ fontWeight: 700, color: "#15803d" }}>All clear — driver fully compliant.</div>
        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>No immediate actions required.</div>
      </div>
    );
  }
  return (
    <div style={{ background: "#fefce8", border: "1.5px solid #fde68a", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>🤖 Compliance Assistant — Next Action</div>
      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", marginBottom: 4 }}>{nextAction.action}</div>
      <div style={{ fontSize: "0.78rem", color: "#d97706", fontWeight: 600, marginBottom: 12 }}>{nextAction.urgency}</div>
      <button onClick={() => onFlash(`Reminder sent: ${nextAction.action}`)} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>
        Send Reminder
      </button>
    </div>
  );
}

function Timeline({ documents, profile }: { documents: Document[]; profile: Profile }) {
  type Event = { date: string; label: string; detail: string; icon: string };
  const events: Event[] = [];

  for (const doc of documents) {
    events.push({ date: doc.uploaded_at, label: `${doc.doc_type} Uploaded`, detail: doc.expires_on ? `Expires ${fmtDate(doc.expires_on)}` : "No expiration", icon: "📄" });
  }
  if (profile.hire_date) {
    events.push({ date: profile.hire_date + "T00:00:00", label: "Hired", detail: profile.position_role || "Driver", icon: "🚛" });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const shown = events.slice(0, 8);

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Driver Timeline</div>
      {shown.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>No timeline events yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {shown.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < shown.length - 1 ? 14 : 0, position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{e.icon}</div>
                {i < shown.length - 1 && <div style={{ width: 2, flex: 1, background: "#e2e8f0", marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>{e.label}</div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{fmtDateTime(e.date)}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{e.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Editable field ─────────────────────────────── */
function EditField({ label, value, field, type = "text", options, onSave }: {
  label: string; value: string | number | boolean | undefined | null; field: string;
  type?: string; options?: string[]; onSave: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  function commit() { onSave(field, draft); setEditing(false); }

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
            <input value={draft} onChange={(e) => setDraft(e.target.value)} type={type} style={editInp} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />
          )}
          <button onClick={commit} style={saveBtnSm}>Save</button>
          <button onClick={() => setEditing(false)} style={cancelBtnSm}>✕</button>
        </div>
      ) : (
        <div onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
          style={{ fontSize: "0.9rem", color: value ? "#0f172a" : "#cbd5e1", cursor: "pointer", padding: "5px 0", borderBottom: "1px dashed #e2e8f0", display: "inline-block", minWidth: 160 }} title="Click to edit">
          {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
        </div>
      )}
    </div>
  );
}

/* ─── Document row ───────────────────────────────── */
function DocRow({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  const days = daysUntil(doc.expires_on);
  let expColor = "#64748b";
  if (days !== null) { if (days < 0) expColor = "#dc2626"; else if (days <= 30) expColor = "#d97706"; else expColor = "#15803d"; }
  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={tdSt}><strong style={{ color: "#0f172a" }}>{doc.doc_type}</strong></td>
      <td style={tdSt}>
        <span style={{ background: doc.status === "uploaded" ? "#dcfce7" : "#f1f5f9", color: doc.status === "uploaded" ? "#15803d" : "#64748b", padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700 }}>
          {doc.status}
        </span>
      </td>
      <td style={{ ...tdSt, color: expColor, fontWeight: days !== null && days <= 30 ? 700 : 400 }}>
        {doc.expires_on ?? "—"}{days !== null && days < 0 && " ⚠"}
      </td>
      <td style={tdSt}>
        {doc.file_url ? (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", fontSize: "0.8rem", fontWeight: 600 }}>View</a>
        ) : <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>No file</span>}
      </td>
      <td style={tdSt}>
        <button onClick={() => onDelete(doc.id)} style={{ ...actionSm, color: "#dc2626", background: "#fee2e2" }}>Delete</button>
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
  const [ticketStats, setTicketStats] = useState<TicketStat>({ total: 0, verified: 0, review: 0, missingSignatures: 0, duplicates: 0, payrollHolds: 0, exceptions: 0, revenue: 0, loadsThisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(searchParams.get("new") === "1" ? "Driver created! Upload documents and assign a truck below." : "");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const driverId = params.id;

  const loadData = useCallback(async () => {
    const [profRes, docsRes, tickRes] = await Promise.all([
      fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`),
      fetch(`/api/ronyx/drivers/documents?driverId=${driverId}`),
      fetch(`/api/ronyx/tickets`),
    ]);
    const [profData, docsData, tickData] = await Promise.all([profRes.json(), docsRes.json(), tickRes.json()]);

    const prof: Profile = profData.profile || {};
    setProfile(prof);
    setDocuments(docsData.documents || []);

    // Derive ticket stats for this driver by name (best available filter)
    const driverName = (prof.full_name || "").toLowerCase();
    const allTickets: any[] = tickData.tickets || [];
    const driverTickets = driverName
      ? allTickets.filter((t: any) => (t.driver_name || "").toLowerCase().includes(driverName.split(" ")[0] || "NOMATCH"))
      : allTickets;

    const weekAgo = Date.now() - 7 * 86400000;
    setTicketStats({
      total:             driverTickets.length,
      verified:          driverTickets.filter((t: any) => (t.ocr_confidence || 0.85) >= 0.9).length,
      review:            driverTickets.filter((t: any) => ["needs_review", "in_review"].includes(t.status || "")).length,
      missingSignatures: driverTickets.filter((t: any) => !t.driver_signature && !t.has_driver_signature).length,
      duplicates:        0,
      payrollHolds:      driverTickets.filter((t: any) => t.payroll_hold === true).length,
      exceptions:        driverTickets.filter((t: any) => ["needs_review", "rejected"].includes(t.status || "")).length,
      revenue:           driverTickets.reduce((s: number, t: any) => s + (Number(t.total_amount) || 0), 0),
      loadsThisWeek:     driverTickets.filter((t: any) => new Date(t.ticket_date || 0).getTime() >= weekAgo).length,
    });

    setLoading(false);
  }, [driverId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveField(field: string, value: string) {
    setSaving(true);
    const res = await fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }),
    });
    const data = await res.json();
    if (res.ok) { setProfile((prev) => ({ ...prev, ...data.profile })); flash("Saved."); }
    else flash(`Error: ${data.error}`);
    setSaving(false);
  }

  async function uploadDocument(docType: string, file: File, expiresOn?: string) {
    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("driver_id", driverId); fd.append("doc_type", docType);
    if (expiresOn) fd.append("expires_on", expiresOn);
    const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) { setDocuments((prev) => [data.document, ...prev.filter((d) => d.doc_type !== docType)]); flash(`${docType} uploaded.`); }
    else flash(`Upload error: ${data.error}`);
    setUploadingDoc(false);
  }

  async function deleteDocument(_docId: string) {
    if (!confirm("Delete this document?")) return;
    flash("Delete not yet wired to API — coming soon.");
  }

  function flash(msg: string) { setStatusMsg(msg); setTimeout(() => setStatusMsg(""), 6000); }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading driver profile…</div>;
  if (!profile) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ color: "#dc2626", fontWeight: 600 }}>Driver not found.</div>
      <Link href="/ronyx/drivers" style={{ color: "#1e40af", marginTop: 12, display: "inline-block" }}>← Back to Drivers</Link>
    </div>
  );

  const name     = profile.full_name || "Unnamed Driver";
  const readiness = computeReadiness(profile, documents, ticketStats);
  const complianceOk = readiness.expiringSoon.every(e => e.days > 30) && readiness.missingDocs.length === 0;

  return (
    <div style={{ maxWidth: 1080 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/ronyx/drivers" style={{ color: "#64748b", fontSize: "0.83rem", textDecoration: "none" }}>← Drivers</Link>
      </div>

      {/* ── Header ────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
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
            {profile.driver_type && <span>{profile.driver_type} · </span>}
            {profile.assigned_truck_number && <span>🚛 {profile.assigned_truck_number} · </span>}
            {profile.hire_date && <span>Hired {fmtDate(profile.hire_date)}</span>}
          </div>
        </div>
        <Link href="/ronyx/drivers/new" style={{ padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, color: "#475569", textDecoration: "none" }}>
          + Add Driver
        </Link>
      </div>

      {/* ── Status message ────────────────────────── */}
      {statusMsg && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: "0.85rem", fontWeight: 500, background: statusMsg.startsWith("Error") ? "#fee2e2" : "#eff6ff", color: statusMsg.startsWith("Error") ? "#dc2626" : "#1e40af", border: `1px solid ${statusMsg.startsWith("Error") ? "#fecaca" : "#bfdbfe"}` }}>
          {statusMsg}
        </div>
      )}

      {/* ── Readiness banner ──────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <ScoreBanner
          score={readiness.score}
          dispatchOk={readiness.dispatchEligible}
          payrollOk={readiness.payrollEligible}
          complianceOk={complianceOk}
        />
      </div>

      {/* ── Operational cards row ─────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <EligBadge ok={readiness.dispatchEligible} label="Dispatch Status" blocks={readiness.dispatchBlocks} />
        <EligBadge ok={readiness.payrollEligible}  label="Payroll Status"  blocks={readiness.payrollIssues} />
        <RiskBadge level={readiness.riskLevel} factors={readiness.riskFactors} />
        <ComplianceAssistant nextAction={readiness.nextAction} onFlash={flash} />
      </div>

      {/* ── Alerts: expiring + missing ────────────── */}
      {readiness.expiringSoon.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <ExpiringPanel items={readiness.expiringSoon} />
        </div>
      )}
      {readiness.missingDocs.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <MissingPanel missing={readiness.missingDocs} onUpload={uploadDocument} uploading={uploadingDoc} />
        </div>
      )}

      {/* ── Activity summary ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        <StatCard label="Loads This Week" value={ticketStats.loadsThisWeek} sub="From FastScan" />
        <StatCard label="Tickets Submitted" value={ticketStats.total} sub="All time" />
        <StatCard label="Exceptions" value={ticketStats.exceptions} sub="Need review" color={ticketStats.exceptions > 0 ? "#d97706" : "#0f172a"} />
        <StatCard label="Payroll Holds" value={ticketStats.payrollHolds} sub="Blocked" color={ticketStats.payrollHolds > 0 ? "#dc2626" : "#0f172a"} />
        <StatCard label="Revenue Generated" value={ticketStats.revenue > 0 ? `$${ticketStats.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"} sub="From tickets" />
      </div>

      {/* ── Ticket audit ──────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Driver Ticket Health — FastScan Audit</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {[
            { label: "Verified Tickets",    value: ticketStats.verified,          color: "#15803d" },
            { label: "Review Required",     value: ticketStats.review,            color: ticketStats.review > 0 ? "#d97706" : "#64748b" },
            { label: "Missing Signatures",  value: ticketStats.missingSignatures, color: ticketStats.missingSignatures > 0 ? "#dc2626" : "#64748b" },
            { label: "Duplicate Risk",      value: ticketStats.duplicates,        color: ticketStats.duplicates > 0 ? "#dc2626" : "#64748b" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Equipment + Comm ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <EquipmentPanel truck={profile.assigned_truck_number} onFlash={flash} />
        <CommPanel profile={profile} />
      </div>

      {/* ── Timeline ──────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Timeline documents={documents} profile={profile} />
      </div>

      {/* ── Tabs ──────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "9px 18px", border: "none", background: "none", cursor: "pointer",
            fontSize: "0.85rem", fontWeight: activeTab === tab ? 700 : 500,
            color: activeTab === tab ? "#1e40af" : "#64748b",
            borderBottom: activeTab === tab ? "2px solid #1e40af" : "2px solid transparent", marginBottom: -2,
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ─────────────────────────── */}
      {activeTab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Personal">
            <EditField label="Full Name"  value={profile.full_name}  field="full_name"  onSave={saveField} />
            <EditField label="Phone"      value={profile.phone}      field="phone"      type="tel"   onSave={saveField} />
            <EditField label="Email"      value={profile.email}      field="email"      type="email" onSave={saveField} />
            <EditField label="Address"    value={profile.address}    field="address"    onSave={saveField} />
            <EditField label="Status"     value={profile.status}     field="status"     options={["active", "inactive", "suspended"]} onSave={saveField} />
          </Card>
          <Card title="Employment">
            <EditField label="Driver Type"    value={profile.driver_type}    field="driver_type"    options={["W2", "1099", "owner_operator"]} onSave={saveField} />
            <EditField label="Position / Role" value={profile.position_role} field="position_role"  onSave={saveField} />
            <EditField label="Hire Date"      value={profile.hire_date}      field="hire_date"      type="date"  onSave={saveField} />
            <EditField label="Supervisor"     value={profile.supervisor_name} field="supervisor_name" onSave={saveField} />
          </Card>
          <Card title="License & Compliance">
            <EditField label="CDL Number"       value={profile.license_number}          field="license_number"          onSave={saveField} />
            <EditField label="CDL State"        value={profile.license_state}           field="license_state"           onSave={saveField} />
            <EditField label="CDL Expiration"   value={profile.license_expiration_date} field="license_expiration_date" type="date" onSave={saveField} />
            <EditField label="MVR Expiration"   value={profile.mvr_expiration}          field="mvr_expiration"          type="date" onSave={saveField} />
            <EditField label="Medical Card Exp." value={profile.medical_card_expiration} field="medical_card_expiration" type="date" onSave={saveField} />
          </Card>
          <Card title="Emergency Contact">
            <EditField label="Contact Name"  value={profile.emergency_contact_name}  field="emergency_contact_name"  onSave={saveField} />
            <EditField label="Contact Phone" value={profile.emergency_contact_phone} field="emergency_contact_phone" type="tel" onSave={saveField} />
          </Card>
        </div>
      )}

      {/* ── Tab: Documents ────────────────────────── */}
      {activeTab === "Documents" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Required Documents</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {REQUIRED_DOCS.map((docType) => {
                const existing = documents.find((d) => d.doc_type === docType);
                return (
                  <div key={docType} style={{ border: `1px solid ${existing ? "#86efac" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 14px", background: existing ? "#f0fdf4" : "#fafafa" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{docType}</div>
                    <div style={{ fontSize: "0.72rem", color: existing ? "#15803d" : "#94a3b8", marginBottom: 8 }}>{existing ? "✓ On file" : "Not uploaded"}</div>
                    <label style={{ ...uploadLabelStyle, cursor: uploadingDoc ? "not-allowed" : "pointer", opacity: uploadingDoc ? 0.6 : 1 }}>
                      {existing ? "Replace" : "Upload"}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ display: "none" }} disabled={uploadingDoc}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(docType, f); }} />
                    </label>
                    {existing?.file_url && (
                      <a href={existing.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, fontSize: "0.72rem", color: "#1e40af", fontWeight: 600 }}>View →</a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {documents.length > 0 ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <h3 style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>All Documents</h3>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={thSt}>Document</th><th style={thSt}>Status</th><th style={thSt}>Expires</th><th style={thSt}>File</th><th style={thSt}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => <DocRow key={doc.id} doc={doc} onDelete={deleteDocument} />)}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No documents uploaded yet.</div>
          )}
        </div>
      )}

      {/* ── Tab: Assignments ──────────────────────── */}
      {activeTab === "Assignments" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Truck Assignment">
            <EditField label="Assigned Truck #" value={profile.assigned_truck_number} field="assigned_truck_number" onSave={saveField} />
          </Card>
          <Card title="Active Load">
            <div style={{ padding: "12px 0", color: "#94a3b8", fontSize: "0.85rem" }}>No active load. Load assignments module coming soon.</div>
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
              <select value={profile.hazmat_training ? "Yes" : "No"} onChange={(e) => saveField("hazmat_training", e.target.value === "Yes" ? "true" : "false")} style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Orientation Completed</div>
              <select value={profile.orientation_completed ? "Yes" : "No"} onChange={(e) => saveField("orientation_completed", e.target.value === "Yes" ? "true" : "false")} style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}>
                <option>No</option><option>Yes</option>
              </select>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Activity ─────────────────────────── */}
      {activeTab === "Activity" && (
        <Card title="Recent Activity">
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Full activity feed (tickets, shifts, messages) appears here once Tickets and Dispatch are connected. Check the Driver Timeline above for document and assignment events.
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

/* ─── Style constants ────────────────────────────── */
const statLbl: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 };
const ghostBtn: React.CSSProperties = { padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };
const tdSt:   React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle", fontSize: "0.85rem" };
const thSt:   React.CSSProperties = { padding: "8px 14px", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" };
const editInp: React.CSSProperties = { padding: "5px 10px", border: "1px solid #93c5fd", borderRadius: 6, fontSize: "0.87rem", outline: "none", background: "#eff6ff" };
const saveBtnSm: React.CSSProperties = { padding: "4px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" };
const cancelBtnSm: React.CSSProperties = { padding: "4px 8px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer" };
const actionSm: React.CSSProperties = { padding: "3px 10px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, color: "#475569", cursor: "pointer", display: "inline-block" };
const uploadLabelStyle: React.CSSProperties = { display: "inline-block", padding: "4px 12px", background: "#1e40af", color: "#fff", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 };
