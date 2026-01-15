import Link from "next/link";

const highlights = [
  {
    title: "Predictive Orchestration",
    detail: "Move from reactive dispatch to proactive, AI-informed routing.",
  },
  {
    title: "Autonomous Exceptions",
    detail: "Detect mismatches early and auto-route resolutions by department.",
  },
  {
    title: "Cross-Border Intelligence",
    detail: "CFDI 4.0 + Carta Porte readiness with compliance visibility.",
  },
];

const quickLinks = [
  { label: "Command Center", href: "/dashboard" },
  { label: "Live Tracking", href: "/tracking" },
  { label: "Workflow Automation", href: "/workflows/plant-ops" },
  { label: "Reconciliation Engine", href: "/aggregates/reconciliation" },
  { label: "Executive Reports", href: "/reports/executive" },
  { label: "Integrations Hub", href: "/integrations" },
];

const trustSignals = [
  { label: "Encrypted Data Flow", detail: "TLS + audited access." },
  { label: "Operational Accuracy", detail: "Exception-first workflows." },
  { label: "Cross-Border Ready", detail: "US–MX compliance." },
];

const stats = [
  { value: "2-5%", label: "Revenue Leakage Recovered" },
  { value: "80%", label: "Faster Reconciliation Cycles" },
  { value: "15-30d", label: "Shorter Payment Cycles" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.4),_transparent_60%)]" />
        <div className="absolute -left-40 top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-400/40 bg-blue-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-blue-200">
              Intelligent Logistics Brain
            </div>
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Move Around TMS
                <span className="block bg-gradient-to-r from-blue-200 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  Predictive. Autonomous. Cross-border ready.
                </span>
              </h1>
              <p className="max-w-2xl text-lg text-slate-200">
                Shift from reactive dispatch to predictive, autonomous
                optimization across the entire logistics chain. Built for speed,
                trust, and clarity across cross-border operations.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-indigo-400"
                >
                  Launch Command Center
                </Link>
                <Link
                  href="/aggregates/reconciliation"
                  className="rounded-full border border-slate-600 px-7 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300 hover:text-white"
                >
                  See Reconciliation Engine
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_0_40px_rgba(15,23,42,0.8)]"
                >
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-semibold text-blue-300">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {trustSignals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                >
                  <div className="text-sm font-semibold text-slate-100">
                    {signal.label}
                  </div>
                  <div className="text-xs text-slate-400">
                    {signal.detail}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-100 transition hover:border-blue-400 hover:bg-slate-900/70"
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-xs text-blue-300 opacity-0 transition group-hover:opacity-100">
                      Open
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Move Around TMS</span>
          <span>Trust-first automation for high-velocity logistics.</span>
        </div>
      </div>
    </div>
  );
}
