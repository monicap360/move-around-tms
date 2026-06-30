"use client";

import { useState } from "react";

// Staff system training & guidance pop-up. Auto-opens once per device, reopenable from the
// top bar "📚 Training" button. Plain-language quick-starts for the daily workflows.

type Lesson = { icon: string; title: string; href: string; steps: string[] };

const LESSONS: Lesson[] = [
  { icon: "⚡", title: "Fast Scan — tickets to money", href: "/ronyx/fast-scan", steps: [
    "Upload a scale/pit ticket photo or PDF (drag-drop, browse, or phone camera).",
    "It reads the ticket automatically — check the fields, fix anything highlighted.",
    "Route it: Billing, Payroll, or both. Cleared tickets unlock money.",
    "Work the Priority Queue first — it sorts by the biggest dollar impact.",
  ] },
  { icon: "📋", title: "Owner-Operators & documents", href: "/ronyx/owner-operators", steps: [
    "Click a company to open it — everything for that carrier is on one screen.",
    "Documents & Compliance tiles: Upload/Replace, then 👁 view · ✉ email · 🖨 print.",
    "Use the ⚠ Action Required list up top — click any item to jump to that company.",
    "The status button toggles ● Active / ○ Inactive in one click.",
  ] },
  { icon: "📞", title: "Driver compliance follow-up", href: "/ronyx/drivers/follow-up", steps: [
    "See every driver with a missing or expired CDL, medical, or inspection.",
    "Tap the phone number to call, then 'Mark contacted' — it logs the date + your name.",
    "Critical items (expired/missing) are at the top. Work those first.",
    "Found a duplicate driver? Use Drivers → Merge Duplicates.",
  ] },
  { icon: "💵", title: "Accounting Command Center", href: "/ronyx/accounting-command-center", steps: [
    "Start on the Overview — the AI Assistant tells you the highest-value task.",
    "Ticket-to-Invoice → generate invoices; Receivables → log calls + promise-to-pay.",
    "Settlements → email a driver their review link; Payroll → check the funding banner.",
    "Every blocked item shows the dollars it's holding up.",
  ] },
  { icon: "🚚", title: "Capacity Network (hiring)", href: "/ronyx/driver-network", steps: [
    "Browse or save drivers & owner-operators; unlock to see full details.",
    "The Pipeline tab tracks each candidate: Saved → Screening → Ready to Dispatch.",
    "Open a candidate → assign an owner, log calls, move them through the stages.",
    "Hire → Add to MoveAround creates the real driver/OO profile for dispatch.",
  ] },
];

export default function StaffTraining({ name, onClose }: { name?: string; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const lesson = LESSONS[i];
  const last = i === LESSONS.length - 1;

  function close() {
    if (dontShow) { try { localStorage.setItem("ronyx_training_seen", "1"); } catch {} }
    onClose();
  }

  return (
    <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)", color: "#fff", padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#67e8f9", textTransform: "uppercase", letterSpacing: "0.1em" }}>System Training &amp; Guidance</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, marginTop: 3 }}>{name ? `Welcome, ${name}!` : "Welcome!"}</div>
              <div style={{ fontSize: "0.82rem", color: "#cbd5e1", marginTop: 2 }}>A quick tour of the daily workflows — {LESSONS.length} short guides.</div>
            </div>
            <button onClick={close} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
        </div>

        <div style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: "1.6rem" }}>{lesson.icon}</span>
            <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{lesson.title}</div>
          </div>
          <ol style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 9 }}>
            {lesson.steps.map((s, k) => <li key={k} style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.5 }}>{s}</li>)}
          </ol>
          <a href={lesson.href} onClick={close} style={{ display: "inline-block", marginTop: 16, background: "#1d4ed8", color: "#fff", padding: "9px 18px", borderRadius: 9, fontWeight: 800, fontSize: "0.84rem", textDecoration: "none" }}>Open {lesson.title.split(" — ")[0]} →</a>
        </div>

        <div style={{ display: "flex", gap: 5, justifyContent: "center", paddingBottom: 6 }}>
          {LESSONS.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Guide ${k + 1}`} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 99, border: "none", background: k === i ? "#1d4ed8" : "#cbd5e1", cursor: "pointer", transition: "all .15s" }} />)}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px 20px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.78rem", color: "#64748b", cursor: "pointer" }}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} style={{ width: 15, height: 15 }} />
            Don&apos;t show this automatically
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setI(v => Math.max(0, v - 1))} disabled={i === 0} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: i === 0 ? "#cbd5e1" : "#475569", fontWeight: 700, fontSize: "0.82rem", cursor: i === 0 ? "default" : "pointer" }}>← Back</button>
            {last
              ? <button onClick={close} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>Got it ✓</button>
              : <button onClick={() => setI(v => Math.min(LESSONS.length - 1, v + 1))} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>Next →</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
