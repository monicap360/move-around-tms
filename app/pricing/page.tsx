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
    id: "Basic",
    name: "Starter",
    price: "$50/truck",
    features: ["Core system only", "5 trucks max", "Email support"],
    cta: "Start Starter",
  },
  {
    id: "Pro",
    name: "Professional",
    price: "$80/truck",
    features: [
      "Core + Accounting, IFTA, Maintenance",
      "Unlimited trucks",
      "Phone support",
      "Customer portal included",
    ],
    cta: "Start Professional",
  },
  {
    id: "Enterprise",
    name: "Enterprise",
    price: "$120/truck",
    features: ["All modules included", "Dedicated account manager", "Custom reporting", "API access"],
    cta: "Contact Sales",
  },
];

const comparisonRows = [
  {
    category: "Pricing & Scale",
    feature: "Monthly Price",
    starter: "$50/truck",
    professional: "$80/truck",
    enterprise: "$120/truck",
  },
  {
    category: "Pricing & Scale",
    feature: "Truck Limit",
    starter: "Up to 5",
    professional: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    category: "Core System",
    feature: "Dispatch Board",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Digital Load Tickets + e‑Signature",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Driver Mobile App (Load → Haul → Dump → Return)",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Ticket Management + Ready‑to‑Invoice",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Basic Invoicing (PDF, Email, Mark Paid)",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Customer & Driver Directory",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Core System",
    feature: "Dashboard (Hauls, Revenue, Trucks)",
    starter: "✅",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Accounting Integration",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "IFTA Reporting",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Vehicle Maintenance",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Customer Portal",
    starter: "—",
    professional: "✅",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Driver Payroll",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "ELD Integration",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Advanced Dispatching",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Material Inventory",
    starter: "—",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Included Modules",
    feature: "Document Scanning (Rock Box)",
    starter: "Add‑On",
    professional: "Add‑On",
    enterprise: "✅",
  },
  {
    category: "Enterprise",
    feature: "Custom Reporting",
    starter: "—",
    professional: "—",
    enterprise: "✅",
  },
  {
    category: "Enterprise",
    feature: "API Access",
    starter: "—",
    professional: "—",
    enterprise: "✅",
  },
  {
    category: "Support",
    feature: "Support Level",
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
  const [plan, setPlan] = useState<"Basic" | "Pro" | "Enterprise">("Basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/plan");
      const json = await res.json();
      if (json.plan) setPlan(json.plan);
    })();
  }, []);

  async function upgrade(newPlan: "Basic" | "Pro" | "Enterprise") {
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
    <div className="p-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          MoveAround TMS Pricing
        </h1>
        <p className="text-gray-600 mt-1">
          Built for dirt, sand, and aggregate haulers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <Card
            key={t.name}
            className={`relative ${plan === t.name ? "ring-2 ring-blue-500" : ""}`}
          >
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between">
                <span>{t.name}</span>
                <span className="text-xl font-bold">{t.price}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-4">
                {t.features.map((f) => (
                  <li key={f} className="text-sm text-gray-700">
                    • {f}
                  </li>
                ))}
              </ul>
              {t.name === "Enterprise" ? (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => alert("We will reach out to you shortly.")}
                >
                  {t.cta}
                </Button>
              ) : (
                <Button
                  className="w-full"
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

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">Tier Comparison</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Feature
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Starter
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Professional
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, index) => (
                <tr
                  key={`${row.category}-${row.feature}-${index}`}
                  className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3">
                    <div className="text-xs uppercase text-gray-400">
                      {row.category}
                    </div>
                    <div className="font-medium text-gray-800">
                      {row.feature}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.starter}</td>
                  <td className="px-4 py-3 text-gray-700">{row.professional}</td>
                  <td className="px-4 py-3 text-gray-700">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">Optional Add-Ons</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addOns.map((addon) => (
            <Card key={addon.name} className="border border-gray-200">
              <CardContent className="py-4">
                <div className="text-sm font-medium text-gray-800">
                  {addon.name}
                </div>
                <div className="text-sm text-gray-600">{addon.price}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-gray-500">Add-ons can be layered on any tier.</p>
      </div>

      <section className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-800">Onboarding Strategy</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>30‑day free trial: Core system only</li>
            <li>Week 3: “Here’s how Accounting Integration would save you ~2 hours/week.”</li>
            <li>Month 2: Offer the first module at 50% off for 3 months</li>
            <li>Month 4–6: Recommend the next logical module based on usage</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-800">Retention Strategy</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Modules create stickiness (QuickBooks connection is hard to leave)</li>
            <li>Each module adds new value threads across the operation</li>
            <li>Annual contracts: 2 months free with yearly commitment</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-gray-800">Market Reality Check</h2>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>New companies (1–3 trucks): start with core</li>
            <li>Growing companies (3–10 trucks): core + 2–4 modules</li>
            <li>
              Established companies switching from paper/spreadsheets: bundle tiers and
              enterprise support to make switching painless
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-800">
            Competitive Analysis: Who Has These Features?
          </h2>
          <p className="text-gray-600">
            Many platforms offer dispatch, tracking, and documents. The gap is not
            features alone. It is focus. MoveAround TMS is built for material hauling
            workflows, not general freight or construction ERP.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-gray-200">
            <CardContent className="py-4 space-y-2">
              <div className="text-sm font-semibold text-gray-800">
                1) Generic TMS Giants
              </div>
              <div className="text-sm text-gray-600">
                Examples: Rose Rocket, Tailwind (Motive), AscendTMS, Truckstop.
                They have dispatch and tracking, but are built for brokerage and
                general freight, not material cycles.
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="py-4 space-y-2">
              <div className="text-sm font-semibold text-gray-800">
                2) Construction Telematics Platforms
              </div>
              <div className="text-sm text-gray-600">
                Examples: Tenna, SiteTrax, Flexbase, HCSS. Strong asset tracking,
                but dispatch is not a dedicated TMS workflow.
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="py-4 space-y-2">
              <div className="text-sm font-semibold text-gray-800">
                3) Trucking Accounting Suites
              </div>
              <div className="text-sm text-gray-600">
                Examples: TruckingOffice, Axon, TruckBytes. Accounting-first with
                dispatch added on, often generic and clunky for aggregates.
              </div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="py-4 space-y-2">
              <div className="text-sm font-semibold text-gray-800">
                4) Direct Niche Competitors
              </div>
              <div className="text-sm text-gray-600">
                Examples: RuckShuk, LoadMaster, TruckIT. Often legacy systems with
                weaker UX. A modern, cloud-native alternative wins.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="py-4 space-y-2">
            <div className="text-sm font-semibold text-gray-800">
              The Sweet Spot
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-wrap">
              Telematics and Asset Tracking (Tenna, Samsara)
                        |
                        |
              Generic TMS ---- MoveAround TMS ---- Construction ERP
              (Rose Rocket)     (movearoundtms.com) (HCSS, Procore)
                        |
                        |
                 Accounting Suites (TruckingOffice, QuickBooks)
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">
            Unfair Advantage
          </h3>
          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>Industry-tailored UX that defaults to material and job site.</li>
            <li>Frictionless core loop: ticket to dispatch to invoice in minutes.</li>
            <li>Smart integrations: QuickBooks, Geotab, scale APIs.</li>
            <li>Content, support, and case studies focused on material haulers.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">
            Competitive Differentiation Matrix
          </h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Buying Factor
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Generic TMS
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Telematics
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    Accounting Suite
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">
                    MoveAround TMS
                  </th>
                </tr>
              </thead>
              <tbody>
                {competitiveRows.map((row, index) => (
                  <tr
                    key={`${row.factor}-${index}`}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {row.factor}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.generic}</td>
                    <td className="px-4 py-3 text-gray-700">{row.telematics}</td>
                    <td className="px-4 py-3 text-gray-700">{row.accounting}</td>
                    <td className="px-4 py-3 text-gray-700">{row.movearound}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-800">
            Proof Over Promises
          </h3>
          <p className="text-sm text-gray-600">
            We built MoveAround TMS specifically for material haulers. The workflow
            defaults to material type, tons/yards, and pit-to-site cycles so teams
            stop forcing a general freight tool to fit their daily work.
          </p>
        </div>
      </section>
    </div>
  );
}
