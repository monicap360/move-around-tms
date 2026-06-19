"use client";

import Link from "next/link";

// ─── Step Data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: "01",
    color: "#22d3ee",
    title: "Load Created",
    subtitle: "Dispatch creates or imports the job with every detail attached before the first truck moves.",
    icon: "📋",
    fields: [
      { label: "Customer",         example: "Martin Marietta" },
      { label: "Project",          example: "I-10 Expansion — Phase 2" },
      { label: "Pit / Quarry",     example: "Katy Pit — Lane 3" },
      { label: "Material",         example: "Crushed limestone, 1.5\"" },
      { label: "Driver",           example: "Carlos M." },
      { label: "Truck",            example: "TRK-18 · 2022 Kenworth T880" },
      { label: "Target tons",      example: "22.5 tons" },
      { label: "Customer rate",    example: "$18.50 / ton" },
      { label: "Driver pay rate",  example: "$9.00 / ton" },
    ],
    flags: [],
    result: "Every load starts with a verified job record — no load without an assignment.",
  },
  {
    num: "02",
    color: "#fbbf24",
    title: "Scale Weight Captured",
    subtitle: "The pit or scale house captures the gross and tare weights. AccuriScale links the weight directly to the dispatch job.",
    icon: "⚖️",
    fields: [
      { label: "Gross weight",  example: "47,200 lbs" },
      { label: "Tare weight",   example: "26,600 lbs" },
      { label: "Net tons",      example: "10.27 tons (below 22.5t target)" },
      { label: "Scale operator",example: "S. Johnson" },
      { label: "Scale location",example: "Pit 3 — Bay 2" },
      { label: "Timestamp",     example: "2026-06-14 10:42 AM" },
    ],
    flags: [
      { icon: "🔴", label: "No scale weight",           desc: "Ticket moves to manual review" },
      { icon: "🔴", label: "Weight below tolerance",    desc: "AccuriScale flags potential short load" },
      { icon: "🟡", label: "Weight above tolerance",    desc: "Overweight alert — permit review" },
      { icon: "🔴", label: "Manual override used",      desc: "Logged and flagged for supervisor review" },
      { icon: "🔴", label: "Scale operator edit detected", desc: "Immutable log entry created" },
    ],
    result: "Scale data is captured, timestamped, and linked before the driver leaves the pit.",
  },
  {
    num: "03",
    color: "#86efac",
    title: "TicketFlash OCR Reads Ticket",
    subtitle: "The driver, office, or scanner uploads the paper ticket. TicketFlash OCR extracts every field automatically.",
    icon: "📷",
    fields: [
      { label: "Ticket number",  example: "TKT-004921" },
      { label: "Ticket date",    example: "June 14, 2026" },
      { label: "Truck number",   example: "TRK-18" },
      { label: "Driver",         example: "Carlos M." },
      { label: "Material",       example: "Crushed limestone" },
      { label: "Gross weight",   example: "47,200 lbs" },
      { label: "Tare weight",    example: "26,600 lbs" },
      { label: "Net tons",       example: "10.27" },
      { label: "Pit name",       example: "Katy Pit" },
      { label: "Customer",       example: "Martin Marietta" },
      { label: "Project",        example: "I-10 Phase 2" },
      { label: "Signature",      example: "✓ Captured" },
    ],
    flags: [],
    result: "Paper tickets become structured digital records in seconds — no manual re-entry.",
  },
  {
    num: "04",
    color: "#a78bfa",
    title: "AccuriScale Matches Everything",
    subtitle: "The system runs automated matching across dispatch, scale data, OCR ticket, payroll, and invoice records simultaneously.",
    icon: "🔗",
    fields: [],
    matchRules: [
      { label: "Ticket number match",  pass: true  },
      { label: "Truck match",          pass: true  },
      { label: "Driver match",         pass: true  },
      { label: "Project match",        pass: true  },
      { label: "Material match",       pass: true  },
      { label: "Weight tolerance",     pass: false, note: "Net tons 10.27 vs 22.5t target — SHORT LOAD FLAG" },
      { label: "Duplicate ticket check",pass: true },
      { label: "Rate check",           pass: true  },
      { label: "Billing status",       pass: null, note: "Pending — held for exception review" },
      { label: "Payroll status",       pass: null, note: "Pending — held for exception review" },
    ],
    flags: [],
    result: "Every load is cross-referenced in seconds. No manual spreadsheet matching needed.",
  },
  {
    num: "05",
    color: "#f87171",
    title: "Exceptions Are Flagged",
    subtitle: "Problem loads go to a dedicated review queue before payroll or billing processes. Nothing slips through.",
    icon: "🚨",
    fields: [],
    exceptionExamples: [
      { icon: "🔴", label: "Short load",                 example: "Net tons 10.27 vs 22.5t — dispatch hold" },
      { icon: "🔴", label: "Missing ticket",             example: "Load TRK-18 · 2:15 PM — no ticket uploaded" },
      { icon: "🔴", label: "Duplicate ticket",           example: "TKT-004888 submitted twice" },
      { icon: "🟡", label: "Weight mismatch",            example: "Scale 22.1t · OCR reads 21.8t · variance 0.3t" },
      { icon: "🔴", label: "Manual scale override",      example: "Override by S. Johnson at 11:05 AM — flagged" },
      { icon: "🟡", label: "Driver / truck mismatch",    example: "Carlos M. checked out TRK-22, ticket shows TRK-18" },
      { icon: "🟡", label: "Material mismatch",          example: "Dispatched limestone — ticket shows gravel" },
      { icon: "🔴", label: "Rate mismatch",              example: "Billed $19.50/ton · contract rate $18.50/ton" },
      { icon: "🟡", label: "Unbilled accessorial",       example: "Wait time 1.5 hrs detected — not on invoice" },
      { icon: "🔴", label: "Payroll hold",               example: "Ticket held — exception requires approval" },
      { icon: "🔴", label: "Billing hold",               example: "Held until exception resolved" },
    ],
    flags: [],
    result: "Flagged loads wait in review. Nothing reaches payroll or billing until approved.",
  },
  {
    num: "06",
    color: "#22d3ee",
    title: "Clean Loads Move to Pay & Bill",
    subtitle: "Verified tickets advance automatically. Exceptions stay in the queue until a supervisor resolves them.",
    icon: "✅",
    fields: [],
    outcomes: [
      { icon: "💵", label: "Payroll has proof",              desc: "Every driver pay line is backed by a matched ticket" },
      { icon: "📄", label: "Billing has proof",              desc: "Every invoice is backed by verified scale and OCR data" },
      { icon: "🤝", label: "Customer disputes are reduced",  desc: "Disputes arrive with matched documentation ready" },
      { icon: "⏱️", label: "Office time is saved",           desc: "Automation replaces hours of manual reconciliation daily" },
      { icon: "🛡️", label: "Revenue leakage is flagged early", desc: "Short loads and missed billing caught before close" },
    ],
    flags: [],
    result: "AccuriScale moves clean, verified loads forward. Everything else waits for a human decision.",
  },
];

