"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import BrandLogo from "@/components/ronyx/BrandLogo";
import { MODULE_LOGO_MAP, BrandAssetKey } from "@/lib/brandAssets";

// ── Types ─────────────────────────────────────────────────────────────────────

type Module = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price: number;
  icon: string | null;
  category: string;
  included_in_plans: string[];
  sort_order: number;
  org_is_active: boolean;
};

type Subscription = {
  plan_slug: string;
  plan: { name: string } | null;
};

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: "all",              label: "All" },
  { slug: "operations",       label: "Operations" },
  { slug: "tickets-ocr",      label: "Tickets & OCR" },
  { slug: "billing-payroll",  label: "Billing & Payroll" },
  { slug: "compliance",       label: "Compliance" },
  { slug: "ai",               label: "AI / Automation" },
  { slug: "store",            label: "Store" },
  { slug: "enterprise-addons",label: "Enterprise Add-Ons" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  operations:         { bg: "#dbeafe", color: "#1e40af" },
  "tickets-ocr":      { bg: "#fef3c7", color: "#d97706" },
  "billing-payroll":  { bg: "#dcfce7", color: "#15803d" },
  compliance:         { bg: "#fee2e2", color: "#dc2626" },
  ai:                 { bg: "#ede9fe", color: "#7c3aed" },
  store:              { bg: "#d1fae5", color: "#065f46" },
  "enterprise-addons":{ bg: "#f0f4ff", color: "#3730a3" },
};

function catColor(cat: string): { bg: string; color: string } {
  return CATEGORY_COLORS[cat] ?? { bg: "#f1f5f9", color: "#475569" };
}

// DB category slug → display filter slug
const DB_TO_DISPLAY: Record<string, string> = {
  operations: "operations",
  compliance: "compliance",
  money:      "billing-payroll",
  people:     "operations",
  ai:         "ai",
  commerce:   "store",
};

// Per-slug overrides (takes precedence over DB category)
const SLUG_CATEGORY_OVERRIDE: Record<string, string> = {
  "fast-scan": "tickets-ocr",
  billing:     "billing-payroll",
  payroll:     "billing-payroll",
};

function displayCat(m: Module): string {
  if (SLUG_CATEGORY_OVERRIDE[m.slug]) return SLUG_CATEGORY_OVERRIDE[m.slug];
  return DB_TO_DISPLAY[m.category] ?? m.category;
}

// ── Featured module config ────────────────────────────────────────────────────

// These slugs get dedicated featured cards and are excluded from the regular grid
const FEATURED_SLUGS = ["ccb", "fast-dispatch"];

// Which filter tabs reveal each featured card
const FEATURED_CATEGORIES: Record<string, string[]> = {
  "ccb":           ["compliance", "billing-payroll", "enterprise-addons"],
  "fast-dispatch": ["operations", "ai", "enterprise-addons"],
};

// Local fallbacks — used if DB migrations haven't been run yet
const LOCAL_FEATURED: Module[] = [
  {
    id: "local-ccb",
    slug: "ccb",
    name: "CCB™ — Carrier Clearance Bureau",
    description: "Carrier vetting, clearance status, billing risk, compliance controls, dispatch holds, account blocks, and audit history for owner operators and sub-haulers.",
    monthly_price: 199,
    icon: "🏛️",
    category: "compliance",
    included_in_plans: ["enterprise", "enterprise-plus"],
    sort_order: 100,
    org_is_active: false,
  },
  {
    id: "local-fast-dispatch",
    slug: "fast-dispatch",
    name: "Fast Dispatch™",
    description: "AI-assisted dispatch recommendations for drivers, trucks, compliance, tickets, payroll, billing, and CCB holds.",
    monthly_price: 299,
    icon: "⚡",
    category: "ai",
    included_in_plans: ["pro", "enterprise", "enterprise-plus"],
    sort_order: 101,
    org_is_active: false,
  },
];

// ── Module Card (regular grid) ────────────────────────────────────────────────

