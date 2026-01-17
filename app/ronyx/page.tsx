"use client";

import Link from "next/link";

const navItems = [
  { label: "Overview", href: "/ronyx" },
  { label: "Dispatch", href: "/ronyx/dispatch" },
  { label: "Customer Requests", href: "/ronyx/customer-requests" },
  { label: "Loads", href: "/ronyx/loads" },
  { label: "Tickets", href: "/ronyx/tickets" },
  { label: "Aggregates", href: "/ronyx/aggregates" },
  { label: "Workflows", href: "/ronyx/workflows" },
  { label: "Driver App", href: "/ronyx/driver-app" },
  { label: "Customer Portal", href: "/ronyx/portal" },
  { label: "Integrations", href: "/ronyx/integrations" },
  { label: "Roadmap", href: "/ronyx/roadmap" },
  { label: "Onboarding & Support", href: "/ronyx/onboarding-support" },
  { label: "HR & TXDOT Compliance", href: "/ronyx/hr-compliance" },
  { label: "Drivers", href: "/ronyx/drivers" },
  { label: "Trucks", href: "/ronyx/trucks" },
  { label: "Maintenance", href: "/ronyx/maintenance" },
  { label: "Billing", href: "/ronyx/billing" },
  { label: "Finance", href: "/ronyx/finance" },
  { label: "Accounting", href: "/ronyx/accounting" },
  { label: "Payroll", href: "/ronyx/payroll" },
  { label: "Accounts Receivable", href: "/ronyx/accounts-receivable" },
  { label: "Compliance", href: "/ronyx/compliance" },
  { label: "FMCSA", href: "/ronyx/fmcsa" },
  { label: "Reports", href: "/ronyx/reports" },
  { label: "Settings", href: "/ronyx/settings" },
];

const quickActions = [
  { title: "+ Create Load", href: "/ronyx/loads" },
  { title: "📄 New Ticket", href: "/ronyx/tickets" },
  { title: "👤 Assign Driver", href: "/ronyx/drivers" },
  { title: "🚛 Find Backhaul", href: "/ronyx/loads" },
  { title: "⚙️ Quick Dispatch", href: "/ronyx/loads" },
  { title: "💰 Run Payroll", href: "/ronyx/payroll" },
];