// ─── Product Card (for sales website embedding) ───────────────────────────────

function ProductCard() {
  return (
    <div style={{ background: "#0a0f1e", border: "1.5px solid #22d3ee", borderRadius: 16, padding: "28px 24px", maxWidth: 380 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <div style={{ background: "rgba(34,211,238,0.1)", borderRadius: 10, padding: "8px 10px", fontSize: "1.3rem" }}>⚖️</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff" }}>AccuriScale Intelligence™</div>
          <div style={{ fontSize: "0.72rem", color: "#22d3ee" }}>For aggregate and bulk material haulers.</div>
        </div>
      </div>
      <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.7 }}>
        Verify every load from pit scale to ticket, payroll, invoice, and audit packet.
      </p>
      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: 12 }}>Best for: Dump trucks, quarries, pits, bulk material haulers, brokers, and owner operator networks.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
        {["Short-load detection","TicketFlash OCR","Scale ticket matching","Fraud pattern alerts","Production tracking","Payroll & billing holds","Invoice reconciliation"].map(f => (
          <div key={f} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.78rem", color: "#e2e8f0" }}>
            <span style={{ color: "#22d3ee" }}>✓</span>{f}
          </div>
        ))}
      </div>
      <Link href="/products/accuriscale-intelligence/walkthrough"
        style={{ display: "block", background: "#dc2626", color: "#fff", textAlign: "center", padding: "11px 0", borderRadius: 9, fontWeight: 800, fontSize: "0.85rem", textDecoration: "none" }}>
        Walk Through →
      </Link>
    </div>
  );
}

