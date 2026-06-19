"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import PageProtection from "@/components/security/PageProtection";

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

const TICKETS_OCR_CHILDREN: NavChild[] = [
  { label: "Fast Scan™",             href: "/ronyx/fast-scan",                    icon: "⚡", color: "#16a34a" },
  { label: "All Tickets",            href: "/ronyx/tickets?tab=all",              icon: "🎫", color: "#d97706" },
  { label: "Needs Review",           href: "/ronyx/tickets?tab=needs_review",     icon: "⚠️", color: "#ea580c" },
  { label: "Invoice Reconciliation", href: "/ronyx/tickets?tab=reconciliation",   icon: "🔍", color: "#4f46e5" },
  { label: "AccuriScale Checks",     href: "/ronyx/accuriscale",                  icon: "⚖️", color: "#22d3ee" },
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
      { label: "Command Briefing",      href: "/ronyx/admin/command-briefing",     icon: "☀️", color: "#dc2626" },
      { label: "Dispatch",              href: "/ronyx/dispatch/board",             icon: "📋", color: "#2563eb", children: [
        { label: "Dispatch Board",         href: "/ronyx/dispatch/board",              icon: "📋", color: "#2563eb" },
        { label: "Daily Dispatch Import",  href: "/ronyx/dispatch/daily-import",       icon: "📥", color: "#7c3aed" },
        { label: "Dispatch Guard™",        href: "/ronyx/dispatch/dispatch-guard",     icon: "🛡️", color: "#dc2626" },
        { label: "Load Tracker",           href: "/ronyx/dispatch/loads",              icon: "📍", color: "#0d9488" },
        { label: "Reassign Truck",         href: "/ronyx/maintenance/breakdowns",      icon: "🔄", color: "#ea580c" },
      ]},
      { label: "Tickets & OCR",         href: "/ronyx/fast-scan",               icon: "🎫", color: "#d97706", children: TICKETS_OCR_CHILDREN },
      { label: "Projects / Jobs",       href: "/ronyx/loads",                      icon: "📁", color: "#0d9488" },
      { label: "Maintenance",           href: "/ronyx/maintenance",                icon: "🔩", color: "#ea580c", children: [
        { label: "Overview",            href: "/ronyx/maintenance",                icon: "🔩", color: "#ea580c" },
        { label: "Breakdowns / OOS",    href: "/ronyx/maintenance/breakdowns",    icon: "🚨", color: "#dc2626" },
        { label: "Truck Availability",  href: "/ronyx/maintenance/availability",  icon: "✅", color: "#15803d" },
        { label: "Reassignment Log",    href: "/ronyx/maintenance/reassignments", icon: "🔄", color: "#7c3aed" },
      ]},
    ],
  },
  {
    section: "People & Assets",
    items: [
      { label: "Drivers",              href: "/ronyx/drivers?tab=list",  icon: "👤", color: "#0891b2", children: [
        ...DRIVERS_CHILDREN,
        { label: "Driver Upload Portal", href: "/ronyx/driver-portal/upload-ticket", color: "#16a34a" },
      ]},
      { label: "Owner Operators",      href: "/ronyx/owner-operators",   icon: "🚛", color: "#7c3aed", children: [
        { label: "Overview",           href: "/ronyx/owner-operators",                   icon: "🚛", color: "#7c3aed" },
        { label: "Settlements",        href: "/ronyx/owner-operators/settlements",       icon: "💵", color: "#15803d" },
        { label: "COI Matrix",         href: "/ronyx/owner-operators/coi-matrix",        icon: "📋", color: "#1e40af" },
        { label: "Bulk Import",        href: "/ronyx/owner-operators/bulk-import",       icon: "📥", color: "#0891b2" },
        { label: "Expired Insurance",  href: "/ronyx/compliance/expired-insurance",      icon: "🔴", color: "#dc2626" },
        { label: "Compliance Monitor", href: "/ronyx/compliance",                        icon: "🛡️", color: "#dc2626" },
      ]},
      { label: "Fleet & Equipment",    href: "/ronyx/fleet",             icon: "🔧", color: "#0284c7" },
      { label: "Driver Network™",      href: "/ronyx/driver-network",    icon: "🌐", color: "#0891b2", children: [
        { label: "Browse Drivers",     href: "/ronyx/driver-network",           icon: "🔍", color: "#0891b2" },
        { label: "Shortlist",          href: "/ronyx/driver-network#shortlist", icon: "★",  color: "#7c3aed" },
        { label: "Unlocked Profiles",  href: "/ronyx/driver-network#unlocked",  icon: "🔓", color: "#15803d" },
        { label: "Driver Finder™",     href: "/ronyx/settings/billing",         icon: "💼", color: "#dc2626" },
      ]},
      { label: "Documents & Compliance", href: "/ronyx/documents",       icon: "📄", color: "#64748b", children: [
        { label: "Documents",            href: "/ronyx/documents",                         icon: "📄", color: "#64748b" },
        { label: "Compliance Center",    href: "/ronyx/compliance",                        icon: "🛡️", color: "#dc2626" },
        { label: "Driver Docs",          href: "/ronyx/compliance/driver-docs",            icon: "👤", color: "#0891b2" },
        { label: "Expiring Docs",        href: "/ronyx/compliance/expiring",               icon: "⏰", color: "#ea580c" },
        { label: "Expired Insurance",    href: "/ronyx/compliance/expired-insurance",      icon: "🔴", color: "#dc2626" },
        { label: "Audit Packets",        href: "/ronyx/compliance/audit-packets",          icon: "📦", color: "#64748b" },
      ]},
    ],
  },
  {
    section: "Money",
    items: [
      { label: "Payroll",            href: "/ronyx/payroll",  icon: "💵", color: "#15803d" },
      { label: "Invoice Command Center", href: "/ronyx/billing", icon: "🧾", color: "#1d4ed8", children: [
        { label: "Customer Billing",         href: "/ronyx/billing?tab=customer_billing", icon: "💵", color: "#1e40af" },
        { label: "Payroll Invoices",         href: "/ronyx/billing?tab=payroll_queue",    icon: "📋", color: "#7c3aed" },
        { label: "Contractor Pay Sheets",    href: "/ronyx/billing?tab=pay_sheet",        icon: "🧾", color: "#0f766e" },
        { label: "Unpaid Tickets",           href: "/ronyx/billing?tab=unpaid",           icon: "⚠️", color: "#dc2626" },
        { label: "Reconciliation",           href: "/ronyx/billing?tab=exceptions",       icon: "🔴", color: "#b45309" },
      ]},
      { label: "Accounting Hub",     href: "/ronyx/accounting", icon: "📒", color: "#7c3aed", children: [
        { label: "Billing Pipeline",    href: "/ronyx/accounting",           icon: "⚡", color: "#1d4ed8" },
        { label: "Invoices",            href: "/ronyx/accounting",           icon: "📄", color: "#1d4ed8" },
        { label: "AR Aging",            href: "/ronyx/accounting",           icon: "📊", color: "#f59e0b" },
        { label: "QuickBooks Sync",     href: "/ronyx/accounting",           icon: "🔗", color: "#7c3aed" },
        { label: "Accounts Receivable", href: "/ronyx/accounts-receivable",  icon: "💰", color: "#16a34a" },
      ]},
      { label: "IFTA / Fuel Tax",    href: "/ronyx/ifta",     icon: "⛽", color: "#ca8a04" },
    ],
  },
  {
    section: "Compliance & Records",
    items: [
      { label: "HR / DOT Compliance", href: "/ronyx/compliance",  icon: "🛡️", color: "#dc2626", children: [
        { label: "Compliance Center",       href: "/ronyx/compliance",                                        icon: "🛡️", color: "#dc2626" },
        { label: "Be Audit Ready™",         href: "/ronyx/compliance/audit-ready",                            icon: "✅", color: "#15803d" },
        { label: "Clearance Check™",        href: "/ronyx/compliance/customer-dispatch-requirements",         icon: "🔍", color: "#1e40af" },
        { label: "Driver Docs",             href: "/ronyx/compliance/driver-docs",                            icon: "📄", color: "#0891b2" },
        { label: "Expiring Docs",           href: "/ronyx/compliance/expiring",                               icon: "⏰", color: "#ea580c" },
        { label: "RMIS Monitor",            href: "/ronyx/compliance/rmis-monitor",                           icon: "📡", color: "#7c3aed" },
        { label: "Overrides",               href: "/ronyx/compliance/overrides",                              icon: "🔓", color: "#ea580c" },
        { label: "Expired Insurance",       href: "/ronyx/compliance/expired-insurance",                      icon: "🔴", color: "#dc2626" },
        { label: "Owner Operator COIs",     href: "/ronyx/owner-operators/coi-matrix",                       icon: "📋", color: "#1e40af" },
        { label: "Audit Packets",           href: "/ronyx/compliance/audit-packets",                          icon: "📦", color: "#64748b" },
      ]},
      { label: "Insurance Expiry Report", href: "/ronyx/compliance/expired-insurance", icon: "🔴", color: "#dc2626" },
      { label: "Documents",           href: "/ronyx/documents",    icon: "📄", color: "#64748b" },
      { label: "Backup Vault",        href: "/ronyx/backup",       icon: "💾", color: "#0f766e", children: [
        { label: "Archive Center",    href: "/ronyx/backup/archive-center", icon: "🗃️", color: "#0f766e" },
      ]},
      { label: "Reports",             href: "/ronyx/reports",      icon: "📊", color: "#9333ea" },
    ],
  },
  {
    section: "Staff",
    items: [
      { label: "Staff To-Do Lists", href: "/ronyx/tasks",                icon: "✅", color: "#15803d", children: [
        { label: "CCB (Insurance)",      href: "/ronyx/tasks?tab=CCB",    icon: "🛡️", color: "#1d4ed8" },
        { label: "Sylvia (Compliance)",  href: "/ronyx/tasks?tab=Sylvia", icon: "📋", color: "#7c3aed" },
        { label: "Team (General)",       href: "/ronyx/tasks?tab=Team",   icon: "👥", color: "#0891b2" },
        { label: "All Tasks",            href: "/ronyx/tasks?tab=All",    icon: "📌", color: "#475569" },
      ]},
      { label: "Launch Center",      href: "/ronyx/staff/my-dashboard",   icon: "🚀", color: "#1e40af" },
      { label: "Team Momentum",     href: "/ronyx/staff/team-momentum",  icon: "📊", color: "#7c3aed" },
    ],
  },
  {
    section: "Commerce",
    items: [
      { label: "Merch Store", href: "/ronyx/store", icon: "🛒", color: "#16a34a", subtitle: "Powered by Shopify" },
    ],
  },
  {
    section: "Setup",
    items: [
      { label: "Implementation Hub", href: "/ronyx/implementation", icon: "🚀", color: "#1d4ed8", subtitle: "Data transfer & staff training" },
      { label: "Onboarding Support", href: "/ronyx/onboarding-support", icon: "🎓", color: "#16a34a" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Admin Control Center", href: "/ronyx/settings", icon: "⚙️", color: "#475569", children: [
        { label: "Billing & Subscription", href: "/ronyx/settings/billing",          icon: "💳", color: "#16a34a" },
        { label: "Module Marketplace",     href: "/ronyx/settings/modules",          icon: "🧩", color: "#7c3aed" },
        { label: "Command Briefing",       href: "/ronyx/admin/command-briefing",    icon: "☀️", color: "#dc2626" },
        { label: "Company Profile",        href: "/ronyx/settings/company-profile",  icon: "🏢", color: "#1e40af" },
        { label: "Users & Staff",          href: "/ronyx/settings/users",            icon: "👥", color: "#0891b2" },
        { label: "Roles & Permissions",    href: "/ronyx/settings/roles",            icon: "🔐", color: "#7c3aed" },
        { label: "System Rules",           href: "/ronyx/settings/system-rules",     icon: "⚡", color: "#1e40af" },
        { label: "Document Routing",       href: "/ronyx/settings/document-routing", icon: "📂", color: "#d97706" },
        { label: "Notification Rules",     href: "/ronyx/settings/notifications",    icon: "🔔", color: "#d97706" },
        { label: "Storage Health",         href: "/ronyx/admin/storage-health",      icon: "🗄️", color: "#0891b2" },
        { label: "Audit Log",              href: "/ronyx/settings/audit-log",        icon: "📜", color: "#475569" },
      ]},
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
  const [pilotBanner, setPilotBanner] = useState<{
    show: boolean;
    daysRemaining: number | null;
    expired: boolean;
    endsAt: string | null;
  }>({ show: false, daysRemaining: null, expired: false, endsAt: null });

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
      if (pathname.startsWith("/ronyx/tickets"))     next.add("Tickets & OCR");
      if (pathname.startsWith("/ronyx/fast-scan"))   next.add("Tickets & OCR");
      if (pathname.startsWith("/ronyx/accuriscale")) next.add("Tickets & OCR");
      if (pathname.startsWith("/ronyx/drivers"))     next.add("Drivers");
      if (pathname.startsWith("/ronyx/maintenance")) next.add("Maintenance");
      if (pathname.startsWith("/ronyx/dispatch"))    next.add("Dispatch");
      if (pathname.startsWith("/ronyx/admin"))          next.add("Admin Control Center");
      if (pathname.startsWith("/ronyx/backup"))         next.add("Backup Vault");
      if (pathname.startsWith("/ronyx/compliance"))     next.add("HR / DOT Compliance");
      if (pathname.startsWith("/ronyx/accounting"))     next.add("Accounting Hub");
      if (pathname.startsWith("/ronyx/billing"))        next.add("Invoice Command Center");
      if (pathname.startsWith("/ronyx/implementation")) next.add("Implementation Hub");
      return next;
    });
  }, [pathname]);

  // Fetch pilot status once on mount
  useEffect(() => {
    fetch("/api/ronyx/pilot-status")
      .then(r => r.json())
      .then(d => {
        if (d.isPilot) {
          setPilotBanner({ show: true, daysRemaining: d.daysRemaining, expired: d.pilotExpired, endsAt: d.pilot_ends_at });
        }
      })
      .catch(() => {});
  }, []);

  // Auto-initialize all storage buckets once per day (silent, background)
  useEffect(() => {
    const KEY = "ronyx_storage_setup_at";
    const last = localStorage.getItem(KEY);
    const oneDayAgo = Date.now() - 86400000;
    if (last && Number(last) > oneDayAgo) return; // already ran today
    fetch("/api/ronyx/setup-storage")
      .then(r => r.json())
      .then(d => { if (d.created > 0) console.info(`[storage] ${d.created} bucket(s) initialized`); })
      .catch(() => {}) // never block the UI
      .finally(() => localStorage.setItem(KEY, String(Date.now())));
  }, []);

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
      <PageProtection />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }

        /* ── Sidebar ─────────────────────────────────── */
        .tms-sidebar {
          width: 214px;
          min-height: 100vh;
          background: #1e3a8a;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          z-index: 30;
          scrollbar-width: none;
        }
        .tms-sidebar::-webkit-scrollbar { display: none; }

        .tms-sidebar-brand {
          padding: 12px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          flex-shrink: 0;
        }
        .tms-sidebar-brand-name {
          font-size: 0.9rem;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.3px;
        }
        .tms-sidebar-brand-sub {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.55);
          margin-top: 2px;
        }

        /* ── Quick Actions ───────────────────────────── */
        .tms-quick-actions {
          padding: 6px 8px 4px;
          border-bottom: 1px solid rgba(255,255,255,0.12);
          flex-shrink: 0;
        }
        .tms-qa-label {
          font-size: 0.55rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.45);
          padding: 0 4px 4px;
        }
        .tms-qa-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 3px 7px;
          border-radius: 5px;
          color: rgba(255,255,255,0.75);
          font-size: 0.72rem;
          font-weight: 500;
          transition: background 120ms, color 120ms;
        }
        .tms-qa-item:hover {
          background: rgba(255,255,255,0.1);
          color: #ffffff;
        }
        .tms-qa-icon { font-size: 0.82rem; flex-shrink: 0; }

        /* ── Nav Groups ──────────────────────────────── */
        .tms-nav-group { padding: 5px 8px 1px; }
        .tms-nav-section {
          font-size: 0.54rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          padding: 0 4px 3px;
          margin-top: 1px;
        }

        /* ── Nav Item Row ────────────────────────────── */
        .tms-nav-row {
          display: flex;
          align-items: stretch;
          border-radius: 7px;
          margin-bottom: 1px;
          transition: background 120ms;
        }
        .tms-nav-row:hover { background: rgba(255,255,255,0.1); }
        .tms-nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          padding: 4px 6px 4px 7px;
          color: rgba(255,255,255,0.8);
          font-size: 0.75rem;
          font-weight: 500;
          min-width: 0;
          transition: color 120ms;
        }
        .tms-nav-link:hover { color: #ffffff; }
        .tms-nav-link.active,
        .tms-nav-link.section-on { color: #ffffff; font-weight: 700; background: rgba(255,255,255,0.15); border-radius: 6px; }
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
        .tms-nav-icon { color: rgba(255,255,255,0.7); }
        .tms-nav-link:hover .tms-nav-icon, .tms-nav-link.active .tms-nav-icon { color: #ffffff; }
        .tms-nav-subtitle {
          display: block;
          font-size: 0.6rem;
          color: rgba(255,255,255,0.45);
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tms-nav-link.active .tms-nav-subtitle,
        .tms-nav-link.section-on .tms-nav-subtitle { color: rgba(255,255,255,0.65); }
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
          color: rgba(255,255,255,0.5);
          font-size: 0.7rem;
          flex-shrink: 0;
          padding: 0;
          transition: color 120ms;
        }
        .tms-nav-toggle:hover { color: rgba(255,255,255,0.9); }

        /* ── Sub Items ───────────────────────────────── */
        .tms-nav-sub {
          margin: 1px 0 2px 12px;
          padding-left: 8px;
          border-left: 1px solid rgba(255,255,255,0.18);
        }
        .tms-nav-sub-row {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 3px 7px;
          border-radius: 5px;
          color: rgba(255,255,255,0.65);
          font-size: 0.71rem;
          font-weight: 500;
          margin-bottom: 1px;
          transition: background 120ms, color 120ms;
        }
        .tms-nav-sub-row:hover {
          background: rgba(255,255,255,0.1);
          color: #ffffff;
        }
        .tms-nav-sub-row.active { font-weight: 700; color: #ffffff; background: rgba(255,255,255,0.15); }
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
          border-top: 1px solid rgba(255,255,255,0.12);
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
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
        .tms-content { flex: 1; padding: 16px 20px; }

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
          .tms-content { padding: 12px 14px; }
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
          background: #f1f5f9;
          border-top: 1px solid rgba(0,0,0,0.1);
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
        .tms-mbb-btn:hover { color: #334155; }
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

        {pilotBanner.show && (
          <div style={{
            background: pilotBanner.expired ? "#7f1d1d" : "#1e3a5f",
            color: "#fff",
            padding: "8px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: "0.8rem",
            borderBottom: `2px solid ${pilotBanner.expired ? "#dc2626" : "#2563eb"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1rem" }}>{pilotBanner.expired ? "⚠️" : "🚀"}</span>
              {pilotBanner.expired ? (
                <span>
                  <strong>Your Ronyx free trial has ended.</strong>&nbsp;
                  Your data is saved. Upgrade to continue using Dispatch Command Center, Dispatch Guard™, Fast Scan, tickets, payroll, billing, compliance, and reporting.
                </span>
              ) : (
                <span>
                  <strong>Ronyx Free Trial Active</strong> — Full system access enabled
                  {pilotBanner.daysRemaining !== null && (
                    <> · <strong>{pilotBanner.daysRemaining} day{pilotBanner.daysRemaining !== 1 ? "s" : ""}</strong> left in trial</>
                  )}
                  {pilotBanner.endsAt && (
                    <> · Trial ends {new Date(pilotBanner.endsAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                  )}.
                  &nbsp;Your data is saved — upgrade before the trial ends to keep access.
                </span>
              )}
            </div>
            {pilotBanner.expired && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <a href="/ronyx/settings/billing" style={{
                  background: "#dc2626", color: "#fff", padding: "4px 14px",
                  borderRadius: 5, fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap", textDecoration: "none",
                }}>Upgrade Now</a>
                <a href="/ronyx/settings/billing#plans" style={{
                  background: "transparent", color: "#fff", padding: "4px 14px",
                  borderRadius: 5, fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap",
                  border: "1px solid rgba(255,255,255,0.4)", textDecoration: "none",
                }}>View Plans</a>
                <a href="mailto:support@movearoundtms.com" style={{
                  background: "transparent", color: "#94a3b8", padding: "4px 14px",
                  borderRadius: 5, fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap",
                  border: "1px solid rgba(255,255,255,0.15)", textDecoration: "none",
                }}>Contact Support</a>
              </div>
            )}
          </div>
        )}

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
