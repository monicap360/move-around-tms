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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        html {
          scroll-behavior: smooth;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Navigation */}
      <nav className="border-b border-blue-500/20 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50 shadow-xl shadow-blue-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <span className="text-2xl font-black text-white">M</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    MOVE AROUND TMS
                  </span>
                  <span className="text-[9px] text-blue-300/60 font-semibold tracking-[0.15em] uppercase">
                    From Street Smart to Fleet Smart™
                  </span>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-8 text-sm font-medium">
                <a href="#features" className="text-blue-200/70 hover:text-blue-300 transition-colors">Features</a>
                <a href="#solutions" className="text-blue-200/70 hover:text-blue-300 transition-colors">Solutions</a>
                <a href="#pricing" className="text-blue-200/70 hover:text-blue-300 transition-colors">Pricing</a>
                <a href="#faq" className="text-blue-200/70 hover:text-blue-300 transition-colors">FAQ</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-sm rounded-xl hover:shadow-xl hover:shadow-blue-500/50 transition-all hover:scale-105"
              >
                Launch Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/30 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute bottom-40 left-20 w-80 h-80 bg-purple-500/30 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div
            className={`text-center transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-xl mb-8 shadow-lg shadow-blue-500/20">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-glow"></span>
              <span className="text-xs font-bold text-blue-200 tracking-wider uppercase">
                Built by Operators, For Operators
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.9]">
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
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
                className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-base rounded-2xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-105 flex items-center gap-3"
              >
                START FREE TRIAL
                <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
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
                <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                  <div className="text-5xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-blue-300/70 font-semibold">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-xs font-bold uppercase tracking-wider mb-6">
                💸 The Problem
              </div>
              <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
                Your Team Is Drowning in <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Excel Hell</span>
              </h2>
              <p className="text-lg text-blue-200/80 leading-relaxed mb-8">
                Most trucking companies waste <strong className="text-white">15-25 hours per week</strong> manually
                matching tickets to invoices. Meanwhile, <strong className="text-white">2-5% of revenue leaks</strong> through
                quantity variances and missed charges.
              </p>
              <div className="space-y-3">
                {[
                  "Manual ticket entry takes 3-5 minutes per load",
                  "Invoice reconciliation happens once a month (if at all)",
                  "Detention and accessorial charges are forgotten",
                  "No audit trail for compliance or disputes",
                  "Your billing team is buried in spreadsheets",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <span className="text-red-400 text-xl mt-0.5">✗</span>
                    <span className="text-base text-blue-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl">
              <div className="inline-block px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full text-red-300 text-xs font-bold uppercase tracking-wider mb-8">
                💰 The Cost of Manual Processes
              </div>
              <div className="space-y-6">
                {[
                  { label: "Ticket Clerk Salary", value: "$3.5k-5.5k/mo" },
                  { label: "Revenue Leakage", value: "2-5% annually" },
                  { label: "Missed Detention Claims", value: "$500-2k/mo" },
                  { label: "Billing Disputes", value: "$1k-5k/mo" },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-6 border-b border-white/10 last:border-0">
                    <span className="text-base text-blue-200/70">{item.label}</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">{item.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-6 mt-6">
                  <span className="text-lg font-bold text-white">TOTAL ANNUAL COST</span>
                  <span className="text-4xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">$60k-150k</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-xs font-bold uppercase tracking-wider mb-6">
              ✨ The Solution
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
              Automation That Pays<br />
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">For Itself in 30 Days</span>
            </h2>
            <p className="text-xl text-blue-200/80 max-w-3xl mx-auto">
              Replace your $4k/mo ticket clerk with $399/mo software. Recover enough
              revenue in the first month to cover your annual subscription.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              { number: "01", emoji: "📸", title: "Upload Tickets", desc: "Drop photos, PDFs, or scans. Our OCR reads everything—tons, yards, dates, trucks, pits.", color: "from-blue-500 to-cyan-500" },
              { number: "02", emoji: "🔄", title: "Auto-Match", desc: "We match tickets → invoices → POs → delivery receipts. Flag exceptions instantly.", color: "from-purple-500 to-pink-500" },
              { number: "03", emoji: "💰", title: "Collect Money", desc: "Auto-generate detention claims, catch price variances, recover missed accessorials.", color: "from-green-500 to-emerald-500" },
            ].map((step, idx) => (
              <div key={idx} className="relative group">
                <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all hover:scale-105 hover:shadow-2xl">
                  <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg`}>
                    {step.emoji}
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20">
                    <span className="text-sm font-black text-white">{step.number}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-base text-blue-200/70 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/40 rounded-3xl p-12 text-center backdrop-blur-xl shadow-2xl shadow-green-500/20">
            <div className="text-sm font-bold text-green-300 uppercase tracking-wider mb-4">
              ⚡ Real Results
            </div>
            <div className="text-4xl md:text-5xl font-black text-white mb-3">
              $4,800 Monthly Savings + $12,000 Revenue Recovered
            </div>
            <div className="text-lg text-blue-200/80">
              Average 3PL with 25 trucks sees ROI in <span className="text-white font-bold">18 days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
              🚀 Complete Platform
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Everything Your Office Does.<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Automated.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "📸", title: "FastScan OCR", desc: "99.5% accuracy guaranteed. Extracts tons, yards, dates, trucks, pits, moisture, fines.", color: "from-blue-500 to-cyan-500" },
              { icon: "🔄", title: "Auto Reconciliation", desc: "Match tickets → invoices → POs automatically. Catch discrepancies before they cost you.", color: "from-purple-500 to-pink-500" },
              { icon: "💵", title: "Revenue Shield", desc: "Recover 2-5% of revenue through intelligent exception detection.", color: "from-green-500 to-emerald-500" },
              { icon: "⏱️", title: "Detention Tracking", desc: "Geofence-based automatic detention with photo evidence and timestamped proof.", color: "from-orange-500 to-red-500" },
              { icon: "📊", title: "Driver Payroll", desc: "Calculate pay by ton, yard, hour, load, percentage, or truck capacity.", color: "from-yellow-500 to-orange-500" },
              { icon: "🌐", title: "Cross-Border", desc: "CFDI 4.0 + Carta Porte ready. Automated customs documentation.", color: "from-indigo-500 to-purple-500" },
              { icon: "🚚", title: "Fleet Tracking", desc: "Real-time ELD integration with Samsara, Motive, and Geotab.", color: "from-teal-500 to-cyan-500" },
              { icon: "🛡️", title: "HR Compliance", desc: "Auto-alerts for expiring CDLs, med cards, insurance. Never miss a deadline.", color: "from-pink-500 to-rose-500" },
              { icon: "📈", title: "Dashboards", desc: "Real-time KPIs, trend analysis, and actionable insights.", color: "from-violet-500 to-purple-500" },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all hover:scale-105"
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-black text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-blue-200/70 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold uppercase tracking-wider mb-6">
              🎯 Industry Solutions
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Built for <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Your Operation</span>
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { id: "3pl", label: "3PL Operations", emoji: "🏢" },
              { id: "manufacturing", label: "Manufacturing", emoji: "🏭" },
              { id: "border", label: "Cross-Border", emoji: "🌎" },
              { id: "fleet", label: "Fleet Owners", emoji: "🚛" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-bold rounded-2xl transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50 scale-105"
                    : "bg-white/10 text-blue-200/70 border border-white/10 hover:bg-white/20"
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl">
            {activeTab === "3pl" && (
              <div>
                <h3 className="text-4xl font-black text-white mb-6">🏢 3PL Operations</h3>
                <p className="text-lg text-blue-200/80 mb-8 leading-relaxed">
                  Multi-client billing, carrier management, and real-time visibility across your entire customer base.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    "Multi-client rate management",
                    "Automated carrier selection",
                    "Real-time tracking updates",
                    "Accessorial charge automation",
                    "Customer-specific reporting",
                    "API access for enterprise",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <span className="text-green-400 text-xl">✓</span>
                      <span className="text-blue-100">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-105"
                >
                  See 3PL Demo →
                </Link>
              </div>
            )}

            {activeTab === "manufacturing" && (
              <div>
                <h3 className="text-4xl font-black text-white mb-6">🏭 Manufacturing Plants</h3>
                <p className="text-lg text-blue-200/80 mb-8 leading-relaxed">
                  Automated ticket reconciliation and invoice-to-PO matching with exception-first workflows.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    "Scale ticket OCR with quality data",
                    "Automatic PO matching",
                    "Quantity variance detection",
                    "Price variance alerts",
                    "Supplier performance scorecards",
                    "Excel import for legacy data",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <span className="text-green-400 text-xl">✓</span>
                      <span className="text-blue-100">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/aggregates/reconciliation"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-105"
                >
                  See Reconciliation Demo →
                </Link>
              </div>
            )}

            {activeTab === "border" && (
              <div>
                <h3 className="text-4xl font-black text-white mb-6">🌎 Cross-Border Freight</h3>
                <p className="text-lg text-blue-200/80 mb-8 leading-relaxed">
                  CFDI 4.0 compliance and automated customs documentation for US-Mexico operations.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    "CFDI 4.0 + Carta Porte generation",
                    "Real-time customs tracking",
                    "Document validation",
                    "Broker integration",
                    "Multi-currency (USD/MXN)",
                    "Compliance audit trails",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <span className="text-green-400 text-xl">✓</span>
                      <span className="text-blue-100">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/integrations"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-105"
                >
                  See Integrations →
                </Link>
              </div>
            )}

            {activeTab === "fleet" && (
              <div>
                <h3 className="text-4xl font-black text-white mb-6">🚛 Fleet Management</h3>
                <p className="text-lg text-blue-200/80 mb-8 leading-relaxed">
                  Driver payroll, detention tracking, and performance analytics with Fleet Smart intelligence.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {[
                    "Automated driver payroll",
                    "Geofence detention tracking",
                    "ELD integration for live location",
                    "Performance scorecards",
                    "Fuel efficiency tracking",
                    "Maintenance scheduling",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <span className="text-green-400 text-xl">✓</span>
                      <span className="text-blue-100">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/detention"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-purple-500/50 transition-all hover:scale-105"
                >
                  See Detention Tracking →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-300 text-xs font-bold uppercase tracking-wider mb-6">
              ⭐ Trusted by Operators
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Built by <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Fleet Operators</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "We recovered $18,000 in the first month just from catching quantity variances. Paid for itself in 2 weeks.",
                author: "Operations Manager",
                company: "Texas 3PL (45 trucks)",
                result: "$216k annual recovery",
                color: "from-blue-500 to-cyan-500",
              },
              {
                quote: "Reconciliation that used to take 3 days now happens automatically every night. We catch exceptions before invoices go out.",
                author: "CFO",
                company: "Manufacturing Hauler (28 trucks)",
                result: "80% time savings",
                color: "from-purple-500 to-pink-500",
              },
              {
                quote: "The detention tracking alone pays for the entire system. We're recovering $2,000-3,000/month that we were leaving on the table.",
                author: "Dispatch Manager",
                company: "Regional Carrier (62 trucks)",
                result: "$30k annual recovery",
                color: "from-green-500 to-emerald-500",
              },
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/30 transition-all hover:scale-105">
                <div className="text-6xl text-white/10 mb-4 leading-none">"</div>
                <p className="text-base text-blue-100 leading-relaxed mb-6 italic">
                  {testimonial.quote}
                </p>
                <div className="border-t border-white/10 pt-6">
                  <div className="text-base font-bold text-white">{testimonial.author}</div>
                  <div className="text-sm text-blue-300/70 mb-3">{testimonial.company}</div>
                  <div className={`inline-block px-4 py-2 bg-gradient-to-r ${testimonial.color} rounded-full text-white text-sm font-bold`}>
                    {testimonial.result}
                  </div>
                </div>
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
              Simple, <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">Predictable Pricing</span>
            </h2>
            <p className="text-xl text-blue-200/80">
              No hidden fees. No surprises. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$399",
                setup: "$2,499 setup",
                trucks: "1-7 trucks",
                features: ["Basic OCR scanning", "Basic reconciliation", "Email support", "Mobile app", "Basic reporting"],
                color: "from-blue-500 to-cyan-500",
              },
              {
                name: "Professional",
                price: "$699",
                setup: "$3,999 setup",
                trucks: "8-25 trucks",
                features: ["Advanced OCR", "Full reconciliation", "Priority support", "ELD integrations", "Detention tracking", "Advanced analytics", "Multi-user"],
                popular: true,
                color: "from-purple-500 to-pink-500",
              },
              {
                name: "Enterprise",
                price: "$1,999",
                setup: "$6,999 setup",
                trucks: "26-100 trucks",
                features: ["Everything in Pro", "Multi-org dashboard", "Custom integrations", "Account manager", "API access", "Custom reporting", "White-label", "SLA guarantees"],
                color: "from-green-500 to-emerald-500",
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border ${
                  plan.popular ? "border-purple-500/50 shadow-2xl shadow-purple-500/20 scale-105" : "border-white/10"
                } rounded-3xl p-8 hover:scale-105 transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                    ⭐ Most Popular
                  </div>
                )}
                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-6 shadow-lg`}>
                  {plan.name[0]}
                </div>
                <div className="text-sm font-bold text-blue-300/70 uppercase tracking-wider mb-2">
                  {plan.name}
                </div>
                <div className="mb-6">
                  <span className="text-6xl font-black text-white">{plan.price}</span>
                  <span className="text-lg text-blue-300/70">/mo</span>
                </div>
                <div className="text-sm text-blue-300/70 mb-2">{plan.setup}</div>
                <div className="text-sm font-bold text-white mb-8 uppercase tracking-wide">
                  {plan.trucks}
                </div>
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
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-xl hover:shadow-purple-500/50"
                      : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                  }`}
                >
                  Start Free Trial →
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="text-base text-blue-200/80 mb-2">
              <span className="text-2xl">💯</span> <strong className="text-white">30-Day Money-Back Guarantee</strong>
            </div>
            <div className="text-sm text-blue-300/60">
              No contracts • Cancel anytime • Volume discounts for 100+ trucks
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
              ❓ FAQ
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Got <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Questions?</span>
            </h2>
          </div>

          <div className="space-y-4">
            {[
              { q: "How long does implementation take?", a: "Most customers are up and running in under 2 hours. Upload your first tickets, connect your ELD, and you're live." },
              { q: "Do I need to replace my ELD?", a: "No. We integrate with Samsara, Motive, Geotab, and other major providers. Keep your existing hardware." },
              { q: "How accurate is your OCR?", a: "99.5% accuracy on standard aggregate tickets. Low-confidence scans are flagged for manual review." },
              { q: "Can I try it before committing?", a: "Yes. Start a free trial with no credit card required. See your revenue recovery potential in 24 hours." },
              { q: "What about data security?", a: "Bank-level encryption (TLS 1.3), SOC 2 Type II compliant, 99.9% uptime SLA." },
            ].map((faq, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <span className="text-lg font-bold text-white pr-4">{faq.q}</span>
                  <span className="text-2xl text-blue-400 flex-shrink-0">{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-8 pb-6 text-base text-blue-200/80 leading-relaxed border-t border-white/10 pt-6">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-6xl md:text-7xl font-black mb-6 text-white leading-tight">
            Ready to Go From<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Street Smart to Fleet Smart?
            </span>
          </h2>
          <p className="text-xl text-blue-200/80 mb-4 max-w-3xl mx-auto">
            Join 3PLs and manufacturers who trust Move Around TMS.
          </p>
          <p className="text-base text-blue-300/70 mb-12">
            Start free. No credit card. Full access for 30 days.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black text-lg rounded-2xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all hover:scale-105"
          >
            START FREE TRIAL NOW →
          </Link>
          <div className="mt-8 text-sm text-blue-300/70">
            Questions? <a href="mailto:sales@movearoundtms.com" className="text-white font-semibold underline">sales@movearoundtms.com</a> • (409) 392-9626
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/80 backdrop-blur-xl py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl font-black text-white">M</span>
                </div>
                <span className="font-black text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MOVE AROUND TMS
                </span>
              </div>
              <p className="text-sm text-blue-300/70 leading-relaxed">
                From Street Smart to Fleet Smart™
              </p>
            </div>
            
            {[
              { title: "Product", links: ["Features", "Solutions", "Pricing", "Integrations"] },
              { title: "Resources", links: ["Dashboard", "Tracking", "Reconciliation", "Detention"] },
              { title: "Company", links: ["Contact Sales", "Support", "(409) 392-9626"] },
            ].map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-2 text-sm">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      <span className="text-blue-300/70 hover:text-blue-300 transition-colors cursor-pointer">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 text-center">
            <div className="text-sm text-blue-300/60">
              © {new Date().getFullYear()} Move Around TMS. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
