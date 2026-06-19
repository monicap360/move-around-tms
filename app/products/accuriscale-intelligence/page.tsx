"use client";

import { useState } from "react";
import Link from "next/link";

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function ROICalc() {
  const [vals, setVals] = useState({
    loadsPerDay: 45,
    averageValuePerLoad: 420,
    discrepancyPercent: 4,
    reconciliationHoursPerDay: 2,
    missedAccessorialPercent: 2,
    adminHourlyRate: 30,
  });

  const set = (k: keyof typeof vals, v: number) => setVals(p => ({ ...p, [k]: v }));

  const workingDays            = 260;
  const annualLoadValue        = vals.loadsPerDay * vals.averageValuePerLoad * workingDays;
  const recoveredTonnage       = annualLoadValue * (vals.discrepancyPercent / 100);
  const laborSavings           = vals.reconciliationHoursPerDay * vals.adminHourlyRate * workingDays;
  const recoveredAccessorials  = annualLoadValue * (vals.missedAccessorialPercent / 100);
  const total                  = recoveredTonnage + laborSavings + recoveredAccessorials;

  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <section style={{ background: "#0f172a", padding: "72px 32px", borderTop: "1px solid #1e293b" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ color: "#22d3ee", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>ROI Calculator</div>
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 900, color: "#fff" }}>
            Estimate Your Annual Recovery
          </h2>
          <p style={{ margin: "0 auto", color: "#94a3b8", fontSize: "0.9rem", maxWidth: 560 }}>
            Estimate only — actual recovery depends on ticket volume, rates, disputes, and workflow setup.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>

          {/* Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {([
              ["loadsPerDay",                "Loads per day",                            1, 500],
              ["averageValuePerLoad",         "Average value per load ($)",               50, 5000],
              ["discrepancyPercent",          "Loads with weight discrepancies (%)",      0, 20],
              ["reconciliationHoursPerDay",   "Manual reconciliation (hours/day)",        0, 12],
              ["missedAccessorialPercent",    "Revenue lost to missed accessorials (%)",  0, 10],
              ["adminHourlyRate",             "Admin labor cost ($/hour)",                15, 150],
            ] as [keyof typeof vals, string, number, number][]).map(([key, label, min, max]) => (
              <div key={key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>{label}</label>
                  <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 700 }}>{vals[key]}</span>
                </div>
                <input type="range" min={min} max={max} value={vals[key]}
                  onChange={e => set(key, Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#22d3ee" }} />
              </div>
            ))}
          </div>

          {/* Results */}
          <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 16, padding: 32 }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22d3ee", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 24 }}>
              Estimated Annual Impact
            </div>
            {[
              ["Recovered tonnage revenue",  recoveredTonnage,      "#22d3ee"],
              ["Annual labor savings",        laborSavings,          "#86efac"],
              ["Recovered accessorials",      recoveredAccessorials, "#fbbf24"],
            ].map(([label, val, color]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #1e293b" }}>
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{String(label)}</span>
                <span style={{ color: String(color), fontWeight: 800, fontSize: "1.1rem" }}>{fmt(Number(val))}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>Total annual impact</span>
              <span style={{ color: "#22d3ee", fontWeight: 900, fontSize: "1.4rem" }}>{fmt(total)}</span>
            </div>
            <div style={{ marginTop: 24 }}>
              <Link href="/products/accuriscale-intelligence/walkthrough"
                style={{ display: "block", background: "#dc2626", color: "#fff", textAlign: "center", padding: "14px 0", borderRadius: 10, fontWeight: 800, fontSize: "0.9rem", textDecoration: "none" }}>
                Walk Through AccuriScale →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MISSION_CARDS = [
  { icon: "💰", color: "#22d3ee", title: "Stop Revenue Leakage", body: "Automatically flag load weight discrepancies, missed accessorials, duplicate tickets, and unbilled loads before they cost the company money." },
  { icon: "🔗", color: "#86efac", title: "End Manual Ticket Matching", body: "Sync scale-house data, uploaded tickets, OCR results, dispatch jobs, payroll items, and invoices into one verified workflow." },
  { icon: "⚖️", color: "#fbbf24", title: "Detect Short Loads", body: "Compare pit scale weight, destination weight, ticket quantity, customer contract rate, and billing quantity in one place." },
  { icon: "🛡️", color: "#f87171", title: "Prevent Scale Fraud & Collusion", body: "Validation rules, anomaly detection, override tracking, and audit logs flag suspicious patterns between drivers, loaders, dispatchers, and scale operators." },
  { icon: "📊", color: "#a78bfa", title: "Track Production in Real Time", body: "See loads, tons, trucks, pits, materials, cycle times, queue delays, and completed work without waiting for end-of-day paperwork." },
];

const PIT_TO_PAY = [
  { step: "01", title: "Scale Integration",     color: "#22d3ee", body: "Weight is captured from pit, quarry, or scale-house data and linked to the dispatch job." },
  { step: "02", title: "TicketFlash OCR",        color: "#86efac", body: "Uploaded tickets, PDFs, photos, and scans become structured digital records. Extracts ticket #, date, truck, driver, tons, and signatures." },
  { step: "03", title: "Dispatch & Tracking",   color: "#fbbf24", body: "Every load connects to the assigned driver, truck, project, customer, pit, and material in real time." },
  { step: "04", title: "Delivery Verification", color: "#a78bfa", body: "Destination weight, delivery proof, and customer confirmation are compared against the original ticket." },
  { step: "05", title: "Exception Detection",   color: "#f87171", body: "AccuriScale flags short loads, overweight variances, duplicate tickets, missing tickets, suspicious edits, rate mismatches, and unbilled accessorials." },
  { step: "06", title: "Payroll Review",         color: "#22d3ee", body: "Clean tickets move to payroll review. Questionable tickets are held until approved by the office." },
  { step: "07", title: "Automated Billing",      color: "#86efac", body: "Verified tickets become clean invoices with fewer disputes, faster approval, and stronger audit support." },
];

const PROBLEMS = [
  { icon: "⚖️", title: "Short Loads & Weight Disputes", body: "Unbillable tons, customer arguments, manual matching, and delayed collections hurt margin. AccuriScale compares pit scale data, destination verification, ticket quantity, and invoice quantity." },
  { icon: "💸", title: "Revenue Leakage & Manual Errors", body: "Lost tickets, miskeyed weights, missed wait time, missed fuel surcharge, and missed accessorials add up. Revenue Shield™ and TicketFlash OCR match loads to tickets, tickets to payroll, and payroll to invoices." },
  { icon: "🔍", title: "Scale House Fraud & Collusion", body: "Unverified edits, suspicious overrides, repeated short loads, and no audit trail create risk. Validation rules, anomaly detection, role-based approvals, and immutable audit logs protect the operation." },
  { icon: "🚛", title: "Inefficient Haul Cycles", body: "Idle trucks, poor sequencing, and lack of live production visibility reduce daily output. AccuriScale gives dispatch and owners real-time visibility across the pit, queue, route, delivery, and return cycle." },
  { icon: "🌎", title: "Cross-Border Complexity", body: "For Mexico cross-border freight, paperwork, compliance, currency, and tax documentation can cause delays and billing risk. AccuriScale connects with the Cross-Border Mexico module for CFDI 4.0, Carta Porte, and border compliance." },
];

const FEATURES = [
  "Scale ticket matching","TicketFlash OCR","Pit scale integration","Destination weight verification",
  "Short-load detection","Duplicate ticket detection","Missing ticket alerts","Rate mismatch alerts",
  "Missed accessorial detection","Payroll hold rules","Billing hold rules","Production dashboard",
  "Driver & truck performance","Pit and project analytics","Fraud pattern alerts",
  "Immutable audit logs","Customer dispute packet builder","Invoice reconciliation","Dispatch-to-ticket-to-pay workflow",
];

const EXCEPTIONS = [
  { icon: "🔴", label: "Short Load" },           { icon: "🟡", label: "Missing Ticket" },
  { icon: "🔴", label: "Duplicate Ticket" },     { icon: "🟡", label: "Weight Mismatch" },
  { icon: "🔴", label: "Manual Scale Override" },{ icon: "🟡", label: "Driver/Truck Mismatch" },
  { icon: "🟡", label: "Material Mismatch" },    { icon: "🔴", label: "Rate Mismatch" },
  { icon: "🟡", label: "Unbilled Accessorial" }, { icon: "🔴", label: "Payroll Hold" },
  { icon: "🔴", label: "Billing Hold" },         { icon: "🟡", label: "Scale Operator Edit" },
];

const BUILT_FOR = [
  "Aggregate haulers","Dump truck companies","Quarry & pit operations",
  "Bulk material haulers","Sand, gravel, rock, dirt, asphalt carriers",
  "Brokers managing sub-haulers","Owner operator networks","High-volume ticket operations",
];

export default function AccuriScalePage() {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#020817", color: "#fff", minHeight: "100vh" }}>

      {/* Sticky CTA bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(2,8,23,0.95)",
        backdropFilter: "blur(10px)", borderBottom: "1px solid #1e293b", padding: "12px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#22d3ee" }}>AccuriScale Intelligence™</span>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/products/accuriscale-intelligence/walkthrough"
            style={{ background: "#dc2626", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
            Walk Through AccuriScale
          </Link>
          <Link href="#demo"
            style={{ background: "transparent", color: "#94a3b8", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", border: "1px solid #334155" }}>
            Request Demo
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 32, paddingRight: 32,
        background: "linear-gradient(135deg, #020817 0%, #0c1a2e 50%, #0a1228 100%)", textAlign: "center" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
            color: "#22d3ee", padding: "6px 18px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 24 }}>
            For Aggregate & Bulk Material Haulers
          </div>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(2rem, 5vw, 3.6rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-1.5px" }}>
            <span style={{ color: "#22d3ee" }}>AccuriScale</span>{" "}
            <span style={{ color: "#fff" }}>Intelligence™</span>
          </h1>
          <p style={{ margin: "0 auto 12px", fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "#94a3b8", lineHeight: 1.6, maxWidth: 680 }}>
            Ticket matching, short-load detection, scale fraud monitoring, and production tracking for aggregate and bulk material haulers.
          </p>
          <p style={{ margin: "0 0 40px", fontSize: "0.95rem", color: "#22d3ee", fontStyle: "italic", fontWeight: 600 }}>
            From pit scale to final pay — every ton verified, every ticket matched, every dollar protected.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products/accuriscale-intelligence/walkthrough"
              style={{ background: "#dc2626", color: "#fff", padding: "16px 36px", borderRadius: 10, fontWeight: 800, fontSize: "1rem", textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center" }}>
              Walk Through AccuriScale →
            </Link>
            <Link href="#demo"
              style={{ background: "transparent", color: "#94a3b8", padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", border: "1px solid #334155" }}>
              Request Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: "#0a0f1e", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b", padding: "28px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
          {[
            ["$199+", "Starting at /mo"],
            ["2,000", "Tickets/mo included"],
            ["7 Steps", "Pit-to-Pay workflow"],
            ["100%", "Load accountability"],
          ].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "#22d3ee" }}>{val}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mission Critical */}
      <section style={{ padding: "72px 32px", background: "#020817" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#22d3ee", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Why AccuriScale Is Mission-Critical</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>
              Protect Revenue at Every Step
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {MISSION_CARDS.map(card => (
              <div key={card.title} style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: "24px", borderLeft: `3px solid ${card.color}` }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{card.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.7 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pit-to-Pay Workflow */}
      <section style={{ padding: "72px 32px", background: "#040c18", borderTop: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#86efac", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Pit-to-Pay Workflow</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>
              Seven Steps. Zero Gaps.
            </h2>
          </div>
          <div style={{ position: "relative" }}>
            {PIT_TO_PAY.map((item, i) => (
              <div key={item.step} style={{ display: "flex", gap: 24, marginBottom: i < PIT_TO_PAY.length - 1 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: item.color, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.85rem", flexShrink: 0 }}>{item.step}</div>
                  {i < PIT_TO_PAY.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e293b", minHeight: 32, margin: "4px 0" }} />}
                </div>
                <div style={{ paddingBottom: i < PIT_TO_PAY.length - 1 ? 28 : 0 }}>
                  <h3 style={{ margin: "10px 0 8px", fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{item.title}</h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.7 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 Problems */}
      <section style={{ padding: "72px 32px", background: "#020817", borderTop: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#f87171", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>The 5 Costly Problems AccuriScale Solves</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>
              Every Problem Costs Real Money
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PROBLEMS.map((p, i) => (
              <div key={p.title} style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20 }}>
                <div style={{ fontSize: "2rem", flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ background: "#1e293b", color: "#f87171", padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 800 }}>PROBLEM {i + 1}</span>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{p.title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.7 }}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <ROICalc />

      {/* Exceptions Grid */}
      <section style={{ padding: "72px 32px", background: "#040c18", borderTop: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: "#fbbf24", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Exception & Fraud Alerts</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>
              Every Anomaly. Every Time.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {EXCEPTIONS.map(ex => (
              <div key={ex.label} style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>
                <span>{ex.icon}</span>{ex.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "72px 32px", background: "#020817", borderTop: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: "#22d3ee", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Core Features</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>
              Built for High-Volume Ticket Operations
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: "#0a0f1e", borderRadius: 8, border: "1px solid #1e293b" }}>
                <span style={{ color: "#22d3ee", fontSize: "0.8rem" }}>✓</span>
                <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built For */}
      <section style={{ padding: "56px 32px", background: "#040c18", borderTop: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: "#86efac", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Built For</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {BUILT_FOR.map(t => (
              <span key={t} style={{ background: "#0a0f1e", border: "1px solid #1e293b", color: "#94a3b8", padding: "8px 18px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "72px 32px", background: "#020817", borderTop: "1px solid #1e293b" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#22d3ee", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Pricing</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Simple, Volume-Based Pricing</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {[
              { tier: "Starter",    price: "$199/mo",   tickets: "Up to 500 tickets/month",    color: "#22d3ee",  highlight: false },
              { tier: "Pro",        price: "$399/mo",   tickets: "Up to 2,000 tickets/month",  color: "#dc2626",  highlight: true  },
              { tier: "Enterprise", price: "$799+/mo",  tickets: "High-volume · Custom limits", color: "#a78bfa", highlight: false },
            ].map(plan => (
              <div key={plan.tier} style={{ background: plan.highlight ? "#0c1a2e" : "#0a0f1e",
                border: `1.5px solid ${plan.highlight ? plan.color : "#1e293b"}`, borderRadius: 16, padding: "28px 24px",
                boxShadow: plan.highlight ? `0 0 40px rgba(220,38,38,0.15)` : "none" }}>
                {plan.highlight && (
                  <div style={{ background: "#dc2626", color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "3px 12px", borderRadius: 20, width: "fit-content", marginBottom: 16, letterSpacing: "0.08em" }}>MOST POPULAR</div>
                )}
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>{plan.tier}</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: plan.color, marginBottom: 6 }}>{plan.price}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 20 }}>{plan.tickets}</div>
                {plan.tier === "Enterprise" && (
                  <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.8, marginBottom: 16 }}>
                    Scale integrations · Multiple pits · Fraud analytics · Custom reporting · API access · Cross-border workflows
                  </div>
                )}
                {plan.tier === "Pro" && (
                  <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.8, marginBottom: 16 }}>
                    Additional tickets: $0.15 each · Full exception detection · Fraud alerts · Production dashboard · Audit logs
                  </div>
                )}
                <Link href="#demo"
                  style={{ display: "block", background: plan.highlight ? "#dc2626" : "#1e293b", color: "#fff",
                    textAlign: "center", padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
                  {plan.tier === "Enterprise" ? "Contact Sales" : "Get Started"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" style={{ padding: "80px 32px", background: "linear-gradient(135deg, #0c1a2e 0%, #0a0f1e 100%)", borderTop: "1px solid #1e293b", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
            Stop losing money between the pit, the ticket, payroll, and the invoice.
          </h2>
          <p style={{ margin: "0 0 36px", fontSize: "0.95rem", color: "#64748b", lineHeight: 1.7 }}>
            AccuriScale Intelligence™ gives your operation the proof, automation, and visibility needed to protect every load.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products/accuriscale-intelligence/walkthrough"
              style={{ background: "#dc2626", color: "#fff", padding: "16px 40px", borderRadius: 10, fontWeight: 800, fontSize: "1rem", textDecoration: "none" }}>
              Walk Through AccuriScale
            </Link>
            <Link href="mailto:demo@movearoundtms.com?subject=AccuriScale Intelligence Demo Request"
              style={{ background: "transparent", color: "#94a3b8", padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", border: "1px solid #334155" }}>
              Request Demo
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
