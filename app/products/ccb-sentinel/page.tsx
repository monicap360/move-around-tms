"use client";

import { useState } from "react";
import Link from "next/link";
import { CcbShield, CcbSeal, CcbLockup } from "@/app/components/CcbLogo";

// ─── Public marketing page for Carrier Clearance Bureau™ (CCB) ──────────────────
// Brand: navy shield · steel silver · green "sentinel" clearance light.

const MISSION_CARDS = [
  { icon: "🛡️", color: "#22c55e", title: "Only Cleared Carriers Roll", body: "Clearance is tied straight to dispatch. A carrier with lapsed authority or insurance is auto-held — the bad load never leaves the yard." },
  { icon: "📡", color: "#38bdf8", title: "Always-On Monitoring", body: "Authority, insurance, and safety are watched continuously — not once at onboarding. The moment something lapses, you know." },
  { icon: "🏢", color: "#cbd5e1", title: "One Board, Every Company", body: "Run clearance for your whole operation — every carrier, every sub-hauler, across every company — from one universal board." },
  { icon: "✅", color: "#22c55e", title: "Audit-Ready, Always", body: "Every clearance decision is logged with the note and the date. When an auditor or insurer asks, the proof is one click away." },
  { icon: "⏰", color: "#fbbf24", title: "Catch Lapses Before Dispatch", body: "Expiring COIs, CDLs, and authority surface as warnings with follow-up tasks — so you fix them before they become a claim." },
  { icon: "🟢", color: "#4ade80", title: "Cleared to Move, Trusted to Deliver", body: "A cleared carrier shows the green light. From the office to the driver, everyone knows at a glance who's cleared and who's held — no guesswork, no arguments." },
];

const WORKFLOW = [
  { step: "01", title: "Onboard the Carrier",     color: "#cbd5e1", body: "Add the carrier and pull their authority, insurance, and safety profile into the board." },
  { step: "02", title: "Continuous Monitoring",   color: "#38bdf8", body: "The Bureau watches authority status, insurance certificates, and safety scores around the clock." },
  { step: "03", title: "Auto-Classification",     color: "#22c55e", body: "Each carrier is scored Clear, Warning, or Dispatch-Block based on your clearance rules." },
  { step: "04", title: "Tied to Dispatch",        color: "#fbbf24", body: "An un-cleared carrier is held automatically — dispatch can't roll a truck that isn't cleared." },
  { step: "05", title: "Follow-Up & Fix",         color: "#f87171", body: "Warnings become follow-up tasks — call about expiring insurance or authority before the date passes." },
  { step: "06", title: "Audit Trail",             color: "#4ade80", body: "Every decision, note, and date is stored — audit-ready proof that only cleared carriers were dispatched." },
];

