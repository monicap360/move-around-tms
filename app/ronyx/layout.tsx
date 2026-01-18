"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const mainNav = [
  { label: "Dashboard", href: "/ronyx" },
  { label: "Fleet", href: "/ronyx/fleet" },
  { label: "Jobs", href: "/ronyx/jobs" },
  { label: "Dispatch", href: "/ronyx/loads" },
  { label: "Billing", href: "/ronyx/billing" },
  { label: "Reports", href: "/ronyx/reports" },
];

const fleetNav = [
  { label: "Truck Tracking", href: "/ronyx/trucks" },
  { label: "Driver Management", href: "/ronyx/drivers" },
  { label: "Maintenance", href: "/ronyx/maintenance" },
];

const dispatchNav = [
  { label: "Load Board", href: "/ronyx/loads" },
  { label: "Route Planning", href: "/ronyx/dispatch" },
  { label: "Assignment", href: "/ronyx/dispatch" },
];

const aiNav = [
  { label: "Route Optimization", href: "/ronyx/dispatch" },
  { label: "Load Planning", href: "/ronyx/loads" },
  { label: "Analytics", href: "/ronyx/reports" },
];

const adminNav = [
  { label: "Settings", href: "/ronyx/settings" },
  { label: "Integrations", href: "/ronyx/integrations" },
  { label: "Admin", href: "/ronyx/accounting" },
];

