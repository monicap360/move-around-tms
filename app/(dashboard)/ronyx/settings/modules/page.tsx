"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type ModuleRow = {
  id?: string;
  module_key: string;
  module_name: string;
  module_subtitle?: string | null;
  category: string;
  status: "active" | "in_trial" | "available" | "locked" | "expired" | "coming_soon" | "inactive";
  description?: string | null;
  features?: string[];
  price_monthly?: number;
  price_label?: string | null;
  included_in_plan?: string[];
  trial_days_left?: number | null;
  is_enterprise_add_on?: boolean;
};

type Stats = {
  activeOrTrial: number;
  trialModules: number;
  availableAddOns: number;
  estAddOnCost: number;
};

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { slug: "all",              label: "All" },
  { slug: "Operations",       label: "Operations" },
  { slug: "Tickets & OCR",    label: "Tickets & OCR" },
  { slug: "Billing & Payroll",label: "Billing & Payroll" },
  { slug: "Compliance",       label: "Compliance" },
  { slug: "AI / Automation",  label: "AI / Automation" },
  { slug: "Enterprise Add-Ons",label: "Enterprise Add-Ons" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "Operations":         { bg: "#dbeafe", color: "#1e40af" },
  "Tickets & OCR":      { bg: "#fef3c7", color: "#d97706" },
  "Billing & Payroll":  { bg: "#dcfce7", color: "#15803d" },
  "Compliance":         { bg: "#fee2e2", color: "#dc2626" },
  "AI / Automation":    { bg: "#ede9fe", color: "#7c3aed" },
  "Enterprise Add-Ons": { bg: "#f0f4ff", color: "#3730a3" },
};

function catColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: "#f1f5f9", color: "#475569" };
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ModuleRow["status"] }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:      { label: "🟢 Active",       bg: "#dcfce7", color: "#15803d" },
    in_trial:    { label: "🟢 Trial Active",  bg: "#d1fae5", color: "#065f46" },
    available:   { label: "🔒 Available",     bg: "#f1f5f9", color: "#64748b" },
    locked:      { label: "🔒 Locked",        bg: "#f1f5f9", color: "#94a3b8" },
    expired:     { label: "⚠️ Expired",       bg: "#fef2f2", color: "#dc2626" },
    coming_soon: { label: "⏳ Coming Soon",   bg: "#fffbeb", color: "#d97706" },
    inactive:    { label: "⭕ Inactive",      bg: "#f8fafc", color: "#94a3b8" },
  };
  const s = map[status] ?? map.available;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Regular module card ───────────────────────────────────────────────────────