const PROBLEMS = [
  { icon: "⚠️", title: "Dispatching an Uninsured or Lapsed Carrier", body: "One truck with expired authority or a lapsed COI is a cargo/liability claim and a failed audit waiting to happen. The Bureau ties clearance to dispatch so it can't happen." },
  { icon: "📄", title: "Expired COIs, CDLs & Authority Slipping Through", body: "Certificates expire quietly. Continuous monitoring surfaces every lapse as a warning with a follow-up task before it costs you a load or a claim." },
  { icon: "🗂️", title: "Compliance Living in Spreadsheets & Folders", body: "Manual tracking doesn't scale and can't prove anything. The Bureau puts every carrier's clearance in one board with an immutable audit log." },
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

// CCB vs a legacy carrier-monitoring service. [capability, legacy, ccb]
const COMPARE: [string, boolean, boolean][] = [
  ["Authority · insurance · safety monitoring", true, true],
  ["Clearance tied to dispatch (auto-holds a bad load)", false, true],
  ["Blocks an un-cleared carrier before the truck rolls", false, true],
  ["One universal board across every company", false, true],
  ["Follow-up tasks on expiring COIs / CDLs / authority", false, true],
  ["Office assistant — ask a question or give a command", false, true],
  ["Immutable audit log / proof at dispatch time", false, true],
  ["Purpose-built for dump & aggregate hauling", false, true],
];

const PLANS = [
  { tier: "Starter", price: "$299/mo", sub: "Up to 50 carriers", color: "#38bdf8", highlight: false, note: "Continuous monitoring · dispatch holds · audit log" },
  { tier: "Growth", price: "$4 / carrier /mo", sub: "51–200 carriers", color: "#22c55e", highlight: true, note: "Everything in Starter · follow-up tasks · office assistant" },
  { tier: "Fleet", price: "$3 / carrier /mo", sub: "200+ carriers · custom", color: "#cbd5e1", highlight: false, note: "Volume pricing · universal cross-company board · priority support" },
];

const NAVY = "#0a1428", CARD = "#0f2039", ALT = "#0b1832", BORDER = "#1e3a5f", GREEN = "#22c55e", STEEL = "#cbd5e1", MUTED = "#8ea3c0";
const greenBtn = "linear-gradient(135deg,#16a34a,#15803d)";

export default function CarrierClearanceBureauPage() {
  const [trucks, setTrucks] = useState(120);
  const monthly = trucks <= 50 ? 299 : trucks <= 200 ? trucks * 4 : trucks * 3;
  const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const demo = "/request-demo?product=Carrier%20Clearance%20Bureau";

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: NAVY, color: "#fff", minHeight: "100vh" }}>

      {/* Sticky bar with logo lockup */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,20,40,0.94)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${BORDER}`, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CcbShield size={34} />
          <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "#fff" }}>Carrier Clearance Bureau<span style={{ color: STEEL, fontSize: "0.7em", verticalAlign: "super" }}>™</span></span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="#pricing" style={{ background: greenBtn, color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>See Pricing</Link>
          <Link href={demo} style={{ background: "transparent", color: MUTED, padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", border: `1px solid ${BORDER}` }}>Request Demo</Link>
        </div>
      </div>

      {/* Hero */}
      <section style={{ paddingTop: 108, paddingBottom: 72, paddingLeft: 32, paddingRight: 32, background: "linear-gradient(135deg,#0a1428 0%,#12294d 55%,#0d1d38 100%)", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 28, alignItems: "center", flexWrap: "wrap", marginBottom: 26 }}>
            <CcbShield size={112} />
            <CcbSeal size={116} />
          </div>
          <div style={{ display: "inline-block", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", color: "#86efac", padding: "6px 18px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 22 }}>
            Cleared to Move · Trusted to Deliver
          </div>
          <h1 style={{ margin: "0 0 18px", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-1.5px" }}>
            <span style={{ color: STEEL }}>Carrier Clearance</span> <span style={{ color: GREEN }}>Bureau</span><span style={{ color: "#fff" }}>™</span>
          </h1>
          <p style={{ margin: "0 auto 12px", fontSize: "clamp(1rem, 2vw, 1.25rem)", color: "#aebfd6", lineHeight: 1.6, maxWidth: 680 }}>
            Carrier clearance and compliance monitoring for dump, aggregate, and third-party haulers. Authority, insurance, and safety — watched continuously and tied straight to dispatch.
          </p>
          <p style={{ margin: "0 0 36px", fontSize: "0.95rem", color: GREEN, fontStyle: "italic", fontWeight: 600 }}>
            Only cleared carriers roll. Every decision logged. Every company protected.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#pricing" style={{ background: greenBtn, color: "#fff", padding: "16px 36px", borderRadius: 10, fontWeight: 800, fontSize: "1rem", textDecoration: "none" }}>See Pricing →</Link>
            <Link href={demo} style={{ background: "transparent", color: STEEL, padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", border: `1px solid ${BORDER}` }}>Request Demo</Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ background: ALT, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: "28px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
          {[["24/7", "Monitoring"], ["3", "Signals: authority · insurance · safety"], ["1", "Board for every carrier"], ["100%", "Audit-ready"]].map(([val, label]) => (
            <div key={label}><div style={{ fontSize: "2rem", fontWeight: 900, color: GREEN }}>{val}</div><div style={{ fontSize: "0.75rem", color: MUTED, marginTop: 2 }}>{label}</div></div>
          ))}
        </div>
      </section>

      {/* Mission cards */}
      <section style={{ padding: "72px 32px", background: NAVY }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: GREEN, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Why the Bureau Is Mission-Critical</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Clearance You Can Prove</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {MISSION_CARDS.map(card => (
              <div key={card.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px", borderLeft: `3px solid ${card.color}` }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 12 }}>{card.icon}</div>
                <h3 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#fff" }}>{card.title}</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: MUTED, lineHeight: 1.7 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section style={{ padding: "72px 32px", background: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>How It Works</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>From Onboard to Audit — Six Steps</h2>
          </div>
          {WORKFLOW.map((item, i) => (
            <div key={item.step} style={{ display: "flex", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: item.color, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.85rem" }}>{item.step}</div>
                {i < WORKFLOW.length - 1 && <div style={{ width: 2, flex: 1, background: BORDER, minHeight: 32, margin: "4px 0" }} />}
              </div>
              <div style={{ paddingBottom: i < WORKFLOW.length - 1 ? 28 : 0 }}>
                <h3 style={{ margin: "10px 0 8px", fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: MUTED, lineHeight: 1.7 }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Problems */}
      <section style={{ padding: "72px 32px", background: NAVY, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: "#f87171", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>What the Bureau Prevents</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>One Bad Carrier Is All It Takes</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {PROBLEMS.map((p, i) => (
              <div key={p.title} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px 28px", display: "flex", gap: 20 }}>
                <div style={{ fontSize: "2rem", flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ background: "#3a1520", color: "#f87171", padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 800 }}>RISK {i + 1}</span>
                    <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>{p.title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: MUTED, lineHeight: 1.7 }}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "72px 32px", background: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: GREEN, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Core Features</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Everything Clearance Needs</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", background: CARD, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                <span style={{ color: GREEN, fontSize: "0.8rem" }}>✓</span>
                <span style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built For */}
      <section style={{ padding: "56px 32px", background: NAVY, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ color: STEEL, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Built For</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {BUILT_FOR.map(t => <span key={t} style={{ background: CARD, border: `1px solid ${BORDER}`, color: MUTED, padding: "8px 18px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 600 }}>{t}</span>)}
          </div>
        </div>
      </section>

      {/* More than monitoring — comparison */}
      <section style={{ padding: "72px 32px", background: NAVY, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: GREEN, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>More Than Monitoring</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>We Do More — For Less</h2>
            <p style={{ margin: "10px auto 0", color: MUTED, fontSize: "0.86rem", maxWidth: 560 }}>Legacy services just watch documents. The Bureau turns clearance into action — and connects it to the load that's about to roll.</p>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px", background: ALT, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ padding: "13px 18px", fontSize: "0.72rem", fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em" }}>Capability</div>
              <div style={{ padding: "13px 10px", fontSize: "0.72rem", fontWeight: 800, color: MUTED, textAlign: "center" }}>Legacy monitor</div>
              <div style={{ padding: "13px 10px", fontSize: "0.72rem", fontWeight: 900, color: GREEN, textAlign: "center" }}>CCB Bureau</div>
            </div>
            {COMPARE.map(([cap, legacy, ccb], i) => (
              <div key={cap} style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px", borderBottom: i < COMPARE.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                <div style={{ padding: "12px 18px", fontSize: "0.84rem", color: "#e2e8f0" }}>{cap}</div>
                <div style={{ padding: "12px 10px", textAlign: "center", fontSize: "1rem", color: legacy ? "#64748b" : "#3a4a63" }}>{legacy ? "✓" : "—"}</div>
                <div style={{ padding: "12px 10px", textAlign: "center", fontSize: "1rem", color: GREEN, fontWeight: 900 }}>{ccb ? "✓" : "—"}</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px", background: "#0d2136", borderTop: `2px solid ${BORDER}`, alignItems: "center" }}>
              <div style={{ padding: "14px 18px", fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>Typical monthly cost</div>
              <div style={{ padding: "14px 10px", textAlign: "center", fontSize: "0.9rem", fontWeight: 800, color: "#f87171" }}>~$3,000</div>
              <div style={{ padding: "14px 10px", textAlign: "center", fontSize: "0.9rem", fontWeight: 900, color: GREEN }}>from $299</div>
            </div>
          </div>
          <p style={{ textAlign: "center", color: MUTED, fontSize: "0.72rem", marginTop: 12 }}>Comparison vs typical legacy carrier-monitoring services. Your price scales with fleet size.</p>
        </div>
      </section>

      {/* Pricing + estimator */}
      <section id="pricing" style={{ padding: "72px 32px", background: ALT, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: GREEN, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Pricing</div>
            <h2 style={{ margin: 0, fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>Simple, Per-Truck Pricing</h2>
            <p style={{ margin: "10px auto 0", color: MUTED, fontSize: "0.86rem", maxWidth: 520 }}>Scales with your fleet — a fraction of what legacy monitoring services charge.</p>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "26px 28px", marginBottom: 28, maxWidth: 620, margin: "0 auto 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <label style={{ color: "#aebfd6", fontSize: "0.82rem", fontWeight: 600 }}>How many carriers do you clear?</label>
              <span style={{ color: "#fff", fontWeight: 800 }}>{trucks} carriers</span>
            </div>
            <input type="range" min={5} max={1000} value={trucks} onChange={e => setTrucks(Number(e.target.value))} style={{ width: "100%", accentColor: GREEN }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
              <span style={{ color: "#aebfd6", fontSize: "0.85rem" }}>Estimated monthly</span>
              <span style={{ color: GREEN, fontWeight: 900, fontSize: "1.8rem" }}>{fmt(monthly)}<span style={{ fontSize: "0.9rem", color: MUTED, fontWeight: 600 }}>/mo</span></span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {PLANS.map(plan => (
              <div key={plan.tier} style={{ background: plan.highlight ? "#12294d" : CARD, border: `1.5px solid ${plan.highlight ? GREEN : BORDER}`, borderRadius: 16, padding: "28px 24px", boxShadow: plan.highlight ? "0 0 40px rgba(34,197,94,0.18)" : "none" }}>
                {plan.highlight && <div style={{ background: greenBtn, color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "3px 12px", borderRadius: 20, width: "fit-content", marginBottom: 16, letterSpacing: "0.08em" }}>MOST POPULAR</div>}
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>{plan.tier}</div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: plan.color, marginBottom: 6 }}>{plan.price}</div>
                <div style={{ fontSize: "0.78rem", color: "#aebfd6", marginBottom: 14 }}>{plan.sub}</div>
                <div style={{ fontSize: "0.72rem", color: MUTED, lineHeight: 1.7, marginBottom: 18 }}>{plan.note}</div>
                <Link href={demo} style={{ display: "block", background: plan.highlight ? greenBtn : BORDER, color: "#fff", textAlign: "center", padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>{plan.tier === "Fleet" ? "Contact Sales" : "Get Started"}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section style={{ padding: "80px 32px", background: "linear-gradient(135deg,#12294d 0%,#0d1d38 100%)", borderTop: `1px solid ${BORDER}`, textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><CcbShield size={64} /></div>
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(1.5rem, 3vw, 2.4rem)", fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>Never dispatch an uncleared carrier again.</h2>
          <p style={{ margin: "0 0 36px", fontSize: "0.95rem", color: "#aebfd6", lineHeight: 1.7 }}>Carrier Clearance Bureau™ keeps every carrier's authority, insurance, and safety current — and proves it when it matters.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={demo} style={{ background: greenBtn, color: "#fff", padding: "16px 40px", borderRadius: 10, fontWeight: 800, fontSize: "1rem", textDecoration: "none" }}>Request a Demo</Link>
            <Link href="/" style={{ background: "transparent", color: MUTED, padding: "16px 36px", borderRadius: 10, fontWeight: 700, fontSize: "1rem", textDecoration: "none", border: `1px solid ${BORDER}` }}>← Back to MoveAround</Link>
          </div>
        </div>
      </section>

    </div>
  );
}
