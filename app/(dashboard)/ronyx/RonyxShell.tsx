"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PageProtection from "@/app/components/security/PageProtection";
import IntelImportCenter from "@/app/components/ronyx/IntelImportCenter";
import GuidedTour, { tourDone, type TourStep } from "@/app/components/ronyx/GuidedTour";

// ── Guided tour steps (highlights the main modules in the sidebar) ──────────────
const RONYX_TOUR: TourStep[] = [
  { title: "Welcome to MoveAround TMS 👋", body: "Here's a quick 60-second tour of the main tools. You can replay it anytime from the ? button in the top bar." },
  { selector: '.tms-sidebar a[href="/ronyx/operations-manager"]', title: "🧭 Rory — Operations Manager", body: "Your AI ops manager. Ask plain questions about dispatch, drivers, compliance, fleet, tickets, payroll, and billing — answers come from your live data." },
  { selector: '.tms-sidebar a[href="/ronyx/dispatch/board"]', title: "📋 Dispatch", body: "Your dispatch board and Command Center. Import a daily dispatch, assign drivers to trips, and use Smart Assign to get driver recommendations." },
  { selector: '.tms-sidebar a[href="/ronyx/fast-scan"]', title: "⚡ Fast Scan", body: "Snap or upload a load ticket — Claude reads it automatically (Fast Scan OCR) and routes it to payroll and billing." },
  { selector: '.tms-sidebar a[href="/ronyx/compliance"]', title: "🛡️ CCB Compliance", body: "Keep carriers and drivers cleared to dispatch — expiring documents, clearance checks, and audit-ready records." },
  { selector: '.tms-sidebar a[href="/ronyx/drivers"]', title: "👤 Drivers", body: "Your driver roster with CDL and medical-card compliance, documents, and import tools." },
  { selector: '.tms-sidebar a[href="/ronyx/owner-operators"]', title: "🚛 Owner Operators", body: "Your sub-haulers and OO companies — documents, COI compliance, settlements, and bulk import." },
  { selector: '.tms-sidebar a[href="/ronyx/fleet"]', title: "🔧 Fleet & Maintenance", body: "Truck readiness, maintenance, inspections, and availability — the Fleet Readiness Command Center." },
  { selector: '.tms-sidebar a[href="/ronyx/implementation"]', title: "🚀 Setup & Import", body: "Load your data in phases — customers, drivers, trucks, owner-operators, and your daily dispatch. You can drop several files at once." },
  { title: "You're all set! 🎉", body: "That's the quick tour. Click the ? in the top bar to replay it, or ask Rory if you get stuck." },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type NavChild = { label: string; href: string; icon?: string };
type NavItem  = { label: string; href: string; icon?: string; color?: string; children?: NavChild[] };
type NavGroup = { section: string; color?: string; items: NavItem[] };

type DailyCommand = {
  criticalItems: { text: string; href: string; category: string }[];
  pulse: {
    activeLoads: number; dispatchBlocks: number; ticketsNeedingReview: number;
    payrollHolds: number; trucksDown: number; expiringDocs: number; missingTickets: number;
  };
  smartActions: { label: string; href: string; count: number }[];
};

type RonyxUser = { first_name?: string | null; last_name?: string | null; email?: string | null };

// ── Nav structure (tighter — 4 groups) ───────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    section: "Operations",
    items: [
      { label: "Rory — Operations Manager", href: "/ronyx/operations-manager", icon: "🧭", color: "#4f46e5" },
      { label: "Dispatch",         href: "/ronyx/dispatch/board",          icon: "📋", color: "#2563eb", children: [
        { label: "Dispatch Board",        href: "/ronyx/dispatch/board",           icon: "📋" },
        { label: "Daily Import",          href: "/ronyx/dispatch/daily-import",    icon: "📥" },
        { label: "Dispatch Guard™",       href: "/ronyx/dispatch/dispatch-guard",  icon: "🛡️" },
        { label: "Load Tracker",          href: "/ronyx/dispatch/loads",           icon: "📍" },
      ]},
      { label: "Fast Scan™",       href: "/ronyx/fast-scan",               icon: "⚡", color: "#16a34a" },
      { label: "All Tickets",      href: "/ronyx/tickets",                 icon: "🎫", color: "#d97706", children: [
        { label: "All Tickets",           href: "/ronyx/tickets?tab=all",          icon: "🎫" },
        { label: "Needs Review",          href: "/ronyx/tickets?tab=needs_review", icon: "⚠️" },
        { label: "Reconciliation",        href: "/ronyx/tickets?tab=reconciliation", icon: "🔍" },
      ]},
      { label: "CCB™",             href: "/ronyx/compliance",              icon: "🛡️", color: "#dc2626", children: [
        { label: "Compliance Center",     href: "/ronyx/compliance",               icon: "🛡️" },
        { label: "Be Audit Ready™",       href: "/ronyx/compliance/audit-ready",   icon: "✅" },
        { label: "Clearance Check™",      href: "/ronyx/compliance/customer-dispatch-requirements", icon: "🔍" },
        { label: "Expiring Docs",         href: "/ronyx/compliance/expiring",      icon: "⏰" },
        { label: "CCB Sentinel",            href: "/ronyx/compliance/ccb-sentinel",  icon: "📡" },
      ]},
      { label: "Drivers",          href: "/ronyx/drivers",                 icon: "👤", color: "#0891b2", children: [
        { label: "Driver List",           href: "/ronyx/drivers?tab=list",         icon: "👤" },
        { label: "Compliance",            href: "/ronyx/drivers?tab=compliance",   icon: "🛡️" },
        { label: "Import Drivers",        href: "/ronyx/drivers?tab=import",       icon: "📥" },
        { label: "Documents",             href: "/ronyx/drivers?tab=documents",    icon: "📄" },
      ]},
      { label: "Owner Operators",  href: "/ronyx/owner-operators",         icon: "🚛", color: "#7c3aed", children: [
        { label: "Overview",              href: "/ronyx/owner-operators",          icon: "🚛" },
        { label: "Settlements",          href: "/ronyx/owner-operators/settlements", icon: "💵" },
        { label: "COI Matrix",            href: "/ronyx/owner-operators/coi-matrix", icon: "📋" },
        { label: "Bulk Import",           href: "/ronyx/owner-operators/bulk-import", icon: "📥" },
      ]},
      { label: "Fleet & Maintenance", href: "/ronyx/fleet",               icon: "🔧", color: "#0284c7", children: [
        { label: "Fleet",                 href: "/ronyx/fleet",                    icon: "🔧" },
        { label: "Maintenance",           href: "/ronyx/maintenance",              icon: "🔩" },
        { label: "Breakdowns / OOS",      href: "/ronyx/maintenance/breakdowns",   icon: "🚨" },
        { label: "Availability",          href: "/ronyx/maintenance/availability", icon: "✅" },
        { label: "Inspections",           href: "/ronyx/inspections",              icon: "📋" },
      ]},
      { label: "Projects / Jobs",   href: "/ronyx/loads",                  icon: "📁", color: "#0d9488" },
    ],
  },
  {
    section: "Money",
    items: [
      { label: "Invoice Center",   href: "/ronyx/billing",                 icon: "🧾", color: "#1d4ed8", children: [
        { label: "Customer Billing",      href: "/ronyx/billing?tab=customer_billing", icon: "💵" },
        { label: "Payroll Invoices",      href: "/ronyx/billing?tab=payroll_queue",    icon: "📋" },
        { label: "Unpaid Tickets",        href: "/ronyx/billing?tab=unpaid",           icon: "⚠️" },
      ]},
      { label: "Payroll",          href: "/ronyx/payroll",                 icon: "💵", color: "#15803d" },
      { label: "Settlements",      href: "/ronyx/owner-operators/settlements", icon: "🤝", color: "#059669" },
      { label: "Accounting Hub",   href: "/ronyx/accounting",              icon: "📒", color: "#7c3aed" },
    ],
  },
  {
    section: "Insights",
    items: [
      { label: "Team Momentum",    href: "/ronyx/staff/team-momentum",     icon: "📊", color: "#7c3aed" },
      { label: "Reports",          href: "/ronyx/reports",                 icon: "📈", color: "#9333ea" },
      { label: "Excel Sync™",      href: "/ronyx/excel-center",            icon: "📊", color: "#16a34a" },
      { label: "Staff Tasks",      href: "/ronyx/tasks",                   icon: "✅", color: "#15803d" },
      { label: "Backup Vault",     href: "/ronyx/backup",                  icon: "💾", color: "#0f766e" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Admin Control",    href: "/ronyx/settings",                icon: "⚙️", color: "#475569", children: [
        { label: "Company Profile",       href: "/ronyx/settings/company-profile", icon: "🏢" },
        { label: "Users & Staff",         href: "/ronyx/settings/users",          icon: "👥" },
        { label: "Billing",               href: "/ronyx/settings/billing",        icon: "💳" },
        { label: "System Rules",          href: "/ronyx/settings/system-rules",   icon: "⚡" },
        { label: "Audit Log",             href: "/ronyx/settings/audit-log",      icon: "📜" },
      ]},
      { label: "Implementation",   href: "/ronyx/implementation",          icon: "🚀", color: "#1d4ed8" },
      { label: "Command Briefing", href: "/ronyx/admin/command-briefing",  icon: "☀️", color: "#dc2626" },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseHref(href: string) {
  const [path, qs = ""] = href.split("?");
  return { path, tab: new URLSearchParams(qs).get("tab") };
}

function colorBg(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const CATEGORY_COLOR: Record<string, string> = {
  compliance: "#dc2626", dispatch: "#2563eb", tickets: "#d97706",
  payroll: "#15803d", task: "#7c3aed",
};

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function RonyxShell({ children, user }: { children: React.ReactNode; user: RonyxUser }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get("tab");

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);
  const [fabHidden,    setFabHidden]    = useState(false);
  const [now,          setNow]          = useState("");
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [tourOpen,     setTourOpen]     = useState(false);

  // Auto-start the guided tour once for new users (desktop only — needs the sidebar).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.innerWidth < 821) return;
    if (tourDone("ronyx_v1")) return;
    const t = setTimeout(() => setTourOpen(true), 900); // let the sidebar render first
    return () => clearTimeout(t);
  }, []);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchResults, setSearchResults] = useState<{ label: string; href: string; type: string }[]>([]);
  const [cmdLoading,   setCmdLoading]   = useState(false);
  const [daily,        setDaily]        = useState<DailyCommand | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pilotBanner, setPilotBanner] = useState<{ show: boolean; daysRemaining: number | null; expired: boolean; endsAt: string | null }>({ show: false, daysRemaining: null, expired: false, endsAt: null });

  // Clock
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch daily command on mount + every 5 min
  useEffect(() => {
    const load = () => {
      setCmdLoading(true);
      fetch("/api/ronyx/daily-command")
        .then(r => r.json())
        .then(d => setDaily(d))
        .catch(() => {})
        .finally(() => setCmdLoading(false));
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-expand active nav section
  useEffect(() => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (pathname.startsWith("/ronyx/dispatch"))    next.add("Dispatch");
      if (pathname.startsWith("/ronyx/tickets"))     next.add("All Tickets");
      if (pathname.startsWith("/ronyx/fast-scan"))   next.add("All Tickets");
      if (pathname.startsWith("/ronyx/drivers"))     next.add("Drivers");
      if (pathname.startsWith("/ronyx/compliance"))  next.add("CCB™");
      if (pathname.startsWith("/ronyx/maintenance")) next.add("Fleet & Maintenance");
      if (pathname.startsWith("/ronyx/fleet"))       next.add("Fleet & Maintenance");
      if (pathname.startsWith("/ronyx/settings"))    next.add("Admin Control");
      if (pathname.startsWith("/ronyx/billing"))     next.add("Invoice Center");
      if (pathname.startsWith("/ronyx/owner-operators")) next.add("Owner Operators");
      return next;
    });
  }, [pathname]);

  // Pilot banner
  useEffect(() => {
    fetch("/api/ronyx/pilot-status").then(r => r.json()).then(d => {
      if (d.isPilot) setPilotBanner({ show: true, daysRemaining: d.daysRemaining, expired: d.pilotExpired, endsAt: d.pilot_ends_at });
    }).catch(() => {});
  }, []);

  // Storage init (once/day)
  useEffect(() => {
    const KEY = "ronyx_storage_setup_at";
    const last = localStorage.getItem(KEY);
    if (last && Number(last) > Date.now() - 86400000) return;
    fetch("/api/ronyx/setup-storage").then(r => r.json()).then(d => {
      if (d.created > 0) console.info(`[storage] ${d.created} bucket(s) initialized`);
    }).catch(() => {}).finally(() => localStorage.setItem(KEY, String(Date.now())));
  }, []);

  // ⌘K search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(s => !s);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  // Search handler
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const id = setTimeout(() => {
      Promise.all([
        fetch(`/api/ronyx/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ results: [] })),
      ]).then(([res]) => setSearchResults(res.results ?? []));
    }, 180);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const displayName = user.first_name || user.last_name
    ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
    : user.email?.split("@")[0] ?? "Account";

  function isItemActive(href: string) {
    const { path, tab } = parseHref(href);
    if (href === "/ronyx") return pathname === "/ronyx";
    if (tab) return pathname === path && currentTab === tab;
    return pathname.startsWith(path);
  }
  function isChildActive(href: string) {
    const { path, tab } = parseHref(href);
    if (tab) return pathname === path && currentTab === tab;
    return pathname === path || pathname.startsWith(path + "/");
  }
  function isOnSection(item: NavItem) { return pathname.startsWith(parseHref(item.href).path); }
  function toggleItem(label: string, e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setExpanded(prev => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });
  }

  const totalCritical = daily?.criticalItems.length ?? 0;
  const totalPulse = daily ? (
    (daily.pulse.dispatchBlocks > 0 ? 1 : 0) +
    (daily.pulse.payrollHolds > 0 ? 1 : 0) +
    (daily.pulse.trucksDown > 0 ? 1 : 0)
  ) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <PageProtection />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        a { text-decoration: none; }

        /* ── Sidebar ─────────────────── */
        .tms-sidebar {
          width: 224px; min-height: 100vh;
          background:
            radial-gradient(120% 55% at 0% 0%, rgba(56,189,248,0.10), transparent 60%),
            radial-gradient(90% 50% at 100% 100%, rgba(139,92,246,0.14), transparent 60%),
            linear-gradient(168deg, #0a1228 0%, #111a3d 45%, #0a0f24 100%);
          color: #e2e8f0;
          box-shadow: inset -1px 0 0 rgba(56,189,248,0.20), 6px 0 28px rgba(2,6,23,0.55);
          display: flex; flex-direction: column; flex-shrink: 0;
          position: sticky; top: 0; height: 100vh;
          overflow-y: auto; overflow-x: hidden; z-index: 30;
          scrollbar-width: none;
        }
        .tms-sidebar::-webkit-scrollbar { display: none; }

        /* Brand */
        .tms-brand { padding: 12px 14px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        .tms-brand-name {
          font-size: 0.9rem; font-weight: 800; letter-spacing: 0.6px;
          background: linear-gradient(90deg, #e0f2fe, #67e8f9 55%, #a78bfa);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          text-shadow: 0 0 18px rgba(103,232,249,0.25);
        }
        .tms-brand-sub  { font-size: 0.62rem; color: rgba(255,255,255,0.5); margin-top: 1px; }

        /* Search */
        .tms-search-row {
          padding: 7px 10px 6px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        .tms-search-btn {
          display: flex; align-items: center; gap: 7px;
          width: 100%; padding: 7px 10px; border-radius: 7px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.6); font-size: 0.75rem; cursor: pointer;
          transition: background 120ms;
        }
        .tms-search-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }
        .tms-search-kbd {
          margin-left: auto; font-size: 0.6rem; background: rgba(255,255,255,0.1);
          border-radius: 4px; padding: 1px 5px; color: rgba(255,255,255,0.5);
        }

        /* Do This First */
        .tms-dtf {
          margin: 8px 10px 4px;
          background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
          border-radius: 9px; overflow: hidden;
        }
        .tms-dtf-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 7px 10px; cursor: pointer;
        }
        .tms-dtf-title { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #fca5a5; }
        .tms-dtf-count { font-size: 0.72rem; font-weight: 800; color: #f87171; background: rgba(239,68,68,0.25); padding: 1px 7px; border-radius: 10px; }
        .tms-dtf-item { display: flex; align-items: flex-start; gap: 6px; padding: 5px 10px; border-top: 1px solid rgba(239,68,68,0.15); transition: background 100ms; }
        .tms-dtf-item:hover { background: rgba(239,68,68,0.1); }
        .tms-dtf-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
        .tms-dtf-text { font-size: 0.68rem; color: rgba(255,255,255,0.8); line-height: 1.4; }
        .tms-dtf-open { padding: 5px 10px 7px; border-top: 1px solid rgba(239,68,68,0.15); }
        .tms-dtf-open-btn { font-size: 0.65rem; color: #f87171; font-weight: 700; background: none; border: none; cursor: pointer; padding: 0; }

        /* Daily pulse strip */
        .tms-pulse { padding: 7px 10px 6px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        .tms-pulse-label { font-size: 0.54rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.38); margin-bottom: 5px; }
        .tms-pulse-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; }
        .tms-pulse-cell { background: rgba(255,255,255,0.06); border-radius: 6px; padding: 5px 6px; text-align: center; }
        .tms-pulse-val { font-size: 0.88rem; font-weight: 800; color: #fff; line-height: 1; }
        .tms-pulse-val.warn { color: #fbbf24; }
        .tms-pulse-val.danger { color: #f87171; }
        .tms-pulse-key { font-size: 0.54rem; color: rgba(255,255,255,0.45); margin-top: 2px; line-height: 1.2; }

        /* Smart Actions */
        .tms-smart { padding: 6px 10px 5px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        .tms-smart-label { font-size: 0.54rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.38); margin-bottom: 4px; }
        .tms-smart-item {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 8px; border-radius: 6px; margin-bottom: 1px;
          color: rgba(255,255,255,0.78); font-size: 0.71rem; font-weight: 500;
          transition: background 100ms, color 100ms;
        }
        .tms-smart-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .tms-smart-count { margin-left: auto; font-size: 0.62rem; font-weight: 800; background: rgba(239,68,68,0.3); color: #fca5a5; padding: 1px 6px; border-radius: 8px; }

        /* Quick actions */
        .tms-qa { padding: 4px 10px 5px; border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
        .tms-qa-label { font-size: 0.54rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.38); margin-bottom: 4px; }
        .tms-qa-item {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 8px; border-radius: 6px; margin-bottom: 1px;
          color: rgba(255,255,255,0.65); font-size: 0.71rem;
          background: none; border: none; cursor: pointer; width: 100%; text-align: left;
          transition: background 100ms, color 100ms;
        }
        .tms-qa-item:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* Nav */
        .tms-nav-group { padding: 6px 8px 2px; }
        .tms-nav-section { font-size: 0.52rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); padding: 0 5px 3px; margin-top: 2px; }
        .tms-nav-row { display: flex; align-items: stretch; border-radius: 7px; margin-bottom: 1px; transition: background 120ms, box-shadow 120ms; }
        .tms-nav-row:hover { background: linear-gradient(90deg, rgba(56,189,248,0.16), rgba(56,189,248,0.03)); box-shadow: inset 2px 0 0 rgba(103,232,249,0.75); }
        .tms-nav-link {
          display: flex; align-items: center; gap: 6px; flex: 1;
          padding: 5px 6px 5px 8px; color: rgba(255,255,255,0.78);
          font-size: 0.75rem; font-weight: 500; min-width: 0; transition: color 100ms;
        }
        .tms-nav-link:hover { color: #fff; }
        .tms-nav-link.active, .tms-nav-link.section-on { color: #fff; font-weight: 700; }
        .tms-nav-icon { font-size: 0.85rem; flex-shrink: 0; width: 18px; text-align: center; }
        .tms-nav-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tms-nav-toggle { display: flex; align-items: center; justify-content: center; width: 24px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.4); font-size: 0.65rem; padding: 0; transition: color 100ms; }
        .tms-nav-toggle:hover { color: rgba(255,255,255,0.8); }
        .tms-nav-sub { margin: 1px 0 2px 14px; padding-left: 8px; border-left: 1px solid rgba(255,255,255,0.15); }
        .tms-nav-sub-row {
          display: flex; align-items: center; gap: 5px; padding: 4px 7px;
          border-radius: 5px; color: rgba(255,255,255,0.6); font-size: 0.7rem;
          font-weight: 500; margin-bottom: 1px; transition: background 100ms, color 100ms;
        }
        .tms-nav-sub-row:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .tms-nav-sub-row.active { font-weight: 700; color: #fff; background: rgba(255,255,255,0.13); }
        .tms-sub-icon { font-size: 0.75rem; flex-shrink: 0; width: 14px; text-align: center; }
        .tms-sub-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Footer */
        .tms-sidebar-footer { margin-top: auto; padding: 8px 14px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.6rem; color: rgba(255,255,255,0.3); flex-shrink: 0; }

        /* Main */
        .tms-main { flex: 1; display: flex; flex-direction: column; background: #f1f5f9; min-width: 0; }
        .tms-topbar { height: 52px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 20; gap: 16px; }
        .tms-topbar-left { display: flex; align-items: center; gap: 12px; }
        /* Today's priorities — live chips in the top bar (from daily-command) */
        .tms-topbar-center { display: flex; align-items: center; gap: 7px; overflow-x: auto; flex: 1; justify-content: center; scrollbar-width: none; }
        .tms-topbar-center::-webkit-scrollbar { display: none; }
        .tms-tb-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 11px; border-radius: 20px; font-size: 0.74rem; font-weight: 700; text-decoration: none; white-space: nowrap; border: 1px solid; transition: transform 0.12s, box-shadow 0.12s; }
        .tms-tb-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .tms-tb-chip .n { background: rgba(0,0,0,0.10); border-radius: 10px; padding: 0 6px; font-size: 0.7rem; font-weight: 800; }
        .tms-tb-chip.ok { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
        .tms-tb-chip.warn { background: #fffbeb; color: #b45309; border-color: #fde68a; }
        .tms-tb-chip.danger { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        @media (max-width: 820px) { .tms-topbar-center { display: none; } }
        .tms-menu-btn { display: none; background: none; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-size: 1rem; color: #475569; }
        .tms-topbar-right { display: flex; align-items: center; gap: 8px; }
        .tms-icon-btn { position: relative; background: #f1f5f9; border: none; border-radius: 8px; padding: 7px 10px; cursor: pointer; font-size: 1rem; color: #475569; }
        .tms-notif-badge { position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; border: 1.5px solid #fff; }
        .tms-user-chip { display: flex; align-items: center; gap: 8px; background: #f1f5f9; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #0f172a; }
        .tms-user-avatar { width: 26px; height: 26px; border-radius: 50%; background: #1e40af; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }
        .tms-time { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
        .tms-content { flex: 1; padding: 16px 20px; }

        /* Search overlay */
        .tms-search-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(15,23,42,0.6); display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; }
        .tms-search-box { width: 560px; max-width: 92vw; background: #fff; border-radius: 14px; box-shadow: 0 24px 64px rgba(0,0,0,0.25); overflow: hidden; }
        .tms-search-input-wrap { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
        .tms-search-icon { font-size: 1.1rem; color: #94a3b8; flex-shrink: 0; }
        .tms-search-input { flex: 1; border: none; outline: none; font-size: 1rem; color: #0f172a; }
        .tms-search-close { background: none; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 8px; font-size: 0.72rem; color: #64748b; cursor: pointer; }
        .tms-search-results { max-height: 360px; overflow-y: auto; }
        .tms-search-result { display: flex; align-items: center; gap: 10px; padding: 11px 18px; transition: background 80ms; cursor: pointer; }
        .tms-search-result:hover { background: #f8fafc; }
        .tms-search-type { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; min-width: 64px; }
        .tms-search-label { font-size: 0.85rem; color: #0f172a; }
        .tms-search-empty { padding: 28px; text-align: center; color: #94a3b8; font-size: 0.85rem; }
        .tms-search-hint { padding: 10px 18px; font-size: 0.7rem; color: #94a3b8; border-top: 1px solid #f1f5f9; }

        /* Smart Import FAB */
        .tms-smart-import-fab {
          display: flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #1e40af 0%, #4f46e5 100%);
          color: #fff; border: none; border-radius: 50px; padding: 8px 14px;
          font-size: 0.74rem; font-weight: 700; cursor: pointer;
          box-shadow: 0 5px 16px rgba(79,70,229,0.4); white-space: nowrap;
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        .tms-smart-import-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(79,70,229,0.55); }

        /* Mobile */
        @media (max-width: 900px) {
          .tms-sidebar { position: fixed; left: 0; top: 0; bottom: 0; transform: translateX(-100%); transition: transform 200ms ease; z-index: 50; }
          .tms-sidebar.open { transform: translateX(0); }
          .tms-overlay { display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 45; }
          .tms-overlay.open { display: block; }
          .tms-menu-btn { display: flex; }
          .tms-main { padding-bottom: 56px; }
          .tms-smart-import-fab { bottom: 68px; right: 16px; padding: 11px 16px; font-size: 0.78rem; }
        }
        @media (max-width: 600px) { .tms-time { display: none; } }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`tms-sidebar${mobileOpen ? " open" : ""}`}>

        {/* Zone 1: Brand + Search */}
        <div className="tms-brand">
          <div className="tms-brand-name">MoveAround TMS</div>
          <div className="tms-brand-sub">Ronyx Logistics Portal</div>
        </div>

        <div className="tms-search-row">
          <button className="tms-search-btn" onClick={() => setSearchOpen(true)}>
            🔍 <span>Search everything…</span>
            <span className="tms-search-kbd">⌘K</span>
          </button>
        </div>

        {/* Zone 1: Daily Command — DO THIS FIRST */}
        {(cmdLoading || (daily && daily.criticalItems.length > 0)) && (
          <div className="tms-dtf" style={{ marginBottom: 2 }}>
            <div className="tms-dtf-header">
              <span className="tms-dtf-title">⚑ DO THIS FIRST</span>
              {!cmdLoading && <span className="tms-dtf-count">{totalCritical}</span>}
              {cmdLoading && <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>loading…</span>}
            </div>
            {daily?.criticalItems.map((item, i) => (
              <Link key={i} href={item.href} className="tms-dtf-item" onClick={() => setMobileOpen(false)}>
                <span className="tms-dtf-dot" style={{ background: CATEGORY_COLOR[item.category] ?? "#94a3b8" }} />
                <span className="tms-dtf-text">{item.text}</span>
              </Link>
            ))}
            {daily && daily.criticalItems.length > 0 && (
              <div className="tms-dtf-open">
                <Link href="/ronyx/tasks" className="tms-dtf-open-btn" onClick={() => setMobileOpen(false)}>
                  Open Priority Queue →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Zone 1: Global Pulse */}
        {daily && (
          <div className="tms-pulse">
            <div className="tms-pulse-label">Daily Command</div>
            <div className="tms-pulse-grid">
              <div className="tms-pulse-cell">
                <div className="tms-pulse-val">{daily.pulse.activeLoads}</div>
                <div className="tms-pulse-key">Active Loads</div>
              </div>
              <div className="tms-pulse-cell">
                <div className={`tms-pulse-val${daily.pulse.dispatchBlocks > 0 ? " danger" : ""}`}>{daily.pulse.dispatchBlocks}</div>
                <div className="tms-pulse-key">Dispatch Blocks</div>
              </div>
              <div className="tms-pulse-cell">
                <div className={`tms-pulse-val${daily.pulse.ticketsNeedingReview > 0 ? " warn" : ""}`}>{daily.pulse.ticketsNeedingReview}</div>
                <div className="tms-pulse-key">Review Queue</div>
              </div>
              <div className="tms-pulse-cell">
                <div className={`tms-pulse-val${daily.pulse.payrollHolds > 0 ? " danger" : ""}`}>{daily.pulse.payrollHolds}</div>
                <div className="tms-pulse-key">Payroll Holds</div>
              </div>
              <div className="tms-pulse-cell">
                <div className={`tms-pulse-val${daily.pulse.trucksDown > 0 ? " danger" : ""}`}>{daily.pulse.trucksDown}</div>
                <div className="tms-pulse-key">Trucks Down</div>
              </div>
              <div className="tms-pulse-cell">
                <div className={`tms-pulse-val${daily.pulse.expiringDocs > 0 ? " warn" : ""}`}>{daily.pulse.expiringDocs}</div>
                <div className="tms-pulse-key">Expiring Docs</div>
              </div>
            </div>
          </div>
        )}

        {/* Zone 1: Smart Actions */}
        {daily && daily.smartActions.length > 0 && (
          <div className="tms-smart">
            <div className="tms-smart-label">Smart Actions</div>
            {daily.smartActions.map((a, i) => (
              <Link key={i} href={a.href} className="tms-smart-item" onClick={() => setMobileOpen(false)}>
                <span>↗</span>
                <span>{a.label}</span>
                <span className="tms-smart-count">{a.count}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Zone 1: Quick Tools */}
        <div className="tms-qa">
          <div className="tms-qa-label">Quick Tools</div>
          <button className="tms-qa-item" onClick={() => { setMobileOpen(false); setImportOpen(true); }}>
            <span>📥</span><span>Intel Import Center™</span>
          </button>
          <Link href="/ronyx/fast-scan" className="tms-qa-item" onClick={() => setMobileOpen(false)}>
            <span>⚡</span><span>Fast Scan™</span>
          </Link>
          <Link href="/ronyx/dispatch/dispatch-guard" className="tms-qa-item" onClick={() => setMobileOpen(false)}>
            <span>🛡️</span><span>Dispatch Guard™</span>
          </Link>
          <Link href="/ronyx/payroll?filter=holds" className="tms-qa-item" onClick={() => setMobileOpen(false)}>
            <span>💵</span><span>Payroll Review</span>
          </Link>
        </div>

        {/* Zone 2: Main Navigation */}
        {NAV_GROUPS.map((group) => (
          <div key={group.section} className="tms-nav-group">
            <div className="tms-nav-section">{group.section}</div>
            {group.items.map((item) => {
              const hasChildren  = !!item.children;
              const isOpen       = expanded.has(item.label);
              const sectionOn    = hasChildren && isOnSection(item);
              const directActive = !hasChildren && isItemActive(item.href);
              const color        = item.color ?? "#64748b";
              const rowStyle: React.CSSProperties = directActive || sectionOn
                ? { background: colorBg(color, 0.15), boxShadow: `inset 3px 0 0 ${color}` }
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
                      <span className="tms-nav-label">{item.label}</span>
                    </Link>
                    {hasChildren && (
                      <button className="tms-nav-toggle" onClick={(e) => toggleItem(item.label, e)}
                        aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        style={sectionOn ? { color } : {}}>
                        {isOpen ? "▾" : "▸"}
                      </button>
                    )}
                  </div>
                  {hasChildren && isOpen && (
                    <div className="tms-nav-sub">
                      {item.children!.map((child) => {
                        const childOn    = isChildActive(child.href);
                        const childColor = "#64748b";
                        return (
                          <Link key={child.href} href={child.href}
                            className={`tms-nav-sub-row${childOn ? " active" : ""}`}
                            style={childOn ? { background: "rgba(255,255,255,0.13)", color: "#fff" } : {}}
                            onClick={() => setMobileOpen(false)}>
                            {child.icon && <span className="tms-sub-icon">{child.icon}</span>}
                            <span className="tms-sub-label">{child.label}</span>
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

        {/* Zone 3: Personal / System footer */}
        <div className="tms-sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700 }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
          </div>
          MoveAround TMS · IGOTTA Technologies
        </div>
      </aside>

      {/* Mobile overlay */}
      <div className={`tms-overlay${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />

      {/* ── Search Overlay ───────────────────────────────────────────── */}
      {searchOpen && (
        <div className="tms-search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="tms-search-box" onClick={e => e.stopPropagation()}>
            <div className="tms-search-input-wrap">
              <span className="tms-search-icon">🔍</span>
              <input
                ref={searchRef}
                className="tms-search-input"
                placeholder="Search drivers, trucks, tickets, OOs, MC/DOT, phone…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && searchResults.length > 0) {
                    window.location.href = searchResults[0].href;
                    setSearchOpen(false);
                  }
                }}
              />
              <button className="tms-search-close" onClick={() => setSearchOpen(false)}>Esc</button>
            </div>
            <div className="tms-search-results">
              {searchQuery && searchResults.length === 0 && (
                <div className="tms-search-empty">No results for "{searchQuery}"</div>
              )}
              {searchResults.map((r, i) => (
                <Link key={i} href={r.href} className="tms-search-result" onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                  <span className="tms-search-type">{r.type}</span>
                  <span className="tms-search-label">{r.label}</span>
                </Link>
              ))}
            </div>
            <div className="tms-search-hint">
              Try: driver name · truck # · ticket # · MC/DOT number · phone · customer name
            </div>
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <div className="tms-main">
        <header className="tms-topbar">
          <div className="tms-topbar-left">
            <button className="tms-menu-btn" onClick={() => setMobileOpen(p => !p)} aria-label="Toggle menu">☰</button>
            <span style={{ fontSize: "0.82rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{now}</span>
          </div>

          {/* Today's priorities — live chips (only what needs attention) */}
          {daily && (
            <div className="tms-topbar-center">
              {(() => {
                const p = daily.pulse;
                const chips = [
                  p.dispatchBlocks       ? { n: p.dispatchBlocks,       label: "Dispatch",    icon: "🚛", href: "/ronyx/dispatch/dispatch-guard",   cls: "danger" } : null,
                  p.missingTickets       ? { n: p.missingTickets,       label: "Missing",     icon: "⚠",  href: "/ronyx/tickets?tab=needs_review",  cls: "danger" } : null,
                  p.payrollHolds         ? { n: p.payrollHolds,         label: "Payroll",     icon: "💵", href: "/ronyx/payroll?filter=holds",      cls: "danger" } : null,
                  p.trucksDown           ? { n: p.trucksDown,           label: "Trucks Down", icon: "🔧", href: "/ronyx/maintenance/breakdowns",    cls: "danger" } : null,
                  p.ticketsNeedingReview ? { n: p.ticketsNeedingReview, label: "Review",      icon: "🎫", href: "/ronyx/tickets?tab=needs_review",  cls: "warn" } : null,
                  p.expiringDocs         ? { n: p.expiringDocs,         label: "Expiring",    icon: "📄", href: "/ronyx/owner-operators/coi-matrix", cls: "warn" } : null,
                ].filter(Boolean) as { n: number; label: string; icon: string; href: string; cls: string }[];
                if (chips.length === 0) {
                  return <Link href="/ronyx/dispatch/board" className="tms-tb-chip ok"><span>✓</span> All clear today{p.activeLoads ? <> · {p.activeLoads} active</> : null}</Link>;
                }
                return chips.map((c, i) => (
                  <Link key={i} href={c.href} className={`tms-tb-chip ${c.cls}`} title={`${c.n} ${c.label} — click to open`}>
                    <span>{c.icon}</span> {c.label} <span className="n">{c.n}</span>
                  </Link>
                ));
              })()}
            </div>
          )}

          <div className="tms-topbar-right">
            <button className="tms-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search" title="Search (⌘K)">🔍</button>
            <button className="tms-icon-btn" aria-label="Notifications">🔔<span className="tms-notif-badge" /></button>
            <button className="tms-icon-btn" aria-label="Take a guided tour" title="Take a guided tour" onClick={() => setTourOpen(true)}>?</button>
            <button className="tms-user-chip">
              <div className="tms-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
              {displayName}
            </button>
          </div>
        </header>

        {pilotBanner.show && (
          <div style={{ background: pilotBanner.expired ? "#7f1d1d" : "#1e3a5f", color: "#fff", padding: "8px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: "0.8rem", borderBottom: `2px solid ${pilotBanner.expired ? "#dc2626" : "#2563eb"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1rem" }}>{pilotBanner.expired ? "⚠️" : "🚀"}</span>
              {pilotBanner.expired ? (
                <span><strong>Your Ronyx free trial has ended.</strong> Your data is saved. Upgrade to continue.</span>
              ) : (
                <span><strong>Ronyx Free Trial Active</strong> — Full system access{pilotBanner.daysRemaining !== null && <> · <strong>{pilotBanner.daysRemaining}d</strong> left</>}</span>
              )}
            </div>
            {pilotBanner.expired && (
              <a href="/ronyx/settings/billing" style={{ background: "#dc2626", color: "#fff", padding: "4px 14px", borderRadius: 5, fontWeight: 700, fontSize: "0.75rem", textDecoration: "none" }}>Upgrade Now</a>
            )}
          </div>
        )}

        <main className="tms-content">{children}</main>
      </div>

      <GuidedTour steps={RONYX_TOUR} open={tourOpen} onClose={() => setTourOpen(false)} tourId="ronyx_v1" />

      {/* Intel Import Center™ FAB */}
      {!fabHidden && (
        <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 100 }}>
          <button className="tms-smart-import-fab" onClick={() => { setMobileOpen(false); setImportOpen(true); }}>
            <span style={{ fontSize: "0.95rem" }}>📥</span>
            Intel Import
          </button>
          <button onClick={() => setFabHidden(true)} title="Hide this button" aria-label="Hide Intel Import button"
            style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", background: "#fff", color: "#475569", border: "1px solid #cbd5e1", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.18)", lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      <IntelImportCenter open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
