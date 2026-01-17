import Link from "next/link";

type SectionPageProps = {
  params: { section: string };
};

const sectionConfig: Record<
  string,
  {
    label: string;
    description: string;
    actions: { label: string; href: string }[];
    rows: { title: string; subtitle: string; status: string }[];
  }
> = {
  dispatch: {
    label: "Dispatch",
    description: "Assign trucks, manage pit queues, and keep loads moving.",
    actions: [
      { label: "Create Load", href: "/ronyx/loads" },
      { label: "Assign Driver", href: "/ronyx/drivers" },
      { label: "Open Backhaul Board", href: "/ronyx/backhaul" },
    ],
    rows: [
      { title: "LD-5081 • Pit 7 → I‑45 Jobsite", subtitle: "Driver: D. Perez", status: "In Transit" },
      { title: "LD-5084 • Pit 3 → Beltway 8", subtitle: "Driver: S. Grant", status: "Loading" },
      { title: "LD-5087 • Pit 5 → Katy Site", subtitle: "Driver: J. Lane", status: "Queued" },
    ],
  },
  loads: {
    label: "Loads",
    description: "Track load status, routes, and profitability in one view.",
    actions: [
      { label: "New Load", href: "/ronyx/loads" },
      { label: "Tickets", href: "/ronyx/tickets" },
    ],
    rows: [
      { title: "LD-5069 • Pit 2 → Downtown", subtitle: "Material: Base", status: "Delivered" },
      { title: "LD-5074 • Pit 7 → I‑10", subtitle: "Material: Gravel", status: "In Transit" },
      { title: "LD-5079 • Pit 3 → Loop 610", subtitle: "Material: Sand", status: "Loading" },
    ],
  },
  drivers: {
    label: "Drivers",
    description: "Availability, compliance, and performance by driver.",
    actions: [
      { label: "Assign Driver", href: "/ronyx/dispatch" },
      { label: "Driver Payroll", href: "/ronyx/payroll" },
    ],
    rows: [
      { title: "D. Perez", subtitle: "Available • 9.2 hrs on duty", status: "Ready" },
      { title: "S. Grant", subtitle: "On load LD-5084", status: "On Route" },
      { title: "J. Lane", subtitle: "Pit queue • 32 min", status: "Idle Alert" },
    ],
  },
  trucks: {
    label: "Trucks",
    description: "Live truck status, utilization, and maintenance.",
    actions: [
      { label: "Schedule Maintenance", href: "/ronyx/maintenance" },
      { label: "View Live Tracking", href: "/ronyx/tracking" },
    ],
    rows: [
      { title: "Truck 18 • Kenworth", subtitle: "2,410 hrs • Next service 3 days", status: "Due Soon" },
      { title: "Truck 22 • Mack", subtitle: "On load LD-5074", status: "Active" },
      { title: "Truck 31 • Freightliner", subtitle: "Idle 18 min", status: "Idle Alert" },
    ],
  },
  backhaul: {
    label: "Backhaul Board",
    description: "Fill empty miles with nearby backhaul opportunities.",
    actions: [
      { label: "Find Loads", href: "/ronyx/loads" },
      { label: "Dispatch", href: "/ronyx/dispatch" },
    ],
    rows: [
      { title: "22‑ton asphalt • 2.1 mi away", subtitle: "Adds $420 revenue", status: "Match Ready" },
      { title: "15‑ton sand • 4.6 mi away", subtitle: "Adds $310 revenue", status: "Match Ready" },
      { title: "Concrete return • 6.2 mi away", subtitle: "Adds $260 revenue", status: "Match Ready" },
    ],
  },
  tickets: {
    label: "Tickets",
    description: "Upload, reconcile, and approve ticketed loads.",
    actions: [
      { label: "Open Tickets", href: "/ronyx/tickets" },
      { label: "Run Reconciliation", href: "/ronyx/tickets" },
    ],
    rows: [
      { title: "T-884 • Gravel", subtitle: "Weight mismatch flagged", status: "Needs Review" },
      { title: "T-889 • Sand", subtitle: "OCR complete", status: "Pending" },
      { title: "T-892 • Base", subtitle: "Approved", status: "Approved" },
    ],
  },
  maintenance: {
    label: "Maintenance",
    description: "Upcoming service windows and urgent issues.",
    actions: [
      { label: "Create Work Order", href: "/ronyx/maintenance" },
      { label: "View Trucks", href: "/ronyx/trucks" },
    ],
    rows: [
      { title: "Truck 18 • Brake service", subtitle: "Due in 3 days", status: "Scheduled" },
      { title: "Truck 31 • Oil change", subtitle: "Overdue 120 miles", status: "Critical" },
      { title: "Truck 22 • Tire rotation", subtitle: "Due next week", status: "Planned" },
    ],
  },
  billing: {
    label: "Billing",
    description: "Invoice status and payment tracking.",
    actions: [
      { label: "Generate Invoice", href: "/ronyx/billing" },
      { label: "Tickets", href: "/ronyx/tickets" },
    ],
    rows: [
      { title: "INV-2041 • $12,480", subtitle: "Customer: Gulf Aggregate", status: "Processing" },
      { title: "INV-2037 • $8,230", subtitle: "Customer: Metro Paving", status: "Paid" },
      { title: "INV-2043 • $6,900", subtitle: "Customer: City Site", status: "Unpaid" },
    ],
  },
  compliance: {
    label: "Compliance",
    description: "HOS, safety, and audit readiness.",
    actions: [
      { label: "Review Alerts", href: "/ronyx/alerts" },
      { label: "Compliance Reports", href: "/ronyx/reports" },
    ],
    rows: [
      { title: "Driver J. Lane", subtitle: "HOS limit approaching", status: "Warning" },
      { title: "Truck 18", subtitle: "Inspection due", status: "Due Soon" },
      { title: "Ticket T-884", subtitle: "Missing signature", status: "Needs Review" },
    ],
  },
  tracking: {
    label: "Tracking",
    description: "Live location visibility for loads and drivers.",
    actions: [
      { label: "Dispatch View", href: "/ronyx/dispatch" },
      { label: "Load Board", href: "/ronyx/loads" },
    ],
    rows: [
      { title: "LD-5081", subtitle: "8 mins to jobsite", status: "On Route" },
      { title: "LD-5084", subtitle: "At pit queue 12 mins", status: "Queued" },
      { title: "LD-5087", subtitle: "Waiting to load", status: "Loading" },
    ],
  },
  payroll: {
    label: "Payroll",
    description: "Driver settlements and ticket-based pay.",
    actions: [
      { label: "Run Payroll", href: "/ronyx/payroll" },
      { label: "Tickets", href: "/ronyx/tickets" },
    ],
    rows: [
      { title: "Pay Run • Week 03", subtitle: "12 drivers • $48,220", status: "Processing" },
      { title: "D. Perez", subtitle: "28 tickets • $3,420", status: "Ready" },
      { title: "S. Grant", subtitle: "24 tickets • $2,980", status: "Ready" },
    ],
  },
  reports: {
    label: "Reports",
    description: "Performance, utilization, and revenue summaries.",
    actions: [
      { label: "Download Report", href: "/ronyx/reports" },
      { label: "Executive View", href: "/ronyx/reports" },
    ],
    rows: [
      { title: "Weekly Profit Report", subtitle: "Empty miles down 3%", status: "Ready" },
      { title: "Ticket Discrepancy Report", subtitle: "3 flagged tickets", status: "Review" },
      { title: "Driver Efficiency", subtitle: "Top: D. Perez", status: "Ready" },
    ],
  },
  settings: {
    label: "Settings",
    description: "Manage users, roles, and operational defaults.",
    actions: [
      { label: "Company Profile", href: "/ronyx/settings" },
      { label: "Notification Rules", href: "/ronyx/settings" },
    ],
    rows: [
      { title: "Company Info", subtitle: "Ronyx Logistics LLC", status: "Configured" },
      { title: "Rate Defaults", subtitle: "Per Load • $420", status: "Configured" },
      { title: "User Roles", subtitle: "7 active users", status: "Configured" },
    ],
  },
};

