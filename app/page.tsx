import Link from "next/link";

const highlights = [
  {
    title: "Cross-Border Automation",
    detail: "CFDI 4.0 + Carta Porte readiness with exception handling.",
  },
  {
    title: "Plant Ops Reconciliation",
    detail: "Scale tickets, lab results, delivery proofs in one workflow.",
  },
  {
    title: "3PL Billing Engine",
    detail: "Flexible profiles, rate cards, and automated invoicing.",
  },
];

const quickLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tracking", href: "/tracking" },
  { label: "Workflows", href: "/workflows/plant-ops" },
  { label: "Reconciliation", href: "/aggregates/reconciliation" },
  { label: "Reports", href: "/reports/executive" },
  { label: "Integrations", href: "/integrations" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-200">
              Built for US-MX Manufacturing 3PLs
            </div>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Move Around TMS
              <span className="block text-blue-300">
                Command center for cross-border operations.
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-slate-200">
              Replace spreadsheet chaos with a unified workflow for carriers,
              reconciliation, and exception-driven billing. Built to surface
              discrepancies fast and keep freight moving.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="rounded-md bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400"
              >
                Open Dashboard
              </Link>
              <Link
                href="/aggregates/reconciliation"
                className="rounded-md border border-slate-500 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-blue-300 hover:text-white"
              >
                View Reconciliation
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
                >
                  <h3 className="text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-100 transition hover:border-blue-400 hover:bg-slate-900/70"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Move Around TMS</span>
          <span>Operational clarity for high-velocity logistics.</span>
        </div>
      </div>
    </div>
  );
}
