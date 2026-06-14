"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_GROUPS = [
  {
    section: "Operations",
    items: [
      { label: "Dashboard",          href: "/ronyx" },
      { label: "Dispatch Board",     href: "/ronyx/dispatch/board" },
      { label: "Operations Center",  href: "/ronyx/operations-center" },
      { label: "Loads",              href: "/ronyx/loads" },
      { label: "Tickets",            href: "/ronyx/tickets" },
    ],
  },
  {
    section: "Fleet",
    items: [
      { label: "Drivers",            href: "/ronyx/drivers" },
      { label: "Trucks",             href: "/ronyx/fleet" },
      { label: "Owner Operators",    href: "/ronyx/owner-operators" },
      { label: "Inspections",        href: "/ronyx/inspections" },
      { label: "Tracking",           href: "/ronyx/tracking" },
      { label: "Maintenance",        href: "/ronyx/maintenance" },
    ],
  },
  {
    section: "Compliance",
    items: [
      { label: "Compliance Center",  href: "/ronyx/compliance" },
      { label: "HR & Compliance",    href: "/ronyx/hr-compliance" },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Payroll",            href: "/ronyx/payroll" },
      { label: "Billing",            href: "/ronyx/billing" },
      { label: "Accounts Rec.",      href: "/ronyx/accounts-receivable" },
      { label: "IFTA / Fuel",        href: "/ronyx/ifta-fuel" },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { label: "Reports",            href: "/ronyx/reports" },
      { label: "Customers",          href: "/ronyx/customers" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Integrations",       href: "/ronyx/integrations" },
      { label: "Settings",           href: "/ronyx/settings" },
    ],
  },
];

type RonyxUser = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export default function RonyxShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: RonyxUser;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount] = useState(3);
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const displayName =
    user.first_name || user.last_name
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
      : user.email?.split("@")[0] ?? "Account";

  function isActive(href: string) {
    if (href === "/ronyx") return pathname === "/ronyx";
    return pathname.startsWith(href);
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }

        /* ── Sidebar ─────────────────────────────────────── */
        .tms-sidebar {
          width: 220px;
          min-height: 100vh;
          background: #0f172a;
          color: #cbd5e1;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          z-index: 30;
        }
        .tms-sidebar-brand {
          padding: 20px 18px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .tms-sidebar-brand-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .tms-sidebar-brand-sub {
          font-size: 0.68rem;
          color: #64748b;
          margin-top: 2px;
        }
        .tms-nav-group {
          padding: 10px 10px 4px;
        }
        .tms-nav-section {
          font-size: 0.6rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          padding: 0 8px 6px;
        }
        .tms-nav-items-box {
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 4px;
          background: rgba(255,255,255,0.02);
        }
        .tms-nav-item {
          display: block;
          padding: 7px 10px;
          border-radius: 7px;
          color: #94a3b8;
          font-size: 0.82rem;
          font-weight: 500;
          margin-bottom: 1px;
          transition: background 120ms, color 120ms;
        }
        .tms-nav-item:hover {
          background: rgba(255,255,255,0.06);
          color: #e2e8f0;
        }
        .tms-nav-item.active {
          background: #1e40af;
          color: #fff;
          font-weight: 600;
        }
        .tms-sidebar-footer {
          margin-top: auto;
          padding: 12px 14px;
          border-top: 1px solid rgba(255,255,255,0.07);
          font-size: 0.72rem;
          color: #334155;
        }

        /* ── Main area ──────────────────────────────────── */
        .tms-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
          min-width: 0;
        }

        /* ── Top bar ────────────────────────────────────── */
        .tms-topbar {
          height: 56px;
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          position: sticky;
          top: 0;
          z-index: 20;
          gap: 16px;
        }
        .tms-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tms-menu-btn {
          display: none;
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 1.1rem;
          color: #475569;
        }
        .tms-breadcrumb {
          font-size: 0.82rem;
          color: #64748b;
          font-weight: 500;
        }
        .tms-breadcrumb span {
          color: #0f172a;
          font-weight: 700;
        }
        .tms-topbar-search {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 0.82rem;
          color: #0f172a;
          width: 240px;
          outline: none;
        }
        .tms-topbar-search:focus {
          border-color: #2563eb;
        }
        .tms-topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tms-icon-btn {
          position: relative;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 7px 10px;
          cursor: pointer;
          font-size: 1rem;
          color: #475569;
        }
        .tms-notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          border: 1.5px solid #fff;
        }
        .tms-user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: 600;
          color: #0f172a;
        }
        .tms-user-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #1e40af;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .tms-time {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        /* ── Content ────────────────────────────────────── */
        .tms-content {
          flex: 1;
          padding: 24px;
        }

        /* ── Mobile ─────────────────────────────────────── */
        @media (max-width: 900px) {
          .tms-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            transform: translateX(-100%);
            transition: transform 200ms ease;
            z-index: 50;
          }
          .tms-sidebar.open {
            transform: translateX(0);
          }
          .tms-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,0.5);
            z-index: 45;
          }
          .tms-overlay.open {
            display: block;
          }
          .tms-menu-btn {
            display: flex;
          }
          .tms-topbar-search {
            width: 160px;
          }
          .tms-content {
            padding: 16px;
          }
        }
        @media (max-width: 600px) {
          .tms-topbar-search { display: none; }
          .tms-time { display: none; }
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`tms-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="tms-sidebar-brand">
          <div className="tms-sidebar-brand-name">MoveAround TMS</div>
          <div className="tms-sidebar-brand-sub">Ronyx Logistics Portal</div>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="tms-nav-group">
            <div className="tms-nav-section">{group.section}</div>
            <div className="tms-nav-items-box">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`tms-nav-item${isActive(item.href) ? " active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="tms-sidebar-footer">
          MoveAround TMS · IGOTTA Technologies
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`tms-overlay${mobileOpen ? " open" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Main */}
      <div className="tms-main">

        {/* Top bar */}
        <header className="tms-topbar">
          <div className="tms-topbar-left">
            <button
              className="tms-menu-btn"
              onClick={() => setMobileOpen((p) => !p)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <input
              className="tms-topbar-search"
              placeholder="Search drivers, loads, tickets…"
            />
          </div>

          <div className="tms-topbar-right">
            <span className="tms-time">{now}</span>

            <button className="tms-icon-btn" aria-label="Notifications">
              🔔
              {notifCount > 0 && <span className="tms-notif-badge" />}
            </button>

            <button className="tms-icon-btn" aria-label="Help">
              ?
            </button>

            <button className="tms-user-chip">
              <div className="tms-user-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {displayName}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="tms-content">
          {children}
        </main>
      </div>
    </div>
  );
}
