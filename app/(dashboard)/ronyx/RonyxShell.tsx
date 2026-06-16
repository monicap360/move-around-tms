"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type NavChild = {
  label:  string;
  href:   string;
  icon?:  string;
  color?: string;
  badge?: number;
};

type NavItem = {
  label:     string;
  href:      string;
  icon?:     string;
  color?:    string;
  badge?:    number;
  subtitle?: string;
  children?: NavChild[];
};

type NavGroup = {
  section: string;
  items:   NavItem[];
};

const TICKETS_CHILDREN: NavChild[] = [
  { label: "All Tickets",           href: "/ronyx/tickets?tab=all",            icon: "🎫", color: "#d97706" },
  { label: "Fast Scan™",            href: "/ronyx/tickets?tab=fastscan",        icon: "⚡", color: "#16a34a" },
  { label: "Ticket Reconciliation", href: "/ronyx/tickets?tab=reconciliation",  icon: "🔍", color: "#4f46e5" },
  { label: "Pit Invoice Match",     href: "/ronyx/tickets?tab=invoice_match",   icon: "🧾", color: "#1d4ed8" },
  { label: "Excel Reconcile",       href: "/ronyx/tickets?tab=excel_reconcile", icon: "📊", color: "#9333ea" },
  { label: "Needs Review",          href: "/ronyx/tickets?tab=needs_review",    icon: "⚠️", color: "#ea580c" },
  { label: "Payroll Review",        href: "/ronyx/tickets?tab=payroll_review",  icon: "💵", color: "#15803d" },
  { label: "Billing Ready",         href: "/ronyx/tickets?tab=billing_ready",   icon: "🧾", color: "#1d4ed8" },
  { label: "Pit / Vendor Master",   href: "/ronyx/tickets?tab=pit_master",      icon: "📍", color: "#0d9488" },
  { label: "Audit Trail",           href: "/ronyx/tickets?tab=audit_trail",     icon: "📜", color: "#64748b" },
];

const DRIVERS_CHILDREN: NavChild[] = [
  { label: "Driver Command Center", href: "/ronyx/drivers?tab=command",    color: "#0891b2" },
  { label: "Driver List",           href: "/ronyx/drivers?tab=list",       color: "#0891b2" },
  { label: "Import Drivers",        href: "/ronyx/drivers?tab=import",     color: "#16a34a" },
  { label: "Compliance",            href: "/ronyx/drivers?tab=compliance", color: "#dc2626" },
  { label: "Documents",             href: "/ronyx/drivers?tab=documents",  color: "#64748b" },
  { label: "Backup Data",           href: "/ronyx/drivers?tab=backup",     color: "#0f766e" },
  { label: "Audit Trail",           href: "/ronyx/drivers?tab=audit",      color: "#64748b" },
];