// ─── Walk-Through Page ────────────────────────────────────────────────────────

export default function AccuriScaleWalkthroughPage() {
  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#020817", color: "#fff", minHeight: "100vh" }}>

      {/* Nav */}
      <div style={{ padding: "16px 32px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/products/accuriscale-intelligence" style={{ color: "#94a3b8", fontSize: "0.82rem", textDecoration: "none", display: "flex", gap: 6, alignItems: "center" }}>
          ← AccuriScale Intelligence™
        </Link>
        <Link href="#demo"
          style={{ background: "#dc2626", color: "#fff", padding: "8px 20px", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", textDecoration: "none" }}>
          Request Demo
        </Link>
      </div>

      {/* Hero */}
      <section style={{ padding: "64px 32px 48px", textAlign: "center", background: "linear-gradient(to bottom, #040c18, #020817)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)",
            color: "#22d3ee", padding: "5px 16px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: 20 }}>
            AccuriScale Walk Through
          </div>
          <h1 style={{ margin: "0 0 14px", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, lineHeight: 1.1 }}>
            See How Every Load Moves<br />
            <span style={{ color: "#22d3ee" }}>From Pit Scale to Final Pay</span>
          </h1>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#64748b", lineHeight: 1.7 }}>
            Every ton verified. Every ticket matched. Every dollar protected.
          </p>
        </div>

        {/* Step progress dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <a key={s.num} href={`#step-${s.num}`} style={{ textDecoration: "none" }}>
              <div style={{ background: s.color, color: "#000", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.72rem", cursor: "pointer" }}>
                {s.num}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Steps */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 32px 80px" }}>
        {STEPS.map((step, idx) => (
          <div key={step.num} id={`step-${step.num}`} style={{ marginBottom: 48 }}>
            {/* Step header */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", marginBottom: 24, paddingTop: 48, borderTop: idx === 0 ? "none" : "1px solid #1e293b" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: `rgba(${step.color === "#22d3ee" ? "34,211,238" : step.color === "#fbbf24" ? "251,191,36" : step.color === "#86efac" ? "134,239,172" : step.color === "#a78bfa" ? "167,139,250" : step.color === "#f87171" ? "248,113,113" : "34,211,238"},0.12)`, border: `1.5px solid ${step.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0 }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ background: step.color, color: "#000", padding: "3px 12px", borderRadius: 20, fontWeight: 900, fontSize: "0.72rem" }}>STEP {step.num}</span>
                  <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, color: "#fff" }}>{step.title}</h2>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.7 }}>{step.subtitle}</p>
              </div>
            </div>

            {/* Fields grid */}
            {(step.fields ?? []).length > 0 && (
              <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                  {step.num === "01" ? "Job fields" : step.num === "02" ? "Scale data captured" : step.num === "03" ? "OCR-extracted fields" : "Fields"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {step.fields.map(f => (
                    <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</span>
                      <span style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>{f.example}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Match rules */}
            {"matchRules" in step && Array.isArray(step.matchRules) && step.matchRules.length > 0 && (
              <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Matching rules</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {step.matchRules.map((r: { label: string; pass: boolean | null; note?: string }) => (
                    <div key={r.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>
                        {r.pass === true ? "✅" : r.pass === false ? "🔴" : "🟡"}
                      </span>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 600 }}>{r.label}</span>
                        {r.note && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>{r.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exception examples */}
            {"exceptionExamples" in step && Array.isArray(step.exceptionExamples) && step.exceptionExamples.length > 0 && (
              <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Exception examples</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {step.exceptionExamples.map((ex: { icon: string; label: string; example: string }) => (
                    <div key={ex.label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{ex.icon}</span>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 700 }}>{ex.label}: </span>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{ex.example}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flags */}
            {step.flags.length > 0 && (
              <div style={{ background: "#0c0a0a", border: "1px solid #2d1515", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Flags at this step</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {step.flags.map((f: { icon: string; label: string; desc: string }) => (
                    <div key={f.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.9rem" }}>{f.icon}</span>
                      <div>
                        <span style={{ fontSize: "0.82rem", color: "#e2e8f0", fontWeight: 700 }}>{f.label}: </span>
                        <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{f.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outcomes (step 6) */}
            {"outcomes" in step && Array.isArray(step.outcomes) && step.outcomes.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
                {step.outcomes.map((o: { icon: string; label: string; desc: string }) => (
                  <div key={o.label} style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 10, padding: "16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: "1.2rem" }}>{o.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>{o.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{o.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Result */}
            <div style={{ background: `rgba(${step.color === "#22d3ee" ? "34,211,238" : step.color === "#fbbf24" ? "251,191,36" : step.color === "#86efac" ? "134,239,172" : step.color === "#a78bfa" ? "167,139,250" : step.color === "#f87171" ? "248,113,113" : "34,211,238"},0.06)`,
              border: `1px solid ${step.color}30`, borderRadius: 10, padding: "14px 18px", fontSize: "0.82rem", color: "#e2e8f0", fontStyle: "italic" }}>
              ✓ {step.result}
            </div>
          </div>
        ))}

        {/* Summary / CTA */}
        <div style={{ background: "#0a0f1e", border: "1.5px solid #22d3ee", borderRadius: 18, padding: "36px 32px", textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 14 }}>✅</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>
            From Pit Scale to Final Pay — Every Load Verified
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 28px" }}>
            AccuriScale Intelligence™ replaces manual ticket matching, catches short loads and fraud, and gives your office real-time visibility from dispatch to invoice.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="#demo"
              style={{ background: "#dc2626", color: "#fff", padding: "14px 36px", borderRadius: 9, fontWeight: 800, fontSize: "0.9rem", textDecoration: "none" }}>
              Request Demo
            </Link>
            <Link href="/products/accuriscale-intelligence"
              style={{ background: "transparent", color: "#94a3b8", padding: "14px 28px", borderRadius: 9, fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", border: "1px solid #334155" }}>
              See Full Product Page
            </Link>
          </div>
        </div>

        {/* Product Card preview */}
        <div style={{ marginTop: 64, paddingTop: 48, borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Sales Website Product Card</div>
          <ProductCard />
        </div>

      </div>

      {/* Demo CTA */}
      <section id="demo" style={{ padding: "72px 32px", background: "#040c18", borderTop: "1px solid #1e293b", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#fff" }}>
            Stop losing money between the pit, the ticket, payroll, and the invoice.
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: "0.9rem", color: "#64748b" }}>
            AccuriScale gives your operation the proof, automation, and visibility needed to protect every load.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="mailto:demo@movearoundtms.com?subject=AccuriScale Intelligence Demo"
              style={{ background: "#dc2626", color: "#fff", padding: "14px 36px", borderRadius: 9, fontWeight: 800, fontSize: "0.9rem", textDecoration: "none" }}>
              Request Demo
            </Link>
            <Link href="/products/accuriscale-intelligence"
              style={{ background: "transparent", color: "#94a3b8", padding: "14px 28px", borderRadius: 9, fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", border: "1px solid #334155" }}>
              ← Full Product Page
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
