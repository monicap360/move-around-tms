"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Public marketing page for CCB Sentinel™ (Carrier Clearance Board) ──────────

const MISSION_CARDS = [
  { icon: "🛡️", color: "#a78bfa", title: "Only Cleared Carriers Roll", body: "Clearance is tied straight to dispatch. A carrier with lapsed authority or insurance is auto-held — the bad load never leaves the yard." },
  { icon: "📡", color: "#22d3ee", title: "Always-On Monitoring", body: "Authority, insurance, and safety are watched continuously — not once at onboarding. The moment something lapses, you know." },
  { icon: "🏢", color: "#86efac", title: "One Board, Every Company", body: "Run clearance for your whole operation — every carrier, every sub-hauler, across every company — from one universal board." },
  { icon: "✅", color: "#fbbf24", title: "Audit-Ready, Always", body: "Every clearance decision is logged with the note and the date. When an auditor or insurer asks, the proof is one click away." },
  { icon: "⏰", color: "#f87171", title: "Catch Lapses Before Dispatch", body: "Expiring COIs, CDLs, and authority surface as warnings with follow-up tasks — so you fix them before they become a claim." },
];

const WORKFLOW = [
  { step: "01", title: "Onboard the Carrier",     color: "#a78bfa", body: "Add the carrier and pull their authority, insurance, and safety profile into the board." },
  { step: "02", title: "Continuous Monitoring",   color: "#22d3ee", body: "CCB Sentinel watches authority status, insurance certificates, and safety scores around the clock." },
  { step: "03", title: "Auto-Classification",     color: "#86efac", body: "Each carrier is scored Clear, Warning, or Dispatch-Block based on your clearance rules." },
  { step: "04", title: "Tied to Dispatch",        color: "#fbbf24", body: "An un-cleared carrier is held automatically — dispatch can't roll a truck that isn't cleared." },
  { step: "05", title: "Follow-Up & Fix",         color: "#f87171", body: "Warnings become follow-up tasks — call about expiring insurance or authority before the date passes." },
  { step: "06", title: "Audit Trail",             color: "#a78bfa", body: "Every decision, note, and date is stored — audit-ready proof that only cleared carriers were dispatched." },
];

const PROBLEMS = [
  { icon: "⚠️", title: "Dispatching an Uninsured or Lapsed Carrier", body: "One truck with expired authority or a lapsed COI is a cargo/liability claim and a failed audit waiting to happen. CCB Sentinel ties clearance to dispatch so it can't happen." },
  { icon: "📄", title: "Expired COIs, CDLs & Authority Slipping Through", body: "Certificates expire quietly. Continuous monitoring surfaces every lapse as a warning with a follow-up task before it costs you a load or a claim." },
  { icon: "🗂️", title: "Compliance Living in Spreadsheets & Folders", body: "Manual tracking doesn't scale and can't prove anything. CCB Sentinel puts every carrier's clearance in one board with an immutable audit log." },
  { icon: "🔍", title: "No Proof at Dispatch Time", body: "When an insurer or auditor asks 'was this carrier cleared when you dispatched them?', you need an answer. Every clearance decision is timestamped and logged." },
];

const FEATURES = [
  "Carrier authority monitoring", "Insurance / COI tracking", "Safety score monitoring",
  "Dispatch-tied clearance holds", "Clear / Warning / Block classification", "Expiring-document alerts",
  "Follow-up task creation", "Cross-company universal board", "Per-carrier clearance notes",
  "Immutable audit log", "Office assistant (ask & act)", "New-company auto-onboarding",
];

const BUILT_FOR = [
  "Brokers hiring sub-haulers", "Carriers running owner-operators", "Dump & aggregate fleets",
  "Anyone dispatching third-party trucks", "Compliance & safety teams", "Multi-company operations",
];

const PLANS = [
  { tier: "Starter", price: "$199/mo", sub: "Up to 50 trucks", color: "#22d3ee", highlight: false, note: "Continuous monitoring · dispatch holds · audit log" },
  { tier: "Growth", price: "$3 / truck /mo", sub: "51–200 trucks", color: "#a78bfa", highlight: true, note: "Everything in Starter · follow-up tasks · office assistant" },
  { tier: "Fleet", price: "$2.50 / truck /mo", sub: "200+ trucks · custom", color: "#86efac", highlight: false, note: "Volume pricing · universal cross-company board · priority support" },
];

