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

const CATEGORY_LABELS: Record<string, string> = {
  all:         "All",
  operations:  "Operations",
  compliance:  "Compliance",
  money:       "Money",
  people:      "People",
  ai:          "AI",
  commerce:    "Commerce",
};

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  operations: { bg: "#dbeafe", color: "#1e40af" },
  compliance: { bg: "#fee2e2", color: "#dc2626" },
  money:      { bg: "#dcfce7", color: "#15803d" },
  people:     { bg: "#fef9c3", color: "#a16207" },
  ai:         { bg: "#ede9fe", color: "#7c3aed" },
  commerce:   { bg: "#d1fae5", color: "#065f46" },
};

function catColor(cat: string): { bg: string; color: string } {
  return CATEGORY_COLORS[cat] ?? { bg: "#f1f5f9", color: "#475569" };
}

// ── Module Card ───────────────────────────────────────────────────────────────

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
  const cc             = catColor(module.category);

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
      {/* Icon/Logo + Name */}
      {(() => {
        const logoKey = MODULE_LOGO_MAP[module.slug] as BrandAssetKey | undefined;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {logoKey ? (
              <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, flexShrink: 0, padding: 4 }}>
                <BrandLogo
                  asset={logoKey}
                  maxHeight={36}
                  maxWidth={36}
                  fallbackStyle={{ fontSize: "0.55rem", color: "#64748b" }}
                />
              </div>
            ) : (
              <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{module.icon ?? "📦"}</span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                {module.name}
              </div>
              <span style={{
                display: "inline-block",
                marginTop: 3,
                background: cc.bg,
                color: cc.color,
                borderRadius: 20,
                padding: "2px 9px",
                fontSize: "0.65rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {module.category}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Description */}
      <div style={{
        fontSize: "0.78rem",
        color: "#475569",
        lineHeight: 1.5,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        overflow: "hidden",
      }}>
        {module.description ?? getDefaultDescription(module.slug)}
      </div>

      {/* Price */}
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: includedInPlan ? "#15803d" : "#1e40af" }}>
        {includedInPlan
          ? `✓ Included in ${planSlug.charAt(0).toUpperCase() + planSlug.slice(1)}`
          : module.monthly_price === 0
            ? "Free"
            : `$${module.monthly_price}/mo add-on`}
      </div>

      {/* Status + Action */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 11px",
          borderRadius: 20,
          fontSize: "0.72rem",
          fontWeight: 700,
          background: isActive ? "#dcfce7" : "#f1f5f9",
          color:      isActive ? "#15803d" : "#64748b",
        }}>
          {isActive ? "🟢 Active" : "🔒 Inactive"}
        </span>

        {isActive ? (
          <button
            onClick={() => onToggle(module.slug, "deactivate")}
            disabled={toggling}
            style={{
              padding: "6px 14px",
              background: "transparent",
              color: "#64748b",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "0.75rem",
              cursor: toggling ? "not-allowed" : "pointer",
              transition: "background 120ms",
            }}
          >
            {toggling ? "…" : "Deactivate"}
          </button>
        ) : (
          <button
            onClick={() => onToggle(module.slug, "activate")}
            disabled={toggling}
            style={{
              padding: "6px 14px",
              background: toggling ? "#94a3b8" : "#1e40af",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "0.75rem",
              cursor: toggling ? "not-allowed" : "pointer",
              transition: "opacity 120ms",
            }}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const [modules, setModules]         = useState<Module[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, sRes] = await Promise.all([
        fetch("/api/ronyx/subscription-modules"),
        fetch("/api/ronyx/subscription"),
      ]);
      const [mJson, sJson] = await Promise.all([mRes.json(), sRes.json()]);
      if (mJson.modules) setModules(mJson.modules);
      if (sJson.subscription) setSubscription(sJson.subscription);
    } catch {
      setError("Failed to load module data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const planSlug = subscription?.plan_slug ?? "starter";

  // Stats
  const activeCount    = modules.filter((m) => m.org_is_active).length;
  const inactiveCount  = modules.filter((m) => !m.org_is_active).length;
  const addonCost      = modules
    .filter((m) => m.org_is_active && !m.included_in_plans.includes(planSlug))
    .reduce((sum, m) => sum + m.monthly_price, 0);

  // Filtered modules
  const filteredModules = activeCategory === "all"
    ? modules
    : modules.filter((m) => m.category === activeCategory);

  // Available categories from data
  const categories = ["all", ...Array.from(new Set(modules.map((m) => m.category)))];

  async function handleToggle(slug: string, action: "activate" | "deactivate") {
    setTogglingSlug(slug);
    // Optimistic update
    setModules((prev) =>
      prev.map((m) =>
        m.slug === slug ? { ...m, org_is_active: action === "activate" } : m
      )
    );

    try {
      const res = await fetch("/api/ronyx/subscription-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_slug: slug, action }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Revert optimistic update
        setModules((prev) =>
          prev.map((m) =>
            m.slug === slug ? { ...m, org_is_active: action !== "activate" } : m
          )
        );
        alert(json.error || "Toggle failed");
      } else if (json.modules) {
        setModules(json.modules);
      }
    } catch {
      // Revert on network error
      setModules((prev) =>
        prev.map((m) =>
          m.slug === slug ? { ...m, org_is_active: action !== "activate" } : m
        )
      );
      alert("Network error — please try again");
    } finally {
      setTogglingSlug(null);
    }
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", color: "#0f172a", maxWidth: 1200 }}>

      {/* ── Header ──────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #3b0764 0%, #6d28d9 40%, #7c3aed 100%)",
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
            🧩 Module Marketplace
          </h1>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", marginTop: 4 }}>
            Activate or deactivate features for your organization
          </div>
        </div>
        <Link
          href="/ronyx/settings/billing"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#ddd6fe",
            padding: "8px 18px",
            borderRadius: 20,
            fontSize: "0.78rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          💳 Billing &amp; Subscription →
        </Link>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          Loading modules…
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Stats Strip ──────────────────────────────── */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
            {[
              { label: "Active Modules",      value: activeCount,          color: "#15803d", bg: "#dcfce7", border: "#86efac" },
              { label: "Est. Add-on Cost",     value: addonCost > 0 ? `$${addonCost}/mo` : "$0/mo", color: "#1e40af", bg: "#dbeafe", border: "#93c5fd" },
              { label: "Available to Add",     value: inactiveCount,        color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  flex: "1 1 160px",
                  background: stat.bg,
                  border: `1px solid ${stat.border}`,
                  borderRadius: 12,
                  padding: "14px 20px",
                  minWidth: 140,
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: stat.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* ── Category Filter ───────────────────────────── */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {categories.map((cat) => {
              const isActive = cat === activeCategory;
              const cc = cat === "all" ? { bg: "#1e40af", color: "#fff" } : catColor(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "6px 16px",
                    background: isActive ? (cat === "all" ? "#1e40af" : cc.bg) : "#ffffff",
                    color:      isActive ? (cat === "all" ? "#ffffff" : cc.color) : "#64748b",
                    border:     isActive ? `2px solid ${cat === "all" ? "#1e40af" : cc.color}` : "1px solid #e2e8f0",
                    borderRadius: 20,
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    transition: "all 120ms",
                  }}
                >
                  {CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>

          {/* ── CCB Featured Card ────────────────────────── */}
          {(activeCategory === "all" || activeCategory === "compliance") && (
            <div style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
              border: "1px solid rgba(99,102,241,0.4)",
              borderRadius: 16,
              padding: "24px 28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flex: "1 1 300px" }}>
                <div style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 14px", flexShrink: 0 }}>
                  <BrandLogo
                    asset="ccb"
                    maxHeight={40}
                    maxWidth={120}
                    fallbackStyle={{ color: "#c7d2fe", fontSize: "0.7rem", fontWeight: 700 }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 900, fontSize: "1rem", color: "#ffffff" }}>
                      CCB — Carrier Clearance Bureau
                    </div>
                    <span style={{ background: "#312e81", color: "#a5b4fc", border: "1px solid #4f46e5", borderRadius: 20, padding: "2px 10px", fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Enterprise Add-On
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, maxWidth: 480 }}>
                    Carrier vetting, clearance status, billing risk scoring, compliance controls, dispatch holds, account blocks, and full audit history for owner operators and sub-haulers.
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.75rem", color: "#a5b4fc", fontWeight: 700 }}>+$199/mo add-on</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>·</span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Included in Enterprise &amp; Enterprise Plus</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                {(() => {
                  const ccbModule = modules.find((m) => m.slug === "ccb");
                  return ccbModule?.org_is_active ? (
                    <button
                      onClick={() => handleToggle("ccb", "deactivate")}
                      disabled={togglingSlug === "ccb"}
                      style={{ padding: "10px 20px", background: "rgba(255,255,255,0.12)", color: "#c7d2fe", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      ✓ Active — Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggle("ccb", "activate")}
                      disabled={togglingSlug === "ccb"}
                      style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      🏛️ Activate CCB
                    </button>
                  );
                })()}
                <Link
                  href="/ronyx/settings/billing"
                  style={{ padding: "9px 20px", background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, fontWeight: 600, fontSize: "0.78rem", textDecoration: "none", textAlign: "center" }}
                >
                  View Enterprise Plans
                </Link>
              </div>
            </div>
          )}

          {/* ── Module Grid ───────────────────────────────── */}
          {filteredModules.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              color: "#94a3b8",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>🧩</div>
              <div style={{ fontWeight: 700, color: "#475569" }}>No modules in this category</div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}>
              {filteredModules.map((m) => (
                <ModuleCard
                  key={m.slug}
                  module={m}
                  planSlug={planSlug}
                  onToggle={handleToggle}
                  toggling={togglingSlug === m.slug}
                />
              ))}
            </div>
          )}

          {/* ── Footer Note ───────────────────────────────── */}
          <div style={{
            marginTop: 24,
            padding: "16px 20px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            fontSize: "0.78rem",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <span style={{ fontSize: "1rem" }}>ℹ️</span>
            <span>
              Add-on billing for extra modules will be processed via Stripe — integration coming soon.
              Modules included in your plan are free.{" "}
              <Link href="/ronyx/settings/billing" style={{ color: "#7c3aed", fontWeight: 700 }}>
                View billing details
              </Link>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
