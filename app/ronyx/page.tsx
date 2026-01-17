"use client";

import Link from "next/link";

const navItems = [
  { label: "Overview", href: "/ronyx" },
  { label: "Dispatch", href: "/ronyx/dispatch" },
  { label: "Loads", href: "/ronyx/loads" },
  { label: "Backhaul Board", href: "/ronyx/backhaul" },
  { label: "Pit Tickets", href: "/ronyx/tickets" },
  { label: "Drivers", href: "/ronyx/drivers" },
  { label: "Trucks", href: "/ronyx/trucks" },
  { label: "Maintenance", href: "/ronyx/maintenance" },
  { label: "Billing", href: "/ronyx/billing" },
  { label: "Compliance", href: "/ronyx/compliance" },
  { label: "Reports", href: "/ronyx/reports" },
  { label: "Settings", href: "/ronyx/settings" },
];

const quickActions = [
  { title: "Create Load", href: "/ronyx/loads" },
  { title: "Assign Driver", href: "/ronyx/drivers" },
  { title: "Open Backhaul Board", href: "/ronyx/backhaul" },
  { title: "Scan Pit Ticket", href: "/ronyx/tickets" },
];

export default function RonyxDashboard() {
  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");
        :root {
          --ronyx-black: #080808;
          --ronyx-carbon: #121212;
          --ronyx-steel: #1e1e1e;
          --ronyx-border: rgba(255, 215, 0, 0.25);
          --ronyx-accent: #ffd700;
          --ronyx-blue: #00b4ff;
          --ronyx-red: #ff2800;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(0, 180, 255, 0.08), transparent 55%), var(--ronyx-black);
          color: #ffffff;
        }
        .ronyx-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          min-height: 100vh;
        }
        .ronyx-sidebar {
          background: var(--ronyx-carbon);
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
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
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
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.75);
          text-decoration: none;
          border: 1px solid transparent;
          font-weight: 600;
        }
        .ronyx-nav a:hover {
          border-color: var(--ronyx-border);
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }
        .ronyx-support {
          padding: 20px 24px;
          border-top: 1px solid var(--ronyx-border);
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
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
          background: var(--ronyx-steel);
          border: 1px solid var(--ronyx-border);
          border-radius: 10px;
          padding: 10px 14px;
          color: #fff;
          width: 280px;
        }
        .ronyx-pill {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.75);
        }
        .ronyx-action {
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.04);
        }
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #111;
        }
        .ronyx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 14px;
          padding: 18px;
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
          border-radius: 10px;
          background: var(--ronyx-steel);
          border: 1px solid rgba(255, 215, 0, 0.15);
        }
      `}</style>

      <div className="ronyx-layout">
        <aside className="ronyx-sidebar">
          <div className="ronyx-brand">
            <div className="ronyx-badge">Ronyx Dump Fleet</div>
            <h2 style={{ marginTop: 12, fontSize: "1.25rem", fontWeight: 800 }}>RONYX LOGISTICS</h2>
            <p style={{ color: "rgba(255,255,255,0.6)", marginTop: 6 }}>
              Dump Truck Operations Command
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
              <p style={{ color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                Live control for pit‑to‑site hauling, backhauls, and ticket accuracy.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input type="text" placeholder="Search loads, drivers, tickets..." />
              <span className="ronyx-pill">Shift: Morning</span>
              <Link href="/ronyx/alerts" className="ronyx-action">
                Notifications
              </Link>
              <Link href="/ronyx/settings" className="ronyx-action primary">
                Portal Admin
              </Link>
            </div>
          </div>

          <section className="ronyx-grid" style={{ marginBottom: 22 }}>
            {[
              { label: "Active Loads", value: "38", note: "6 at pit queue" },
              { label: "Empty Miles Today", value: "14%", note: "↓ 3% vs last week" },
              { label: "Tickets Pending", value: "12", note: "3 flagged for review" },
              { label: "On‑Time Rate", value: "97.4%", note: "+1.1% WoW" },
            ].map((stat) => (
              <div key={stat.label} className="ronyx-card">
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--ronyx-accent)", marginTop: 6 }}>
                  {stat.value}
                </div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem", marginTop: 6 }}>
                  {stat.note}
                </div>
              </div>
            ))}
          </section>

          <section className="ronyx-card" style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3>Quick Actions</h3>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>Dump fleet tools</span>
            </div>
            <div className="ronyx-grid">
              {quickActions.map((action) => (
                <Link key={action.title} href={action.href} className="ronyx-row">
                  <span>{action.title}</span>
                  <span style={{ color: "var(--ronyx-accent)" }}>→</span>
                </Link>
              ))}
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
                {[
                  { id: "LD-4021", route: "Pit 7 → I‑45 Jobsite", status: "In Transit", driver: "D. Perez" },
                  { id: "LD-4025", route: "Pit 7 → Beltway 8", status: "Loading", driver: "S. Grant" },
                  { id: "LD-4029", route: "Pit 3 → Katy Site", status: "Queued", driver: "J. Lane" },
                ].map((load) => (
                  <div key={load.id} className="ronyx-row">
                    <div>
                      <strong>{load.id}</strong> • {load.route}
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                        Driver: {load.driver}
                      </div>
                    </div>
                    <span style={{ color: "var(--ronyx-accent)", fontWeight: 700 }}>{load.status}</span>
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
                {[
                  "Truck 18 due for maintenance in 3 days",
                  "Ticket #T-884 mismatch flagged",
                  "Load LD-4025 detention timer running",
                ].map((alert) => (
                  <div key={alert} className="ronyx-row">
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
