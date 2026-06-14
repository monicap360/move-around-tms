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
  license_class?: string;
  license_expiration_date?: string;
  mvr_expiration?: string;
  medical_card_expiration?: string;
  assigned_truck_number?: string;
  pay_rate?: number | string;
  company_name?: string;
  pay_basis?: string;
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
  total: number; verified: number; review: number; missingSignatures: number;
  duplicates: number; payrollHolds: number; exceptions: number; revenue: number;
  loadsThisWeek: number; lastPayDate: string | null; lastPayAmount: number;
};

type Note = { id: string; text: string; author: string; ts: string };
type Violation = { id: string; date: string; type: string; description: string; severity: "Minor" | "Major" | "Critical" };
type Reminder = { docLabel: string; scheduledFor: string; scheduledAt: string };

const TABS = ["Overview", "Documents", "Violations", "Assignments", "Compensation", "Activity"] as const;
type Tab = (typeof TABS)[number];

const REQUIRED_DOCS = ["CDL", "MVR", "Medical Card", "Drug Test", "Background Check", "Insurance", "Driver Application Package", "W-9 / Tax Form", "Direct Deposit Form", "Signed Contract"];
const CDL_CLASSES   = ["", "Class A", "Class B", "Class C"];
const ENDORSEMENTS  = ["H — Hazmat", "N — Tank Vehicle", "T — Double/Triple", "P — Passenger", "S — School Bus", "X — Hazmat + Tank"];
const VIOLATION_TYPES = ["Speeding Ticket", "At-Fault Accident", "Drug/Alcohol", "HOS Violation", "Inspection Failure", "Moving Violation", "Warning", "Other"];

/* ─── Helpers ────────────────────────────────────── */
function daysUntil(d: string | null | undefined) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function uid() { return Math.random().toString(36).slice(2, 10); }

/* ─── localStorage helpers ───────────────────────── */
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ─── Readiness ──────────────────────────────────── */
type Readiness = {
  score: number; dispatchEligible: boolean; dispatchBlocks: string[];
  payrollEligible: boolean; payrollIssues: string[];
  missingDocs: string[]; expiringSoon: { label: string; days: number; date: string }[];
  riskLevel: "Low" | "Medium" | "High" | "Critical"; riskFactors: string[];
  nextAction: { action: string; urgency: string } | null;
  onboarding: { label: string; done: boolean }[];
};

function computeReadiness(profile: Profile, documents: Document[], tickets: TicketStat): Readiness {
  const cdlDays = daysUntil(profile.license_expiration_date);
  const mvrDays = daysUntil(profile.mvr_expiration);
  const medDays = daysUntil(profile.medical_card_expiration);
  const cdlValid = cdlDays !== null && cdlDays > 0;
  const mvrValid = mvrDays !== null && mvrDays > 0;
  const medValid = medDays !== null && medDays > 0;
  const bgCleared   = profile.background_check_status === "cleared";
  const drugCleared = profile.drug_test_status === "cleared";
  const missingDocs = REQUIRED_DOCS.filter((t) => !documents.some((d) => d.doc_type === t));

  const dispatchBlocks: string[] = [];
  if (!cdlValid) dispatchBlocks.push(cdlDays === null ? "CDL Missing" : "CDL Expired");
  if (!medValid) dispatchBlocks.push(medDays === null ? "Medical Card Missing" : "Medical Card Expired");
  if (!bgCleared)   dispatchBlocks.push("Background Check Not Cleared");
  if (!drugCleared) dispatchBlocks.push("Drug Test Not Cleared");

  const payrollIssues: string[] = [];
  if (tickets.payrollHolds > 0)      payrollIssues.push(`${tickets.payrollHolds} payroll hold${tickets.payrollHolds > 1 ? "s" : ""}`);
  if (tickets.missingSignatures > 0) payrollIssues.push(`${tickets.missingSignatures} ticket${tickets.missingSignatures > 1 ? "s" : ""} missing signatures`);
  if (missingDocs.length > 0)        payrollIssues.push("Driver documents incomplete");

  const expiringSoon: { label: string; days: number; date: string }[] = [];
  if (cdlDays !== null && cdlDays >= 0 && cdlDays <= 90) expiringSoon.push({ label: "CDL",          days: cdlDays, date: profile.license_expiration_date! });
  if (mvrDays !== null && mvrDays >= 0 && mvrDays <= 90) expiringSoon.push({ label: "MVR",          days: mvrDays, date: profile.mvr_expiration! });
  if (medDays !== null && medDays >= 0 && medDays <= 90) expiringSoon.push({ label: "Medical Card", days: medDays, date: profile.medical_card_expiration! });

  const riskFactors: string[] = [];
  if (!cdlValid) riskFactors.push(cdlDays !== null && cdlDays <= 0 ? "CDL expired" : "CDL missing");
  if (!medValid) riskFactors.push(medDays !== null && medDays <= 0 ? "Medical card expired" : "Medical card missing");
  if (!mvrValid) riskFactors.push("MVR expired or missing");
  if (missingDocs.length > 0) riskFactors.push(`${missingDocs.length} required doc${missingDocs.length > 1 ? "s" : ""} missing`);
  if (!bgCleared)   riskFactors.push("Background check pending");
  if (!drugCleared) riskFactors.push("Drug test pending");
  if (cdlDays !== null && cdlDays > 0 && cdlDays <= 30) riskFactors.push("CDL expiring in 30 days");
  if (medDays !== null && medDays > 0 && medDays <= 30) riskFactors.push("Medical card expiring soon");
  if (tickets.duplicates > 0) riskFactors.push(`${tickets.duplicates} duplicate ticket${tickets.duplicates > 1 ? "s" : ""}`);
  if (tickets.exceptions > 3) riskFactors.push(`${tickets.exceptions} ticket exceptions`);

  const riskLevel: "Low" | "Medium" | "High" | "Critical" =
    riskFactors.length === 0 ? "Low" : riskFactors.length <= 2 ? "Medium" : riskFactors.length <= 4 ? "High" : "Critical";

  const factors = [cdlValid, mvrValid, medValid, bgCleared, drugCleared,
    !!documents.find(d => d.doc_type === "CDL"), !!documents.find(d => d.doc_type === "MVR"),
    !!documents.find(d => d.doc_type === "Medical Card"), !!documents.find(d => d.doc_type === "Drug Test"),
    tickets.payrollHolds === 0];
  const score = Math.round((factors.filter(Boolean).length / factors.length) * 100);

  let nextAction: { action: string; urgency: string } | null = null;
  if (!medValid)           nextAction = { action: "Request Updated Medical Card", urgency: medDays !== null && medDays < 0 ? "Expired" : "Missing" };
  else if (!cdlValid)      nextAction = { action: "Renew CDL",           urgency: cdlDays !== null && cdlDays < 0 ? "Expired" : "Missing" };
  else if (!mvrValid)      nextAction = { action: "Run MVR Check",       urgency: "Missing or expired" };
  else if (!bgCleared)     nextAction = { action: "Clear Background Check", urgency: "Pending" };
  else if (!drugCleared)   nextAction = { action: "Clear Drug Test",     urgency: "Pending" };
  else if (medDays !== null && medDays <= 30) nextAction = { action: "Renew Medical Card", urgency: `Expires in ${medDays} days` };
  else if (cdlDays !== null && cdlDays <= 60) nextAction = { action: "Renew CDL",         urgency: `Expires in ${cdlDays} days` };
  else if (missingDocs.length > 0) nextAction = { action: `Upload ${missingDocs[0]}`,    urgency: "Missing document" };

  const onboarding = [
    { label: "CDL verified & on file",       done: cdlValid && !!documents.find(d => d.doc_type === "CDL") },
    { label: "MVR on file",                  done: !!documents.find(d => d.doc_type === "MVR") },
    { label: "Medical Card on file",         done: medValid && !!documents.find(d => d.doc_type === "Medical Card") },
    { label: "Drug test cleared",            done: drugCleared && !!documents.find(d => d.doc_type === "Drug Test") },
    { label: "Background check cleared",     done: bgCleared  && !!documents.find(d => d.doc_type === "Background Check") },
    { label: "Insurance on file",            done: !!documents.find(d => d.doc_type === "Insurance") },
    { label: "Orientation completed",        done: !!profile.orientation_completed },
    { label: "Truck assigned",               done: !!profile.assigned_truck_number },
    { label: "First ticket submitted",       done: tickets.total > 0 },
  ];

  return { score, dispatchEligible: dispatchBlocks.length === 0, dispatchBlocks, payrollEligible: payrollIssues.length === 0, payrollIssues, missingDocs, expiringSoon, riskLevel, riskFactors, nextAction, onboarding };
}

