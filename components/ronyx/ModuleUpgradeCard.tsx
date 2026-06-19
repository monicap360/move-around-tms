"use client";

import Link from "next/link";
import BrandLogo from "@/components/ronyx/BrandLogo";
import { MODULE_LOGO_MAP, BrandAssetKey } from "@/lib/brandAssets";

type ModuleInfo = {
  icon: string;
  name: string;
  price: string;
  description: string;
  includes: string[];
  planNote: string;
};

const MODULE_INFO: Record<string, ModuleInfo> = {
  "fast-scan": {
    icon: "📷",
    name: "Fast Scan",
    price: "$49/mo",
    description:
      "Fast Scan turns paper tickets into verified payroll and billing data using Claude AI OCR. Upload ticket images, extract fields automatically, match to dispatch records, and send to payroll and billing in one flow.",
    includes: [
      "AI-powered OCR ticket scanning",
      "Ticket field extraction (number, truck, driver, hours, loads)",
      "Dispatch-to-ticket match validation",
      "Ticket → Payroll pipeline",
      "Ticket → Billing pipeline",
      "Pit invoice upload and reconciliation",
      "Audit trail per ticket",
    ],
    planNote: "Included in Operations, Pro, and Enterprise plans.",
  },
  "payroll": {
    icon: "💰",
    name: "Payroll",
    price: "$49/mo",
    description:
      "Review, approve, and finalize driver and owner operator settlements directly from your ticket data. Payroll connects Fast Scan tickets to pay records, deductions, holds, and settlement packets.",
    includes: [
      "Driver payroll review and approval",
      "Owner operator settlement processing",
      "Payroll hold and deduction management",
      "Settlement packet generation",
      "Payroll audit log",
      "W2 and 1099 driver support",
    ],
    planNote: "Included in Operations, Pro, and Enterprise plans.",
  },
  "billing": {
    icon: "💵",
    name: "Billing",
    price: "$49/mo",
    description:
      "Generate customer invoices directly from verified tickets. The Billing module connects your ticket data to customer accounts, rates, and invoice batches so you can bill faster and reduce disputes.",
    includes: [
      "Customer invoice generation from tickets",
      "Billing queue and approval workflow",
      "Rate sheets per customer",
      "Invoice batch export",
      "Accounts receivable tracking",
      "Dispute and exception management",
    ],
    planNote: "Included in Pro and Enterprise plans.",
  },
  "owner-operators": {
    icon: "🤝",
    name: "Owner Operator Hub™",
    price: "",
    description:
      "Manage your entire owner operator network — profiles, compliance documents, contracts, W-9s, COIs, settlement history, trucks, drivers, and dispatch eligibility — in one place.",
    includes: [
      "Owner operator company profiles",
      "MC/DOT/EIN and compliance tracking",
      "Document management (W-9, COI, contracts)",
      "Dispatch eligibility controls",
      "Settlement hold and block controls",
      "Compliance score and expiration tracking",
    ],
    planNote: "Included in Operations Pro, Enterprise, and Enterprise Plus plans.\nAvailable as a $39/mo add-on for qualifying plans.",
  },
  "owner_operator_hub": {
    icon: "🤝",
    name: "Owner Operator Hub™",
    price: "",
    description:
      "Manage your entire owner operator network — profiles, compliance documents, contracts, W-9s, COIs, settlement history, trucks, drivers, and dispatch eligibility — in one place.",
    includes: [
      "Owner operator company profiles",
      "MC/DOT/EIN and compliance tracking",
      "Document management (W-9, COI, contracts)",
      "Dispatch eligibility controls",
      "Settlement hold and block controls",
      "Compliance score and expiration tracking",
    ],
    planNote: "Included in Operations Pro, Enterprise, and Enterprise Plus plans.\nAvailable as a $39/mo add-on for qualifying plans.",
  },
  "compliance": {
    icon: "🛡️",
    name: "Compliance",
    price: "$29/mo",
    description:
      "Automate compliance tracking for drivers, trucks, and owner operators. Get expiration alerts, auto-block rules, and a full compliance audit trail so nothing slips through.",
    includes: [
      "Driver document expiration tracking (CDL, medical, etc.)",
      "Truck registration and inspection tracking",
      "Owner operator compliance monitoring",
      "Auto-block rules on expired documents",
      "Compliance score dashboard",
      "Expiration alert notifications",
    ],
    planNote: "Included in Operations, Pro, and Enterprise plans.",
  },
  "maintenance": {
    icon: "🔧",
    name: "Maintenance",
    price: "$29/mo",
    description:
      "Track truck inspections, repairs, and maintenance schedules. Flag trucks for dispatch eligibility based on maintenance status and keep your fleet running safely.",
    includes: [
      "Truck maintenance records",
      "Inspection logs",
      "Repair ticket tracking",
      "Maintenance schedule and reminders",
      "Dispatch eligibility by maintenance status",
      "Fleet health dashboard",
    ],
    planNote: "Included in Pro and Enterprise plans.",
  },
  "live-tracking": {
    icon: "📍",
    name: "Live Tracking",
    price: "$79/mo",
    description:
      "See where your trucks are in real time. Live Tracking connects your dispatch board to GPS positions, geo-fenced job sites, and driver status updates.",
    includes: [
      "Real-time truck GPS map",
      "Dispatch board with live truck positions",
      "Geo-fenced job site entry/exit events",
      "Driver status updates",
      "Historical trip replay",
      "ELD integration (coming soon)",
    ],
    planNote: "Included in Pro and Enterprise plans.",
  },
  "ai-assistant": {
    icon: "🤖",
    name: "AI Office Assistant",
    price: "$99/mo",
    description:
      "Your AI-powered office manager. Get next-action suggestions, auto-task creation, compliance alerts, and guided workflows built on your live data.",
    includes: [
      "AI-guided next actions by driver/truck/ticket",
      "Auto-task creation from exceptions",
      "Compliance issue summaries",
      "Dispatch suggestions based on truck availability",
      "Payroll anomaly detection",
      "Natural language data queries",
    ],
    planNote: "Included in Pro and Enterprise plans.",
  },
  "customer-portal": {
    icon: "🌐",
    name: "Customer Portal",
    price: "$59/mo",
    description:
      "Give your customers a self-service portal to view tickets, invoices, and dispatch history tied to their jobs. Reduce email back-and-forth and speed up invoice approval.",
    includes: [
      "Customer-facing ticket view",
      "Invoice history and download",
      "Dispatch history by job",
      "Ticket dispute submission",
      "Customer contact management",
      "Portal access control",
    ],
    planNote: "Included in Pro and Enterprise plans.",
  },
  "store": {
    icon: "🛒",
    name: "Store / Merch",
    price: "$19/mo",
    description:
      "Sell MoveAround TMS branded gear and company merch directly from your TMS dashboard. Connect your Shopify store, manage products, and share links with your team.",
    includes: [
      "Shopify store link/embed integration",
      "Product catalog management",
      "Add/edit products with image, price, sizes",
      "Buy button and embed code support",
      "Organization-scoped product catalog",
    ],
    planNote: "Available on all plans.",
  },
  "dispatch": {
    icon: "🚛",
    name: "Dispatch",
    price: "Included in all plans",
    description:
      "The Dispatch module is the heart of MoveAround TMS. Schedule loads, assign trucks and drivers, manage job boards, and connect dispatch to tickets, payroll, and billing.",
    includes: [
      "Dispatch board and load assignment",
      "Driver and truck scheduling",
      "Job and load management",
      "Dispatch-to-ticket matching",
      "Customer dispatch requirements",
      "Exception and no-show tracking",
    ],
    planNote: "Included in all plans.",
  },
  "ccb": {
    icon: "🏛️",
    name: "CCB — Carrier Clearance Bureau",
    price: "+$199/mo add-on",
    description:
      "Carrier vetting, clearance status, billing risk scoring, compliance controls, dispatch holds, account blocks, and full audit history for owner operators and sub-haulers. CCB turns carrier due diligence into a structured, repeatable process.",
    includes: [
      "Carrier vetting and clearance status",
      "Billing risk scoring per carrier",
      "Compliance control flags",
      "Dispatch hold and account block management",
      "Full CCB audit history",
      "Integration with Owner Operator profiles",
      "Clearance badge on dispatch records",
    ],
    planNote: "Enterprise and Enterprise Plus add-on. +$199/mo.",
  },
};

