"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function SalesWebsite() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("3pl");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f5f5f5]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Navigation */}
      <nav className="border-b border-[#3a3a3f] bg-[#111113]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex flex-col">
                <div className="text-[24px] font-bold tracking-tight text-[#f5f5f5]">
                  MOVE AROUND TMS
                </div>
                <div className="text-[10px] font-medium text-[#71717a] tracking-[0.15em] uppercase mt-0.5">
                  From Street Smart to Fleet Smart™
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-8 text-[13px] font-medium">
                <a href="#problem" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">The Problem</a>
                <a href="#features" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">Features</a>
                <a href="#solutions" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">Solutions</a>
                <a href="#pricing" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">Pricing</a>
                <a href="#faq" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">FAQ</a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-8 bg-[#0a0a0b] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.03),_transparent_50%)]" />
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-[#f5f5f5]/[0.02] rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-[300px] h-[300px] bg-[#f5f5f5]/[0.02] rounded-full blur-3xl" />
        
        <div className="max-w-[1400px] mx-auto relative">
          <div
            className={`text-center transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-[#3a3a3f] bg-[#1a1a1d] mb-8">
              <span className="w-2 h-2 bg-[#16a34a] rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-[#a1a1aa] tracking-[0.12em] uppercase">
                Built by Operators, For Operators
              </span>
            </div>

            <h1 className="text-[80px] font-extrabold mb-6 leading-[0.95] tracking-tight">
              <span className="block text-[#f5f5f5]">Stop Losing Money</span>
              <span className="block text-[#a1a1aa]">Start Recovering It</span>
            </h1>

            <p className="text-[22px] text-[#a1a1aa] max-w-[900px] mx-auto mb-4 leading-relaxed font-medium">
              The only TMS that automatically catches revenue leakage, reconciles invoices
              in seconds, and turns your operations team into strategic analysts.
            </p>
            
            <p className="text-[16px] text-[#71717a] max-w-[700px] mx-auto mb-12">
              Recover 2-5% of your revenue. Eliminate 80% of manual reconciliation work.
              Get audit-ready compliance in real-time.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link
                href="/dashboard"
                className="group px-12 py-5 bg-[#f5f5f5] text-[#0a0a0b] font-bold text-[14px] rounded-sm hover:bg-[#e5e5e5] transition-all uppercase tracking-wide flex items-center gap-3 shadow-2xl shadow-[#f5f5f5]/10"
              >
                START FREE TRIAL
                <span className="text-[20px] group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                href="/aggregates/reconciliation"
                className="px-12 py-5 border-2 border-[#3a3a3f] text-[#f5f5f5] font-semibold text-[14px] rounded-sm hover:border-[#4a4a50] hover:bg-[#1a1a1d] transition-all uppercase tracking-wide"
              >
                SEE LIVE DEMO
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-[1100px] mx-auto pt-12 border-t border-[#3a3a3f]">
              {[
                { value: "2-5%", label: "Revenue Recovered Annually" },
                { value: "80%", label: "Time Saved on Reconciliation" },
                { value: "99.5%", label: "Invoice Accuracy Rate" },
                { value: "<5min", label: "Average Setup Time" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-[44px] font-bold text-[#f5f5f5] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold leading-tight">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="problem" className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
                THE PROBLEM
              </div>
              <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6 leading-tight">
                Your Team Is Drowning in Excel Hell
              </h2>
              <p className="text-[16px] text-[#a1a1aa] leading-relaxed mb-8">
                Most trucking companies waste <strong className="text-[#f5f5f5]">15-25 hours per week</strong> manually
                matching tickets to invoices, chasing down discrepancies, and fighting CSV
                import errors. Meanwhile, <strong className="text-[#f5f5f5]">2-5% of revenue leaks</strong> through
                quantity variances, price mismatches, and missed accessorial charges.
              </p>
              <div className="space-y-4">
                {[
                  "Manual ticket entry takes 3-5 minutes per load",
                  "Invoice reconciliation happens once a month (if at all)",
                  "Detention and accessorial charges are forgotten",
                  "No audit trail for compliance or disputes",
                  "Your billing team is buried in spreadsheets",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span className="text-[#dc2626] text-[20px] mt-1">✗</span>
                    <span className="text-[15px] text-[#a1a1aa]">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-10">
              <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-6">
                THE COST OF MANUAL PROCESSES
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-[#3a3a3f]">
                  <span className="text-[14px] text-[#a1a1aa]">Ticket Clerk Salary</span>
                  <span className="text-[20px] font-bold text-[#dc2626]">$3,500-5,500/mo</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#3a3a3f]">
                  <span className="text-[14px] text-[#a1a1aa]">Revenue Leakage</span>
                  <span className="text-[20px] font-bold text-[#dc2626]">2-5% annually</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#3a3a3f]">
                  <span className="text-[14px] text-[#a1a1aa]">Missed Detention Claims</span>
                  <span className="text-[20px] font-bold text-[#dc2626]">$500-2k/month</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#3a3a3f]">
                  <span className="text-[14px] text-[#a1a1aa]">Billing Disputes</span>
                  <span className="text-[20px] font-bold text-[#dc2626]">$1k-5k/month</span>
                </div>
                <div className="flex justify-between items-center pt-4">
                  <span className="text-[16px] font-bold text-[#f5f5f5]">TOTAL ANNUAL COST</span>
                  <span className="text-[28px] font-bold text-[#dc2626]">$60k-150k</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              THE SOLUTION
            </div>
            <h2 className="text-[56px] font-bold text-[#f5f5f5] mb-6 leading-tight">
              Automation That Pays<br />For Itself in 30 Days
            </h2>
            <p className="text-[18px] text-[#a1a1aa] max-w-[800px] mx-auto">
              Replace your $4k/mo ticket clerk with $399/mo software. Recover enough
              revenue in the first month to cover your annual subscription.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { number: "01", title: "Upload Tickets", desc: "Drop photos, PDFs, or scans. Our OCR reads everything—tons, yards, dates, trucks, pits." },
              { number: "02", title: "Auto-Match Everything", desc: "We match tickets → invoices → POs → delivery receipts. Flag exceptions instantly." },
              { number: "03", title: "Collect Your Money", desc: "Auto-generate detention claims, catch price variances, recover missed accessorials." },
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -top-6 -left-4 text-[120px] font-black text-[#1a1a1d] leading-none">
                  {step.number}
                </div>
                <div className="relative bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
                  <h3 className="text-[20px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-[#a1a1aa] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1a1a1d] border-2 border-[#16a34a]/30 rounded-sm p-12 text-center">
            <div className="text-[14px] font-bold text-[#16a34a] uppercase tracking-wider mb-4">
              REAL RESULTS
            </div>
            <div className="text-[32px] font-bold text-[#f5f5f5] mb-2">
              $4,800 Monthly Savings + $12,000 Revenue Recovered
            </div>
            <div className="text-[14px] text-[#a1a1aa]">
              Average 3PL with 25 trucks sees ROI in 18 days
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              COMPLETE PLATFORM
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Everything Your Office Does.<br />Automated.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "📸",
                title: "FastScan OCR",
                desc: "Upload tickets via mobile or desktop. AI extracts tons, yards, dates, trucks, pits, moisture, fines—everything. 99.5% accuracy guaranteed.",
              },
              {
                icon: "🔄",
                title: "Automated Reconciliation",
                desc: "Match tickets → invoices → POs automatically. Catch quantity variances, price mismatches, and timing discrepancies before they cost you.",
              },
              {
                icon: "💵",
                title: "Revenue Shield",
                desc: "Recover 2-5% of revenue through intelligent exception detection. Catch underbilling, missed accessorials, and pricing errors.",
              },
              {
                icon: "⏱️",
                title: "Detention Tracking",
                desc: "Geofence-based automatic detention tracking. Generate claims instantly with photo evidence and timestamped proof.",
              },
              {
                icon: "📊",
                title: "Driver Payroll Engine",
                desc: "Calculate pay by ton, yard, hour, load, percentage, or truck capacity. Multi-rate structures and automatic compliance checks.",
              },
              {
                icon: "🌐",
                title: "Cross-Border Compliance",
                desc: "CFDI 4.0 + Carta Porte ready. Automated customs documentation for US-Mexico operations. Built-in compliance validation.",
              },
              {
                icon: "🚚",
                title: "Live Fleet Tracking",
                desc: "Real-time ELD integration with Samsara, Motive, and Geotab. Know where every truck is, every minute.",
              },
              {
                icon: "🛡️",
                title: "HR Compliance Alerts",
                desc: "Auto-alerts for expiring CDLs, med cards, insurance. Never miss a compliance deadline again.",
              },
              {
                icon: "📈",
                title: "Executive Dashboards",
                desc: "Real-time KPIs, trend analysis, and actionable insights. Make data-driven decisions in seconds.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all group"
              >
                <div className="text-[48px] mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-[18px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                  {feature.title}
                </h3>
                <p className="text-[14px] text-[#a1a1aa] leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions by Industry */}
      <section id="solutions" className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              INDUSTRY SOLUTIONS
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Built for Your Operation
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-4 mb-12">
            {[
              { id: "3pl", label: "3PL Operations" },
              { id: "manufacturing", label: "Manufacturing" },
              { id: "border", label: "Cross-Border" },
              { id: "fleet", label: "Fleet Owners" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-[13px] font-semibold uppercase tracking-wide rounded-sm transition-all ${
                  activeTab === tab.id
                    ? "bg-[#2d2d32] text-[#f5f5f5] border border-[#4a4a50]"
                    : "text-[#a1a1aa] border border-[#3a3a3f] hover:text-[#f5f5f5] hover:bg-[#1a1a1d]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-12">
            {activeTab === "3pl" && (
              <div>
                <h3 className="text-[32px] font-bold text-[#f5f5f5] mb-6">3PL Operations</h3>
                <p className="text-[16px] text-[#a1a1aa] mb-8 leading-relaxed">
                  Multi-client billing, carrier management, and real-time visibility across your entire customer base.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    "Multi-client rate management with customer-specific pricing",
                    "Automated carrier selection and load assignment",
                    "Real-time tracking updates pushed to customers",
                    "Accessorial charge automation (detention, lumper, TONU)",
                    "Customer-specific reporting and invoice formats",
                    "API access for enterprise customers",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-[#16a34a] text-[20px]">✓</span>
                      <span className="text-[14px] text-[#a1a1aa]">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard"
                  className="inline-block mt-8 px-8 py-4 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
                >
                  SEE 3PL DEMO →
                </Link>
              </div>
            )}

            {activeTab === "manufacturing" && (
              <div>
                <h3 className="text-[32px] font-bold text-[#f5f5f5] mb-6">Manufacturing Plants</h3>
                <p className="text-[16px] text-[#a1a1aa] mb-8 leading-relaxed">
                  Automated ticket reconciliation and invoice-to-PO matching with exception-first workflows.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    "Scale ticket OCR with moisture, fines, and quality data",
                    "Automatic matching to purchase orders and lab results",
                    "Quantity variance detection (received vs. invoiced)",
                    "Price variance alerts (PO price vs. invoice price)",
                    "Supplier performance scorecards",
                    "Excel import for legacy data migration",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-[#16a34a] text-[20px]">✓</span>
                      <span className="text-[14px] text-[#a1a1aa]">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/aggregates/reconciliation"
                  className="inline-block mt-8 px-8 py-4 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
                >
                  SEE RECONCILIATION DEMO →
                </Link>
              </div>
            )}

            {activeTab === "border" && (
              <div>
                <h3 className="text-[32px] font-bold text-[#f5f5f5] mb-6">Cross-Border Freight</h3>
                <p className="text-[16px] text-[#a1a1aa] mb-8 leading-relaxed">
                  CFDI 4.0 compliance and automated customs documentation for US-Mexico operations.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    "CFDI 4.0 + Carta Porte automatic generation",
                    "Real-time customs status tracking",
                    "Automated document validation before border crossing",
                    "Broker integration for seamless clearance",
                    "Multi-currency invoicing (USD/MXN)",
                    "Compliance audit trails for both countries",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-[#16a34a] text-[20px]">✓</span>
                      <span className="text-[14px] text-[#a1a1aa]">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/integrations"
                  className="inline-block mt-8 px-8 py-4 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
                >
                  SEE INTEGRATIONS →
                </Link>
              </div>
            )}

            {activeTab === "fleet" && (
              <div>
                <h3 className="text-[32px] font-bold text-[#f5f5f5] mb-6">Fleet Management</h3>
                <p className="text-[16px] text-[#a1a1aa] mb-8 leading-relaxed">
                  Driver payroll, detention tracking, and performance analytics with Fleet Smart intelligence.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    "Automated driver payroll (ton/yard/hour/load/% rates)",
                    "Geofence-based detention tracking and claims",
                    "ELD integration for live location and HOS",
                    "Driver performance scorecards and rankings",
                    "Fuel efficiency tracking and optimization",
                    "Maintenance scheduling and compliance alerts",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-[#16a34a] text-[20px]">✓</span>
                      <span className="text-[14px] text-[#a1a1aa]">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/detention"
                  className="inline-block mt-8 px-8 py-4 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
                >
                  SEE DETENTION TRACKING →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              TRUSTED BY OPERATORS
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Built by Fleet Operators,<br />For Fleet Operators
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "We recovered $18,000 in the first month just from catching quantity variances we were missing. This system paid for itself in 2 weeks.",
                author: "Operations Manager",
                company: "Texas 3PL (45 trucks)",
                result: "$216k annual recovery",
              },
              {
                quote: "Reconciliation that used to take my team 3 days now happens automatically every night. We catch exceptions before invoices go out.",
                author: "CFO",
                company: "Manufacturing Hauler (28 trucks)",
                result: "80% time savings",
              },
              {
                quote: "The detention tracking alone pays for the entire system. We're recovering $2,000-3,000/month that we were just leaving on the table.",
                author: "Dispatch Manager",
                company: "Regional Carrier (62 trucks)",
                result: "$30k annual recovery",
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8">
                <div className="text-[48px] text-[#3a3a3f] mb-4 leading-none">"</div>
                <p className="text-[15px] text-[#a1a1aa] leading-relaxed mb-6 italic">
                  {testimonial.quote}
                </p>
                <div className="border-t border-[#3a3a3f] pt-4">
                  <div className="text-[14px] font-bold text-[#f5f5f5]">{testimonial.author}</div>
                  <div className="text-[12px] text-[#71717a] mb-2">{testimonial.company}</div>
                  <div className="text-[13px] font-bold text-[#16a34a]">{testimonial.result}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              CALCULATE YOUR SAVINGS
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              See Your ROI in 30 Seconds
            </h2>
          </div>

          <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-12">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <label className="block text-[12px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-3">
                  Number of Trucks
                </label>
                <input
                  type="number"
                  defaultValue="25"
                  className="w-full bg-[#2d2d32] border border-[#3a3a3f] rounded-sm px-4 py-3 text-[16px] text-[#f5f5f5] font-semibold focus:outline-none focus:border-[#4a4a50]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-3">
                  Monthly Revenue
                </label>
                <input
                  type="number"
                  defaultValue="500000"
                  className="w-full bg-[#2d2d32] border border-[#3a3a3f] rounded-sm px-4 py-3 text-[16px] text-[#f5f5f5] font-semibold focus:outline-none focus:border-[#4a4a50]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-3">
                  Current Ticket Clerk Cost
                </label>
                <input
                  type="number"
                  defaultValue="4500"
                  className="w-full bg-[#2d2d32] border border-[#3a3a3f] rounded-sm px-4 py-3 text-[16px] text-[#f5f5f5] font-semibold focus:outline-none focus:border-[#4a4a50]"
                />
              </div>
            </div>

            <div className="bg-[#2d2d32] border border-[#3a3a3f] rounded-sm p-8">
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-[12px] text-[#71717a] uppercase tracking-wider mb-2">Monthly Savings</div>
                  <div className="text-[40px] font-bold text-[#16a34a]">$4,801</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#71717a] uppercase tracking-wider mb-2">Annual Recovery</div>
                  <div className="text-[40px] font-bold text-[#16a34a]">$17,500</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#71717a] uppercase tracking-wider mb-2">ROI Timeline</div>
                  <div className="text-[40px] font-bold text-[#f5f5f5]">18 days</div>
                </div>
              </div>
            </div>

            <div className="text-center mt-8">
              <Link
                href="/dashboard"
                className="inline-block px-10 py-4 bg-[#f5f5f5] text-[#0a0a0b] font-bold text-[14px] rounded-sm hover:bg-[#e5e5e5] transition-all uppercase tracking-wide"
              >
                START RECOVERING REVENUE →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1300px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              TRANSPARENT PRICING
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Simple, Predictable Pricing
            </h2>
            <p className="text-[18px] text-[#a1a1aa]">
              No hidden fees. No surprises. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                name: "Starter",
                price: "$399",
                period: "/month",
                setup: "$2,499 setup fee",
                trucks: "1-7 trucks",
                features: [
                  "Basic OCR ticket scanning",
                  "Basic reconciliation",
                  "Standard support (email)",
                  "Mobile app access",
                  "Basic reporting",
                ],
              },
              {
                name: "Professional",
                price: "$699",
                period: "/month",
                setup: "$3,999 setup fee",
                trucks: "8-25 trucks",
                features: [
                  "Advanced OCR with validation",
                  "Full reconciliation suite",
                  "Priority support (phone + email)",
                  "ELD integrations (Samsara, Motive)",
                  "Detention tracking",
                  "Advanced reporting & analytics",
                  "Multi-user access",
                ],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$1,999",
                period: "/month",
                setup: "$6,999 setup fee",
                trucks: "26-100 trucks",
                features: [
                  "Everything in Professional",
                  "Multi-org dashboard",
                  "Custom integrations",
                  "Dedicated account manager",
                  "API access",
                  "Custom reporting",
                  "White-label options",
                  "SLA guarantees",
                ],
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`bg-[#1a1a1d] border ${
                  plan.popular ? "border-[#f5f5f5] shadow-2xl shadow-[#f5f5f5]/5" : "border-[#3a3a3f]"
                } rounded-sm p-8 relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-[#f5f5f5] text-[#0a0a0b] text-[10px] font-bold uppercase tracking-wider rounded-sm">
                    ⭐ MOST POPULAR
                  </div>
                )}
                <div className="text-[12px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-2">
                  {plan.name}
                </div>
                <div className="mb-6">
                  <span className="text-[56px] font-bold text-[#f5f5f5]">{plan.price}</span>
                  <span className="text-[16px] text-[#71717a]">{plan.period}</span>
                </div>
                <div className="text-[14px] text-[#a1a1aa] mb-2">{plan.setup}</div>
                <div className="text-[13px] font-bold text-[#f5f5f5] mb-6 uppercase tracking-wide">
                  {plan.trucks}
                </div>
                <ul className="space-y-3 mb-8 pb-8 border-b border-[#3a3a3f]">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-[#a1a1aa]">
                      <span className="text-[#16a34a] mt-0.5 text-[16px]">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`block w-full py-4 text-center font-bold text-[13px] rounded-sm transition-all uppercase tracking-wide ${
                    plan.popular
                      ? "bg-[#f5f5f5] text-[#0a0a0b] hover:bg-[#e5e5e5]"
                      : "bg-[#2d2d32] text-[#f5f5f5] border border-[#3a3a3f] hover:bg-[#252529]"
                  }`}
                >
                  START FREE TRIAL
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="text-[14px] text-[#a1a1aa] mb-4">
              💯 <strong className="text-[#f5f5f5]">30-Day Money-Back Guarantee</strong> • No long-term contracts • Cancel anytime
            </div>
            <div className="text-[12px] text-[#71717a]">
              Volume discounts available for 100+ trucks. <a href="mailto:sales@movearoundtms.com" className="text-[#f5f5f5] underline">Contact sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              INTEGRATIONS
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Works With Your Existing Tools
            </h2>
            <p className="text-[16px] text-[#a1a1aa]">
              No rip-and-replace. Plug into your current systems.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { category: "ELD Providers", items: ["Samsara", "Motive (KeepTruckin)", "Geotab", "Omnitracs"] },
              { category: "Accounting", items: ["QuickBooks", "Xero", "NetSuite", "SAP"] },
              { category: "Load Boards", items: ["DAT", "Truckstop", "123Loadboard", "Direct Freight"] },
              { category: "Fuel Cards", items: ["Comdata", "EFS", "WEX", "Fleet One"] },
            ].map((group, idx) => (
              <div key={idx} className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-6">
                <h3 className="text-[14px] font-bold text-[#f5f5f5] uppercase tracking-wide mb-4">
                  {group.category}
                </h3>
                <ul className="space-y-2">
                  {group.items.map((item, i) => (
                    <li key={i} className="text-[13px] text-[#a1a1aa] flex items-center gap-2">
                      <span className="text-[#16a34a]">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/integrations"
              className="inline-block px-8 py-4 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
            >
              VIEW ALL INTEGRATIONS →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1000px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              FREQUENTLY ASKED QUESTIONS
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How long does implementation take?",
                a: "Most customers are up and running in under 2 hours. Upload your first tickets, connect your ELD, and you're live. Our setup team handles the heavy lifting.",
              },
              {
                q: "Do I need to replace my current ELD system?",
                a: "No. We integrate with Samsara, Motive, Geotab, and other major ELD providers. Keep your existing hardware and fleet tracking—we layer on top.",
              },
              {
                q: "What if I don't have an ELD system?",
                a: "No problem. You can still use FastScan OCR for tickets, manual tracking updates, and all reconciliation features. ELD integration is optional.",
              },
              {
                q: "How accurate is your OCR?",
                a: "99.5% accuracy on standard aggregate tickets. We extract tons, yards, dates, truck numbers, pit locations, moisture, fines, and more. Low-confidence scans are flagged for manual review.",
              },
              {
                q: "Can I try it before committing?",
                a: "Yes. Start a free trial with no credit card required. Upload tickets, run reconciliation, and see your revenue recovery potential in 24 hours.",
              },
              {
                q: "What about data security?",
                a: "Bank-level encryption (TLS 1.3), SOC 2 Type II compliant infrastructure, and granular role-based access controls. Your data is hosted on enterprise-grade Supabase with 99.9% uptime SLA.",
              },
              {
                q: "Do you offer onboarding and training?",
                a: "Yes. Professional and Enterprise plans include live onboarding sessions. We'll train your team, import your historical data, and configure your workflows.",
              },
              {
                q: "What if I have custom requirements?",
                a: "Enterprise customers get custom integrations, API access, and dedicated engineering support. We can adapt to your specific workflows and compliance needs.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-8 py-6 flex items-center justify-between hover:bg-[#252529] transition-all"
                >
                  <span className="text-[16px] font-bold text-[#f5f5f5]">{faq.q}</span>
                  <span className="text-[24px] text-[#a1a1aa]">{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-8 pb-6 text-[14px] text-[#a1a1aa] leading-relaxed border-t border-[#3a3a3f] pt-6">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1100px] mx-auto text-center">
          <h2 className="text-[64px] font-bold mb-6 text-[#f5f5f5] leading-tight">
            Ready to Go From<br />Street Smart to Fleet Smart?
          </h2>
          <p className="text-[20px] text-[#a1a1aa] mb-4 max-w-[800px] mx-auto">
            Join 3PLs and manufacturers who trust Move Around TMS for their high-velocity logistics.
          </p>
          <p className="text-[16px] text-[#71717a] mb-12 max-w-[600px] mx-auto">
            Start free. No credit card required. Full access to all features for 30 days.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-14 py-6 bg-[#f5f5f5] text-[#0a0a0b] font-bold text-[16px] rounded-sm hover:bg-[#e5e5e5] transition-all uppercase tracking-wide shadow-2xl shadow-[#f5f5f5]/10"
          >
            START FREE TRIAL NOW →
          </Link>
          <div className="mt-8 text-[13px] text-[#71717a]">
            Questions? <a href="mailto:sales@movearoundtms.com" className="text-[#f5f5f5] underline">sales@movearoundtms.com</a> • (409) 392-9626
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#3a3a3f] bg-[#111113] py-16 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex flex-col mb-6">
                <span className="font-bold text-[18px] text-[#f5f5f5]">
                  MOVE AROUND TMS
                </span>
                <span className="text-[10px] text-[#71717a] uppercase tracking-wider mt-1">
                  From Street Smart to Fleet Smart™
                </span>
              </div>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                The intelligent logistics automation platform built for 3PLs,
                manufacturers, and fleet operators.
              </p>
            </div>
            
            <div>
              <h3 className="text-[12px] font-bold text-[#f5f5f5] uppercase tracking-wider mb-4">
                Product
              </h3>
              <ul className="space-y-3 text-[13px]">
                <li><a href="#features" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Features</a></li>
                <li><a href="#solutions" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Solutions</a></li>
                <li><a href="#pricing" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Pricing</a></li>
                <li><Link href="/integrations" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Integrations</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[12px] font-bold text-[#f5f5f5] uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-3 text-[13px]">
                <li><Link href="/dashboard" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Dashboard</Link></li>
                <li><Link href="/tracking" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Live Tracking</Link></li>
                <li><Link href="/aggregates/reconciliation" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Reconciliation</Link></li>
                <li><Link href="/detention" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Detention Tracking</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-[12px] font-bold text-[#f5f5f5] uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-3 text-[13px]">
                <li><a href="mailto:sales@movearoundtms.com" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Contact Sales</a></li>
                <li><a href="mailto:support@movearoundtms.com" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">Support</a></li>
                <li><a href="tel:4093929626" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors">(409) 392-9626</a></li>
                <li><span className="text-[#71717a]">Powered by iGotta Technologies</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#3a3a3f] pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-[11px] text-[#71717a]">
                © {new Date().getFullYear()} Move Around TMS. All rights reserved.
              </div>
              <div className="flex items-center gap-6 text-[11px] text-[#71717a]">
                <span>Privacy Policy</span>
                <span>•</span>
                <span>Terms of Service</span>
                <span>•</span>
                <span>Security</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