/* ─── ScoreBanner ────────────────────────────────── */
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
        {[{ ok: dispatchOk, label: "Dispatch Eligible" }, { ok: payrollOk, label: "Payroll Eligible" }, { ok: complianceOk, label: "Compliance Current" }].map(({ ok, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>{ok ? "✅" : "❌"}</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: ok ? "#15803d" : "#dc2626" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── EligBadge ──────────────────────────────────── */
function EligBadge({ ok, label, blocks }: { ok: boolean; label: string; blocks: string[] }) {
  return (
    <div style={{ background: ok ? "#f0fdf4" : "#fff1f2", border: `1.5px solid ${ok ? "#86efac" : "#fda4af"}`, borderRadius: 14, padding: "16px 18px", minWidth: 180 }}>
      <div style={eyebrow}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: blocks.length > 0 ? 8 : 0 }}>
        <span style={{ fontSize: "1.1rem" }}>{ok ? "🟢" : "🔴"}</span>
        <span style={{ fontWeight: 800, fontSize: "1rem", color: ok ? "#15803d" : "#dc2626" }}>{ok ? "Eligible" : "Blocked"}</span>
      </div>
      {blocks.map((b, i) => <div key={i} style={{ fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, marginTop: 3 }}>• {b}</div>)}
    </div>
  );
}

/* ─── RiskBadge ──────────────────────────────────── */
function RiskBadge({ level, factors }: { level: string; factors: string[] }) {
  const colors: Record<string, [string, string, string]> = {
    Low: ["#f0fdf4","#86efac","#15803d"], Medium: ["#fefce8","#fde68a","#92400e"],
    High: ["#fff7ed","#fdba74","#c2410c"], Critical: ["#fff1f2","#fda4af","#be123c"],
  };
  const [bg, border, text] = colors[level] ?? colors.Low;
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: "16px 18px", minWidth: 160 }}>
      <div style={eyebrow}>Driver Risk</div>
      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: text, marginBottom: factors.length > 0 ? 8 : 0 }}>{level}</div>
      {factors.slice(0, 3).map((f, i) => <div key={i} style={{ fontSize: "0.7rem", color: text, fontWeight: 600, marginTop: 2 }}>• {f}</div>)}
    </div>
  );
}

/* ─── ComplianceAssistant ────────────────────────── */
function ComplianceAssistant({ nextAction, onSchedule }: { nextAction: { action: string; urgency: string } | null; onSchedule: () => void }) {
  if (!nextAction) return (
    <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ ...eyebrow, color: "#15803d" }}>✅ Compliance Assistant</div>
      <div style={{ fontWeight: 700, color: "#15803d" }}>All clear — driver fully compliant.</div>
    </div>
  );
  return (
    <div style={{ background: "#fefce8", border: "1.5px solid #fde68a", borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ ...eyebrow, color: "#92400e" }}>🤖 Compliance Assistant — Next Action</div>
      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem", marginBottom: 4 }}>{nextAction.action}</div>
      <div style={{ fontSize: "0.78rem", color: "#d97706", fontWeight: 600, marginBottom: 12 }}>{nextAction.urgency}</div>
      <button onClick={onSchedule} style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>
        Schedule Reminder
      </button>
    </div>
  );
}