function ModuleCard({
  module,
  onToggle,
  toggling,
}: {
  module: ModuleRow;
  onToggle: (key: string, action: "activate" | "deactivate") => void;
  toggling: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isOn  = module.status === "active" || module.status === "in_trial";
  const cc    = catColor(module.category);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: isOn ? "2px solid #86efac" : "1px solid #e2e8f0",
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
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", lineHeight: 1.3 }}>
            {module.module_name}
          </div>
          {module.module_subtitle && (
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>{module.module_subtitle}</div>
          )}
          <span style={{ display: "inline-block", marginTop: 5, background: cc.bg, color: cc.color, borderRadius: 20, padding: "2px 9px", fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {module.category}
          </span>
        </div>
      </div>

      {/* Description */}
      {module.description && (
        <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
          {module.description}
        </div>
      )}

      {/* Pricing / plan line */}
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: (module.price_monthly ?? 0) > 0 ? "#1e40af" : "#15803d" }}>
        {module.price_label ?? (
          (module.price_monthly ?? 0) === 0
            ? `✓ Included in ${module.included_in_plan?.join(", ") ?? "plan"}`
            : `$${module.price_monthly}/mo add-on`
        )}
      </div>

      {/* Bottom row: status + button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <StatusBadge status={module.status} />
        {isOn ? (
          <button
            onClick={() => onToggle(module.module_key, "deactivate")}
            disabled={toggling}
            style={{ padding: "6px 14px", background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem", cursor: toggling ? "not-allowed" : "pointer" }}
          >
            {toggling ? "…" : "Deactivate"}
          </button>
        ) : (
          <button
            onClick={() => onToggle(module.module_key, "activate")}
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

// ── Enterprise Add-On featured card ──────────────────────────────────────────

const ENTERPRISE_GRADIENTS: Record<string, string> = {
  ccb:           "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
  fast_dispatch: "linear-gradient(135deg, #052e16 0%, #064e3b 50%, #065f46 100%)",
};
const ENTERPRISE_BORDER: Record<string, string> = {
  ccb:           "1px solid rgba(99,102,241,0.4)",
  fast_dispatch: "1px solid rgba(16,185,129,0.35)",
};
const ENTERPRISE_BADGE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  ccb:           { bg: "#312e81", color: "#a5b4fc", border: "1px solid #4f46e5" },
  fast_dispatch: { bg: "#064e3b", color: "#6ee7b7", border: "1px solid #059669" },
};
const DEFAULT_ENTERPRISE_GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e40af 100%)";

function EnterpriseCard({
  module,
  onToggle,
  toggling,
}: {
  module: ModuleRow;
  onToggle: (key: string, action: "activate" | "deactivate") => void;
  toggling: boolean;
}) {
  const isOn    = module.status === "active" || module.status === "in_trial";
  const bg      = ENTERPRISE_GRADIENTS[module.module_key] ?? DEFAULT_ENTERPRISE_GRADIENT;
  const border  = ENTERPRISE_BORDER[module.module_key] ?? "1px solid rgba(99,102,241,0.25)";
  const badge   = ENTERPRISE_BADGE_STYLE[module.module_key] ?? { bg: "#1e3a5f", color: "#93c5fd", border: "1px solid #3b82f6" };
  const btnColor = module.module_key === "ccb" ? "#4f46e5" : module.module_key === "fast_dispatch" ? "#059669" : "#1e40af";

  return (
    <div style={{ background: bg, border, borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 14 }}>
      <div style={{ flex: "1 1 300px" }}>
        {/* Title + subtitle badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, fontSize: "1rem", color: "#ffffff" }}>{module.module_name}</div>
          {module.module_subtitle && (
            <span style={{ background: badge.bg, color: badge.color, border: badge.border, borderRadius: 20, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {module.module_subtitle}
            </span>
          )}
        </div>

        {/* Description */}
        {module.description && (
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, maxWidth: 520, marginBottom: 10 }}>
            {module.description}
          </div>
        )}

        {/* Features */}
        {module.features && module.features.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 18px", marginBottom: 10 }}>
            {module.features.slice(0, 8).map(f => (
              <span key={f} style={{ fontSize: "0.72rem", color: badge.color }}>✓ {f}</span>
            ))}
          </div>
        )}

        {/* Price label */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {module.price_label ? (
            // Split on " · " to render each pricing point on its own line
            module.price_label.split(" · ").map((part, i) => (
              <span key={i} style={{ fontSize: i === 0 ? "0.8rem" : "0.73rem", color: i === 0 ? badge.color : "rgba(255,255,255,0.55)", fontWeight: i === 0 ? 700 : 500 }}>
                {i === 0 ? part : `· ${part}`}
              </span>
            ))
          ) : (
            <span style={{ fontSize: "0.78rem", color: badge.color, fontWeight: 700 }}>
              {(module.price_monthly ?? 0) === 0 ? `Included in ${module.included_in_plan?.join(", ")}` : `$${module.price_monthly}/mo add-on`}
            </span>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, minWidth: 160 }}>
        <StatusBadge status={module.status} />
        {isOn ? (
          <button
            onClick={() => onToggle(module.module_key, "deactivate")}
            disabled={toggling}
            style={{ padding: "10px 20px", background: "rgba(255,255,255,0.12)", color: badge.color, border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
          >
            ✓ Active — Deactivate
          </button>
        ) : (
          <button
            onClick={() => onToggle(module.module_key, "activate")}
            disabled={toggling}
            style={{ padding: "10px 20px", background: btnColor, color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
          >
            Activate {module.module_name.split(" ")[0]}
          </button>
        )}
        <Link
          href="/ronyx/settings/billing"
          style={{ padding: "9px 20px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, fontWeight: 600, fontSize: "0.78rem", textDecoration: "none", textAlign: "center" }}
        >
          View Enterprise Plans
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const [modules,       setModules]       = useState<ModuleRow[]>([]);
  const [stats,         setStats]         = useState<Stats>({ activeOrTrial: 0, trialModules: 0, availableAddOns: 0, estAddOnCost: 0 });
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [trialActive,   setTrialActive]   = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [togglingKey,   setTogglingKey]   = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/ronyx/subscription-modules");
      const json = await res.json();
      setModules(json.modules ?? []);
      if (json.stats)         setStats(json.stats);
      if (json.trialDaysLeft != null) setTrialDaysLeft(json.trialDaysLeft);
      if (json.trialActive != null)   setTrialActive(json.trialActive);
    } catch {
      setError("Failed to load module data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleToggle(key: string, action: "activate" | "deactivate") {
    setTogglingKey(key);
    setModules(prev => prev.map(m =>
      m.module_key === key ? { ...m, status: action === "activate" ? "active" : "inactive" } : m
    ));
    try {
      const res  = await fetch("/api/ronyx/subscription-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_key: key, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModules(prev => prev.map(m =>
          m.module_key === key ? { ...m, status: action === "activate" ? "available" : "active" } : m
        ));
        alert(json.error || "Toggle failed");
      } else if (json.modules?.length) {
        setModules(json.modules);
      }
    } catch {
      alert("Network error — please try again");
    } finally {
      setTogglingKey(null);
    }
  }

  // Split enterprise add-ons (featured dark cards) from regular grid modules
  const enterpriseModules = modules.filter(m =>
    m.category === "Enterprise Add-Ons" || m.is_enterprise_add_on === true
  );
  const regularModules = modules.filter(m =>
    m.category !== "Enterprise Add-Ons" && !m.is_enterprise_add_on
  );

  // Filter by active category tab
  const showEnterpriseSection = activeCategory === "all" || activeCategory === "Enterprise Add-Ons";
  const filteredEnterprise = showEnterpriseSection
    ? enterpriseModules
    : enterpriseModules.filter(m => m.category === activeCategory);

  const filteredRegular = activeCategory === "all"
    ? regularModules
    : regularModules.filter(m => m.category === activeCategory);

  const isEmpty = filteredEnterprise.length === 0 && filteredRegular.length === 0;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", color: "#0f172a", maxWidth: 1200 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ background: "linear-gradient(135deg, #3b0764 0%, #6d28d9 40%, #7c3aed 100%)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
            🧩 Module Marketplace
          </h1>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", marginTop: 4 }}>
            Activate or deactivate features for your organization
          </div>
        </div>
        <Link href="/ronyx/settings/billing" style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#ddd6fe", padding: "8px 18px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
          💳 Billing &amp; Subscription →
        </Link>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading modules…</div>}
      {error   && <div style={{ background: "#fee2e2", color: "#dc2626", padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: "0.85rem" }}>{error}</div>}

      {!loading && (
        <>
          {/* ── Stats Strip ───────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Active Modules",       value: String(stats.activeOrTrial),  color: "#15803d", bg: "#dcfce7", border: "#86efac" },
              { label: "Trial Modules",         value: String(stats.trialModules),   color: "#065f46", bg: "#d1fae5", border: "#6ee7b7" },
              { label: "Available Add-Ons",     value: String(stats.availableAddOns),color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
              { label: "Trial Days Left",       value: trialDaysLeft != null ? `${trialDaysLeft}d` : "—", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
              { label: "Est. Available Add-on Cost", value: stats.estAddOnCost > 0 ? `$${stats.estAddOnCost}/mo` : "$0/mo", color: "#1e40af", bg: "#dbeafe", border: "#93c5fd" },
            ].map((stat) => (
              <div key={stat.label} style={{ flex: "1 1 140px", background: stat.bg, border: `1px solid ${stat.border}`, borderRadius: 12, padding: "14px 18px", minWidth: 130 }}>
                <div style={{ fontSize: "0.67rem", fontWeight: 700, color: stat.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: "1.55rem", fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* ── Trial banner ──────────────────────────────────────────────── */}
          {trialActive && (
            <div style={{ background: "linear-gradient(90deg, #064e3b, #065f46)", border: "1px solid #059669", borderRadius: 12, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.1rem" }}>🟢</span>
              <span style={{ color: "#6ee7b7", fontWeight: 700, fontSize: "0.85rem" }}>
                Free Trial Active — All modules marked Trial Active have full access.{" "}
                {trialDaysLeft != null ? `${trialDaysLeft} days remaining.` : ""}
              </span>
            </div>
          )}

          {/* ── Category Filter ───────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {CATEGORIES.map(({ slug, label }) => {
              const isAct = slug === activeCategory;
              const cc = slug === "all" ? { bg: "#1e40af", color: "#fff" } : catColor(slug);
              return (
                <button
                  key={slug}
                  onClick={() => setActiveCategory(slug)}
                  style={{ padding: "6px 16px", background: isAct ? (slug === "all" ? "#1e40af" : cc.bg) : "#ffffff", color: isAct ? (slug === "all" ? "#ffffff" : cc.color) : "#64748b", border: isAct ? `2px solid ${slug === "all" ? "#1e40af" : cc.color}` : "1px solid #e2e8f0", borderRadius: 20, fontWeight: isAct ? 700 : 500, fontSize: "0.78rem", cursor: "pointer", transition: "all 120ms" }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* ── Enterprise Add-On featured cards ──────────────────────────── */}
          {filteredEnterprise.length > 0 && (
            <div style={{ marginBottom: filteredRegular.length > 0 ? 8 : 0 }}>
              {filteredEnterprise.map(m => (
                <EnterpriseCard key={m.module_key} module={m} onToggle={handleToggle} toggling={togglingKey === m.module_key} />
              ))}
            </div>
          )}

          {/* ── Regular module grid ───────────────────────────────────────── */}
          {filteredRegular.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
              {filteredRegular.map(m => (
                <ModuleCard key={m.module_key} module={m} onToggle={handleToggle} toggling={togglingKey === m.module_key} />
              ))}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────────── */}
          {isEmpty && (
            <div style={{ textAlign: "center", padding: "60px 24px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>🧩</div>
              <div style={{ fontWeight: 700, color: "#475569" }}>No modules in this category</div>
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div style={{ marginTop: 24, padding: "16px 20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>ℹ️</span>
            <span>
              Add-on billing will be processed via Stripe — integration coming soon. Modules included in your plan are free.{" "}
              <Link href="/ronyx/settings/billing" style={{ color: "#7c3aed", fontWeight: 700 }}>View billing details</Link>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