function ModuleCard({
  module,
  planSlug,
  onToggle,
  toggling,
}: {
  module: Module;
  planSlug: string;
  onToggle: (slug: string, action: "activate" | "deactivate") => void;
  toggling: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive       = module.org_is_active;
  const includedInPlan = module.included_in_plans.includes(planSlug);
  const dispCat        = displayCat(module);
  const cc             = catColor(dispCat);
  const catLabel       = CATEGORIES.find(c => c.slug === dispCat)?.label ?? dispCat;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: isActive ? "2px solid #86efac" : "1px solid #e2e8f0",
        borderRadius: 14,
        padding: "20px 20px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 150ms",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        opacity: toggling ? 0.7 : 1,
      }}
    >
      {(() => {
        const logoKey = MODULE_LOGO_MAP[module.slug] as BrandAssetKey | undefined;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logoKey ? (
              <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, flexShrink: 0, padding: 4 }}>
                <BrandLogo asset={logoKey} maxHeight={36} maxWidth={36} fallbackStyle={{ fontSize: "0.55rem", color: "#64748b" }} />
              </div>
            ) : (
              <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{module.icon ?? "📦"}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{module.name}</div>
              <span style={{ display: "inline-block", marginTop: 3, background: cc.bg, color: cc.color, borderRadius: 20, padding: "2px 9px", fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {catLabel}
              </span>
            </div>
          </div>
        );
      })()}

      <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
        {module.description ?? getDefaultDescription(module.slug)}
      </div>

      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: includedInPlan ? "#15803d" : "#1e40af" }}>
        {includedInPlan
          ? `✓ Included in ${planSlug.charAt(0).toUpperCase() + planSlug.slice(1)}`
          : module.monthly_price === 0 ? "Free" : `$${module.monthly_price}/mo add-on`}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: isActive ? "#dcfce7" : "#f1f5f9", color: isActive ? "#15803d" : "#64748b" }}>
          {isActive ? "🟢 Active" : "🔒 Inactive"}
        </span>
        {isActive ? (
          <button
            onClick={() => onToggle(module.slug, "deactivate")}
            disabled={toggling}
            style={{ padding: "6px 14px", background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem", cursor: toggling ? "not-allowed" : "pointer" }}
          >
            {toggling ? "…" : "Deactivate"}
          </button>
        ) : (
          <button
            onClick={() => onToggle(module.slug, "activate")}
            disabled={toggling}
            style={{ padding: "6px 14px", background: toggling ? "#94a3b8" : "#1e40af", color: "#ffffff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem", cursor: toggling ? "not-allowed" : "pointer" }}
          >
            {toggling ? "…" : "Activate"}
          </button>
        )}
      </div>
    </div>
  );
}

function getDefaultDescription(slug: string): string {
  const map: Record<string, string> = {
    dispatch:          "Core dispatching, load tracking, and driver assignment.",
    "fast-scan":       "OCR ticket scanning and automatic data extraction.",
    compliance:        "Driver compliance tracking, document expiry alerts, and DOT readiness.",
    maintenance:       "Fleet maintenance scheduling, breakdown tracking, and service logs.",
    payroll:           "Driver payroll calculation, ticket-to-pay reconciliation, and export.",
    billing:           "Customer invoice generation, aging reports, and collections.",
    "owner-operators": "Owner operator onboarding, COI tracking, and settlement reports.",
    "customer-portal": "Self-service portal for customers to view tickets and invoices.",
    "live-tracking":   "Real-time GPS tracking of trucks and loads on the map.",
    "ai-assistant":    "AI-powered office assistant for dispatch, compliance, and reporting.",
    store:             "Shopify-linked merch store for MoveAround branded gear.",
  };
  return map[slug] ?? "No description available.";
}

// ── CCB Featured Card ─────────────────────────────────────────────────────────

function CcbCard({ mod, planSlug, onToggle, togglingSlug }: {
  mod: Module; planSlug: string;
  onToggle: (slug: string, action: "activate" | "deactivate") => void;
  togglingSlug: string | null;
}) {
  const isActive = mod.org_is_active;
  const inPlan   = mod.included_in_plans.includes(planSlug);
  return (
    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flex: "1 1 300px" }}>
        <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 14px", flexShrink: 0 }}>
          <BrandLogo asset="ccb" maxHeight={40} maxWidth={120} fallbackStyle={{ color: "#c7d2fe", fontSize: "0.7rem", fontWeight: 700 }} />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: "#ffffff" }}>CCB™ — Carrier Clearance Bureau</div>
            <span style={{ background: "#312e81", color: "#a5b4fc", border: "1px solid #4f46e5", borderRadius: 20, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Enterprise Add-On
            </span>
          </div>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, maxWidth: 480 }}>
            Carrier vetting, clearance status, billing risk, compliance controls, dispatch holds, account blocks, and audit history for owner operators and sub-haulers.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {inPlan
              ? <span style={{ fontSize: "0.75rem", color: "#86efac", fontWeight: 700 }}>✓ Included in your plan</span>
              : <span style={{ fontSize: "0.75rem", color: "#a5b4fc", fontWeight: 700 }}>+$199/mo add-on</span>}
            <span style={{ fontSize: "0.75rem", color: "#4b5563" }}>·</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Included in Enterprise &amp; Enterprise Plus</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {isActive ? (
          <button onClick={() => onToggle("ccb", "deactivate")} disabled={togglingSlug === "ccb"} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.12)", color: "#c7d2fe", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            ✓ Active — Deactivate
          </button>
        ) : (
          <button onClick={() => onToggle("ccb", "activate")} disabled={togglingSlug === "ccb"} style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            🏛️ Activate CCB
          </button>
        )}
        <Link href="/ronyx/settings/billing" style={{ padding: "9px 20px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, fontWeight: 600, fontSize: "0.78rem", textDecoration: "none", textAlign: "center" }}>
          View Enterprise Plans
        </Link>
      </div>
    </div>
  );
}

