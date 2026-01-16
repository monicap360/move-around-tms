"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("3pl");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-blue-500/20 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-black text-white">M</span>
              </div>
              <div>
                <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  MOVE AROUND TMS
                </div>
                <div className="text-[9px] text-blue-300/60 font-semibold uppercase tracking-wider">
                  From Street Smart to Fleet Smart™
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm rounded-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
            >
              Launch Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-xl mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-bold text-blue-200 tracking-wider uppercase">
              Built by Operators, For Operators
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Stop Losing Money
            </span>
            <span className="block text-white mt-3">
              Start Recovering It
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto mb-4 leading-relaxed font-medium">
            The only TMS that automatically catches revenue leakage, reconciles invoices
            in seconds, and turns your operations team into strategic analysts.
          </p>
          
          <p className="text-base text-blue-300/70 max-w-3xl mx-auto mb-12">
            Recover 2-5% of your revenue • Eliminate 80% of manual work • Audit-ready in real-time
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/dashboard"
              className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base rounded-2xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
            >
              START FREE TRIAL →
            </Link>
            <Link
              href="/aggregates/reconciliation"
              className="px-10 py-5 bg-white/10 backdrop-blur-xl border-2 border-white/20 text-white font-bold text-base rounded-2xl hover:bg-white/20 transition-all"
            >
              Watch Demo
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { value: "2-5%", label: "Revenue Recovered" },
              { value: "80%", label: "Time Saved" },
              { value: "99.5%", label: "Accuracy Rate" },
              { value: "<5min", label: "Setup Time" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-wider text-blue-300/70 font-semibold">
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
                Your Team Is Drowning in <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Excel Hell</span>
              </h2>
              <p className="text-lg text-blue-200/80 leading-relaxed mb-8">
                Most trucking companies waste <strong className="text-white">15-25 hours per week</strong> manually
                matching tickets to invoices. Meanwhile, <strong className="text-white">2-5% of revenue leaks</strong> through
                quantity variances and missed charges.
              </p>
            </div>

            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-10">
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
                  <div key={idx} className="flex justify-between items-center pb-6 border-b border-white/10">
                    <span className="text-base text-blue-200/70">{item.label}</span>
                    <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 bg-red-500/20 border border-red-500/30 rounded-xl p-6">
                  <span className="text-lg font-bold text-white">TOTAL ANNUAL</span>
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">$60k-150k</span>
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
            <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
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
                className="bg-slate-900/90 border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all"
              >
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-black text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-blue-200/70 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-xs font-bold uppercase tracking-wider mb-6">
              💳 Transparent Pricing
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Predictable Pricing</span>
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
                className={`relative bg-slate-900/90 border ${
                  plan.popular ? "border-purple-500/50 scale-105" : "border-white/10"
                } rounded-3xl p-8`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold uppercase rounded-full">
                    ⭐ Most Popular
                  </div>
                )}
                <div className="text-sm font-bold text-blue-300/70 uppercase mb-2">{plan.name}</div>
                <div className="mb-6">
                  <span className="text-6xl font-black text-white">{plan.price}</span>
                  <span className="text-lg text-blue-300/70">/mo</span>
                </div>
                <div className="text-sm text-blue-300/70 mb-2">{plan.setup}</div>
                <div className="text-sm font-bold text-white mb-8 uppercase">{plan.trucks}</div>
                <ul className="space-y-3 mb-8 pb-8 border-b border-white/10">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-blue-200/80">
                      <span className="text-green-400 text-lg">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className={`block w-full py-4 text-center font-bold text-sm rounded-2xl transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                      : "bg-white/10 text-white border border-white/20"
                  }`}
                >
                  Start Free Trial →
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="text-base text-blue-200/80">
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Street Smart to Fleet Smart?
            </span>
          </h2>
          <p className="text-xl text-blue-200/80 mb-12">
            Start free. No credit card. Full access for 30 days.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all"
          >
            START FREE TRIAL NOW →
          </Link>
          <div className="mt-8 text-sm text-blue-300/70">
            Questions? <a href="mailto:sales@movearoundtms.com" className="text-white font-semibold underline">sales@movearoundtms.com</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/80 py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-black text-white">M</span>
            </div>
            <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              MOVE AROUND TMS
            </span>
          </div>
          <div className="text-sm text-blue-300/60 mb-8">From Street Smart to Fleet Smart™</div>
          <div className="text-sm text-blue-300/60">
            © {new Date().getFullYear()} Move Around TMS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