/* ─── OnboardingChecklist ────────────────────────── */
function OnboardingChecklist({ items }: { items: { label: string; done: boolean }[] }) {
  const done = items.filter(i => i.done).length;
  const pct  = Math.round((done / items.length) * 100);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={eyebrow}>Onboarding Checklist</div>
        <span style={{ fontWeight: 800, fontSize: "0.85rem", color: pct === 100 ? "#15803d" : "#d97706" }}>{done}/{items.length} complete</span>
      </div>
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, marginBottom: 12 }}>
        <div style={{ height: 6, borderRadius: 99, background: pct === 100 ? "#10b981" : "#f59e0b", width: `${pct}%`, transition: "width 0.4s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
        {items.map(({ label, done }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", fontWeight: done ? 600 : 500, color: done ? "#15803d" : "#64748b" }}>
            <span style={{ fontSize: "0.9rem" }}>{done ? "✅" : "⬜"}</span>{label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── ExpiringPanel ──────────────────────────────── */
function ExpiringPanel({ items }: { items: { label: string; days: number; date: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ ...eyebrow, color: "#f59e0b", marginBottom: 12 }}>⚠ Expiring Soon</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {items.map(({ label, days, date }) => {
          const c  = days <= 14 ? "#dc2626" : days <= 30 ? "#d97706" : "#f59e0b";
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

/* ─── MissingPanel ───────────────────────────────── */
function MissingPanel({ missing, onUpload, uploading }: { missing: string[]; onUpload: (docType: string, file: File) => void; uploading: boolean }) {
  if (missing.length === 0) return null;
  return (
    <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ ...eyebrow, color: "#be123c", marginBottom: 12 }}>🔴 Action Required — Missing Documents</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {missing.map((doc) => (
          <label key={doc} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #fda4af", borderRadius: 8, padding: "8px 14px", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1, fontWeight: 700, fontSize: "0.82rem", color: "#be123c" }}>
            ↑ {doc}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ display: "none" }} disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(doc, f); }} />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ─── StatCard ───────────────────────────────────── */
function StatCard({ label, value, sub, color = "#0f172a" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px" }}>
      <div style={eyebrow}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1.1, margin: "6px 0 2px" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

/* ─── PayHistoryCard ─────────────────────────────── */
function PayHistoryCard({ driverId, tickets }: { driverId: string; tickets: TicketStat }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={eyebrow}>Pay History</div>
        <Link href="/ronyx/payroll" style={{ fontSize: "0.75rem", color: "#1e40af", fontWeight: 600, textDecoration: "none" }}>View Payroll →</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Last Pay Date</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 3 }}>{tickets.lastPayDate ? fmtDate(tickets.lastPayDate) : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Last Amount</div>
          <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 3 }}>{tickets.lastPayAmount > 0 ? `$${tickets.lastPayAmount.toLocaleString()}` : "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>YTD Revenue</div>
          <div style={{ fontWeight: 700, color: "#15803d", marginTop: 3 }}>{tickets.revenue > 0 ? `$${tickets.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}</div>
        </div>
      </div>
      {tickets.payrollHolds > 0 && (
        <div style={{ marginTop: 10, background: "#fff1f2", borderRadius: 8, padding: "8px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#dc2626" }}>
          ⚠ {tickets.payrollHolds} payroll hold{tickets.payrollHolds > 1 ? "s" : ""} — manager review required
        </div>
      )}
    </div>
  );
}

/* ─── NotesPanel ─────────────────────────────────── */
function NotesPanel({ driverId }: { driverId: string }) {
  const key = `driver_notes_${driverId}`;
  const [notes, setNotes] = useState<Note[]>(() => lsGet<Note[]>(key, []));
  const [draft, setDraft] = useState("");

  function addNote() {
    if (!draft.trim()) return;
    const n: Note = { id: uid(), text: draft.trim(), author: "Office", ts: new Date().toISOString() };
    const updated = [n, ...notes];
    setNotes(updated); lsSet(key, updated); setDraft("");
  }
  function deleteNote(id: string) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated); lsSet(key, updated);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ ...eyebrow, marginBottom: 12 }}>📝 Internal Notes</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <textarea
          value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a note visible only to office staff…"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote(); }}
          style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 12px", fontSize: "0.85rem", resize: "none", minHeight: 60, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={addNote} style={{ alignSelf: "flex-end", ...primaryBtn, padding: "8px 18px" }}>Add</button>
      </div>
      {notes.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: "0.82rem", textAlign: "center", padding: "12px 0" }}>No notes yet. Use notes to track calls, follow-ups, or anything the team needs to know.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: "0.85rem", color: "#0f172a", fontWeight: 500, flex: 1 }}>{n.text}</div>
                <button onClick={() => deleteNote(n.id)} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.8rem", padding: 0 }}>✕</button>
              </div>
              <div style={{ marginTop: 6, fontSize: "0.68rem", color: "#94a3b8" }}>{n.author} · {fmtDateTime(n.ts)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── EquipmentPanel ─────────────────────────────── */
function EquipmentPanel({ truck, onFlash }: { truck?: string; onFlash: (msg: string) => void }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ ...eyebrow, marginBottom: 12 }}>Assigned Equipment</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[["Primary Truck", truck || "—"], ["Trailer", "—"], ["Last Used", "—"], ["Inspection Status", "—"]].map(([lbl, val]) => (
          <div key={lbl}><div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{lbl}</div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{val}</div></div>
        ))}
      </div>
      <button onClick={() => onFlash("Truck assignment — edit in the Assignments tab.")} style={{ marginTop: 12, ...ghostBtn }}>
        Change Assignment →
      </button>
    </div>
  );
}

/* ─── CommPanel ──────────────────────────────────── */
function CommPanel({ profile }: { profile: Profile }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ ...eyebrow, marginBottom: 12 }}>Communication</div>
      {[["Phone", profile.phone], ["Email", profile.email], ["Emergency", profile.emergency_contact_name ? `${profile.emergency_contact_name} · ${profile.emergency_contact_phone || ""}` : null]].map(([lbl, val]) => (
        <div key={lbl as string} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>{lbl}</div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.85rem" }}>{val || "—"}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {profile.phone  && <a href={`tel:${profile.phone}`}  style={{ ...ghostBtn, textDecoration: "none" }}>📞 Call</a>}
        {profile.email  && <a href={`mailto:${profile.email}`} style={{ ...ghostBtn, textDecoration: "none" }}>✉ Email</a>}
        {profile.phone  && <a href={`sms:${profile.phone}`}  style={{ ...ghostBtn, textDecoration: "none" }}>💬 Text</a>}
      </div>
    </div>
  );
}

/* ─── Timeline ───────────────────────────────────── */
function Timeline({ documents, profile }: { documents: Document[]; profile: Profile }) {
  type Ev = { date: string; label: string; detail: string; icon: string };
  const events: Ev[] = documents.map(doc => ({ date: doc.uploaded_at, label: `${doc.doc_type} Uploaded`, detail: doc.expires_on ? `Expires ${fmtDate(doc.expires_on)}` : "No expiration", icon: "📄" }));
  if (profile.hire_date) events.push({ date: profile.hire_date + "T00:00:00", label: "Hired", detail: profile.position_role || "Driver", icon: "🚛" });
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const shown = events.slice(0, 8);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ ...eyebrow, marginBottom: 14 }}>Driver Timeline</div>
      {shown.length === 0
        ? <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>No timeline events yet.</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {shown.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 14, paddingBottom: i < shown.length - 1 ? 14 : 0 }}>
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
      }
    </div>
  );
}

/* ─── ReminderModal ──────────────────────────────── */
function ReminderModal({ driverId, nextAction, onClose, onFlash }: {
  driverId: string; nextAction: { action: string; urgency: string } | null;
  onClose: () => void; onFlash: (msg: string) => void;
}) {
  const key = `driver_reminders_${driverId}`;
  const [docLabel, setDocLabel] = useState(nextAction?.action ?? "");
  const [date, setDate]         = useState("");
  const [method, setMethod]     = useState("Email");

  function save() {
    if (!docLabel.trim() || !date) { onFlash("Fill in action and date."); return; }
    const existing = lsGet<Reminder[]>(key, []);
    lsSet(key, [...existing, { docLabel, scheduledFor: date, scheduledAt: new Date().toISOString() }]);
    onFlash(`Reminder scheduled: "${docLabel}" on ${fmtDate(date)} via ${method}.`);
    onClose();
  }

  return (
    <div style={moverlay}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 440, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Schedule Compliance Reminder</h2>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: "0.82rem" }}>Driver and office will be notified on the scheduled date.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={mlbl}>Action / Document</label>
          <input value={docLabel} onChange={e => setDocLabel(e.target.value)} style={minpSt} placeholder="e.g. Renew Medical Card" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px", marginBottom: 12 }}>
          <div>
            <label style={mlbl}>Remind On</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={minpSt} />
          </div>
          <div>
            <label style={mlbl}>Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} style={minpSt}>
              {["Email", "Text / SMS", "Both"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={save} style={{ flex: 1, ...primaryBtn, padding: "10px 0", fontSize: 14 }}>Schedule Reminder</button>
          <button onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── EditField ──────────────────────────────────── */
function EditField({ label, value, field, type = "text", options, onSave }: {
  label: string; value: string | number | boolean | undefined | null; field: string;
  type?: string; options?: string[]; onSave: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value ?? ""));
  function commit() { onSave(field, draft); setEditing(false); }
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      {editing ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {options
            ? <select value={draft} onChange={e => setDraft(e.target.value)} style={editInp} autoFocus>{options.map(o => <option key={o} value={o}>{o}</option>)}</select>
            : <input value={draft} onChange={e => setDraft(e.target.value)} type={type} style={editInp} autoFocus onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }} />
          }
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

/* ─── DocRow ─────────────────────────────────────── */
function DocRow({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  const days = daysUntil(doc.expires_on);
  const expColor = days === null ? "#64748b" : days < 0 ? "#dc2626" : days <= 30 ? "#d97706" : "#15803d";
  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={tdSt}><strong style={{ color: "#0f172a" }}>{doc.doc_type}</strong></td>
      <td style={tdSt}><span style={{ background: doc.status === "uploaded" ? "#dcfce7" : "#f1f5f9", color: doc.status === "uploaded" ? "#15803d" : "#64748b", padding: "2px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 700 }}>{doc.status}</span></td>
      <td style={{ ...tdSt, color: expColor, fontWeight: days !== null && days <= 30 ? 700 : 400 }}>{doc.expires_on ?? "—"}{days !== null && days < 0 && " ⚠"}</td>
      <td style={tdSt}>{doc.file_url ? <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: "#1e40af", fontSize: "0.8rem", fontWeight: 600 }}>View</a> : <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>No file</span>}</td>
      <td style={tdSt}><button onClick={() => onDelete(doc.id)} style={{ ...actionSm, color: "#dc2626", background: "#fee2e2" }}>Delete</button></td>
    </tr>
  );
}

/* ─── ViolationsTab ──────────────────────────────── */
function ViolationsTab({ driverId }: { driverId: string }) {
  const key = `driver_violations_${driverId}`;
  const [violations, setViolations] = useState<Violation[]>(() => lsGet<Violation[]>(key, []));
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ date: "", type: "", description: "", severity: "Minor" as Violation["severity"] });

  function save() {
    if (!form.date || !form.type) return;
    const v: Violation = { id: uid(), ...form };
    const updated = [v, ...violations].sort((a, b) => b.date.localeCompare(a.date));
    setViolations(updated); lsSet(key, updated); setShowForm(false);
    setForm({ date: "", type: "", description: "", severity: "Minor" });
  }
  function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const updated = violations.filter(v => v.id !== id);
    setViolations(updated); lsSet(key, updated);
  }

  const sevColor = (s: string) => s === "Critical" ? "#dc2626" : s === "Major" ? "#d97706" : "#64748b";
  const sevBg    = (s: string) => s === "Critical" ? "#fff1f2" : s === "Major" ? "#fff7ed" : "#f1f5f9";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Violations & Incidents</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>Accidents, citations, warnings, and safety incidents.</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={primaryBtn}>+ Log Entry</button>
      </div>

      {showForm && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }}>
            <div>
              <label style={mlbl}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={minpSt} />
            </div>
            <div>
              <label style={mlbl}>Severity</label>
              <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value as Violation["severity"] }))} style={minpSt}>
                {["Minor", "Major", "Critical"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={mlbl}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={minpSt}>
                <option value="">Select type…</option>
                {VIOLATION_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={mlbl}>Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={minpSt} placeholder="Brief details" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={save} style={primaryBtn}>Save Entry</button>
            <button onClick={() => setShowForm(false)} style={{ ...ghostBtn, fontSize: "0.82rem" }}>Cancel</button>
          </div>
        </div>
      )}

      {violations.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
          No violations or incidents on record. Use the button above to log an entry.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {violations.map(v => (
            <div key={v.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ background: sevBg(v.severity), color: sevColor(v.severity), padding: "4px 10px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 800, flexShrink: 0 }}>{v.severity}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{v.type}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{fmtDate(v.date)}{v.description ? ` · ${v.description}` : ""}</div>
              </div>
              <button onClick={() => remove(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.8rem" }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── DOT packet export ──────────────────────────── */
function exportDOTPacket(profile: Profile, documents: Document[]) {
  const rows = documents.map(d =>
    `<tr><td>${d.doc_type}</td><td>${d.status}</td><td>${d.expires_on ?? "—"}</td><td>${d.file_url ? `<a href="${d.file_url}" target="_blank">View</a>` : "No file"}</td></tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><title>DOT Packet — ${profile.full_name ?? "Driver"}</title>
  <style>body{font-family:sans-serif;padding:32px;color:#0f172a} h1{font-size:1.5rem} table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left} th{background:#f8fafc;font-size:.75rem;text-transform:uppercase}</style>
  </head><body>
  <h1>DOT Compliance Packet</h1>
  <p><strong>${profile.full_name ?? "—"}</strong> · ${profile.position_role ?? ""} · CDL ${profile.license_state ?? ""} ${profile.license_number ?? ""}<br>
  Generated: ${new Date().toLocaleString()}</p>
  <table><thead><tr><th>Document</th><th>Status</th><th>Expires</th><th>File</th></tr></thead><tbody>${rows}</tbody></table>
  </body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
}

/* ─── Main page ──────────────────────────────────── */
export default function DriverProfilePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab]   = useState<Tab>((searchParams.get("tab") as Tab) || "Overview");
  const [profile, setProfile]       = useState<Profile | null>(null);
  const [documents, setDocuments]   = useState<Document[]>([]);
  const [ticketStats, setTicketStats] = useState<TicketStat>({ total: 0, verified: 0, review: 0, missingSignatures: 0, duplicates: 0, payrollHolds: 0, exceptions: 0, revenue: 0, loadsThisWeek: 0, lastPayDate: null, lastPayAmount: 0 });
  const [endorsements, setEndorsements] = useState<string[]>(() => lsGet<string[]>(`driver_endorsements_${params.id}`, []));
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [statusMsg, setStatusMsg]   = useState(searchParams.get("new") === "1" ? "Driver created! Upload documents and assign a truck below." : "");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
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

    const driverName = (prof.full_name || "").toLowerCase();
    const allTickets: any[] = tickData.tickets || [];
    const driverTickets = driverName
      ? allTickets.filter((t: any) => (t.driver_name || "").toLowerCase().includes(driverName.split(" ")[0] || "NOMATCH"))
      : allTickets;

    const weekAgo = Date.now() - 7 * 86400000;
    const paidTickets = driverTickets.filter((t: any) => t.payment_status === "paid");
    setTicketStats({
      total:             driverTickets.length,
      verified:          driverTickets.filter((t: any) => (t.ocr_confidence || 0.85) >= 0.9).length,
      review:            driverTickets.filter((t: any) => ["needs_review","in_review"].includes(t.status || "")).length,
      missingSignatures: driverTickets.filter((t: any) => !t.driver_signature && !t.has_driver_signature).length,
      duplicates:        0,
      payrollHolds:      driverTickets.filter((t: any) => t.payroll_hold === true).length,
      exceptions:        driverTickets.filter((t: any) => ["needs_review","rejected"].includes(t.status || "")).length,
      revenue:           driverTickets.reduce((s: number, t: any) => s + (Number(t.total_amount) || 0), 0),
      loadsThisWeek:     driverTickets.filter((t: any) => new Date(t.ticket_date || 0).getTime() >= weekAgo).length,
      lastPayDate:       paidTickets[0]?.updated_at ?? null,
      lastPayAmount:     paidTickets[0]?.total_amount ?? 0,
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
    if (res.ok) { setProfile(prev => ({ ...prev, ...data.profile })); flash("Saved."); }
    else flash(`Error: ${data.error}`);
    setSaving(false);
  }

  async function setStatus(status: string) {
    setProfile(prev => prev ? { ...prev, status } : prev);
    await saveField("status", status);
  }

  async function uploadDocument(docType: string, file: File, expiresOn?: string) {
    setUploadingDoc(true);
    const fd = new FormData();
    fd.append("file", file); fd.append("driver_id", driverId); fd.append("doc_type", docType);
    if (expiresOn) fd.append("expires_on", expiresOn);
    const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) { setDocuments(prev => [data.document, ...prev.filter(d => d.doc_type !== docType)]); flash(`${docType} uploaded.`); }
    else flash(`Upload error: ${data.error}`);
    setUploadingDoc(false);
  }

  async function deleteDocument(_docId: string) {
    if (!confirm("Delete this document?")) return;
    flash("Delete not yet wired to API — coming soon.");
  }

  function toggleEndorsement(e: string) {
    const updated = endorsements.includes(e) ? endorsements.filter(x => x !== e) : [...endorsements, e];
    setEndorsements(updated); lsSet(`driver_endorsements_${driverId}`, updated);
  }

  function flash(msg: string) { setStatusMsg(msg); setTimeout(() => setStatusMsg(""), 6000); }

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading driver profile…</div>;
  if (!profile) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div style={{ color: "#dc2626", fontWeight: 600 }}>Driver not found.</div>
      <Link href="/ronyx/drivers" style={{ color: "#1e40af", marginTop: 12, display: "inline-block" }}>← Back to Drivers</Link>
    </div>
  );

  const name      = profile.full_name || "Unnamed Driver";
  const readiness = computeReadiness(profile, documents, ticketStats);
  const complianceOk = readiness.expiringSoon.every(e => e.days > 30) && readiness.missingDocs.length === 0;

  return (
    <div style={{ maxWidth: 1080 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/ronyx/drivers" style={{ color: "#64748b", fontSize: "0.83rem", textDecoration: "none" }}>← Drivers</Link>
      </div>

      {/* ── Header ──────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 14, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 700, flexShrink: 0 }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>{name}</h1>
            {/* Quick status toggle */}
            {(["active", "suspended", "inactive"] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{ padding: "3px 12px", borderRadius: 20, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", border: "1.5px solid", borderColor: profile.status === s ? (s === "active" ? "#86efac" : s === "suspended" ? "#fda4af" : "#e2e8f0") : "#e2e8f0", background: profile.status === s ? (s === "active" ? "#dcfce7" : s === "suspended" ? "#fff1f2" : "#f1f5f9") : "#fff", color: profile.status === s ? (s === "active" ? "#15803d" : s === "suspended" ? "#dc2626" : "#475569") : "#94a3b8" }}>
                {s}
              </button>
            ))}
            {saving && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>Saving…</span>}
          </div>
          <div style={{ marginTop: 4, fontSize: "0.83rem", color: "#64748b" }}>
            {profile.company_name  && <span style={{ fontWeight: 700, color: "#1e40af" }}>{profile.company_name} · </span>}
            {profile.position_role && <span>{profile.position_role} · </span>}
            {profile.driver_type   && <span>{profile.driver_type} · </span>}
            {profile.pay_basis     && <span style={{ fontWeight: 600 }}>Paid {profile.pay_basis.replace("_", " ")} · </span>}
            {profile.license_class && <span>CDL {profile.license_class} · </span>}
            {endorsements.length > 0 && <span>{endorsements.map(e => e.split(" — ")[0]).join(", ")} · </span>}
            {profile.assigned_truck_number && <span>🚛 {profile.assigned_truck_number} · </span>}
            {profile.hire_date && <span>Hired {fmtDate(profile.hire_date)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ ...primaryBtn, fontSize: "0.78rem", cursor: uploadingDoc ? "not-allowed" : "pointer", opacity: uploadingDoc ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 4 }}>
            🪪 Upload CDL
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} disabled={uploadingDoc} onChange={(e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const state = prompt("CDL State (e.g. TX):", profile.license_state || "TX") || "";
              if (state) saveField("license_state", state.toUpperCase());
              uploadDocument("CDL", f);
            }} />
          </label>
          <button onClick={() => exportDOTPacket(profile, documents)} style={{ ...ghostBtn, fontSize: "0.82rem" }}>📋 Export DOT Packet</button>
          <Link href="/ronyx/drivers/new" style={{ ...ghostBtn, textDecoration: "none", fontSize: "0.82rem" }}>+ Add Driver</Link>
        </div>
      </div>

      {statusMsg && (
        <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 14, fontSize: "0.85rem", fontWeight: 500, background: statusMsg.startsWith("Error") ? "#fee2e2" : "#eff6ff", color: statusMsg.startsWith("Error") ? "#dc2626" : "#1e40af", border: `1px solid ${statusMsg.startsWith("Error") ? "#fecaca" : "#bfdbfe"}` }}>
          {statusMsg}
        </div>
      )}

      {/* ── Readiness banner ────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <ScoreBanner score={readiness.score} dispatchOk={readiness.dispatchEligible} payrollOk={readiness.payrollEligible} complianceOk={complianceOk} />
      </div>

      {/* ── Eligibility + risk row ───────────────────── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <EligBadge ok={readiness.dispatchEligible} label="Dispatch Status" blocks={readiness.dispatchBlocks} />
        <EligBadge ok={readiness.payrollEligible}  label="Payroll Status"  blocks={readiness.payrollIssues} />
        <RiskBadge level={readiness.riskLevel} factors={readiness.riskFactors} />
        <ComplianceAssistant nextAction={readiness.nextAction} onSchedule={() => setReminderOpen(true)} />
      </div>

      {/* ── Alerts ──────────────────────────────────── */}
      {readiness.expiringSoon.length > 0 && <div style={{ marginBottom: 14 }}><ExpiringPanel items={readiness.expiringSoon} /></div>}
      {readiness.missingDocs.length > 0  && <div style={{ marginBottom: 14 }}><MissingPanel missing={readiness.missingDocs} onUpload={uploadDocument} uploading={uploadingDoc} /></div>}

      {/* ── Onboarding checklist ─────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <OnboardingChecklist items={readiness.onboarding} />
      </div>

      {/* ── Activity summary ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        <StatCard label="Loads This Week"   value={ticketStats.loadsThisWeek}  sub="From FastScan" />
        <StatCard label="Tickets Submitted" value={ticketStats.total}          sub="All time" />
        <StatCard label="Exceptions"        value={ticketStats.exceptions}     sub="Need review"  color={ticketStats.exceptions > 0 ? "#d97706" : "#0f172a"} />
        <StatCard label="Payroll Holds"     value={ticketStats.payrollHolds}   sub="Blocked"      color={ticketStats.payrollHolds > 0 ? "#dc2626" : "#0f172a"} />
        <StatCard label="Revenue Generated" value={ticketStats.revenue > 0 ? `$${ticketStats.revenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"} sub="From tickets" />
      </div>

      {/* ── Ticket audit ─────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ ...eyebrow, marginBottom: 12 }}>Driver Ticket Health — FastScan Audit</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {[
            { label: "Verified Tickets",   value: ticketStats.verified,          color: "#15803d" },
            { label: "Review Required",    value: ticketStats.review,            color: ticketStats.review > 0 ? "#d97706" : "#64748b" },
            { label: "Missing Signatures", value: ticketStats.missingSignatures, color: ticketStats.missingSignatures > 0 ? "#dc2626" : "#64748b" },
            { label: "Duplicate Risk",     value: ticketStats.duplicates,        color: ticketStats.duplicates > 0 ? "#dc2626" : "#64748b" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Equipment + Comm ─────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <EquipmentPanel truck={profile.assigned_truck_number} onFlash={flash} />
        <CommPanel profile={profile} />
      </div>

      {/* ── Pay history ──────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <PayHistoryCard driverId={driverId} tickets={ticketStats} />
      </div>

      {/* ── Internal notes ───────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <NotesPanel driverId={driverId} />
      </div>

      {/* ── Timeline ─────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Timeline documents={documents} profile={profile} />
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "9px 18px", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? "#1e40af" : "#64748b", borderBottom: activeTab === tab ? "2px solid #1e40af" : "2px solid transparent", marginBottom: -2 }}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ────────────────────────────── */}
      {activeTab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Personal">
            <EditField label="Full Name" value={profile.full_name}  field="full_name"  onSave={saveField} />
            <EditField label="Phone"     value={profile.phone}      field="phone"      type="tel"   onSave={saveField} />
            <EditField label="Email"     value={profile.email}      field="email"      type="email" onSave={saveField} />
            <EditField label="Address"   value={profile.address}    field="address"    onSave={saveField} />
          </Card>
          <Card title="Employment">
            <EditField label="Company / Carrier" value={profile.company_name}    field="company_name"   onSave={saveField} />
            <EditField label="Driver Type"       value={profile.driver_type}    field="driver_type"    options={["W2","1099","owner_operator"]} onSave={saveField} />
            <EditField label="Pay Basis"         value={profile.pay_basis}      field="pay_basis"      options={["hourly","per_load","per_mile"]} onSave={saveField} />
            <EditField label="Position / Role"   value={profile.position_role}  field="position_role"  onSave={saveField} />
            <EditField label="Hire Date"         value={profile.hire_date}      field="hire_date"      type="date" onSave={saveField} />
            <EditField label="Supervisor"        value={profile.supervisor_name} field="supervisor_name" onSave={saveField} />
          </Card>
          <Card title="License & Compliance">
            <EditField label="CDL Number"       value={profile.license_number}          field="license_number"          onSave={saveField} />
            <EditField label="CDL State"        value={profile.license_state}           field="license_state"           onSave={saveField} />
            <EditField label="CDL Class"        value={profile.license_class}           field="license_class"           options={CDL_CLASSES} onSave={saveField} />
            <EditField label="CDL Expiration"   value={profile.license_expiration_date} field="license_expiration_date" type="date" onSave={saveField} />
            <EditField label="MVR Expiration"   value={profile.mvr_expiration}          field="mvr_expiration"          type="date" onSave={saveField} />
            <EditField label="Medical Card Exp." value={profile.medical_card_expiration} field="medical_card_expiration" type="date" onSave={saveField} />
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Endorsements</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ENDORSEMENTS.map(e => (
                  <button key={e} onClick={() => toggleEndorsement(e)} style={{ padding: "4px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", border: "1.5px solid", borderColor: endorsements.includes(e) ? "#3b82f6" : "#e2e8f0", background: endorsements.includes(e) ? "#eff6ff" : "#f8fafc", color: endorsements.includes(e) ? "#1e40af" : "#64748b" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </Card>
          <Card title="Emergency Contact">
            <EditField label="Contact Name"  value={profile.emergency_contact_name}  field="emergency_contact_name"  onSave={saveField} />
            <EditField label="Contact Phone" value={profile.emergency_contact_phone} field="emergency_contact_phone" type="tel" onSave={saveField} />
          </Card>
          <Card title="Drug & Background Screening">
            <EditField label="Drug Test Status"       value={profile.drug_test_status}       field="drug_test_status"       options={["pending","cleared","failed","expired"]} onSave={saveField} />
            <EditField label="Background Check Status" value={profile.background_check_status} field="background_check_status" options={["pending","cleared","failed"]} onSave={saveField} />
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Upload Drug Screen Result</div>
              <label style={{ ...uploadLabelStyle, cursor: uploadingDoc ? "not-allowed" : "pointer", opacity: uploadingDoc ? 0.6 : 1 }}>
                Upload Drug Test
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} disabled={uploadingDoc} onChange={e => { const f = e.target.files?.[0]; if (f) uploadDocument("Drug Test", f); }} />
              </label>
              {documents.find(d => d.doc_type === "Drug Test") && (
                <span style={{ marginLeft: 10, fontSize: "0.72rem", color: "#15803d", fontWeight: 600 }}>✓ On file</span>
              )}
            </div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Drug Test Status",  value: profile.drug_test_status,        color: profile.drug_test_status === "cleared" ? "#15803d" : profile.drug_test_status === "failed" ? "#dc2626" : "#d97706" },
                { label: "Background Check",  value: profile.background_check_status, color: profile.background_check_status === "cleared" ? "#15803d" : profile.background_check_status === "failed" ? "#dc2626" : "#d97706" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontWeight: 800, color: value ? color : "#cbd5e1", textTransform: "capitalize" }}>{value || "—"}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Documents ───────────────────────────── */}
      {activeTab === "Documents" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>Required Documents</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
              {REQUIRED_DOCS.map(docType => {
                const existing = documents.find(d => d.doc_type === docType);
                return (
                  <div key={docType} style={{ border: `1px solid ${existing ? "#86efac" : "#e2e8f0"}`, borderRadius: 8, padding: "10px 14px", background: existing ? "#f0fdf4" : "#fafafa" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{docType}</div>
                    <div style={{ fontSize: "0.72rem", color: existing ? "#15803d" : "#94a3b8", marginBottom: 8 }}>{existing ? "✓ On file" : "Not uploaded"}</div>
                    <label style={{ ...uploadLabelStyle, cursor: uploadingDoc ? "not-allowed" : "pointer", opacity: uploadingDoc ? 0.6 : 1 }}>
                      {existing ? "Replace" : "Upload"}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ display: "none" }} disabled={uploadingDoc} onChange={e => { const f = e.target.files?.[0]; if (f) uploadDocument(docType, f); }} />
                    </label>
                    {existing?.file_url && <a href={existing.file_url} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6, fontSize: "0.72rem", color: "#1e40af", fontWeight: 600 }}>View →</a>}
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
                <thead><tr style={{ background: "#f8fafc" }}><th style={thSt}>Document</th><th style={thSt}>Status</th><th style={thSt}>Expires</th><th style={thSt}>File</th><th style={thSt}>Actions</th></tr></thead>
                <tbody>{documents.map(doc => <DocRow key={doc.id} doc={doc} onDelete={deleteDocument} />)}</tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No documents uploaded yet.</div>
          )}
        </div>
      )}

      {/* ── Tab: Violations ──────────────────────────── */}
      {activeTab === "Violations" && <ViolationsTab driverId={driverId} />}

      {/* ── Tab: Assignments ─────────────────────────── */}
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

      {/* ── Tab: Compensation ────────────────────────── */}
      {activeTab === "Compensation" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Pay Setup">
            <EditField label="Company / Carrier" value={profile.company_name}   field="company_name"  onSave={saveField} />
            <EditField label="Driver Type"        value={profile.driver_type}   field="driver_type"   options={["W2","1099","owner_operator"]} onSave={saveField} />
            <EditField label="Pay Basis"          value={profile.pay_basis}     field="pay_basis"     options={["hourly","per_load","per_mile"]} onSave={saveField} />
            <EditField label="Pay Rate"           value={profile.pay_rate}      field="pay_rate"      type="number" onSave={saveField} />
          </Card>
          <Card title="Compliance Checks">
            <EditField label="Background Check" value={profile.background_check_status} field="background_check_status" options={["pending","cleared","failed"]} onSave={saveField} />
            <EditField label="Drug Test" value={profile.drug_test_status} field="drug_test_status" options={["pending","cleared","failed"]} onSave={saveField} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Hazmat Training</div>
              <select value={profile.hazmat_training ? "Yes" : "No"} onChange={e => saveField("hazmat_training", e.target.value === "Yes" ? "true" : "false")} style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}><option>No</option><option>Yes</option></select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Orientation Completed</div>
              <select value={profile.orientation_completed ? "Yes" : "No"} onChange={e => saveField("orientation_completed", e.target.value === "Yes" ? "true" : "false")} style={{ padding: "5px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.85rem" }}><option>No</option><option>Yes</option></select>
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Activity ────────────────────────────── */}
      {activeTab === "Activity" && (
        <Card title="Recent Activity">
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Full activity feed (tickets, shifts, messages) appears here once Tickets and Dispatch are connected. Check the Driver Timeline above for document and assignment events.
          </div>
        </Card>
      )}

      {/* ── Reminder modal ───────────────────────────── */}
      {reminderOpen && (
        <ReminderModal driverId={driverId} nextAction={readiness.nextAction} onClose={() => setReminderOpen(false)} onFlash={flash} />
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
const eyebrow: React.CSSProperties = { fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties  = { padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.78rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };
const moverlay: React.CSSProperties  = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" };
const mlbl: React.CSSProperties      = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const minpSt: React.CSSProperties    = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };
const tdSt: React.CSSProperties      = { padding: "10px 14px", verticalAlign: "middle", fontSize: "0.85rem" };
const thSt: React.CSSProperties      = { padding: "8px 14px", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left" };
const editInp: React.CSSProperties   = { padding: "5px 10px", border: "1px solid #93c5fd", borderRadius: 6, fontSize: "0.87rem", outline: "none", background: "#eff6ff" };
const saveBtnSm: React.CSSProperties = { padding: "4px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 6, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" };
const cancelBtnSm: React.CSSProperties = { padding: "4px 8px", background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer" };
const actionSm: React.CSSProperties  = { padding: "3px 10px", background: "#f1f5f9", border: "none", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, color: "#475569", cursor: "pointer", display: "inline-block" };
const uploadLabelStyle: React.CSSProperties = { display: "inline-block", padding: "4px 12px", background: "#1e40af", color: "#fff", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600 };