const DEFAULT_INFO: ModuleInfo = {
  icon: "🔒",
  name: "This Module",
  price: "Contact sales",
  description: "This feature is not active for your organization. Activate it to unlock access.",
  includes: [],
  planNote: "Contact support for pricing and availability.",
};

export default function ModuleUpgradeCard({ moduleSlug }: { moduleSlug: string }) {
  const info    = MODULE_INFO[moduleSlug] ?? { ...DEFAULT_INFO, name: moduleSlug };
  const logoKey = MODULE_LOGO_MAP[moduleSlug] as BrandAssetKey | undefined;

  return (
    <div style={{
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      padding: "40px 24px",
    }}>
      <div style={{
        background: "#ffffff",
        border: "2px solid #e2e8f0",
        borderRadius: 20,
        padding: "40px 36px",
        maxWidth: 560,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
      }}>
        {/* Logo or Icon */}
        {logoKey ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 20px" }}>
              <BrandLogo
                asset={logoKey}
                maxHeight={52}
                maxWidth={200}
                style={{ margin: "0 auto" }}
                fallbackStyle={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}
              />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>{info.icon}</div>
        )}

        {/* Locked badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#fef2f2",
          color: "#dc2626",
          border: "1px solid #fca5a5",
          borderRadius: 20,
          padding: "4px 14px",
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}>
          🔒 Module Not Active
        </div>

        {/* Name */}
        <h2 style={{
          margin: "0 0 10px 0",
          fontSize: "1.5rem",
          fontWeight: 900,
          color: "#0f172a",
        }}>
          {info.name} is not active
        </h2>

        {/* Price — only shown if non-empty (some modules fold it into planNote) */}
        {info.price && (
          <div style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "#1e40af",
            marginBottom: 12,
          }}>
            {info.price}
          </div>
        )}

        {/* Description */}
        <p style={{
          margin: "0 0 20px 0",
          fontSize: "0.88rem",
          color: "#475569",
          lineHeight: 1.6,
        }}>
          {info.description}
        </p>

        {/* Includes list */}
        {info.includes.length > 0 && (
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "16px 20px",
            textAlign: "left",
            marginBottom: 20,
          }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
              What you get
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {info.includes.map((item, i) => (
                <li key={i} style={{ fontSize: "0.82rem", color: "#334155" }}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Plan note — split on \n so multi-line notes render as separate lines */}
        <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 24 }}>
          {info.planNote.split("\n").map((line, i) => (
            <div key={i} style={{ fontStyle: "italic", marginBottom: i < info.planNote.split("\n").length - 1 ? 4 : 0 }}>{line}</div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/ronyx/settings/modules"
            style={{
              display: "block",
              padding: "13px 24px",
              background: "#1e40af",
              color: "#ffffff",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: "0.9rem",
              textDecoration: "none",
              textAlign: "center",
              letterSpacing: "0.01em",
            }}
          >
            🧩 Activate {info.name.replace("™", "")} →
          </Link>
          <Link
            href="/ronyx/settings/billing"
            style={{
              display: "block",
              padding: "11px 24px",
              background: "transparent",
              color: "#475569",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            View Plans & Pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