export default function RonyxSectionPage({ params }: SectionPageProps) {
  const config = sectionConfig[params.section] || {
    label: "Module",
    description: "Operational tools for Ronyx Logistics.",
    actions: [{ label: "Back to Dashboard", href: "/ronyx" }],
    rows: [],
  };

  return (
    <div className="min-h-screen bg-[#e2eaf6] text-slate-900">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Ronyx TMS</p>
            <h1 className="text-3xl font-bold text-[#1d4ed8]">{config.label}</h1>
          </div>
          <Link
            href="/ronyx"
            className="px-4 py-2 bg-white border border-[#c7d6ea] rounded-lg text-sm text-slate-700 hover:border-[#1d4ed8]/60 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-[#f8fafc] border border-[#c7d6ea] rounded-2xl p-6 shadow-[0_18px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm text-slate-600 mb-4">{config.description}</p>
          <div className="flex flex-wrap gap-3 mb-6">
            {config.actions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="px-4 py-2 bg-white border border-[#c7d6ea] rounded-full text-sm text-slate-700 hover:border-[#1d4ed8]/60 transition-all"
              >
                {action.label}
              </Link>
            ))}
          </div>
          {config.rows.length === 0 ? (
            <p className="text-sm text-slate-500">No records yet.</p>
          ) : (
            <div className="space-y-3">
              {config.rows.map((row) => (
                <div
                  key={row.title}
                  className="flex items-center justify-between bg-white border border-[#c7d6ea] rounded-xl px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{row.title}</div>
                    <div className="text-xs text-slate-500">{row.subtitle}</div>
                  </div>
                  <span className="text-xs font-semibold text-[#1d4ed8]">{row.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