// ── Fast Dispatch Featured Card ───────────────────────────────────────────────

function FastDispatchCard({ mod, planSlug, onToggle, togglingSlug }: {
  mod: Module; planSlug: string;
  onToggle: (slug: string, action: "activate" | "deactivate") => void;
  togglingSlug: string | null;
}) {
  const isActive = mod.org_is_active;
  const inPlan   = mod.included_in_plans.includes(planSlug);
  return (
    <div style={{ background: "linear-gradient(135deg, #052e16 0%, #064e3b 50%, #065f46 100%)", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flex: "1 1 300px" }}>
        <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "14px", flexShrink: 0, fontSize: "2rem", lineHeight: 1 }}>
          ⚡
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: "#ffffff" }}>Fast Dispatch™</div>
            <span style={{ background: "#064e3b", color: "#6ee7b7", border: "1px solid #059669", borderRadius: 20, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              AI Add-On
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>Virtual Dispatcher powered by MoveAround TMS</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.5, maxWidth: 520 }}>
            AI-assisted dispatch recommendations for drivers, trucks, compliance, tickets, payroll, billing, and CCB holds.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 20px", marginTop: 8 }}>
            {["Recommend best driver","Check dispatch blockers","Driver/truck eligibility","Late/risk alerts","Missing ticket alerts","Send completed jobs to Fast Scan","Payroll and billing routing suggestions"].map(f => (
              <span key={f} style={{ fontSize: "0.72rem", color: "#6ee7b7" }}>✓ {f}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            {inPlan
              ? <span style={{ fontSize: "0.75rem", color: "#6ee7b7", fontWeight: 700 }}>✓ Included in your plan</span>
              : <span style={{ fontSize: "0.75rem", color: "#6ee7b7", fontWeight: 700 }}>+$299/mo add-on</span>}
            <span style={{ fontSize: "0.75rem", color: "#374151" }}>·</span>
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Included in Pro, Enterprise &amp; Enterprise Plus</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        {isActive ? (
          <button onClick={() => onToggle("fast-dispatch", "deactivate")} disabled={togglingSlug === "fast-dispatch"} style={{ padding: "10px 20px", background: "rgba(255,255,255,0.12)", color: "#6ee7b7", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            ✓ Active — Deactivate
          </button>
        ) : (
          <button onClick={() => onToggle("fast-dispatch", "activate")} disabled={togglingSlug === "fast-dispatch"} style={{ padding: "10px 20px", background: "#059669", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            ⚡ Activate Fast Dispatch
          </button>
        )}
        <Link href="/ronyx/settings/billing" style={{ padding: "9px 20px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, fontWeight: 600, fontSize: "0.78rem", textDecoration: "none", textAlign: "center" }}>
          View Plans
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const [modules, setModules]           = useState<Module[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  // Merge API response with local featured fallbacks (so stats always count them)
  function mergeWithFallbacks(apiModules: Module[]): Module[] {
    const merged = [...apiModules];
    for (const local of LOCAL_FEATURED) {
      if (!merged.some(m => m.slug === local.slug)) merged.push(local);
    }
    return merged;
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, sRes] = await Promise.all([
        fetch("/api/ronyx/subscription-modules"),
        fetch("/api/ronyx/subscription"),
      ]);
      const [mJson, sJson] = await Promise.all([mRes.json(), sRes.json()]);
      setModules(mergeWithFallbacks(mJson.modules ?? []));
      if (sJson.subscription) setSubscription(sJson.subscription);
    } catch {
      setError("Failed to load module data");
      setModules(LOCAL_FEATURED);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const planSlug = subscription?.plan_slug ?? "starter";

  // Stats — include ALL modules (featured + regular)
  const activeCount   = modules.filter(m => m.org_is_active).length;
  const inactiveCount = modules.filter(m => !m.org_is_active).length;
  // Est. add-on cost = inactive paid add-ons not already in current plan
  const addonCost = modules
    .filter(m => !m.org_is_active && m.monthly_price > 0 && !m.included_in_plans.includes(planSlug))
    .reduce((sum, m) => sum + m.monthly_price, 0);

  // Regular modules (exclude featured — they get their own cards)
  const regularModules = modules.filter(m => !FEATURED_SLUGS.includes(m.slug));

  // Which featured cards are visible for the active category
  const showCcb = activeCategory === "all" || FEATURED_CATEGORIES["ccb"].includes(activeCategory);
  const showFd  = activeCategory === "all" || FEATURED_CATEGORIES["fast-dispatch"].includes(activeCategory);

  // Regular modules visible in current tab
  const filteredRegular = activeCategory === "all"
    ? regularModules
    : regularModules.filter(m => displayCat(m) === activeCategory);

  // True empty = no featured cards AND no regular modules for this tab
  const isEmptyCategory = !showCcb && !showFd && filteredRegular.length === 0;

  const ccbMod = modules.find(m => m.slug === "ccb") ?? LOCAL_FEATURED[0];
  const fdMod  = modules.find(m => m.slug === "fast-dispatch") ?? LOCAL_FEATURED[1];

  async function handleToggle(slug: string, action: "activate" | "deactivate") {
    setTogglingSlug(slug);
    setModules(prev => prev.map(m => m.slug === slug ? { ...m, org_is_active: action === "activate" } : m));
    try {
      const res = await fetch("/api/ronyx/subscription-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_slug: slug, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModules(prev => prev.map(m => m.slug === slug ? { ...m, org_is_active: action !== "activate" } : m));
        alert(json.error || "Toggle failed");
      } else if (json.modules) {
        setModules(mergeWithFallbacks(json.modules));
      }
    } catch {
      setModules(prev => prev.map(m => m.slug === slug ? { ...m, org_is_active: action !== "activate" } : m));
      alert("Network error — please try again");
    } finally {
      setTogglingSlug(null);
    }
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", color: "#0f172a", maxWidth: 1200 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #3b0764 0%, #6d28d9 40%, #7c3aed 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>🧩 Module Marketplace</h1>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", marginTop: 4 }}>Activate or deactivate features for your organization</div>
        </div>
        <Link href="/ronyx/settings/billing" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#ddd6fe", padding: "8px 18px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
          💳 Billing &amp; Subscription →
        </Link>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading modules…</div>}

      {error && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: "0.85rem" }}>{error}</div>}

      {!loading && (
        <>
          {/* ── Stats Strip ───────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Active Modules",   value: String(activeCount),  color: "#15803d", bg: "#dcfce7", border: "#86efac" },
              { label: "Est. Add-on Cost", value: addonCost > 0 ? `$${addonCost}/mo` : "$0/mo", color: "#1e40af", bg: "#dbeafe", border: "#93c5fd" },
              { label: "Available to Add", value: String(inactiveCount), color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
            ].map((stat) => (
              <div key={stat.label} style={{ flex: "1 1 160px", background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 12, padding: "14px 20px", minWidth: 140 }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: stat.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* ── Category Filter ───────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {CATEGORIES.map(({ slug, label }) => {
              const isAct = slug === activeCategory;
              const cc = slug === "all" ? { bg: "#1e40af", color: "#fff" } : catColor(slug);
              return (
                <button
                  key={slug}
                  onClick={() => setActiveCategory(slug)}
                  style={{
                    padding: "6px 16px",
                    background: isAct ? (slug === "all" ? "#1e40af" : cc.bg) : "#ffffff",
                    color:      isAct ? (slug === "all" ? "#ffffff" : cc.color) : "#64748b",
                    border:     isAct ? `2px solid ${slug === "all" ? "#1e40af" : cc.color}` : "1px solid #e2e8f0",
                    borderRadius: 20,
                    fontWeight: isAct ? 700 : 500,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    transition: "all 120ms",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Featured Cards ────────────────────────────────────────────── */}
          {showFd  && <FastDispatchCard mod={fdMod}  planSlug={planSlug} onToggle={handleToggle} togglingSlug={togglingSlug} />}
          {showCcb && <CcbCard         mod={ccbMod} planSlug={planSlug} onToggle={handleToggle} togglingSlug={togglingSlug} />}

          {/* ── Module Grid ───────────────────────────────────────────────── */}
          {filteredRegular.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginTop: (showCcb || showFd) ? 8 : 0 }}>
              {filteredRegular.map((m) => (
                <ModuleCard key={m.slug} module={m} planSlug={planSlug} onToggle={handleToggle} toggling={togglingSlug === m.slug} />
              ))}
            </div>
          )}

          {/* ── Empty state — only when the tab truly has no content ──────── */}
          {isEmptyCategory && (
            <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>🧩</div>
              <div style={{ fontWeight: 700, color: "#475569" }}>No modules in this category</div>
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>ℹ️</span>
            <span>
              Add-on billing for extra modules will be processed via Stripe — integration coming soon.
              Modules included in your plan are free.{" "}
              <Link href="/ronyx/settings/billing" style={{ color: "#7c3aed", fontWeight: 700 }}>View billing details</Link>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
