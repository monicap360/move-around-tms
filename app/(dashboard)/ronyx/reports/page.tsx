"use client";

import { useEffect, useState } from "react";

/* ─── Types ─────────────────────────────────────── */
type ReportDef = {
  id: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  better_than: string;
};

const REPORTS: ReportDef[] = [
  // ── Owner Reports ──
  { id: "r01", category: "Owner",       icon: "📊", name: "Revenue Summary",            description: "Total revenue, gross margin, and OO settlement by date range. Exportable to CSV.",               tags: ["revenue","finance"],      better_than: "Rose Rocket shows revenue but no margin breakdown. Axon requires Finance add-on." },
  { id: "r02", category: "Owner",       icon: "💰", name: "Profitability by Project",   description: "Revenue, OO pay, and margin per Domino Project number. See which jobs make money.",              tags: ["domino","finance","OO"],   better_than: "Rose Rocket has no per-project P&L. Axon requires custom report builder." },
  { id: "r03", category: "Owner",       icon: "📈", name: "Monthly KPI Dashboard",      description: "Loads, tons, revenue, payroll, and margin trend month over month.",                               tags: ["kpi","trending"],         better_than: "Neither Rose Rocket nor Axon provides a one-page KPI snapshot out of the box." },
  { id: "r04", category: "Owner",       icon: "🏆", name: "Top Drivers by Revenue",     description: "Rank drivers by total revenue generated. Identify your most productive operators.",              tags: ["driver","performance"],   better_than: "Rose Rocket has no driver revenue ranking." },
  { id: "r05", category: "Owner",       icon: "🔑", name: "OO Settlement Report",       description: "What you paid each Owner Operator per project. Ready to send directly to the OO.",              tags: ["OO","settlement","pay"],   better_than: "Rose Rocket OO settlements need manual export. Axon lacks email-to-OO." },

  // ── Operations Reports ──
  { id: "r06", category: "Operations", icon: "🎫", name: "Ticket Exception Report",     description: "All scale-vs-manifest discrepancies, missing signatures, and voided tickets.",                  tags: ["tickets","exceptions"],   better_than: "Axon shows ticket logs but not side-by-side exception analysis." },
  { id: "r07", category: "Operations", icon: "🚚", name: "Dispatch Summary",            description: "Loads dispatched, completed, and pending approval by day and driver.",                           tags: ["dispatch","loads"],       better_than: "Rose Rocket dispatch reports lack driver-level breakdown." },
  { id: "r08", category: "Operations", icon: "⏳", name: "Payroll Holds Report",        description: "Drivers with payroll holds, reason, and days outstanding. Resolve from this report.",           tags: ["payroll","holds"],        better_than: "Most TMS systems offer no payroll hold visibility outside payroll module." },
  { id: "r09", category: "Operations", icon: "📋", name: "Missing Tickets Report",      description: "Loads with no ticket scanned, sorted by driver and truck. Direct action from the report.",      tags: ["tickets","missing"],      better_than: "No comparable feature in Rose Rocket or Axon." },
  { id: "r10", category: "Operations", icon: "📦", name: "Loads by Material",           description: "Total tons and revenue broken down by material type (limestone, base rock, crushed, etc.).",    tags: ["loads","material"],       better_than: "Rose Rocket has basic material tagging but no tonnage trend." },

  // ── Driver / HR Reports ──
  { id: "r11", category: "Drivers",    icon: "🪪", name: "CDL & Med Card Expiry",       description: "Every driver's CDL and medical card expiration sorted by nearest to expire first.",            tags: ["compliance","CDL","driver"], better_than: "Rose Rocket and Axon require manual tracking in spreadsheets." },
  { id: "r12", category: "Drivers",    icon: "🚨", name: "Driver Violations Log",       description: "All logged violations, incidents, and disciplinary actions with severity.",                     tags: ["safety","violation","HR"],  better_than: "Neither competitor has a dedicated violation log inside the TMS." },
  { id: "r13", category: "Drivers",    icon: "💵", name: "Driver Pay History",          description: "Pay-per-period breakdown per driver. Compare hourly vs per-load earnings.",                    tags: ["payroll","driver","pay"],   better_than: "Axon payroll reports are static PDFs. Rose Rocket lacks per-driver detail." },
  { id: "r14", category: "Drivers",    icon: "📅", name: "Driver Onboarding Status",    description: "Incomplete onboarding checklists, missing documents, and orientation gaps.",                   tags: ["HR","onboarding"],          better_than: "No comparable feature exists in Rose Rocket or Axon." },

  // ── Fleet Reports ──
  { id: "r15", category: "Fleet",      icon: "🔧", name: "Maintenance Due Report",      description: "Trucks with upcoming PM, overdue oil changes, and pending shop tickets.",                      tags: ["maintenance","PM"],        better_than: "Rose Rocket has basic maintenance but no PM due alerts. Axon is stronger here." },
  { id: "r16", category: "Fleet",      icon: "🔍", name: "Inspection History",          description: "All inspections per truck with pass/fail rate, open defects, and fleet health score.",         tags: ["inspections","fleet"],     better_than: "No built-in inspection history in Rose Rocket. Axon requires add-on module." },
  { id: "r17", category: "Fleet",      icon: "📄", name: "Cab Card & Reg Renewal",      description: "All trucks with cab card, IFTA decal, and registration renewal dates sorted by urgency.",     tags: ["compliance","cabcard"],    better_than: "Neither competitor tracks cab card renewals inside the TMS." },
  { id: "r18", category: "Fleet",      icon: "⛽", name: "Fuel & IFTA Summary",         description: "Fuel consumption, cost, and IFTA mileage by truck and quarter.",                              tags: ["IFTA","fuel","finance"],   better_than: "Rose Rocket lacks IFTA integration. Axon requires manual fuel log entry." },

  // ── Finance Reports ──
  { id: "r19", category: "Finance",    icon: "🧾", name: "Invoice Aging Report",        description: "Outstanding invoices grouped by aging bucket (current, 30, 60, 90+ days).",                   tags: ["billing","AR","finance"],  better_than: "Rose Rocket AR aging is basic. Axon has similar but no quick action buttons." },
  { id: "r20", category: "Finance",    icon: "📑", name: "Accounts Receivable Summary", description: "Total AR by customer with outstanding balance, last payment, and contact.",                    tags: ["AR","customer","finance"], better_than: "Comparable in Rose Rocket but requires navigation through 4 screens." },
  { id: "r21", category: "Finance",    icon: "💸", name: "Billing Review Queue",        description: "Loads ready to invoice, on hold, and pending correction. One-click invoice generation.",      tags: ["billing","invoice"],       better_than: "Rose Rocket billing requires manual line-by-line review. Axon has bulk billing." },
];