export default function RonyxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [metrics, setMetrics] = useState({
    fleet: { active: 18, total: 24, moving: 12, idle: 4 },
    deliveries: { today: 142, completed: 128, in_progress: 14, on_time_rate: 94.7 },
    alerts: { total: 3, critical: 1, warning: 2, unread: 3 },
    efficiency: { fuel_avg: 5.8, mileage_today: 8420, driver_hours: 142 },
    last_updated: new Date().toISOString(),
    data_freshness: "just now",
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/ronyx/metrics", { cache: "no-store" });
        const data = await res.json();
        if (isMounted && data?.metrics) {
          setMetrics(data.metrics);
        }
      } catch {
        // keep last known metrics
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`ronyx-app ${collapsed ? "collapsed" : ""} ${mobileNavOpen ? "mobile-open" : ""}`}>
      <style jsx global>{`
        .ronyx-app {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
          background: #eef2ff;
        }
        .ronyx-app.collapsed {
          grid-template-columns: 88px 1fr;
        }
        .ronyx-top-nav {
          grid-column: 2 / -1;
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 20px;
          background: #0f172a;
          color: #f8fafc;
          border-bottom: 1px solid rgba(148, 163, 184, 0.25);
        }
        .ronyx-top-group {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .ronyx-search {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(148, 163, 184, 0.35);
          color: #f8fafc;
          padding: 8px 12px;
          border-radius: 12px;
          min-width: 240px;
        }
        .ronyx-stat-pill {
          background: rgba(255, 255, 255, 0.14);
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.8rem;
        }
        .ronyx-side-nav {
          grid-row: 1 / span 2;
          background: #111827;
          color: #e2e8f0;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .ronyx-mobile-toggle {
          display: none;
          background: rgba(15, 23, 42, 0.6);
          color: #f8fafc;
          border: 1px solid rgba(148, 163, 184, 0.35);
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 600;
        }
        .ronyx-side-nav .section-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(148, 163, 184, 0.7);
        }
        .ronyx-side-nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          color: inherit;
          text-decoration: none;
        }
        .ronyx-side-nav a.active {
          background: rgba(59, 130, 246, 0.25);
          color: #ffffff;
        }
        .ronyx-content {
          grid-column: 2 / -1;
          padding: 16px 20px 40px;
        }
        .ronyx-logo {
          font-weight: 800;
          font-size: 1rem;
        }
        .ronyx-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
        }
        .ronyx-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
        }
        @media (max-width: 1024px) {
          .ronyx-app {
            grid-template-columns: 1fr;
          }
          .ronyx-top-nav {
            grid-column: 1 / -1;
          }
          .ronyx-side-nav {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 280px;
            transform: translateX(-100%);
            transition: transform 160ms ease;
            z-index: 40;
          }
          .ronyx-app.mobile-open .ronyx-side-nav {
            transform: translateX(0);
          }
          .ronyx-app.mobile-open::after {
            content: "";
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.45);
            z-index: 35;
          }
          .ronyx-content {
            grid-column: 1 / -1;
          }
          .ronyx-mobile-toggle {
            display: inline-flex;
          }
        }
        @media (max-width: 768px) {
          .ronyx-top-nav {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 14px;
          }
          .ronyx-top-group {
            width: 100%;
            justify-content: space-between;
          }
          .ronyx-search {
            width: 100%;
            min-width: unset;
          }
          .ronyx-content {
            padding: 12px 12px 28px;
          }
          .ronyx-stat-pill {
            font-size: 0.75rem;
          }
          .ronyx-shell {
            padding: 16px !important;
          }
          .ronyx-container {
            padding: 0 4px;
          }
          .ronyx-card {
            padding: 14px;
          }
          .ronyx-grid {
            grid-template-columns: 1fr !important;
            gap: 12px;
          }
          .ronyx-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          table {
            display: block;
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          thead,
          tbody,
          tr,
          th,
          td {
            white-space: nowrap;
          }
          .ronyx-input,
          .ronyx-action,
          .ronyx-btn {
            width: 100%;
          }
        }
        @media (max-width: 540px) {
          .ronyx-top-group {
            flex-direction: column;
            align-items: flex-start;
          }
          .ronyx-stat-pill {
            width: 100%;
            text-align: left;
          }
        }
      `}</style>

      <aside className="ronyx-side-nav">
        <div className="ronyx-logo">Move Around TMS</div>
        <button
          className="ronyx-stat-pill"
          onClick={() => setCollapsed((prev) => !prev)}
        >
          {collapsed ? "Expand Nav" : "Collapse Nav"}
        </button>
        <div>
          <div className="section-title">Main Modules</div>
          {mainNav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <div className="section-title">Fleet Management</div>
          {fleetNav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <div className="section-title">Dispatch Center</div>
          {dispatchNav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <div className="section-title">AI Tools</div>
          {aiNav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <div className="section-title">Settings / Admin</div>
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      <header className="ronyx-top-nav">
        <div className="ronyx-top-group">
          <button className="ronyx-mobile-toggle" onClick={() => setMobileNavOpen((prev) => !prev)}>
            {mobileNavOpen ? "Close Menu" : "Menu"}
          </button>
          <span className="ronyx-logo">Ronyx Logistics</span>
          <span className="ronyx-stat-pill">
            {metrics.fleet.active}/{metrics.fleet.total} Trucks Active
          </span>
          <span className="ronyx-stat-pill">Deliveries Today: {metrics.deliveries.today}</span>
          <span className="ronyx-stat-pill">Alerts: {metrics.alerts.total}</span>
          <span className="ronyx-stat-pill">On-time: {metrics.deliveries.on_time_rate}%</span>
        </div>
        <div className="ronyx-top-group">
          <input className="ronyx-search" placeholder="Search trucks, loads, drivers..." />
          <span className="ronyx-status">
            <span className="ronyx-status-dot" /> System Online
          </span>
          <span className="ronyx-stat-pill">{metrics.data_freshness}</span>
          <span className="ronyx-stat-pill">{now.toLocaleTimeString()}</span>
          <button className="ronyx-stat-pill">Help</button>
          <button className="ronyx-stat-pill">Notifications</button>
          <button className="ronyx-stat-pill">Profile</button>
          <button className="ronyx-stat-pill">Apps</button>
        </div>
      </header>

      <main className="ronyx-content">{children}</main>
    </div>
  );
}
