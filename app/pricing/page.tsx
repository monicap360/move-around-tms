"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";

const tiers = [
  {
    id: "OwnerOp",
    name: "Owner-Operator",
    price: "$89/mo flat",
    priceNote: "1–3 trucks, one flat rate",
    badge: null,
    features: [
      "Up to 3 trucks included",
      "Core dispatch + digital tickets",
      "Driver mobile app",
      "Basic invoicing (PDF, email)",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "Basic",
    name: "Starter",
    price: "$35/truck",
    priceNote: "4–10 trucks · month-to-month",
    badge: null,
    features: [
      "Everything in Owner-Operator",
      "Up to 10 trucks",
      "Pit invoice reconciliation",
      "QuickBooks export",
      "Email support",
    ],
    cta: "Start Starter",
  },
  {
    id: "Pro",
    name: "Professional",
    price: "$80/truck",
    priceNote: "Unlimited trucks · month-to-month",
    badge: "Most Popular",
    features: [
      "Everything in Starter",
      "Unlimited trucks",
      "Accounting Integration + IFTA",
      "Driver Payroll module",
      "Customer portal",
      "Phone support",
    ],
    cta: "Start Professional",
  },
  {
    id: "Enterprise",
    name: "Enterprise",
    price: "$120/truck",
    priceNote: "Unlimited trucks · annual",
    badge: null,
    features: [
      "All modules included",
      "Dedicated account manager",
      "Custom reporting + API access",
      "ELD integration",
      "Priority support",
    ],
    cta: "Contact Sales",
  },
];

const comparisonRows = [
  {
    category: "Pricing & Scale",
    feature: "Monthly Price",
    ownerOp: "$89 flat",
    starter: "$35/truck",
    professional: "$80/truck",
    enterprise: "$120/truck",
  },
  {
    category: "Pricing & Scale",
    feature: "Truck Limit",
    ownerOp: "1–3 trucks",
    starter: "Up to 10",
    professional: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    category: "Core System",
    feature: "Dispatch Board",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Digital Load Tickets + e‑Signature",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Driver Mobile App (Load → Haul → Dump → Return)",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Ticket Management + Ready‑to‑Invoice",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Basic Invoicing (PDF, Email, Mark Paid)",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Customer & Driver Directory",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Dashboard (Hauls, Revenue, Trucks)",
    ownerOp: "✅",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Pit Invoice Reconciliation",
    ownerOp: "—",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "QuickBooks Export",
    ownerOp: "—",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Accounting Integration",
    ownerOp: "—",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "IFTA Reporting",
    ownerOp: "—",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Vehicle Maintenance",
    ownerOp: "—",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Customer Portal",
    ownerOp: "—",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Driver Payroll",
    ownerOp: "—",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "ELD Integration",
    ownerOp: "—",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Advanced Dispatching",
    ownerOp: "—",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Material Inventory",
    ownerOp: "—",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Document Scanning (Rock Box)",
    ownerOp: "—",
    starter: "Add‑On",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Enterprise",
    feature: "Custom Reporting",
    ownerOp: "—",
    starter: "—",
    professional: "—",
    enterprise: "✅",
  },
  {
    category: "Enterprise",
    feature: "API Access",
    ownerOp: "—",
    starter: "—",
    professional: "—",
    enterprise: "✅",
  },
  {
    category: "Support",
    feature: "Support Level",
    ownerOp: "Email",
    starter: "Email",
    professional: "Phone",
    enterprise: "Dedicated AM",
  },
];

const addOns = [
  { name: "Accounting Integration", price: "+$50–100/month" },
  { name: "IFTA Reporting", price: "+$10–20/truck/month" },
  { name: "Document Scanning (Rock Box)", price: "+$30–50/month" },
  { name: "Vehicle Maintenance", price: "+$10–20/truck/month" },
  { name: "Driver Payroll", price: "+$5–10/driver/month" },
  { name: "ELD Integration", price: "+$10–20/truck/month" },
  { name: "Customer Portal", price: "+$50–200/month" },
  { name: "Advanced Dispatching", price: "+$30–100/month" },
  { name: "Material Inventory", price: "+$50–150/month" },
];

const competitiveRows = [
  {
    factor: "Core Design Purpose",
    generic: "Brokerage and general freight",
    telematics: "Mixed fleet asset tracking",
    accounting: "Bookkeeping and compliance",
    movearound: "Dirt and aggregate hauling operations",
  },
  {
    factor: "Primary Value Metric",
    generic: "Per shipment",
    telematics: "Per asset",
    accounting: "Per truck (bundled)",
    movearound: "Per truck + operational intelligence",
  },
  {
    factor: "Load Ticket Focus",
    generic: "BOLs, POs, commodity",
    telematics: "Maintenance, hours, location",
    accounting: "Basic dispatch info",
    movearound: "Material type, tons/yards, pit-to-site",
  },
  {
    factor: "Job Costing",
    generic: "By customer or lane",
    telematics: "By project (heavy)",
    accounting: "Basic P&L",
    movearound: "By material, job site, haul cycle",
  },
  {
    factor: "Key Integrations",
    generic: "Load boards, ELDs",
    telematics: "Telematics, ERP",
    accounting: "Accounting, IFTA",
    movearound: "Scale APIs, quarry systems, QuickBooks",
  },
  {
    factor: "Ideal Customer",
    generic: "3PLs, brokers",
    telematics: "Large construction fleets",
    accounting: "Small trucking companies",
    movearound: "Aggregate producers and dump fleets",
  },
  {
    factor: "Mobile Experience",
    generic: "Driver status updates",
    telematics: "Inspections, logs",
    accounting: "Hours and expenses",
    movearound: "Ticket signing, site check-ins",
  },
  {
    factor: "Reporting",
    generic: "Shipment history",
    telematics: "Asset utilization",
    accounting: "Profit and tax reports",
    movearound: "Revenue per ton, pit vs site idle time",
  },
  {
    factor: "Pricing Transparency",
    generic: "Complex, often custom",
    telematics: "High, enterprise-focused",
    accounting: "Low, add-ons pile up",
    movearound: "Simple per-truck pricing",
  },
];


export default function PricingPage() {
  const [plan, setPlan] = useState<"OwnerOp" | "Basic" | "Pro" | "Enterprise">("OwnerOp");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/plan");
        if (!res.ok) return;
        const json = await res.json();
        if (json.plan) setPlan(json.plan);
      } catch {
        // API unavailable — default plan stays set
      }
    })();
  }, []);

  async function upgrade(newPlan: "OwnerOp" | "Basic" | "Pro" | "Enterprise") {
    setSaving(true);
    const res = await fetch("/api/admin/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ""}`,
      },
      body: JSON.stringify({ plan: newPlan }),
    });
    const json = await res.json();
    if (json.plan) setPlan(json.plan);
    setSaving(false);
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
      color: "#ffffff",
      minHeight: "100vh",
      padding: "2rem 1rem",
      fontFamily: "Poppins, sans-serif"
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        paddingTop: "2rem",
        paddingBottom: "2rem"
      }}>
        <div style={{ marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#F7931E", marginBottom: "0.5rem" }}>
            MoveAround TMS Pricing
          </h1>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)" }}>
            Built for dirt, sand, and aggregate haulers.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "2rem",
          marginBottom: "3rem"
        }}>
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={`relative flex flex-col ${plan === t.id ? "ring-2 ring-orange-400" : ""}`}
              style={{
                background: t.badge ? "rgba(247,147,30,0.08)" : "rgba(30, 30, 30, 0.8)",
                border: t.badge ? "2px solid rgba(247,147,30,0.6)" : "1px solid rgba(247, 147, 30, 0.3)",
                borderRadius: "12px",
                position: "relative"
              }}
            >
              {t.badge && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#F7931E", color: "#000", fontWeight: 800, fontSize: "0.72rem",
                  letterSpacing: "0.08em", padding: "3px 12px", borderRadius: 20,
                  textTransform: "uppercase", whiteSpace: "nowrap"
                }}>
                  {t.badge}
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-baseline justify-between" style={{ color: "#F7931E", fontSize: "1.3rem" }}>
                  <span style={{ color: "#ffffff" }}>{t.name}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#F7931E" }}>{t.price}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", fontWeight: 400 }}>{t.priceNote}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <ul style={{ paddingLeft: 0, marginBottom: "1.5rem", listStylePosition: "inside" }}>
                  {t.features.map((f) => (
                    <li key={f} style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", marginBottom: "0.5rem" }}>
                      • {f}
                    </li>
                  ))}
                </ul>
                {t.name === "Enterprise" ? (
                  <Button
                    className="w-full min-w-0"
                    style={{
                      background: "rgba(247, 147, 30, 0.2)",
                      color: "#F7931E",
                      border: "1px solid #F7931E",
                      padding: "0.5rem 0.875rem",
                      fontSize: "0.875rem"
                    }}
                    onClick={() => alert("We will reach out to you shortly.")}
                  >
                    {t.cta}
                  </Button>
                ) : (
                  <Button
                    className="w-full min-w-0"
                    style={{
                      background: "#F7931E",
                      color: "#000000",
                      border: "none",
                      padding: "0.5rem 0.875rem",
                      fontSize: "0.875rem",
                      cursor: "pointer"
                    }}
                    disabled={plan === t.id || saving}
                    onClick={() => upgrade(t.id as any)}
                  >
                    {plan === t.id ? "Current Plan" : t.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 600, color: "#F7931E", marginBottom: "1rem" }}>Tier Comparison</h2>
          <div style={{ overflowX: "auto", border: "1px solid rgba(247, 147, 30, 0.3)", borderRadius: "8px" }}>
            <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(0, 0, 0, 0.4)" }}>
                <tr>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>
                    Feature
                  </th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>
                    Owner-Op
                  </th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>
                    Starter
                  </th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>
                    Professional
                  </th>
                  <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E" }}>
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr
                    key={`${row.category}-${row.feature}-${index}`}
                    style={{
                      background: index % 2 === 0 ? "rgba(30,30,30,0.4)" : "rgba(20,20,20,0.4)",
                      borderBottom: "1px solid rgba(247, 147, 30, 0.1)"
                    }}
                  >
                    <td style={{ padding: "0.875rem 1rem", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>
                      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "rgba(255,215,0,0.6)", marginBottom: "0.3rem" }}>
                        {row.category}
                      </div>
                      <div style={{ fontWeight: 500, color: "#ffffff" }}>
                        {row.feature}
                      </div>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.8)", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>{(row as any).ownerOp ?? "—"}</td>
                    <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.8)", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>{row.starter}</td>
                    <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.8)", borderRight: "1px solid rgba(247, 147, 30, 0.2)" }}>{row.professional}</td>
                    <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.8)" }}>{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#F7931E", marginBottom: "1rem" }}>Optional Add-Ons</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {addOns.map((addon) => (
              <div key={addon.name} style={{ background: "rgba(20,20,20,0.6)", border: "1px solid rgba(247,147,30,0.12)", borderRadius: 10 }}>
                <div style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff" }}>{addon.name}</div>
                  <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.75)" }}>{addon.price}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginTop: "0.75rem" }}>Add-ons can be layered on any tier.</p>
        </div>

        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#F7931E" }}>Onboarding Strategy</h2>
            <ul style={{ marginTop: "0.75rem", paddingLeft: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              <li>30‑day free trial: Core system only</li>
              <li>Week 3: "Here's how Accounting Integration would save you ~2 hours/week."</li>
              <li>Month 2: Offer the first module at 50% off for 3 months</li>
              <li>Month 4–6: Recommend the next logical module based on usage</li>
            </ul>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#F7931E" }}>Retention Strategy</h2>
            <ul style={{ marginTop: "0.75rem", paddingLeft: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              <li>Modules create stickiness (QuickBooks connection is hard to leave)</li>
              <li>Each module adds new value threads across the operation</li>
              <li>Annual contracts: 2 months free with yearly commitment</li>
            </ul>
          </div>

          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#F7931E" }}>Market Reality Check</h2>
            <ul style={{ marginTop: "0.75rem", paddingLeft: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              <li>New companies (1–3 trucks): start with core</li>
              <li>Growing companies (3–10 trucks): core + 2–4 modules</li>
              <li>
                Established companies switching from paper/spreadsheets: bundle tiers and
                enterprise support to make switching painless
              </li>
            </ul>
          </div>
        </section>

        <section style={{ marginBottom: "2.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 600, color: "#F7931E" }}>
              Competitive Analysis: Who Has These Features?
            </h2>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)", marginTop: "0.5rem" }}>
              Many platforms offer dispatch, tracking, and documents. The gap is not
              features alone. It is focus. MoveAround TMS is built for material hauling
              workflows, not general freight or construction ERP.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <Card style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(247,147,30,0.3)", borderRadius: 10 }}>
              <CardContent style={{ padding: "1rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.4rem" }}>
                  1) Generic TMS Giants
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>
                  Examples: Rose Rocket, Tailwind (Motive), AscendTMS, Truckstop.
                  They have dispatch and tracking, but are built for brokerage and
                  general freight, not material cycles.
                </div>
              </CardContent>
            </Card>
            <Card style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(247,147,30,0.3)", borderRadius: 10 }}>
              <CardContent style={{ padding: "1rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.4rem" }}>
                  2) Construction Telematics Platforms
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>
                  Examples: Tenna, SiteTrax, Flexbase, HCSS. Strong asset tracking,
                  but dispatch is not a dedicated TMS workflow.
                </div>
              </CardContent>
            </Card>
            <Card style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(247,147,30,0.3)", borderRadius: 10 }}>
              <CardContent style={{ padding: "1rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.4rem" }}>
                  3) Trucking Accounting Suites
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>
                  Examples: TruckingOffice, Axon, TruckBytes. Accounting-first with
                  dispatch added on, often generic and clunky for aggregates.
                </div>
              </CardContent>
            </Card>
            <Card style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(247,147,30,0.3)", borderRadius: 10 }}>
              <CardContent style={{ padding: "1rem" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.4rem" }}>
                  4) Direct Niche Competitors
                </div>
                <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>
                  Examples: RuckShuk, LoadMaster, TruckIT. Often legacy systems with
                  weaker UX. A modern, cloud-native alternative wins.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card style={{ background: "rgba(30,30,30,0.8)", border: "1px solid rgba(247,147,30,0.3)", borderRadius: 10, marginBottom: "1.5rem" }}>
            <CardContent style={{ padding: "1rem" }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#F7931E", marginBottom: "0.5rem" }}>
                The Sweet Spot
              </div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                {`Telematics and Asset Tracking (Tenna, Samsara)
          |
          |
Generic TMS ---- MoveAround TMS ---- Construction ERP
(Rose Rocket)     (movearoundtms.com) (HCSS, Procore)
          |
          |
   Accounting Suites (TruckingOffice, QuickBooks)`}
              </div>
            </CardContent>
          </Card>

          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#F7931E", marginBottom: "0.75rem" }}>
              Unfair Advantage
            </h3>
            <ul style={{ paddingLeft: 18, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, fontSize: "0.95rem" }}>
              <li>Industry-tailored UX that defaults to material and job site.</li>
              <li>Frictionless core loop: ticket to dispatch to invoice in minutes.</li>
              <li>Smart integrations: QuickBooks, Geotab, scale APIs.</li>
              <li>Content, support, and case studies focused on material haulers.</li>
            </ul>
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#F7931E", marginBottom: "0.75rem" }}>
              Competitive Differentiation Matrix
            </h3>
            <div style={{ overflowX: "auto", border: "1px solid rgba(247,147,30,0.3)", borderRadius: "8px" }}>
              <table style={{ width: "100%", fontSize: "0.9rem", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgba(0,0,0,0.4)" }}>
                  <tr>
                    <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247,147,30,0.2)" }}>
                      Buying Factor
                    </th>
                    <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247,147,30,0.2)" }}>
                      Generic TMS
                    </th>
                    <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247,147,30,0.2)" }}>
                      Telematics
                    </th>
                    <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E", borderRight: "1px solid rgba(247,147,30,0.2)" }}>
                      Accounting Suite
                    </th>
                    <th style={{ padding: "0.875rem 1rem", textAlign: "left", fontWeight: 600, color: "#F7931E" }}>
                      MoveAround TMS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {competitiveRows.map((row, index) => (
                    <tr
                      key={`${row.factor}-${index}`}
                      style={{
                        background: index % 2 === 0 ? "rgba(30,30,30,0.4)" : "rgba(20,20,20,0.4)",
                        borderBottom: "1px solid rgba(247,147,30,0.1)"
                      }}
                    >
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 500, color: "#ffffff", borderRight: "1px solid rgba(247,147,30,0.2)" }}>
                        {row.factor}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.75)", borderRight: "1px solid rgba(247,147,30,0.2)" }}>{row.generic}</td>
                      <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.75)", borderRight: "1px solid rgba(247,147,30,0.2)" }}>{row.telematics}</td>
                      <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.75)", borderRight: "1px solid rgba(247,147,30,0.2)" }}>{row.accounting}</td>
                      <td style={{ padding: "0.875rem 1rem", color: "rgba(255,255,255,0.75)" }}>{row.movearound}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#F7931E", marginBottom: "0.75rem" }}>
              Proof Over Promises
            </h3>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}>
              We built MoveAround TMS specifically for material haulers. The workflow
              defaults to material type, tons/yards, and pit-to-site cycles so teams
              stop forcing a general freight tool to fit their daily work.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
