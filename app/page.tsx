"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Zap,
  Shield,
  TrendingUp,
  ChevronRight,
  CheckCircle,
  Rocket,
  BarChart3,
  Globe,
  Lock,
  Clock,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Predictive Orchestration",
    description:
      "AI-powered routing that anticipates delays and optimizes in real-time.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Autonomous Exceptions",
    description:
      "Auto-detect mismatches and route resolutions to the right department instantly.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Globe,
    title: "Cross-Border Intelligence",
    description:
      "CFDI 4.0 + Carta Porte compliance with real-time validation.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: BarChart3,
    title: "Revenue Shield",
    description:
      "Recover 2-5% revenue leakage through intelligent reconciliation.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Clock,
    title: "Automated Detention",
    description:
      "Track facility dwell time automatically and generate claims instantly.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: Lock,
    title: "Audit-Ready Compliance",
    description:
      "Every transaction tracked, timestamped, and compliance-verified.",
    gradient: "from-violet-500 to-purple-500",
  },
];

const stats = [
  { value: "2-5%", label: "Revenue Recovered", suffix: "" },
  { value: "80%", label: "Faster Reconciliation", suffix: "" },
  { value: "15-30", label: "Days Shorter Payment Cycle", suffix: "d" },
  { value: "99.5%", label: "Data Accuracy", suffix: "" },
];

const useCases = [
  {
    title: "3PL Operations",
    description: "Multi-client billing, carrier management, and real-time visibility.",
    link: "/dashboard",
  },
  {
    title: "Manufacturing Plants",
    description: "Automated ticket reconciliation and invoice-to-PO matching.",
    link: "/aggregates/reconciliation",
  },
  {
    title: "Cross-Border Freight",
    description: "CFDI 4.0 compliance and automated customs documentation.",
    link: "/integrations",
  },
  {
    title: "Fleet Management",
    description: "Driver payroll, detention tracking, and performance analytics.",
    link: "/detention",
  },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-2000" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Move Around TMS
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div
            className={`text-center transition-all duration-1000 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm mb-8">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-200 font-medium">
                Intelligent Logistics Brain
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
              <span className="block text-white">The Future of</span>
              <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Logistics is Autonomous
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
              Predictive routing. Autonomous exception handling. Cross-border
              intelligence. Built for high-velocity 3PLs and manufacturers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/dashboard"
                className="group px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/aggregates/reconciliation"
                className="px-8 py-4 rounded-full border-2 border-white/20 hover:border-blue-400 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all backdrop-blur-sm"
              >
                See Reconciliation Engine
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {stats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={`transition-all duration-1000 delay-${idx * 100}`}
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? "translateY(0)" : "translateY(20px)",
                  }}
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all">
                    <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                      {stat.value}
                      {stat.suffix}
                    </div>
                    <div className="text-sm text-gray-400 uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                High Performance
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Every feature designed to eliminate manual work and maximize
              operational efficiency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative py-24 px-6 bg-gradient-to-b from-black to-blue-950/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for Your{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Operation
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Whether you're a 3PL, manufacturer, or cross-border carrier—we've
              got you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <Link
                key={useCase.title}
                href={useCase.link}
                className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">
                  {useCase.title}
                </h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  {useCase.description}
                </p>
                <div className="flex items-center gap-2 text-blue-400 font-semibold">
                  Explore
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border border-blue-500/20 rounded-3xl p-12 backdrop-blur-sm">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Lock className="w-10 h-10 text-blue-400 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Bank-Level Security</h3>
                <p className="text-gray-400 text-sm">
                  TLS encryption + SOC 2 compliance
                </p>
              </div>
              <div className="text-center">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">99.5% Accuracy</h3>
                <p className="text-gray-400 text-sm">
                  Exception-first matching engine
                </p>
              </div>
              <div className="text-center">
                <TrendingUp className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Real-Time Intelligence</h3>
                <p className="text-gray-400 text-sm">
                  Live tracking + predictive alerts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Ready to{" "}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Transform
            </span>{" "}
            Your Operations?
          </h2>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Join forward-thinking 3PLs and manufacturers automating their
            logistics with AI-powered intelligence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group px-10 py-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg transition-all shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 flex items-center gap-3"
            >
              Launch Command Center
              <Rocket className="w-6 h-6 group-hover:translate-y-[-2px] transition-transform" />
            </Link>
            <Link
              href="/tracking"
              className="px-10 py-5 rounded-full border-2 border-white/20 hover:border-blue-400 bg-white/5 hover:bg-white/10 text-white font-semibold text-lg transition-all backdrop-blur-sm"
            >
              View Live Tracking
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Move Around TMS</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/tracking" className="hover:text-white transition-colors">
                Tracking
              </Link>
              <Link
                href="/aggregates/reconciliation"
                className="hover:text-white transition-colors"
              >
                Reconciliation
              </Link>
              <Link href="/integrations" className="hover:text-white transition-colors">
                Integrations
              </Link>
              <Link href="/detention" className="hover:text-white transition-colors">
                Detention
              </Link>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} Move Around TMS
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
