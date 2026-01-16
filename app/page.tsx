"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("3pl");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f5f5f5]">
      {/* Navigation */}
      <nav className="border-b border-[#2a2a2f] bg-[#0f0f11]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#f7931e] rounded-lg flex items-center justify-center text-black font-black text-2xl shadow-lg shadow-[#f7931e]/30">
                M
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-[#f5f5f5]">
                  MOVE AROUND TMS
                </div>
                <div className="text-[9px] text-[#a1a1aa] font-semibold uppercase tracking-wider">
                  From Street Smart to Fleet Smart™
                </div>
              </div>
            </div>
            <Link
              href="/ronyx"
              className="px-6 py-2.5 bg-[#f7931e] text-black font-bold text-sm rounded-lg hover:bg-[#ff8c1a] transition-all shadow-lg shadow-[#f7931e]/30"
            >
              Launch Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(247,147,30,0.08),_transparent_55%)]" />
        <div className="max-w-6xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2a2a2f] bg-[#141418] mb-8">
            <span className="w-2 h-2 bg-[#16a34a] rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-[#a1a1aa] tracking-wider uppercase">
              Built by Operators, For Operators
            </span>
          </div>

          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="block text-[#f5f5f5]">Stop Losing Money</span>
            <span className="block text-[#f7931e]">Start Recovering It</span>
          </h1>

          <p className="text-lg md:text-xl text-[#cbd5e1] max-w-4xl mx-auto mb-4 leading-relaxed font-medium">
            The only TMS that automatically catches revenue leakage, reconciles invoices
            in seconds, and turns your operations team into strategic analysts.
          </p>
          <p className="text-sm text-[#94a3b8] max-w-3xl mx-auto mb-10">
            Recover 2-5% of your revenue • Eliminate 80% of manual work • Audit-ready in real-time
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/ronyx"
              className="px-10 py-4 bg-[#f7931e] text-black font-bold text-base rounded-lg hover:bg-[#ff8c1a] transition-all shadow-lg shadow-[#f7931e]/30"
            >
              START FREE TRIAL →
            </Link>
            <Link
              href="/aggregates/reconciliation"
              className="px-10 py-4 border border-[#2a2a2f] text-[#f5f5f5] font-bold text-base rounded-lg hover:bg-[#16161b] transition-all"
            >
              Watch Demo
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { value: "2-5%", label: "Revenue Recovered" },
              { value: "80%", label: "Time Saved" },
              { value: "99.5%", label: "Accuracy Rate" },
              { value: "<5min", label: "Setup Time" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-[#111114] border border-[#222228] rounded-xl p-6">
                <div className="text-4xl font-black text-[#f7931e] mb-2">
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-[#9ca3af] font-semibold">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-xs font-bold uppercase tracking-wider mb-6">
                💸 The Problem
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Your Team Is Drowning in <span className="text-[#f7931e]">Excel Hell</span>
              </h2>
              <p className="text-lg text-[#cbd5e1] leading-relaxed mb-8">
                Most trucking companies waste <strong className="text-white">15-25 hours per week</strong> manually
                matching tickets to invoices. Meanwhile, <strong className="text-white">2-5% of revenue leaks</strong> through
                quantity variances and missed charges.
              </p>
            </div>

            <div className="bg-[#111114] border border-[#222228] rounded-3xl p-10">
              <div className="inline-block px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-xs font-bold uppercase tracking-wider mb-8">
                💰 The Cost
              </div>
              <div className="space-y-6">
                {[
                  { label: "Ticket Clerk Salary", value: "$3.5k-5.5k/mo" },
                  { label: "Revenue Leakage", value: "2-5% annually" },
                  { label: "Missed Detention", value: "$500-2k/mo" },
                  { label: "Billing Disputes", value: "$1k-5k/mo" },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-6 border-b border-[#222228]">
                    <span className="text-base text-[#a1a1aa]">{item.label}</span>
                    <span className="text-2xl font-bold text-[#f7931e]">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 bg-[#1a1a1d] border border-[#2a2a2f] rounded-xl p-6">
                  <span className="text-lg font-bold text-white">TOTAL ANNUAL</span>
                  <span className="text-4xl font-black text-[#f7931e]">$60k-150k</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-[#1a1a1d] border border-[#2a2a2f] rounded-full text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-6">
              🚀 Complete Platform
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Everything Automated.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "📸", title: "FastScan OCR", desc: "99.5% accuracy. Extracts tons, yards, dates, trucks, pits, moisture, fines." },
              { icon: "🔄", title: "Auto Reconciliation", desc: "Match tickets → invoices → POs automatically." },
              { icon: "💵", title: "Revenue Shield", desc: "Recover 2-5% of revenue through intelligent detection." },
              { icon: "⏱️", title: "Detention Tracking", desc: "Geofence-based automatic detention with proof." },
              { icon: "📊", title: "Driver Payroll", desc: "Calculate pay by ton, yard, hour, load, or percentage." },
              { icon: "🌐", title: "Cross-Border", desc: "CFDI 4.0 + Carta Porte ready. Automated customs." },
              { icon: "🚚", title: "Fleet Tracking", desc: "Real-time ELD integration with Samsara, Motive, Geotab." },
              { icon: "🛡️", title: "HR Compliance", desc: "Auto-alerts for expiring CDLs, med cards, insurance." },
              { icon: "📈", title: "Dashboards", desc: "Real-time KPIs, trend analysis, actionable insights." },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#111114] border border-[#222228] rounded-3xl p-8 hover:border-[#2f2f36] transition-all"
              >
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-black text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-[#a1a1aa] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-[#1a1a1d] border border-[#2a2a2f] rounded-full text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-6">
              💳 Transparent Pricing
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Simple, <span className="text-[#f7931e]">Predictable Pricing</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$399",
                setup: "$2,499 setup",
                trucks: "1-7 trucks",
                features: ["Basic OCR", "Basic reconciliation", "Email support", "Mobile app", "Basic reports"],
              },
              {
                name: "Professional",
                price: "$699",
                setup: "$3,999 setup",
                trucks: "8-25 trucks",
                features: ["Advanced OCR", "Full reconciliation", "Priority support", "ELD integrations", "Detention tracking", "Advanced analytics"],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$1,999",
                setup: "$6,999 setup",
                trucks: "26-100 trucks",
                features: ["Everything in Pro", "Multi-org dashboard", "Custom integrations", "Account manager", "API access", "White-label"],
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-[#111114] border ${
                  plan.popular ? "border-[#f7931e] scale-105" : "border-[#222228]"
                } rounded-3xl p-8`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#f7931e] text-black text-xs font-bold uppercase rounded-full">
                    ⭐ Most Popular
                  </div>
                )}
                <div className="text-sm font-bold text-[#a1a1aa] uppercase mb-2">{plan.name}</div>
                <div className="mb-6">
                  <span className="text-6xl font-black text-white">{plan.price}</span>
                  <span className="text-lg text-[#a1a1aa]">/mo</span>
                </div>
                <div className="text-sm text-[#a1a1aa] mb-2">{plan.setup}</div>
                <div className="text-sm font-bold text-white mb-8 uppercase">{plan.trucks}</div>
                <ul className="space-y-3 mb-8 pb-8 border-b border-[#222228]">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#a1a1aa]">
                      <span className="text-[#16a34a] text-lg">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/ronyx"
                  className={`block w-full py-4 text-center font-bold text-sm rounded-2xl transition-all ${
                    plan.popular
                      ? "bg-[#f7931e] text-black hover:bg-[#ff8c1a]"
                      : "bg-[#1a1a1d] text-white border border-[#2a2a2f] hover:bg-[#1f1f24]"
                  }`}
                >
                  Start Free Trial →
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="text-base text-[#cbd5e1]">
              <span className="text-2xl">💯</span> <strong className="text-white">30-Day Money-Back Guarantee</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-6xl md:text-7xl font-black mb-6 text-white leading-tight">
            Ready to Go From<br />
            <span className="text-[#f7931e]">
              Street Smart to Fleet Smart?
            </span>
          </h2>
          <p className="text-xl text-[#cbd5e1] mb-12">
            Start free. No credit card. Full access for 30 days.
          </p>
          <Link
            href="/ronyx"
            className="inline-block px-12 py-6 bg-[#f7931e] text-black font-black text-lg rounded-2xl hover:bg-[#ff8c1a] transition-all shadow-lg shadow-[#f7931e]/30"
          >
            START FREE TRIAL NOW →
          </Link>
          <div className="mt-8 text-sm text-[#a1a1aa]">
            Questions? <a href="mailto:sales@movearoundtms.com" className="text-white font-semibold underline">sales@movearoundtms.com</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222228] bg-[#0f0f11] py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#f7931e] rounded-lg flex items-center justify-center shadow-lg shadow-[#f7931e]/30">
              <span className="text-xl font-black text-black">M</span>
            </div>
            <span className="font-black text-lg text-white">
              MOVE AROUND TMS
            </span>
          </div>
          <div className="text-sm text-[#a1a1aa] mb-8">From Street Smart to Fleet Smart™</div>
          <div className="text-sm text-[#71717a]">
            © {new Date().getFullYear()} Move Around TMS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
