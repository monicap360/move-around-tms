"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    category: "Getting Started",
    items: [
      {
        q: "How long does it take to get set up?",
        a: "Most fleets are fully operational within 30 days. The first week covers driver and truck setup, the second covers ticket workflow and QuickBooks connection, and weeks three and four are live operations with your dedicated onboarding support. Owner-operators with 1–3 trucks are often live in under a week.",
      },
      {
        q: "Do I need any special hardware?",
        a: "No. Drivers use the MoveAround mobile app on any Android or iOS smartphone they already own. Dispatchers work from a web browser on any computer. The only optional hardware is a document scanner if you want to use the Rock Box OCR module for paper ticket scanning.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes — we offer a 30-day free trial on the core system. You get full access to dispatch, digital tickets, and the driver app with no credit card required. After 30 days you choose a plan or we schedule a call to find the right fit.",
      },
      {
        q: "What is the startup deposit and what does it cover?",
        a: "The one-time $999 startup deposit covers your dedicated onboarding session, data migration support (we import your existing customer list, driver roster, and material rates), and 30 days of priority setup support. It is credited toward your first month if you continue past the trial.",
      },
    ],
  },
  {
    category: "Fit & Workflow",
    items: [
      {
        q: "We haul sand, gravel, and dirt — is this built for us?",
        a: "Yes. MoveAround TMS was built specifically for aggregate and bulk material hauling. Material type, tons/yards, pit-to-site cycles, scale house reconciliation, and per-load payroll are all native to the system — not bolt-ons. Generic TMS tools treat these as custom fields; we treat them as the core workflow.",
      },
      {
        q: "Will this work with my existing scale software?",
        a: "We support CSV/Excel export from all major scale house systems (Fairbanks, Mettler Toledo, Rice Lake, and others). Our AccuriScale module ingests your scale tickets and matches them against your dispatch records automatically. If your scale system has an API, we can integrate directly — reach out and we will confirm compatibility.",
      },
      {
        q: "My drivers are not tech-savvy. Will they be able to use the app?",
        a: "The driver app is designed for one-handed use in a moving truck cab. The core flow is four taps: Load → Haul → Dump → Return. Drivers can capture a photo of a paper ticket in under 10 seconds. We have had fleets where drivers over 60 with no prior smartphone app experience were using it independently within one shift.",
      },
      {
        q: "We currently use spreadsheets. How painful is the switch?",
        a: "We built an Excel import tool specifically for this. Upload your existing load sheet and we map the columns to MoveAround fields. Your historical data stays in Excel — we start clean from your go-live date. The biggest adjustment is dispatchers moving from a shared spreadsheet to a live board, which most describe as 'easier after the first day.'",
      },
    ],
  },
  {
    category: "Pricing & Contracts",
    items: [
      {
        q: "What does 'per truck per month' pricing actually mean?",
        a: "You pay based on the number of active trucks in your fleet — trucks you are dispatching at least once that month. If a truck sits in the yard for a full month, it does not count. Owner-operators with seasonal work can pause trucks during slow periods without canceling.",
      },
      {
        q: "Are there long-term contracts?",
        a: "No. All plans are month-to-month. We also offer annual contracts with a 2-month discount (pay 10 months, get 12) for fleets ready to commit. Launch partners who complete the 90-day pilot get a locked-in rate for their initial 12-month term.",
      },
      {
        q: "Can I add modules later without switching plans?",
        a: "Yes. You can start on Starter and add individual modules (Accounting Integration, IFTA, Payroll, etc.) as add-ons at any time. Or upgrade to Professional/Enterprise to get bundles at a lower per-module cost. There is no penalty or gap in service when upgrading.",
      },
      {
        q: "What happens to my data if I cancel?",
        a: "Your data belongs to you. If you cancel, we give you a full CSV export of all your loads, tickets, drivers, customers, and invoices within 48 hours. We retain the data for 90 days after cancellation in case you change your mind, then permanently delete it.",
      },
    ],
  },
  {
    category: "Integrations & Data",
    items: [
      {
        q: "Does it connect to QuickBooks?",
        a: "Yes — both QuickBooks Online and QuickBooks Desktop (via IIF export). Invoices created in MoveAround sync to QuickBooks automatically. Driver payroll exports as a QuickBooks-ready file with itemized ticket breakdowns. The connection is set up during onboarding and takes about 15 minutes.",
      },
      {
        q: "Can customers see their own loads and tickets?",
        a: "Yes, on the Professional and Enterprise plans. The Customer Portal gives your clients a login where they can view active loads, download signed tickets, check invoice status, and run their own haul reports. Many of our users find this eliminates 80% of the 'where is my load?' calls they used to get.",
      },
      {
        q: "Do you integrate with ELD systems?",
        a: "ELD integration is available as an add-on. We currently support Samsara, Motive (KeepTruckin), and Geotab. HOS data flows into driver profiles and dispatch can see truck location on the live map without a separate telematics login.",
      },
    ],
  },
  {
    category: "Support",
    items: [
      {
        q: "What kind of support do you offer?",
        a: "Starter plans get email support with a 1-business-day response SLA. Professional plans include phone support during business hours (Mon–Fri, 8am–6pm CT). Enterprise plans include a dedicated account manager with direct cell access. All plans get access to our help center and video library.",
      },
      {
        q: "What if something breaks during a critical haul day?",
        a: "We maintain 99.99% uptime and monitor the system 24/7. If there is an outage, we post status updates at status.movearoundtms.com and our on-call team responds within 15 minutes. Professional and Enterprise customers can call the support line directly. The driver app also has an offline mode that queues ticket data and syncs when connectivity is restored.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{
      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
      color: "#ffffff",
      minHeight: "100vh",
      fontFamily: "Poppins, sans-serif",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>

        <div style={{ marginBottom: "3rem" }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", textDecoration: "none" }}>
            ← Back to home
          </Link>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#F7931E", margin: "1rem 0 0.5rem" }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.05rem" }}>
            Everything trucking operators ask us before signing up — answered straight.
          </p>
        </div>

        {faqs.map((section) => (
          <div key={section.category} style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#F7931E", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid rgba(247,147,30,0.25)" }}>
              {section.category}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {section.items.map((item, i) => {
                const key = `${section.category}-${i}`;
                const open = openMap[key];
                return (
                  <div key={key} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => toggle(key)}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: 12 }}
                    >
                      <span style={{ color: "#ffffff", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4 }}>{item.q}</span>
                      <span style={{ color: "#F7931E", fontSize: "1.1rem", flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
                    </button>
                    {open && (
                      <div style={{ padding: "0 1.25rem 1.25rem", color: "rgba(255,255,255,0.78)", fontSize: "0.9rem", lineHeight: 1.7 }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div style={{ marginTop: "3rem", background: "rgba(247,147,30,0.08)", border: "1px solid rgba(247,147,30,0.3)", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <h3 style={{ color: "#F7931E", marginBottom: "0.5rem" }}>Still have questions?</h3>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "1.25rem", fontSize: "0.95rem" }}>
            We are real people based in Houston. Call us, email us, or book a 30-minute demo and we will answer everything live.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:sales@movearoundtms.com" className="btn btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 1.25rem" }}>
              Email Us
            </a>
            <a href="https://calendly.com/movearoundtms/demo" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ fontSize: "0.875rem", padding: "0.5rem 1.25rem" }}>
              Book a Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