export default function RonyxDashboard() {
  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-steel: #dbe5f1;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
          --ronyx-blue: #0ea5e9;
          --ronyx-red: #ef4444;
          --primary: #0ea5e9;
          --danger: #ef4444;
          --success: #10b981;
          --warning: #f59e0b;
          --secondary: #6b7280;
          --disabled: #374151;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
        }
        .ronyx-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          min-height: 100vh;
        }
        .ronyx-sidebar {
          background: #f1f5fb;
          border-right: 1px solid var(--ronyx-border);
          display: flex;
          flex-direction: column;
        }
        .ronyx-brand {
          padding: 24px;
          border-bottom: 1px solid var(--ronyx-border);
        }
        .ronyx-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: var(--ronyx-accent);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-nav {
          flex: 1;
          padding: 18px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          overflow-y: auto;
        }
        .ronyx-nav a {
          padding: 12px 14px;
          border-radius: 12px;
          color: rgba(15, 23, 42, 0.8);
          text-decoration: none;
          border: 1px solid var(--ronyx-border);
          font-weight: 600;
          background: rgba(29, 78, 216, 0.06);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
          transition: transform 120ms ease, box-shadow 120ms ease, background 120ms ease;
        }
        .ronyx-nav a:hover {
          border-color: rgba(29, 78, 216, 0.35);
          color: #0f172a;
          background: rgba(29, 78, 216, 0.14);
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.1);
          transform: translateY(-1px);
        }
        .ronyx-support {
          padding: 20px 24px;
          border-top: 1px solid var(--ronyx-border);
          font-size: 0.85rem;
          color: rgba(15, 23, 42, 0.65);
        }
        .ronyx-main {
          padding: 28px 32px 40px;
        }
        .ronyx-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--ronyx-border);
          margin-bottom: 24px;
        }
        .ronyx-topbar input {
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 14px;
          color: #0f172a;
          width: 280px;
        }
        .ronyx-pill {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action {
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #fff;
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-card h3 {
          margin: 0 0 8px;
          font-size: 1rem;
        }
        .ronyx-table {
          display: grid;
          gap: 12px;
        }
        .ronyx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
        .quick-actions-bar {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .btn-primary,
        .btn-secondary,
        .btn-success,
        .btn-warning,
        .btn-danger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: none;
          padding: 0 20px;
          height: 40px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
        }
        .btn-primary {
          background: var(--primary);
          color: #ffffff;
        }
        .btn-primary:hover {
          background: #0c94d1;
        }
        .btn-primary:active {
          background: #0a83b9;
        }
        .btn-secondary {
          background: var(--secondary);
          color: #ffffff;
        }
        .btn-secondary:hover {
          background: #4b5563;
        }
        .btn-secondary:active {
          background: #374151;
        }
        .btn-success {
          background: var(--success);
          color: #ffffff;
        }
        .btn-success:hover {
          background: #059669;
        }
        .btn-success:active {
          background: #047857;
        }
        .btn-warning {
          background: var(--warning);
          color: #ffffff;
        }
        .btn-warning:hover {
          background: #d97706;
        }
        .btn-warning:active {
          background: #b45309;
        }
        .btn-danger {
          background: var(--danger);
          color: #ffffff;
        }
        .btn-danger:hover {
          background: #dc2626;
        }
        .btn-danger:active {
          background: #b91c1c;
        }
        .btn-sm {
          height: 32px;
          padding: 0 12px;
          font-size: 0.75rem;
          text-transform: uppercase;
        }
        .status-badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .in-transit {
          background: #dbeafe;
          color: #1e40af;
        }
        .completed {
          background: #d1fae5;
          color: #065f46;
        }
        .flagged {
          background: #fef3c7;
          color: #92400e;
        }
        .alert-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(29, 78, 216, 0.16);
        }
      `}</style>

      <div className="ronyx-layout">
        <aside className="ronyx-sidebar">
          <div className="ronyx-brand">
            <div className="ronyx-badge">Ronyx Logistics LLC</div>
            <h2 style={{ marginTop: 12, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
              RONYX LOGISTICS LLC
            </h2>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Powered by MoveAround TMS · iGotta Technologies
            </p>
          </div>

          <nav className="ronyx-nav">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ronyx-support">
            <div>Support: support@movearoundtms.com</div>
            <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
              <Link href="/ronyx/terms" style={{ color: "var(--ronyx-accent)" }}>
                Terms
              </Link>
              <Link href="/ronyx/privacy" style={{ color: "var(--ronyx-accent)" }}>
                Privacy
              </Link>
            </div>
      </div>
        </aside>

        <main className="ronyx-main">
          <div className="ronyx-topbar">
          <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800 }}>Dump Fleet Command Center</h1>
              <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
                Live control for dispatch, backhauls, and ticket accuracy.
            </p>
          </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input type="text" placeholder="Search loads, drivers, tickets..." />
              <details className="ronyx-action" style={{ position: "relative" }}>
                <summary style={{ listStyle: "none", cursor: "pointer" }}>+ Quick Add ▼</summary>
                <div style={{ position: "absolute", right: 0, top: "110%", background: "#fff", border: "1px solid var(--ronyx-border)", borderRadius: 12, padding: 12, minWidth: 200, zIndex: 20 }}>
                  <Link href="/ronyx/loads" className="ronyx-row" style={{ marginBottom: 8 }}>New Load</Link>
                  <Link href="/ronyx/customer-requests" className="ronyx-row" style={{ marginBottom: 8 }}>New Customer</Link>
                  <Link href="/ronyx/drivers" className="ronyx-row" style={{ marginBottom: 8 }}>New Driver</Link>
                  <Link href="/ronyx/tickets" className="ronyx-row">New Ticket</Link>
                </div>
              </details>
              <Link href="/ronyx/reports" className="ronyx-action">
                📊 Reports
              </Link>
              <Link href="/ronyx/alerts" className="ronyx-action">
                🔔 Alerts (3)
              </Link>
              <Link href="/ronyx/settings" className="ronyx-action primary">
                👤 Portal Admin
              </Link>
            </div>
        </div>

          <section className="ronyx-grid" style={{ marginBottom: 22 }}>
            {[
              { label: "Active Loads", value: "38", note: "6 in queue", href: "/ronyx/loads?status=active" },
              { label: "Empty Miles Today", value: "14%", note: "↓ 3% vs last week", href: "/ronyx/tracking?filter=empty" },
              { label: "Tickets Pending", value: "12", note: "3 flagged for review", href: "/ronyx/tickets?status=pending" },
              { label: "On‑Time Rate", value: "97.4%", note: "2.6% late", href: "/ronyx/reports?filter=late" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href} className="ronyx-card" style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--ronyx-accent)", marginTop: 6 }}>
                  {stat.value}
                </div>
                <div style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.8rem", marginTop: 6 }}>
                  {stat.note}
                </div>
              </Link>
            ))}
          </section>

          <section className="ronyx-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3>Quick Actions</h3>
              <span style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.8rem" }}>Turn goals into tasks</span>
            </div>
            <div className="quick-actions-bar">
              <Link href="/ronyx/loads" className="btn-primary">+ Create Load</Link>
              <Link href="/ronyx/drivers" className="btn-primary">Assign Driver</Link>
              <Link href="/ronyx/payroll" className="btn-success">Run Payroll</Link>
              <Link href="/ronyx/reports" className="btn-secondary">View Reports</Link>
            </div>
          </section>

          <section className="ronyx-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3>SaaS System Layers</h3>
              <span style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.8rem" }}>Create data, not just view it</span>
            </div>
            <div className="ronyx-grid">
              <div className="ronyx-card">
                <h4 style={{ marginBottom: 8 }}>Input Layers</h4>
                <p style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.85rem" }}>
                  Dispatcher web app + driver mobile input to capture loads, tickets, and GPS.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/ronyx/driver-app" className="ronyx-action">
                    Driver App
                  </Link>
                  <Link href="/ronyx/loads" className="ronyx-action">
                    Dispatch Input
                  </Link>
                </div>
              </div>
              <div className="ronyx-card">
                <h4 style={{ marginBottom: 8 }}>Workflow Engines</h4>
                <p style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.85rem" }}>
                  Order → Dispatch → Ticket → Invoice automation with approvals and audit trails.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/ronyx/workflows" className="ronyx-action">
                    View Workflows
                  </Link>
                  <Link href="/ronyx/tickets" className="ronyx-action">
                    Tickets
                  </Link>
                </div>
              </div>
              <div className="ronyx-card">
                <h4 style={{ marginBottom: 8 }}>External Interfaces</h4>
                <p style={{ color: "rgba(15,23,42,0.6)", fontSize: "0.85rem" }}>
                  Customer portal + integrations for shippers, brokers, and accounting tools.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href="/ronyx/portal" className="ronyx-action">
                    Customer Portal
                  </Link>
                  <Link href="/ronyx/integrations" className="ronyx-action">
                    Integrations
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="ronyx-grid">
            <div className="ronyx-card" style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3>Live Loads</h3>
                <Link href="/ronyx/loads" className="ronyx-action">
                  View all
                </Link>
              </div>
              <div className="ronyx-table">
                <div className="ronyx-row" style={{ fontWeight: 700 }}>
                  <span>Load #</span>
                  <span>Driver</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {[
                  { id: "LD-4021", status: "IN TRANSIT", driver: "D. Perez" },
                  { id: "LD-4025", status: "LOADING", driver: "S. Grant" },
                  { id: "LD-4029", status: "QUEUED", driver: "J. Lane" },
                ].map((load) => (
                  <div key={load.id} className="ronyx-row">
                    <span>{load.id}</span>
                    <span>{load.driver}</span>
                    <span className={`status-badge ${load.status === "IN TRANSIT" ? "in-transit" : load.status === "LOADING" ? "flagged" : "completed"}`}>
                      {load.status}
                    </span>
                    <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn-sm btn-secondary">Message</button>
                      <button className="btn-sm btn-secondary">Update</button>
                      <button className="btn-sm btn-warning">Flag</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ronyx-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3>Alerts</h3>
                <Link href="/ronyx/compliance" className="ronyx-action">
                  Manage
                </Link>
              </div>
              <div className="ronyx-table">
                <div className="alert-bar">
                  <span>⚠️ Truck 18 due for maintenance in 3 days</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn-primary">Schedule Now</button>
                    <button className="btn-secondary">Dismiss</button>
                  </div>
                </div>
                <div className="alert-bar" style={{ marginTop: 10 }}>
                  <span>⚠️ Ticket #T-884 mismatch flagged</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn-primary">Review</button>
                    <button className="btn-secondary">Dismiss</button>
                  </div>
                </div>
                <div className="alert-bar" style={{ marginTop: 10 }}>
                  <span>⚠️ Load LD-4025 detention timer running</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn-primary">Notify Driver</button>
                    <button className="btn-secondary">Contact Site</button>
                  </div>
                </div>
              </div>
        </div>
          </section>
      </main>
      </div>
    </div>
  );
}
