"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
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
        
        :root {
          --industrial-black: #0a0a0b;
          --industrial-charcoal: #111113;
          --industrial-steel: #1a1a1d;
          --industrial-gunmetal: #252529;
          --industrial-surface: #2d2d32;
          --industrial-border: #3a3a3f;
          --industrial-border-light: #4a4a50;
          --violation-red: #dc2626;
          --text-primary: #f5f5f5;
          --text-secondary: #a1a1aa;
          --text-tertiary: #71717a;
        }
      `}</style>

      {/* Navigation Bar */}
      <nav className="border-b border-[#3a3a3f] bg-[#111113]">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-[24px] font-bold tracking-tight text-[#f5f5f5]">
                MOVE AROUND TMS
              </div>
              <div className="text-[11px] font-medium text-[#71717a] tracking-wider mt-1">
                From Street Smart to Fleet Smart™
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:bg-[#252529] transition-all"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-8 bg-[#0a0a0b]">
        <div className="max-w-[1600px] mx-auto">
          <div
            className={`transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-[#3a3a3f] bg-[#1a1a1d] mb-8">
              <span className="text-[10px] font-bold text-[#a1a1aa] tracking-[0.08em] uppercase">
                INTELLIGENT LOGISTICS BRAIN
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-[64px] font-bold mb-6 leading-tight tracking-tight">
              <span className="block text-[#f5f5f5]">Transportation Management</span>
              <span className="block text-[#a1a1aa]">Built for Operations</span>
            </h1>

            {/* Subheading */}
            <p className="text-[18px] text-[#a1a1aa] max-w-[800px] mb-12 leading-relaxed font-medium">
              From Street Smart to Fleet Smart. Predictive routing, autonomous
              exception handling, and cross-border intelligence for high-velocity
              3PLs and manufacturers. Built by iGotta Technologies.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center gap-4 mb-20">
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-bold text-[13px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
              >
                Launch Command Center
              </Link>
              <Link
                href="/aggregates/reconciliation"
                className="px-8 py-4 border-2 border-[#3a3a3f] text-[#f5f5f5] font-semibold text-[13px] rounded-sm hover:border-[#4a4a50] hover:bg-[#1a1a1d] transition-all uppercase tracking-wide"
              >
                See Reconciliation Engine
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 max-w-[1200px]">
              <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-6">
                <div className="text-[32px] font-bold text-[#f5f5f5] mb-2">
                  2-5%
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold">
                  Revenue Recovered
                </div>
              </div>
              <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-6">
                <div className="text-[32px] font-bold text-[#f5f5f5] mb-2">
                  80%
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold">
                  Faster Reconciliation
                </div>
              </div>
              <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-6">
                <div className="text-[32px] font-bold text-[#f5f5f5] mb-2">
                  15-30d
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold">
                  Shorter Payment Cycle
                </div>
              </div>
              <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-6">
                <div className="text-[32px] font-bold text-[#f5f5f5] mb-2">
                  99.5%
                </div>
                <div className="text-[11px] uppercase tracking-wider text-[#71717a] font-semibold">
                  Data Accuracy
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-24 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-16">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.08em] uppercase mb-4">
              OPERATIONAL EXCELLENCE
            </div>
            <h2 className="text-[40px] font-bold text-[#f5f5f5] mb-4">
              Built for High-Performance Operations
            </h2>
            <p className="text-[16px] text-[#a1a1aa] max-w-[700px]">
              Every feature designed to eliminate manual work and maximize
              operational efficiency across your entire logistics chain.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
              <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[20px]">
                ⚡
              </div>
              <h3 className="text-[16px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                Predictive Orchestration
              </h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                AI-powered routing that anticipates delays and optimizes in
                real-time. Move from reactive dispatch to proactive operations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
              <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[20px]">
                🛡️
              </div>
              <h3 className="text-[16px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                Autonomous Exceptions
              </h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                Auto-detect mismatches and route resolutions to the right
                department instantly. Exception-first workflow automation.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
              <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[20px]">
                🌐
              </div>
              <h3 className="text-[16px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                Cross-Border Intelligence
              </h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                CFDI 4.0 + Carta Porte compliance with real-time validation.
                Built for US-Mexico manufacturing operations.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
              <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[20px]">
                📊
              </div>
              <h3 className="text-[16px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                Revenue Shield
              </h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                Recover 2-5% revenue leakage through intelligent reconciliation.
                Match tickets, invoices, and POs with 99.5% accuracy.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
              <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[20px]">
                ⏱️
              </div>
              <h3 className="text-[16px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                Automated Detention
              </h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                Track facility dwell time automatically and generate claims
                instantly. Geofence-based detention tracking.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-8 hover:border-[#4a4a50] transition-all">
              <div className="w-12 h-12 bg-[#2d2d32] border border-[#3a3a3f] rounded-sm flex items-center justify-center mb-6 text-[20px]">
                🔒
              </div>
              <h3 className="text-[16px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide">
                Audit-Ready Compliance
              </h3>
              <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
                Every transaction tracked, timestamped, and compliance-verified.
                Full audit trail for SOX and regulatory requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-16">
            <div className="text-[10px] font-bold text-[#71717a] tracking-[0.08em] uppercase mb-4">
              INDUSTRY SOLUTIONS
            </div>
            <h2 className="text-[40px] font-bold text-[#f5f5f5] mb-4">
              Built for Your Operation
            </h2>
            <p className="text-[16px] text-[#a1a1aa] max-w-[700px]">
              Whether you're a 3PL, manufacturer, or cross-border carrier—Move
              Around TMS adapts to your workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Link
              href="/dashboard"
              className="group bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-10 hover:border-[#4a4a50] hover:bg-[#111113] transition-all"
            >
              <h3 className="text-[20px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide group-hover:text-[#f5f5f5]">
                3PL Operations
              </h3>
              <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-4">
                Multi-client billing, carrier management, and real-time
                visibility across your entire customer base.
              </p>
              <div className="text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                Explore →
              </div>
            </Link>

            <Link
              href="/aggregates/reconciliation"
              className="group bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-10 hover:border-[#4a4a50] hover:bg-[#111113] transition-all"
            >
              <h3 className="text-[20px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide group-hover:text-[#f5f5f5]">
                Manufacturing Plants
              </h3>
              <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-4">
                Automated ticket reconciliation and invoice-to-PO matching with
                exception-first workflows.
              </p>
              <div className="text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                Explore →
              </div>
            </Link>

            <Link
              href="/integrations"
              className="group bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-10 hover:border-[#4a4a50] hover:bg-[#111113] transition-all"
            >
              <h3 className="text-[20px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide group-hover:text-[#f5f5f5]">
                Cross-Border Freight
              </h3>
              <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-4">
                CFDI 4.0 compliance and automated customs documentation for
                US-Mexico operations.
              </p>
              <div className="text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                Explore →
              </div>
            </Link>

            <Link
              href="/detention"
              className="group bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-10 hover:border-[#4a4a50] hover:bg-[#111113] transition-all"
            >
              <h3 className="text-[20px] font-bold text-[#f5f5f5] mb-3 uppercase tracking-wide group-hover:text-[#f5f5f5]">
                Fleet Management
              </h3>
              <p className="text-[14px] text-[#a1a1aa] leading-relaxed mb-4">
                Driver payroll, detention tracking, and performance analytics
                with Fleet Smart intelligence.
              </p>
              <div className="text-[12px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                Explore →
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-24 px-8 bg-[#111113] border-t border-[#3a3a3f]">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-[#1a1a1d] border border-[#3a3a3f] rounded-sm p-12">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="text-[32px] mb-4">🔒</div>
                <h3 className="font-bold text-[14px] mb-2 uppercase tracking-wide text-[#f5f5f5]">
                  Bank-Level Security
                </h3>
                <p className="text-[12px] text-[#a1a1aa]">
                  TLS encryption + SOC 2 compliance
                </p>
              </div>
              <div className="text-center">
                <div className="text-[32px] mb-4">✅</div>
                <h3 className="font-bold text-[14px] mb-2 uppercase tracking-wide text-[#f5f5f5]">
                  99.5% Accuracy
                </h3>
                <p className="text-[12px] text-[#a1a1aa]">
                  Exception-first matching engine
                </p>
              </div>
              <div className="text-center">
                <div className="text-[32px] mb-4">📈</div>
                <h3 className="font-bold text-[14px] mb-2 uppercase tracking-wide text-[#f5f5f5]">
                  Real-Time Intelligence
                </h3>
                <p className="text-[12px] text-[#a1a1aa]">
                  Live tracking + predictive alerts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-8 bg-[#0a0a0b] border-t border-[#3a3a3f]">
        <div className="max-w-[1000px] mx-auto text-center">
          <h2 className="text-[48px] font-bold mb-6 text-[#f5f5f5]">
            Ready to Transform Your Operations?
          </h2>
          <p className="text-[16px] text-[#a1a1aa] mb-12 max-w-[600px] mx-auto">
            Join forward-thinking 3PLs and manufacturers automating their
            logistics with AI-powered intelligence.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-10 py-5 bg-[#2d2d32] border border-[#4a4a50] text-[#f5f5f5] font-bold text-[14px] rounded-sm hover:bg-[#252529] transition-all uppercase tracking-wide"
            >
              Launch Command Center
            </Link>
            <Link
              href="/tracking"
              className="px-10 py-5 border-2 border-[#3a3a3f] text-[#f5f5f5] font-semibold text-[14px] rounded-sm hover:border-[#4a4a50] hover:bg-[#1a1a1d] transition-all uppercase tracking-wide"
            >
              View Live Tracking
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#3a3a3f] bg-[#111113] py-12 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-bold text-[14px] text-[#f5f5f5]">
                  MOVE AROUND TMS
                </span>
                <span className="text-[10px] text-[#71717a] uppercase tracking-wider">
                  From Street Smart to Fleet Smart
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-[12px] text-[#a1a1aa] font-medium">
              <Link href="/dashboard" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Dashboard
              </Link>
              <Link href="/tracking" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Tracking
              </Link>
              <Link
                href="/aggregates/reconciliation"
                className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide"
              >
                Reconciliation
              </Link>
              <Link href="/integrations" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Integrations
              </Link>
              <Link href="/detention" className="hover:text-[#f5f5f5] transition-colors uppercase tracking-wide">
                Detention
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