const NAV_GROUPS: NavGroup[] = [
  {
    section: "Operations",
    items: [
      { label: "Command Center",        href: "/ronyx",                            icon: "⊕",  color: "#1e293b" },
      { label: "Dispatch",              href: "/ronyx/dispatch/board",             icon: "📋", color: "#2563eb" },
      { label: "Tickets",               href: "/ronyx/tickets?tab=all",            icon: "🎫", color: "#d97706", children: TICKETS_CHILDREN },
      { label: "Fast Scan™",            href: "/ronyx/tickets?tab=fastscan",       icon: "⚡", color: "#16a34a", subtitle: "Powered by Ronyx" },
      { label: "Ticket Reconciliation", href: "/ronyx/tickets?tab=reconciliation", icon: "🔍", color: "#4f46e5" },
      { label: "Projects / Jobs",       href: "/ronyx/loads",                      icon: "📁", color: "#0d9488" },
    ],
  },
  {
    section: "People & Assets",
    items: [
      { label: "Drivers",           href: "/ronyx/drivers?tab=list", icon: "👤", color: "#0891b2", children: DRIVERS_CHILDREN },
      { label: "Owner Operators",   href: "/ronyx/owner-operators",  icon: "🚛", color: "#7c3aed" },
      { label: "Fleet / Equipment", href: "/ronyx/fleet",            icon: "🔧", color: "#0284c7" },
      { label: "Maintenance",       href: "/ronyx/maintenance",      icon: "🔩", color: "#ea580c" },
    ],
  },
  {
    section: "Money",
    items: [
      { label: "Payroll",            href: "/ronyx/payroll",  icon: "💵", color: "#15803d" },
      { label: "Billing / Invoices", href: "/ronyx/billing",  icon: "🧾", color: "#1d4ed8" },
      { label: "IFTA / Fuel Tax",    href: "/ronyx/ifta",     icon: "⛽", color: "#ca8a04" },
    ],
  },
  {
    section: "Compliance & Records",
    items: [
      { label: "HR / DOT Compliance", href: "/ronyx/compliance",  icon: "🛡️", color: "#dc2626" },
      { label: "Documents",           href: "/ronyx/documents",    icon: "📄", color: "#64748b" },
      { label: "Backup Data",         href: "/ronyx/backup",       icon: "💾", color: "#0f766e" },
      { label: "Reports",             href: "/ronyx/reports",      icon: "📊", color: "#9333ea" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Admin Settings", href: "/ronyx/settings", icon: "⚙️", color: "#475569" },
    ],
  },
];

const QUICK_ACTIONS = [
  { label: "Smart Import",          icon: "📤", href: "/ronyx/import" },
  { label: "Start Fast Scan Batch", icon: "⚡", href: "/ronyx/tickets?tab=fastscan&action=start_batch" },
  { label: "New Ticket",            icon: "🎫", href: "/ronyx/tickets?action=new" },
  { label: "Upload Driver Sheet",   icon: "⬆️", href: "/ronyx/drivers?tab=import" },
  { label: "Open Reconciliation",   icon: "🔍", href: "/ronyx/tickets?tab=reconciliation" },
  { label: "Payroll Holds",         icon: "💵", href: "/ronyx/payroll?filter=holds" },
];

function parseHref(href: string): { path: string; tab: string | null } {
  const [path, qs = ""] = href.split("?");
  const tab = new URLSearchParams(qs).get("tab");
  return { path, tab };
}

function colorBg(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type RonyxUser = {
  first_name?: string | null;
  last_name?:  string | null;
  email?:      string | null;
};

export default function RonyxShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: RonyxUser;
}) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get("tab");

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount] = useState(3);
  const [now, setNow] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set<string>());

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (pathname.startsWith("/ronyx/tickets")) next.add("Tickets");
      if (pathname.startsWith("/ronyx/drivers"))  next.add("Drivers");
      return next;
    });
  }, [pathname]);

  const displayName =
    user.first_name || user.last_name
      ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
      : user.email?.split("@")[0] ?? "Account";

  function isItemActive(href: string): boolean {
    const { path, tab } = parseHref(href);
    if (href === "/ronyx") return pathname === "/ronyx";
    if (tab) return pathname === path && currentTab === tab;
    return pathname.startsWith(path);
  }

  function isChildActive(href: string): boolean {
    const { path, tab } = parseHref(href);
    if (tab) return pathname === path && currentTab === tab;
    return pathname === path || pathname.startsWith(path + "/");
  }

  function isOnSection(item: NavItem): boolean {
    const { path } = parseHref(item.href);
    return pathname.startsWith(path);
  }

  function toggleItem(label: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }

        /* ── Sidebar ─────────────────────────────────── */
        .tms-sidebar {
          width: 236px;
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
          overflow-x: hidden;
          z-index: 30;
        }
        .tms-sidebar::-webkit-scrollbar { width: 3px; }
        .tms-sidebar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }

        .tms-sidebar-brand {
          padding: 16px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }
        .tms-sidebar-brand-name {
          font-size: 0.9rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .tms-sidebar-brand-sub {
          font-size: 0.65rem;
          color: #475569;
          margin-top: 2px;
        }

        /* ── Quick Actions ───────────────────────────── */
        .tms-quick-actions {
          padding: 8px 10px 6px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .tms-qa-label {
          font-size: 0.57rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #334155;
          padding: 0 4px 5px;
        }
        .tms-qa-item {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 8px;
          border-radius: 5px;
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 500;
          transition: background 120ms, color 120ms;
        }
        .tms-qa-item:hover {
          background: rgba(255,255,255,0.05);
          color: #cbd5e1;
        }
        .tms-qa-icon { font-size: 0.82rem; flex-shrink: 0; }

        /* ── Nav Groups ──────────────────────────────── */
        .tms-nav-group { padding: 7px 10px 2px; }
        .tms-nav-section {
          font-size: 0.57rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
          padding: 0 4px 4px;
          margin-top: 2px;
        }

        /* ── Nav Item Row ────────────────────────────── */
        .tms-nav-row {
          display: flex;
          align-items: stretch;
          border-radius: 7px;
          margin-bottom: 1px;
          transition: background 120ms;
        }
        .tms-nav-row:hover { background: rgba(255,255,255,0.04); }
        .tms-nav-link {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          padding: 6px 6px 6px 8px;
          color: #94a3b8;
          font-size: 0.79rem;
          font-weight: 500;
          min-width: 0;
          transition: color 120ms;
        }
        .tms-nav-link:hover { color: #e2e8f0; }
        .tms-nav-link.active,
        .tms-nav-link.section-on { color: #fff; font-weight: 600; }
        .tms-nav-icon {
          font-size: 0.88rem;
          flex-shrink: 0;
          width: 17px;
          text-align: center;
        }
        .tms-nav-label-wrap { flex: 1; min-width: 0; overflow: hidden; }
        .tms-nav-label-text {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tms-nav-subtitle {
          display: block;
          font-size: 0.6rem;
          color: #334155;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tms-nav-link.active .tms-nav-subtitle,
        .tms-nav-link.section-on .tms-nav-subtitle { color: rgba(255,255,255,0.35); }
        .tms-nav-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 9px;
          font-size: 0.62rem;
          font-weight: 700;
          flex-shrink: 0;
          background: #ef4444;
          color: #fff;
        }
        .tms-nav-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          background: none;
          border: none;
          cursor: pointer;
          color: #475569;
          font-size: 0.7rem;
          flex-shrink: 0;
          padding: 0;
          transition: color 120ms;
        }
        .tms-nav-toggle:hover { color: #94a3b8; }

        /* ── Sub Items ───────────────────────────────── */
        .tms-nav-sub {
          margin: 1px 0 3px 13px;
          padding-left: 9px;
          border-left: 1px solid rgba(255,255,255,0.07);
        }
        .tms-nav-sub-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          border-radius: 5px;
          color: #64748b;
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 1px;
          transition: background 120ms, color 120ms;
        }
        .tms-nav-sub-row:hover {
          background: rgba(255,255,255,0.04);
          color: #cbd5e1;
        }
        .tms-nav-sub-row.active { font-weight: 700; }
        .tms-sub-icon { font-size: 0.78rem; flex-shrink: 0; width: 15px; text-align: center; }
        .tms-sub-label {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tms-sub-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 15px;
          height: 15px;
          padding: 0 4px;
          border-radius: 8px;
          font-size: 0.58rem;
          font-weight: 700;
          flex-shrink: 0;
          background: #ef4444;
          color: #fff;
        }

        /* ── Sidebar Footer ──────────────────────────── */
        .tms-sidebar-footer {
          margin-top: auto;
          padding: 10px 14px;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 0.65rem;
          color: #334155;
          flex-shrink: 0;
        }

        /* ── Main ────────────────────────────────────── */
        .tms-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #f1f5f9;
          min-width: 0;
        }

        /* ── Top Bar ─────────────────────────────────── */
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
        .tms-topbar-left { display: flex; align-items: center; gap: 12px; }
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
        .tms-topbar-search:focus { border-color: #2563eb; }
        .tms-topbar-right { display: flex; align-items: center; gap: 8px; }
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
          top: 4px; right: 4px;
          width: 8px; height: 8px;
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
          width: 26px; height: 26px;
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
        .tms-time { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }

        /* ── Content ─────────────────────────────────── */
        .tms-content { flex: 1; padding: 24px; }

        /* ── Mobile ──────────────────────────────────── */
        @media (max-width: 900px) {
          .tms-sidebar {
            position: fixed;
            left: 0; top: 0; bottom: 0;
            transform: translateX(-100%);
            transition: transform 200ms ease;
            z-index: 50;
          }
          .tms-sidebar.open { transform: translateX(0); }
          .tms-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,0.5);
            z-index: 45;
          }
          .tms-overlay.open { display: block; }
          .tms-menu-btn { display: flex; }
          .tms-topbar-search { width: 160px; }
          .tms-content { padding: 16px; }
          .tms-main { padding-bottom: 56px; }
          .tms-mobile-bottom { display: flex !important; }
        }
        @media (max-width: 600px) {
          .tms-topbar-search { display: none; }
          .tms-time { display: none; }
        }

        /* ── Mobile Bottom Bar ───────────────────────── */
        .tms-mobile-bottom {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 56px;
          background: #0f172a;
          border-top: 1px solid rgba(255,255,255,0.1);
          z-index: 40;
          align-items: stretch;
        }
        .tms-mbb-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          gap: 2px;
          transition: color 120ms;
        }
        .tms-mbb-btn:hover { color: #e2e8f0; }
        .tms-mbb-btn.active { color: #16a34a; }
        .tms-mbb-icon { font-size: 1.25rem; }

        /* ── Smart Import FAB ────────────────────────── */
        .tms-smart-import-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #1e40af 0%, #4f46e5 100%);
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 13px 20px;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 25px rgba(79,70,229,0.45);
          text-decoration: none;
          transition: transform 140ms ease, box-shadow 140ms ease;
          letter-spacing: -0.2px;
          white-space: nowrap;
        }
        .tms-smart-import-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(79,70,229,0.55);
        }
        .tms-smart-import-fab.on-import-page {
          background: linear-gradient(135deg, #166534 0%, #15803d 100%);
          box-shadow: 0 8px 25px rgba(22,101,52,0.4);
        }
        @media (max-width: 900px) {
          .tms-smart-import-fab { bottom: 68px; right: 16px; padding: 11px 16px; font-size: 0.78rem; }
        }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className={`tms-sidebar${mobileOpen ? " open" : ""}`}>

        <div className="tms-sidebar-brand">
          <div className="tms-sidebar-brand-name">MoveAround TMS</div>
          <div className="tms-sidebar-brand-sub">Ronyx Logistics Portal</div>
        </div>

        <div className="tms-quick-actions">
          <div className="tms-qa-label">Quick Actions</div>
          {QUICK_ACTIONS.map((qa) => (
            <Link key={qa.href} href={qa.href} className="tms-qa-item" onClick={() => setMobileOpen(false)}>
              <span className="tms-qa-icon">{qa.icon}</span>
              <span>{qa.label}</span>
            </Link>
          ))}
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="tms-nav-group">
            <div className="tms-nav-section">{group.section}</div>

            {group.items.map((item) => {
              const hasChildren = !!item.children;
              const isOpen      = expanded.has(item.label);
              const sectionOn   = hasChildren && isOnSection(item);
              const directActive = !hasChildren && isItemActive(item.href);
              const color        = item.color ?? "#64748b";

              const rowStyle: React.CSSProperties =
                directActive || sectionOn
                  ? { background: colorBg(color, 0.14), boxShadow: `inset 3px 0 0 ${color}` }
                  : {};

              return (
                <div key={item.label}>
                  <div className="tms-nav-row" style={rowStyle}>
                    <Link
                      href={item.href}
                      className={`tms-nav-link${directActive ? " active" : sectionOn ? " section-on" : ""}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.icon && <span className="tms-nav-icon">{item.icon}</span>}
                      <span className="tms-nav-label-wrap">
                        <span className="tms-nav-label-text">{item.label}</span>
                        {item.subtitle && <span className="tms-nav-subtitle">{item.subtitle}</span>}
                      </span>
                      {!!item.badge && item.badge > 0 && (
                        <span className="tms-nav-badge">{item.badge}</span>
                      )}
                    </Link>
                    {hasChildren && (
                      <button
                        className="tms-nav-toggle"
                        onClick={(e) => toggleItem(item.label, e)}
                        aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        style={sectionOn ? { color: color } : {}}
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                    )}
                  </div>

                  {hasChildren && isOpen && (
                    <div className="tms-nav-sub">
                      {item.children!.map((child) => {
                        const childOn    = isChildActive(child.href);
                        const childColor = child.color ?? "#64748b";
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`tms-nav-sub-row${childOn ? " active" : ""}`}
                            style={childOn ? {
                              color:      childColor,
                              background: colorBg(childColor, 0.1),
                              boxShadow:  `inset 2px 0 0 ${childColor}`,
                            } : {}}
                            onClick={() => setMobileOpen(false)}
                          >
                            {child.icon && <span className="tms-sub-icon">{child.icon}</span>}
                            <span className="tms-sub-label">{child.label}</span>
                            {!!child.badge && child.badge > 0 && (
                              <span className="tms-sub-badge">{child.badge}</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        <div className="tms-sidebar-footer">MoveAround TMS · IGOTTA Technologies</div>
      </aside>

      {/* Mobile overlay */}
      <div className={`tms-overlay${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />

      {/* ── Main ─────────────────────────────────────── */}
      <div className="tms-main">
        <header className="tms-topbar">
          <div className="tms-topbar-left">
            <button className="tms-menu-btn" onClick={() => setMobileOpen((p) => !p)} aria-label="Toggle menu">
              ☰
            </button>
            <input className="tms-topbar-search" placeholder="Search drivers, loads, tickets…" />
          </div>
          <div className="tms-topbar-right">
            <span className="tms-time">{now}</span>
            <button className="tms-icon-btn" aria-label="Notifications">
              🔔
              {notifCount > 0 && <span className="tms-notif-badge" />}
            </button>
            <button className="tms-icon-btn" aria-label="Help">?</button>
            <button className="tms-user-chip">
              <div className="tms-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
              {displayName}
            </button>
          </div>
        </header>

        <main className="tms-content">{children}</main>
      </div>

      {/* Smart Import floating button */}
      <Link
        href="/ronyx/import"
        className={`tms-smart-import-fab${pathname === "/ronyx/import" ? " on-import-page" : ""}`}
        onClick={() => setMobileOpen(false)}
      >
        <span style={{ fontSize: "1.1rem" }}>📤</span>
        {pathname === "/ronyx/import" ? "Smart Import (active)" : "Smart Import"}
      </Link>

      {/* Mobile bottom bar */}
      <nav className="tms-mobile-bottom" style={{ display: "none" }}>
        <Link
          href="/ronyx/tickets?tab=fastscan"
          className={`tms-mbb-btn${pathname === "/ronyx/tickets" && currentTab === "fastscan" ? " active" : ""}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="tms-mbb-icon">⚡</span>
          <span>Fast Scan</span>
        </Link>
        <Link
          href="/ronyx/tickets"
          className={`tms-mbb-btn${pathname === "/ronyx/tickets" && !currentTab ? " active" : ""}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="tms-mbb-icon">🎫</span>
          <span>Tickets</span>
        </Link>
        <Link
          href="/ronyx/dispatch/board"
          className={`tms-mbb-btn${pathname.startsWith("/ronyx/dispatch") ? " active" : ""}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="tms-mbb-icon">📋</span>
          <span>Dispatch</span>
        </Link>
        <Link
          href="/ronyx/payroll"
          className={`tms-mbb-btn${pathname.startsWith("/ronyx/payroll") ? " active" : ""}`}
          onClick={() => setMobileOpen(false)}
        >
          <span className="tms-mbb-icon">💵</span>
          <span>Payroll</span>
        </Link>
      </nav>
    </div>
  );
}