const CATEGORIES = ["All", ...Array.from(new Set(REPORTS.map(r => r.category)))];
const eyebrow: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" };
const ghostBtn: React.CSSProperties   = { padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };

export default function ReportsPage() {
  const [catFilter, setCatFilter]  = useState("All");
  const [search, setSearch]        = useState("");
  const [toast, setToast]          = useState("");
  const [showBetter, setShowBetter] = useState<string | null>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const filtered = REPORTS.filter(r =>
    (catFilter === "All" || r.category === catFilter) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()) || r.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  );

  function runReport(r: ReportDef) {
    flash(`${r.name} — report feature coming soon. Export data will open here.`);
  }

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = c === "All" ? REPORTS.length : REPORTS.filter(r => r.category === c).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ maxWidth: 1080 }}>
      {toast && <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "13px 22px", borderRadius: 14, fontWeight: 700, fontSize: 14 }}>{toast}</div>}

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={eyebrow}>MoveAround TMS / Reports</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>Reports Center</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
          {REPORTS.length} reports for owners and office staff — every report your team needs, available in one place.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {CATEGORIES.filter(c => c !== "All").map(c => (
          <div key={c} onClick={() => setCatFilter(c)} style={{ background: catFilter===c?"#1e40af":"#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: catFilter===c?"rgba(255,255,255,0.7)":"#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{c}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: catFilter===c?"#fff":"#0f172a", marginTop: 4 }}>{catCounts[c]}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" style={{ flex: 1, padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "6px 12px", border: "none", borderRadius: 8, background: catFilter===c?"#0f172a":"#f1f5f9", color: catFilter===c?"#fff":"#475569", cursor: "pointer", fontSize: "0.78rem", fontWeight: catFilter===c?700:500 }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Reports banner */}
      <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)", borderRadius: 14, padding: "14px 20px", marginBottom: 20, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: "1.2rem" }}>📊</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>21 reports built for owners and office staff</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)" }}>Click "Why Better?" on any report to see what makes this report stand out for your operation.</div>
          </div>
        </div>
      </div>

      {/* Report cards */}
      {filtered.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "40px 0", textAlign: "center", color: "#94a3b8" }}>No reports match your search.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ fontSize: "1.6rem", flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{r.name}</div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: 6, display: "inline-block" }}>{r.category}</div>
                </div>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>{r.description}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {r.tags.map(t => <span key={t} style={{ background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600 }}>#{t}</span>)}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => runReport(r)} style={{ ...primaryBtn, flex: 1, textAlign: "center" }}>Run Report</button>
                <button
                  onClick={() => setShowBetter(showBetter === r.id ? null : r.id)}
                  style={{ ...ghostBtn, fontSize: "0.72rem", padding: "6px 10px", background: "#f5f3ff", color: "#7c3aed", borderColor: "#c4b5fd" }}
                >
                  🏆 Why Better?
                </button>
              </div>
              {showBetter === r.id && (
                <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: "10px 12px", fontSize: "0.78rem", color: "#5b21b6", lineHeight: 1.5 }}>
                  <strong>vs. Rose Rocket & Axon:</strong> {r.better_than}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24, padding: "14px 18px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: "0.78rem", color: "#64748b" }}>
        <strong>Coming soon:</strong> Scheduled reports (email delivery), custom date ranges, PDF export, and shareable report links. Planned upgrades will include automated weekly summaries emailed to owners and dispatchers.
      </div>
    </div>
  );
}
