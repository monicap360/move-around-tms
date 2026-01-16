"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function SalesLandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#f5f5f5]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
      `}</style>

      {/* Navigation */}
      <nav className="border-b border-[#3a3a3f] bg-[#111113] sticky top-0 z-50 backdrop-blur-xl">
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
              <div className="hidden md:flex items-center gap-8 text-[13px] font-medium">
                <a href="#features" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">Features</a>
                <a href="#solutions" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">Solutions</a>
                <a href="#pricing" className="text-[#a1a1aa] hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">Pricing</a>
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.05),_transparent_50%)]" />
        <div className="max-w-[1400px] mx-auto relative">
          <div
            className={`text-center transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-[#3a3a3f] bg-[#1a1a1d] mb-8">
              <span className="text-[10px] font-bold text-[#a1a1aa] tracking-[0.12em] uppercase">
                🚀 INTELLIGENT LOGISTICS AUTOMATION
              </span>
            </div>

            <h1 className="text-[72px] font-bold mb-6 leading-[1.1] tracking-tight">
              <span className="block text-[#f5f5f5]">The TMS That</span>
              <span className="block text-[#a1a1aa]">Actually Works</span>
            </h1>

            <p className="text-[20px] text-[#a1a1aa] max-w-[900px] mx-auto mb-12 leading-relaxed font-medium">
              From Street Smart to Fleet Smart. Automate reconciliation, eliminate revenue
              leakage, and get real-time visibility across your entire operation. Built
              for 3PLs and manufacturers who demand excellence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Link
                href="/dashboard"
                className="group px-10 py-5 bg-[#f5f5f5] text-[#0a0a0b] font-bold text-[14px] rounded-sm hover:bg-[#e5e5e5] transition-all uppercase tracking-wide flex items-center gap-3"
              >
                START FREE TRIAL
                <span className="text-[20px]">→</span>
              </Link>
              <Link
                href="#pricing"
                className="px-10 py-5 border-2 border-[#3a3a3f] text-[#f5f5f5] font-semibold text-[14px] rounded-sm hover:border-[#4a4a50] hover:bg-[#1a1a1d] transition-all uppercase tracking-wide"
              >
                VIEW PRICING
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-6 max-w-[1100px] mx-auto pt-12 border-t border-[#3a3a3f]">
              {[
                { value: "2-5%", label: "Revenue Recovered" },
                { value: "80%", label: "Time Saved" },
                { value: "99.5%", label: "Data Accuracy" },
                { value: "24/7", label: "Live Tracking" },
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-[40px] font-bold text-[#f5f5f5] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              CORE CAPABILITIES
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Everything You Need.<br />Nothing You Don't.
            </h2>
            <p className="text-[18px] text-[#a1a1aa] max-w-[700px] mx-auto">
              Built for operations teams who need results, not complexity.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Automated Reconciliation",
                desc: "Match tickets, invoices, and POs automatically. Catch discrepancies before they cost you money.",
              },
              {
                title: "Revenue Shield",
                desc: "Recover 2-5% revenue leakage through intelligent exception detection and workflow routing.",
              },
              {
                title: "Live Fleet Tracking",
                desc: "Real-time ELD integration with Samsara, Motive, and Geotab. Know where every truck is.",
              },
              {
                title: "Detention Tracking",
                desc: "Geofence-based automatic detention tracking. Generate claims instantly with photo evidence.",
              },
              {
                title: "Cross-Border Compliance",
                desc: "CFDI 4.0 + Carta Porte ready. Automated customs documentation for US-Mexico operations.",
              },
              {
                title: "FastScan OCR",
                desc: "Upload tickets, get instant data extraction. 99.5% accuracy with AI-powered validation.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all group"
              >
                <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[24px] group-hover:bg-[#252529] transition-all">
                  ✓
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

      {/* Solutions Section */}
      <section id="solutions" className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              INDUSTRY SOLUTIONS
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Purpose-Built for Your Industry
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "3PL Operations",
                desc: "Multi-client billing, carrier management, and real-time visibility.",
                link: "/dashboard",
              },
              {
                title: "Manufacturing Plants",
                desc: "Aggregate reconciliation and invoice-to-PO matching automation.",
                link: "/aggregates/reconciliation",
              },
              {
                title: "Cross-Border Freight",
                desc: "CFDI 4.0 compliance and automated customs documentation.",
                link: "/integrations",
              },
              {
                title: "Fleet Management",
                desc: "Driver payroll, detention tracking, and performance analytics.",
                link: "/detention",
              },
            ].map((solution, idx) => (
              <Link
                key={idx}
                href={solution.link}
                className="group bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-10 hover:border-[#4a4a50] hover:bg-[#111113] transition-all"
              >
                <h3 className="text-[24px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide group-hover:text-[#f5f5f5]">
                  {solution.title}
                </h3>
                <p className="text-[16px] text-[#a1a1aa] leading-relaxed mb-4">
                  {solution.desc}
                </p>
                <div className="text-[13px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-2">
                  LEARN MORE
                  <span className="text-[16px]">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.12em] uppercase mb-4">
              TRANSPARENT PRICING
            </div>
            <h2 className="text-[48px] font-bold text-[#f5f5f5] mb-6">
              Simple, Predictable Pricing
            </h2>
            <p className="text-[18px] text-[#a1a1aa]">
              No hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Starter",
                price: "$399",
                setup: "$2,499 setup",
                features: ["Up to 7 trucks", "Basic reconciliation", "Standard support", "FastScan OCR"],
              },
              {
                name: "Professional",
                price: "$699",
                setup: "$3,999 setup",
                features: ["Up to 25 trucks", "Advanced reconciliation", "Priority support", "ELD integrations", "Detention tracking"],
                popular: true,
              },
              {
                name: "Enterprise",
                price: "$1,999",
                setup: "$6,999 setup",
                features: ["26-100 trucks", "Full reconciliation suite", "Dedicated support", "Custom integrations", "Multi-org dashboard", "API access"],
              },
            ].map((plan, idx) => (
              <div
                key={idx}
                className={`bg-[#1a1a1d] border ${
                  plan.popular ? "border-[#f5f5f5]" : "border-[#3a3a3f]"
                } rounded-sm p-8 relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#f5f5f5] text-[#0a0a0b] text-[10px] font-bold uppercase tracking-wider rounded-sm">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-[12px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-4">
                  {plan.name}
                </div>
                <div className="text-[48px] font-bold text-[#f5f5f5] mb-2">
                  {plan.price}
                  <span className="text-[16px] text-[#71717a]">/mo</span>
                </div>
                <div className="text-[13px] text-[#71717a] mb-8">{plan.setup}</div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-[14px] text-[#a1a1aa]">
                      <span className="text-[#f5f5f5] mt-0.5">✓</span>
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
                  START TRIAL
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1000px] mx-auto text-center">
          <h2 className="text-[56px] font-bold mb-6 text-[#f5f5f5]">
            Ready to Go From<br />Street Smart to Fleet Smart?
          </h2>
          <p className="text-[18px] text-[#a1a1aa] mb-12 max-w-[700px] mx-auto">
            Join operations teams who trust Move Around TMS for their high-velocity logistics.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-12 py-6 bg-[#f5f5f5] text-[#0a0a0b] font-bold text-[14px] rounded-sm hover:bg-[#e5e5e5] transition-all uppercase tracking-wide"
          >
            START FREE TRIAL →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#3a3a3f] bg-[#111113] py-12 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col">
              <span className="font-bold text-[14px] text-[#f5f5f5]">
                MOVE AROUND TMS
              </span>
              <span className="text-[10px] text-[#71717a] uppercase tracking-wider mt-1">
                From Street Smart to Fleet Smart™
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-[12px] text-[#a1a1aa] font-medium">
              <Link href="/dashboard" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Dashboard
              </Link>
              <Link href="/tracking" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Tracking
              </Link>
              <Link href="/aggregates/reconciliation" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Reconciliation
              </Link>
              <Link href="/integrations" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Integrations
              </Link>
            </div>
            <div className="text-[11px] text-[#71717a]">
              © {new Date().getFullYear()} Move Around TMS • Powered by iGotta Technologies
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
