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
    name: "Hauler",
    price: "$349 flat (up to 3 trucks) or $129/truck (4–10 trucks)",
    features: [
      "Live dispatch board",
      "Real-time GPS tracking",
      "Driver mobile app",
      "Digital tickets with e-signature",
      "Basic IFTA reporting",
      "Document storage (1 GB)",
    ],
    cta: "Start Hauler",
  },
  {
    name: "Producer",
    price: "$249 base + $85/truck",
    features: [
      "Multi-job scheduling",
      "Unlimited materials library",
      "Job costing (basic margin)",
      "Aggregate analytics",
      "Accounting sync",
      "Priority support",
    ],
    cta: "Start Producer",
  },
  {
    name: "Enterprise",
    price: "Custom (starts ~$3k–$5k/mo)",
    features: [
      "Unlimited trucks & users",
      "Advanced reconciliation + anomaly scoring",
      "Role-based access",
      "Integrations + API access",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
  },
];

const comparisonRows = [
  {
    category: "Pricing & Scale",
    feature: "Monthly Price",
    hauler: "$349 flat (up to 3 trucks) or $129/truck (4–10 trucks)",
    producer: "$249 base + $85/truck",
    enterprise: "Custom (starts ~$3k–$5k/mo)",
  },
  {
    category: "Pricing & Scale",
    feature: "Truck / Trailer Units",
    hauler: "Up to 5",
    producer: "Up to 25",
    enterprise: "Unlimited",
  },
  {
    category: "Pricing & Scale",
    feature: "User Logins",
    hauler: "3",
    producer: "10",
    enterprise: "Unlimited + Roles",
  },
  {
    category: "Core Dispatch & Tracking",
    feature: "Live Dispatch Board",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Core Dispatch & Tracking",
    feature: "Real-Time GPS Tracking",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅ (+ Geofences)",
  },
  {
    category: "Core Dispatch & Tracking",
    feature: "Driver Mobile App",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Core Dispatch & Tracking",
    feature: "Route History & Stops",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Aggregate Load Mgmt",
    feature: "Digital Ticket + e-Signature",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Aggregate Load Mgmt",
    feature: "Material Library",
    hauler: "✅ (10)",
    producer: "✅ (Unlimited)",
    enterprise: "✅ (Unlimited + Custom)",
  },
  {
    category: "Aggregate Load Mgmt",
    feature: "Tonnage / Cubic Yards",
    hauler: "✅ (Manual)",
    producer: "✅ (Auto via density)",
    enterprise: "✅ (Auto + Scale*)",
  },
  {
    category: "Aggregate Load Mgmt",
    feature: "Pits / Jobsites",
    hauler: "✅ (15)",
    producer: "✅ (Unlimited)",
    enterprise: "✅ (Unlimited + Notes)",
  },
  {
    category: "Aggregate Load Mgmt",
    feature: "Multi-Job Scheduling",
    hauler: "❌",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Aggregate Load Mgmt",
    feature: "Job Costing",
    hauler: "❌",
    producer: "✅ (Basic)",
    enterprise: "✅ (Advanced P&L)",
  },
  {
    category: "Ops & Compliance",
    feature: "Basic IFTA",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Ops & Compliance",
    feature: "Document Storage",
    hauler: "✅ (1 GB)",
    producer: "✅ (10 GB)",
    enterprise: "✅ (Unlimited)",
  },
  {
    category: "Ops & Compliance",
    feature: "Maintenance Tracking",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "Ops & Compliance",
    feature: "Permit Tracking",
    hauler: "❌",
    producer: "✅ (Manual)",
    enterprise: "✅ (Alerts)",
  },
  {
    category: "Ops & Compliance",
    feature: "Sub-hauler Portal",
    hauler: "❌",
    producer: "❌",
    enterprise: "✅",
  },
  {
    category: "Safety",
    feature: "DVIR & Safety Forms",
    hauler: "❌",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "BI & Integrations",
    feature: "Standard Reports",
    hauler: "✅",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "BI & Integrations",
    feature: "Aggregate Analytics",
    hauler: "❌",
    producer: "✅",
    enterprise: "✅ (Custom Dashboards)",
  },
  {
    category: "BI & Integrations",
    feature: "Accounting Sync",
    hauler: "❌",
    producer: "✅",
    enterprise: "✅",
  },
  {
    category: "BI & Integrations",
    feature: "Telematics / ELD",
    hauler: "❌",
    producer: "✅ (1)",
    enterprise: "✅ (Unlimited)",
  },
  {
    category: "BI & Integrations",
    feature: "API Access",
    hauler: "❌",
    producer: "❌",
    enterprise: "✅",
  },
  {
    category: "Onboarding & Support",
    feature: "Training",
    hauler: "Self-Serve",
    producer: "Guided",
    enterprise: "White-Glove + On-Site",
  },
  {
    category: "Onboarding & Support",
    feature: "Support",
    hauler: "Email/Chat",
    producer: "Priority Phone/Chat",
    enterprise: "Dedicated AM",
  },
];

const addOns = [
  {
    name: "Scale Ticket Integration (Enterprise add-on)",
    price: "$500–$1,500/mo",
  },
  {
    name: "Fast Scan OCR",
    price: "$350–$900/mo",
  },
  {
    name: "Accounting Sync",
    price: "$200–$500/mo",
  },
  {
    name: "Telematics / ELD",
    price: "$250/mo per connection + setup",
  },
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
                  disabled={plan === t.name || saving}
                  onClick={() => upgrade(t.name as any)}
                >
                  {plan === t.name ? "Current Plan" : t.cta}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Plan Comparison for Dirt, Sand & Aggregate Haulers
        </h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Feature
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Hauler
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">
                  Producer
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
                  <td className="px-4 py-3 text-gray-700">{row.hauler}</td>
                  <td className="px-4 py-3 text-gray-700">{row.producer}</td>
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
        <p className="text-xs text-gray-500">
          Scale Ticket Integration is available as an Enterprise add-on.
        </p>
      </div>

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