export default function CcbSentinelPage() {
  const [trucks, setTrucks] = useState(120);
  const monthly = trucks <= 50 ? 199 : trucks <= 200 ? trucks * 3 : trucks <= 600 ? trucks * 2.5 : trucks * 2;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#0a0510", color: "#fff", minHeight: "100vh" }}>

      {/* Sticky CTA bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,5,16,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #2e1065", padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#a78bfa" }}>📡 CCB Sentinel™</span>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="#pricing" style={{ background: "#7c3aed", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>See Pricing</Link>
          <Link href="#demo" style={{ background: "transparent", color: "#94a3b8", padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", border: "1px solid #334155" }}>Request Demo</Link>
        </div>
      </div>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, background: "linear-gradient(135deg,#0a0510 0%,#1e1046 50%,#0c1a3a 100%)", textAlign: "center" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)", color: "#c4b5fd", padding: "6px 18px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 24 }}>
            Carrier Clearance Board
          </div>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(2rem, 5vw, 3.6rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-1.5px" }}>
            <span style={{ color: "#a78bfa" }}>CCB Sentinel</span><span style={{ color: "#fff" }}>™</span>
          </h1>
          <p style={{ margin: "0 auto 12px", fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "#94a3b8", lineHeight: 1.6, maxWidth: 680 }}>
            Carrier clearance and compliance monitoring for dump, aggregate, and third-party haulers. Authority, insurance, and safety — watched continuously and tied straight to dispatch.
          </p>
          <p style={{ margin: "0 0 40px", fontSize: "0.95rem", color: "#a78bfa", fontStyle: "italic", fontWeight: 600 }}>
            Only cleared carriers roll. Every decision logged. Every company protected.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#pricing" style={{ background: "#7c3aed", color: "#fff", padding: "16px 36px", borderRadius: 10, fontWeight: 800, fontSize: "1rem", textDecoration: "none" }}>See Pricing →</Link>
            <Link href="#demo" style={{ background: "transparent", color: "#94a3b8", padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", border: "1px solid #334155" }}>Request Demo</Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: "#120a20", borderTop: "1px solid #2e1065", borderBottom: "1px solid #2e1065", padding: "28px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
          {[["24/7", "Monitoring"], ["3", "Signals: authority · insurance · safety"], ["1", "Board for every carrier"], ["100%", "Audit-ready"]].map(([val, label]) => (
            <div key={label}><div style={{ fontSize: "2rem", fontWeight: 900, color: "#a78bfa" }}>{val}</div><div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>{label}</div></div>
          ))}
        </div>
      </section>

      {/* Mission Critical */}
      <section style={{ padding: "72px 32px", background: "#0a0510" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#a78bfa", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Why CCB Sentinel Is Mission-Critical</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Clearance You Can Prove</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {MISSION_CARDS.map(card => (
              <div key={card.title} style={{ background: "#120a20", border: "1px solid #2e1065", borderRadius: 14, padding: "24px", borderLeft: `3px solid ${card.color}` }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{card.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#8b7ba8", lineHeight: 1.7 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section style={{ padding: "72px 32px", background: "#0c0718", borderTop: "1px solid #2e1065" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#22d3ee", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>How It Works</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>From Onboard to Audit — Six Steps</h2>
          </div>
          {WORKFLOW.map((item, i) => (
            <div key={item.step} style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: item.color, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.85rem" }}>{item.step}</div>
                {i < WORKFLOW.length - 1 && <div style={{ width: 2, flex: 1, background: "#2e1065", minHeight: 32, margin: "4px 0" }} />}
              </div>
              <div style={{ paddingBottom: i < WORKFLOW.length - 1 ? 28 : 0 }}>
                <h3 style={{ margin: "10px 0 8px", fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#8b7ba8", lineHeight: 1.7 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Problems */}
      <section style={{ padding: "72px 32px", background: "#0a0510", borderTop: "1px solid #2e1065" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#f87171", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>What CCB Sentinel Prevents</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>One Bad Carrier Is All It Takes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PROBLEMS.map((p, i) => (
              <div key={p.title} style={{ background: "#120a20", border: "1px solid #2e1065", borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20 }}>
                <div style={{ fontSize: "2rem", flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ background: "#2e1065", color: "#f87171", padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 800 }}>RISK {i + 1}</span>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{p.title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#8b7ba8", lineHeight: 1.7 }}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "72px 32px", background: "#0c0718", borderTop: "1px solid #2e1065" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: "#a78bfa", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Core Features</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Everything Clearance Needs</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: "#120a20", borderRadius: 8, border: "1px solid #2e1065" }}>
                <span style={{ color: "#a78bfa", fontSize: "0.8rem" }}>✓</span>
                <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built For */}
      <section style={{ padding: "56px 32px", background: "#0a0510", borderTop: "1px solid #2e1065" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: "#86efac", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Built For</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {BUILT_FOR.map(t => <span key={t} style={{ background: "#120a20", border: "1px solid #2e1065", color: "#94a3b8", padding: "8px 18px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 600 }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* Pricing + estimator */}
      <section id="pricing" style={{ padding: "72px 32px", background: "#0c0718", borderTop: "1px solid #2e1065" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: "#a78bfa", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Pricing</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Simple, Per-Truck Pricing</h2>
            <p style={{ margin: "10px auto 0", color: "#8b7ba8", fontSize: "0.86rem", maxWidth: 520 }}>Scales with your fleet — a fraction of what legacy monitoring services charge.</p>
          </div>

          {/* Estimator */}
          <div style={{ background: "#120a20", border: "1px solid #2e1065", borderRadius: 16, padding: "26px 28px", marginBottom: 28, maxWidth: 620, margin: "0 auto 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ color: "#94a3b8", fontSize: "0.82rem", fontWeight: 600 }}>How many trucks do you clear?</label>
              <span style={{ color: "#fff", fontWeight: 800 }}>{trucks} trucks</span>
            </div>
            <input type="range" min={5} max={1000} value={trucks} onChange={e => setTrucks(Number(e.target.value))} style={{ width: "100%", accentColor: "#a78bfa" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, paddingTop: 16, borderTop: "1px solid #2e1065" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Estimated monthly</span>
              <span style={{ color: "#a78bfa", fontWeight: 900, fontSize: "1.8rem" }}>{fmt(monthly)}<span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>/mo</span></span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.tier} style={{ background: plan.highlight ? "#1a0f33" : "#120a20", border: `1.5px solid ${plan.highlight ? plan.color : "#2e1065"}`, borderRadius: 16, padding: "28px 24px", boxShadow: plan.highlight ? "0 0 40px rgba(124,58,237,0.2)" : "none" }}>
                {plan.highlight && <div style={{ background: "#7c3aed", color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "3px 12px", borderRadius: 20, width: "fit-content", marginBottom: 16, letterSpacing: "0.08em" }}>MOST POPULAR</div>}
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>{plan.tier}</div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: plan.color, marginBottom: 6 }}>{plan.price}</div>
                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 14 }}>{plan.sub}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.7, marginBottom: 18 }}>{plan.note}</div>
                <Link href="#demo" style={{ display: "block", background: plan.highlight ? "#7c3aed" : "#2e1065", color: "#fff", textAlign: "center", padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>{plan.tier === "Fleet" ? "Contact Sales" : "Get Started"}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" style={{ padding: "80px 32px", background: "linear-gradient(135deg,#1e1046 0%,#0c1a3a 100%)", borderTop: "1px solid #2e1065", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>Never dispatch an uncleared carrier again.</h2>
          <p style={{ margin: "0 0 36px", fontSize: "0.95rem", color: "#c4b5fd", lineHeight: 1.7 }}>CCB Sentinel™ keeps every carrier's authority, insurance, and safety current — and proves it when it matters.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="mailto:demo@movearoundtms.com?subject=CCB Sentinel Demo Request" style={{ background: "#7c3aed", color: "#fff", padding: "16px 40px", borderRadius: 10, fontWeight: 800, fontSize: "1rem", textDecoration: "none" }}>Request a Demo</Link>
            <Link href="/" style={{ background: "transparent", color: "#94a3b8", padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", border: "1px solid #334155" }}>← Back to MoveAround</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
