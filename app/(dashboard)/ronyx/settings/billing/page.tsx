"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/app/components/ronyx/BrandLogo";

// ── Types ─────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  slug: string;
  name: string;
  monthly_price: number;
  annual_price: number | null;
  setup_price: number | null;
  max_trucks: number | null;
  max_drivers: number | null;
  max_monthly_scans: number | null;
  max_staff_users: number | null;
  truck_range_label: string | null;
  driver_range_label: string | null;
  overage_per_scan: number | null;
  overage_per_user: number | null;
  is_enterprise: boolean;
  tagline: string | null;
  features: string[];
  sort_order: number;
  is_active: boolean;
};

type Subscription = {
  id?: string;
  plan_slug: string;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at?: string | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan | null;
};

type ModuleRow = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: string;
  monthly_price: number;
  included_in_plans: string[];
  org_is_active: boolean;
};

type ManualPaymentStatus =
  | "not_required"
  | "pending_manual_payment"
  | "payment_submitted"
  | "payment_received"
  | "payment_verified"
  | "payment_rejected"
  | "past_due";

type ManualPaymentState = {
  manual_payment_status: ManualPaymentStatus;
  manual_payment_method: string | null;
  manual_payment_reference: string | null;
  manual_payment_amount: number | null;
  manual_payment_submitted_at: string | null;
  manual_payment_confirmed_at: string | null;
  logs: Array<Record<string, unknown>>;
};

const PAYMENT_METHODS = [
  {
    key:   "zelle",
    label: "Zelle",
    icon:  "💜",
    detail: "409-392-9626",
    copy:  "Send payment to 409-392-9626 via Zelle.",
    gradient: "linear-gradient(135deg, #4f46e5, #7c3aed)",
  },
  {
    key:   "cash_app",
    label: "Cash App",
    icon:  "💚",
    detail: "$GalvestonMonica",
    copy:  "Send to $GalvestonMonica on Cash App.",
    gradient: "linear-gradient(135deg, #15803d, #16a34a)",
  },
  {
    key:   "cash",
    label: "Cash",
    icon:  "💵",
    detail: "By approval only",
    copy:  "Accepted by approval only. Please request a receipt at time of payment.",
    gradient: "linear-gradient(135deg, #92400e, #b45309)",
  },
  {
    key:   "check",
    label: "Check",
    icon:  "📄",
    detail: "See invoice for payee name",
    copy:  "Make checks payable to the approved business name listed on your invoice.",
    gradient: "linear-gradient(135deg, #1e40af, #2563eb)",
  },
] as const;

const PAYMENT_STATUS_LABELS: Record<ManualPaymentStatus, { label: string; bg: string; color: string }> = {
  not_required:          { label: "Not Required",       bg: "#f1f5f9", color: "#64748b" },
  pending_manual_payment:{ label: "Pending Payment",    bg: "#fef3c7", color: "#b45309" },
  payment_submitted:     { label: "Payment Submitted",  bg: "#dbeafe", color: "#1e40af" },
  payment_received:      { label: "Payment Received",   bg: "#d1fae5", color: "#065f46" },
  payment_verified:      { label: "Payment Verified ✓", bg: "#dcfce7", color: "#15803d" },
  payment_rejected:      { label: "Payment Rejected",   bg: "#fee2e2", color: "#dc2626" },
  past_due:              { label: "Past Due",           bg: "#fef2f2", color: "#dc2626" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function planColor(slug: string): { bg: string; color: string; border: string } {
  switch (slug) {
    case "starter":        return { bg: "#f1f5f9", color: "#475569",  border: "#cbd5e1" };
    case "operations":     return { bg: "#dbeafe", color: "#1e40af",  border: "#3b82f6" };
    case "pro":            return { bg: "#ede9fe", color: "#7c3aed",  border: "#7c3aed" };
    case "enterprise":     return { bg: "#fef9c3", color: "#92400e",  border: "#d97706" };
    case "enterprise-plus":return { bg: "#fff1f2", color: "#9f1239",  border: "#fb7185" };
    default:               return { bg: "#f1f5f9", color: "#475569",  border: "#cbd5e1" };
  }
}

function fmtScans(n: number | null): string {
  if (!n) return "Unlimited";
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${n}`;
}

function statusBadge(status: string): { label: string; bg: string; color: string } {
  switch (status) {
    case "active":    return { label: "Active",    bg: "#dcfce7", color: "#15803d" };
    case "trialing":  return { label: "Trialing",  bg: "#fef9c3", color: "#a16207" };
    case "cancelled": return { label: "Cancelled", bg: "#fee2e2", color: "#dc2626" };
    case "past_due":  return { label: "Past Due",  bg: "#fee2e2", color: "#dc2626" };
    default:          return { label: status,      bg: "#f1f5f9", color: "#475569" };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: "0 0 14px 0",
      fontSize: "1rem",
      fontWeight: 800,
      color: "#0f172a",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      {children}
    </h2>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: "24px 28px",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Plan Comparison Card ──────────────────────────────────────────────────────

function PlanCard({ plan, currentSlug }: { plan: Plan; currentSlug: string }) {
  const isCurrent = plan.slug === currentSlug;
  const isPro     = plan.slug === "pro";
  const c         = planColor(plan.slug);
  const [hovered, setHovered] = useState(false);

  const limits = [
    plan.truck_range_label  && { icon: "🚛", label: "Trucks",       val: plan.truck_range_label },
    plan.driver_range_label && { icon: "👤", label: "Drivers",      val: plan.driver_range_label },
    plan.max_monthly_scans  && { icon: "📷", label: "Scans/mo",     val: `Up to ${fmtScans(plan.max_monthly_scans)}` },
    plan.max_staff_users && plan.max_staff_users < 9999
                            && { icon: "👥", label: "Staff users",   val: `${plan.max_staff_users} users` },
    plan.max_staff_users === 9999
                            && { icon: "👥", label: "Staff users",   val: "Unlimited" },
  ].filter(Boolean) as { icon: string; label: string; val: string }[];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#ffffff",
        border: `2px solid ${isCurrent || isPro ? c.border : "#e2e8f0"}`,
        borderRadius: 14,
        padding: "22px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        transition: "box-shadow 150ms",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {isPro && (
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: "#7c3aed", color: "#fff", fontSize: "0.65rem", fontWeight: 800,
          padding: "3px 12px", borderRadius: 20, letterSpacing: "0.04em", whiteSpace: "nowrap",
        }}>
          MAIN PACKAGE
        </div>
      )}

      {/* Name + price */}
      <div>
        <div style={{
          display: "inline-block", background: c.bg, color: c.color,
          border: `1px solid ${c.border}`, borderRadius: 20, padding: "3px 10px",
          fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase",
          letterSpacing: "0.05em", marginBottom: 8,
        }}>
          {plan.name}
        </div>
        {plan.tagline && (
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 6 }}>{plan.tagline}</div>
        )}
        <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
          {plan.monthly_price === 0 ? "Custom" : `$${plan.monthly_price.toLocaleString()}`}
          {plan.monthly_price > 0 && (
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>/mo</span>
          )}
        </div>
        {plan.setup_price && plan.setup_price > 0 && (
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>
            + ${plan.setup_price.toLocaleString()} setup
          </div>
        )}
      </div>

      {/* Capacity limits */}
      {limits.length > 0 && (
        <div style={{
          background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 8, padding: "10px 12px",
          display: "flex", flexDirection: "column", gap: 5,
        }}>
          {limits.map((l) => (
            <div key={l.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
              <span style={{ color: "#64748b" }}>{l.icon} {l.label}</span>
              <span style={{ fontWeight: 700, color: "#0f172a" }}>{l.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 5 }}>
        {(plan.features || []).slice(0, 6).map((f, i) => (
          <li key={i} style={{ fontSize: "0.78rem", color: "#334155" }}>{f}</li>
        ))}
        {(plan.features || []).length > 6 && (
          <li style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            + {plan.features.length - 6} more…
          </li>
        )}
      </ul>

      {/* CTA */}
      {isCurrent ? (
        <div style={{
          padding: "9px 0", background: c.bg, color: c.color,
          border: `1px solid ${c.border}`, borderRadius: 8,
          fontWeight: 700, fontSize: "0.82rem", textAlign: "center",
        }}>
          ✓ Current Plan
        </div>
      ) : (
        <button
          disabled
          title="Stripe integration coming soon"
          style={{
            padding: "9px 0", background: "#f1f5f9", color: "#94a3b8",
            border: "1px solid #e2e8f0", borderRadius: 8,
            fontWeight: 700, fontSize: "0.82rem", cursor: "not-allowed", width: "100%",
          }}
        >
          Upgrade — Stripe coming soon
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [allModules, setAllModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual payment state
  const [manualPayment, setManualPayment] = useState<ManualPaymentState | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [payAmount, setPayAmount]     = useState("");
  const [payReference, setPayReference] = useState("");
  const [payNotes, setPayNotes]       = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payMsg, setPayMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/ronyx/subscription")
      .then((r) => r.json())
      .then((d) => {
        setSubscription(d.subscription ?? null);
        setActiveModules(d.activeModules ?? []);
        setAllPlans(d.allPlans ?? []);
        setAllModules(d.allModules ?? []);
      })
      .catch(() => setError("Failed to load subscription data"))
      .finally(() => setLoading(false));

    fetch("/api/ronyx/manual-payment")
      .then((r) => r.json())
      .then((d) => setManualPayment(d))
      .catch(() => {/* payment fields not migrated yet — silent */});
  }, []);

  async function handleSubmitPayment() {
    if (!selectedMethod) return;
    setPaySubmitting(true);
    setPayMsg(null);
    try {
      const res  = await fetch("/api/ronyx/manual-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action:    "submit",
          method:    selectedMethod,
          amount:    payAmount ? Number(payAmount) : undefined,
          reference: payReference || undefined,
          notes:     payNotes || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setPayMsg({ text: "Payment marked as submitted. We will review and confirm shortly.", ok: true });
        setManualPayment(prev => prev ? { ...prev, manual_payment_status: "payment_submitted", manual_payment_method: selectedMethod } : prev);
      } else {
        setPayMsg({ text: json.error ?? "Submission failed", ok: false });
      }
    } catch {
      setPayMsg({ text: "Network error — please try again", ok: false });
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleAdminAction(action: "verify" | "reject" | "reset") {
    const res  = await fetch("/api/ronyx/manual-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (res.ok && json.manual_payment_status) {
      setManualPayment(prev => prev ? { ...prev, manual_payment_status: json.manual_payment_status } : prev);
    }
  }

  const planSlug = subscription?.plan_slug ?? "starter";
  const status   = subscription?.status    ?? "trialing";
  const pc       = planColor(planSlug);
  const sb       = statusBadge(status);

  const renewalDate =
    status === "trialing"
      ? subscription?.trial_ends_at
      : subscription?.current_period_end;

  // Main comparison: Starter, Operations, Pro (the self-serve plans)
  const comparisonPlans   = allPlans.filter((p) => !p.is_enterprise && p.slug !== "enterprise-plus");
  const enterprisePlan    = allPlans.find((p) => p.slug === "enterprise");
  const enterprisePlusPlan = allPlans.find((p) => p.slug === "enterprise-plus");

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", color: "#0f172a", maxWidth: 1100 }}>

      {/* ── Header Strip ─────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 40%, #4f46e5 100%)",
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
          <div style={{ marginBottom: 10 }}>
            <BrandLogo
              asset="moveAroundTms"
              maxHeight={32}
              maxWidth={180}
              fallbackStyle={{ color: "rgba(255,255,255,0.9)", fontSize: "0.9rem", fontWeight: 800 }}
            />
          </div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
            💳 Billing &amp; Subscription
          </h1>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.82rem", marginTop: 4 }}>
            Igotta Technologies · MoveAround TMS Platform
          </div>
        </div>
        <Link
          href="/ronyx/settings/modules"
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#c7d2fe",
            padding: "8px 18px",
            borderRadius: 20,
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textDecoration: "none",
          }}
        >
          🧩 Module Marketplace →
        </Link>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: "0.9rem" }}>
          Loading subscription data…
        </div>
      )}

      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "14px 18px", borderRadius: 10, marginBottom: 20, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── Current Plan Card ───────────────────────── */}
          <Card style={{ border: `2px solid ${pc.border}` }}>
            <SectionTitle>Current Plan</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>

              {/* Plan info */}
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{
                    display: "inline-block",
                    background: pc.bg,
                    color: pc.color,
                    border: `1px solid ${pc.border}`,
                    borderRadius: 20,
                    padding: "4px 14px",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {subscription?.plan?.name ?? planSlug}
                  </span>
                  <span style={{
                    background: sb.bg,
                    color: sb.color,
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}>
                    {sb.label}
                  </span>
                </div>

                <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#0f172a", lineHeight: 1, marginBottom: 4 }}>
                  {(subscription?.plan?.monthly_price ?? 0) === 0
                    ? "Custom"
                    : `$${(subscription?.plan?.monthly_price ?? 0).toLocaleString()}`}
                  {(subscription?.plan?.monthly_price ?? 0) > 0 && (
                    <span style={{ fontSize: "1rem", fontWeight: 500, color: "#64748b" }}>/mo</span>
                  )}
                </div>
                {subscription?.plan?.setup_price && (
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: 8 }}>
                    + ${subscription.plan.setup_price.toLocaleString()} setup
                  </div>
                )}
                {subscription?.plan?.tagline && (
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 10, fontStyle: "italic" }}>
                    {subscription.plan.tagline}
                  </div>
                )}
                {/* Capacity row */}
                {subscription?.plan?.truck_range_label && (
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                    {[
                      { icon: "🚛", val: subscription.plan.truck_range_label },
                      subscription.plan.driver_range_label && { icon: "👤", val: subscription.plan.driver_range_label },
                      subscription.plan.max_monthly_scans && { icon: "📷", val: `${fmtScans(subscription.plan.max_monthly_scans)} scans/mo` },
                    ].filter(Boolean).map((item, i) => (
                      <span key={i} style={{ fontSize: "0.78rem", color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "3px 10px" }}>
                        {(item as {icon:string;val:string}).icon} {(item as {icon:string;val:string}).val}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.82rem", color: "#475569" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {status === "trialing" ? "Trial ends:" : "Renews:"}
                    </span>{" "}
                    {fmtDate(renewalDate ?? null)}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Billing email:</span>{" "}
                    {subscription?.billing_email ?? <span style={{ color: "#94a3b8" }}>Not set</span>}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Stripe customer:</span>{" "}
                    {subscription?.stripe_customer_id ?? (
                      <span style={{ color: "#94a3b8" }}>Not connected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 200 }}>
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button
                    disabled
                    style={{
                      width: "100%",
                      padding: "11px 20px",
                      background: "#f1f5f9",
                      color: "#94a3b8",
                      border: "1px solid #e2e8f0",
                      borderRadius: 9,
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: "not-allowed",
                    }}
                    title="Stripe billing portal coming soon"
                  >
                    💳 Manage Billing
                  </button>
                  <div style={{
                    fontSize: "0.65rem",
                    color: "#94a3b8",
                    textAlign: "center",
                    marginTop: 3,
                  }}>
                    Coming Soon
                  </div>
                </div>

                <button
                  disabled
                  style={{
                    padding: "11px 20px",
                    background: "transparent",
                    color: "#94a3b8",
                    border: "1px solid #e2e8f0",
                    borderRadius: 9,
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "not-allowed",
                  }}
                  title="Contact support to cancel"
                >
                  ❌ Cancel Plan
                </button>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center" }}>
                  Contact support to cancel
                </div>
              </div>
            </div>
          </Card>

          {/* ── Active Modules ───────────────────────────── */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <SectionTitle>Active Modules</SectionTitle>
              <Link
                href="/ronyx/settings/modules"
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#7c3aed",
                  textDecoration: "none",
                }}
              >
                🛒 Manage Modules →
              </Link>
            </div>

            {activeModules.length === 0 ? (
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>No modules active yet.</div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {allModules
                  .filter((m) => activeModules.includes(m.slug))
                  .map((m) => (
                    <span
                      key={m.slug}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        background: "#dcfce7",
                        color: "#15803d",
                        border: "1px solid #86efac",
                        borderRadius: 20,
                        padding: "5px 12px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      {m.icon && <span>{m.icon}</span>}
                      {m.name}
                    </span>
                  ))}
              </div>
            )}
          </Card>

          {/* ── Plan Comparison ──────────────────────────── */}
          <div>
            <SectionTitle>Plan Comparison</SectionTitle>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginTop: 8,
            }}>
              {comparisonPlans.map((plan) => (
                <PlanCard key={plan.slug} plan={plan} currentSlug={planSlug} />
              ))}
            </div>

            {/* Enterprise banner */}
            {enterprisePlan && (
              <div style={{
                marginTop: 16,
                background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)",
                borderRadius: 14,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}>
                <div style={{ flex: "1 1 260px" }}>
                  <div style={{ color: "#fde68a", fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>
                    🏢 Enterprise — Starting at $3,500/mo + $8,000 setup
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginBottom: 6 }}>
                    76–200 trucks · 126–300 drivers · 15,000 scans/mo
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.74rem" }}>
                    {(enterprisePlan.features || []).slice(0, 4).join(" · ")}
                  </div>
                </div>
                <button
                  disabled
                  style={{
                    padding: "9px 20px",
                    background: "rgba(255,255,255,0.15)",
                    color: "#fde68a",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "not-allowed",
                  }}
                >
                  Contact Sales
                </button>
              </div>
            )}

            {/* Enterprise Plus banner */}
            {enterprisePlusPlan && (
              <div style={{
                marginTop: 10,
                background: "linear-gradient(135deg, #881337 0%, #9f1239 100%)",
                borderRadius: 14,
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}>
                <div style={{ flex: "1 1 260px" }}>
                  <div style={{ color: "#fda4af", fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>
                    🏭 Enterprise Plus — $5,000–$10,000+/mo · $15,000–$25,000+ setup
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginBottom: 6 }}>
                    200+ trucks · 300+ drivers · 15,000+ scans/mo · Multi-location
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.74rem" }}>
                    White-label · Dedicated account manager · Custom integrations · SLA guarantee
                  </div>
                </div>
                <button
                  disabled
                  style={{
                    padding: "9px 20px",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fda4af",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "not-allowed",
                  }}
                >
                  Contact Sales
                </button>
              </div>
            )}
          </div>

          {/* ── Manual Payment Options ──────────────────── */}
          <Card style={{ border: "1px solid #c4b5fd", padding: 0, overflow: "hidden" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4f46e5 100%)", padding: "20px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: "1.4rem" }}>💸</span>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#ffffff" }}>Manual Payment Options</div>
                  <div style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                    For onboarding deposits, setup fees, approved invoices, or enterprise billing.
                  </div>
                </div>
                {manualPayment?.manual_payment_status && (
                  <span style={{ marginLeft: "auto", background: PAYMENT_STATUS_LABELS[manualPayment.manual_payment_status].bg, color: PAYMENT_STATUS_LABELS[manualPayment.manual_payment_status].color, borderRadius: 20, padding: "4px 14px", fontSize: "0.75rem", fontWeight: 800 }}>
                    {PAYMENT_STATUS_LABELS[manualPayment.manual_payment_status].label}
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Description */}
              <div style={{ fontSize: "0.83rem", color: "#334155", lineHeight: 1.6 }}>
                We accept <strong>Zelle</strong>, <strong>Cash App</strong>, <strong>cash</strong>, and <strong>business check</strong> payments for approved onboarding deposits, setup fees, invoices, and enterprise accounts.
              </div>

              {/* Payment method cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = selectedMethod === pm.key;
                  return (
                    <button
                      key={pm.key}
                      onClick={() => setSelectedMethod(isSelected ? null : pm.key)}
                      style={{
                        background: isSelected ? pm.gradient : "#f8fafc",
                        border: isSelected ? "2px solid transparent" : "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "16px 18px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 150ms",
                        boxShadow: isSelected ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: "1.4rem" }}>{pm.icon}</span>
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", color: isSelected ? "#ffffff" : "#0f172a" }}>
                          {pm.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: isSelected ? "rgba(255,255,255,0.9)" : "#1e40af", marginBottom: 4 }}>
                        {pm.detail}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: isSelected ? "rgba(255,255,255,0.7)" : "#64748b", lineHeight: 1.4 }}>
                        {pm.copy}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Expanded form when method selected */}
              {selectedMethod && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 22px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginBottom: 14 }}>
                    {PAYMENT_METHODS.find(p => p.key === selectedMethod)?.icon}{" "}
                    Pay with {PAYMENT_METHODS.find(p => p.key === selectedMethod)?.label}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Amount (optional)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box" as const }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Reference / Invoice # / Memo (optional)</label>
                      <input
                        type="text"
                        placeholder="Invoice # or transaction memo"
                        value={payReference}
                        onChange={e => setPayReference(e.target.value)}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box" as const }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>Additional Notes (optional)</label>
                      <textarea
                        placeholder="Company name, contact info, or other details"
                        value={payNotes}
                        onChange={e => setPayNotes(e.target.value)}
                        rows={2}
                        style={{ width: "100%", padding: "9px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.85rem", resize: "vertical", boxSizing: "border-box" as const }}
                      />
                    </div>
                    <button
                      onClick={handleSubmitPayment}
                      disabled={paySubmitting}
                      style={{ padding: "11px 24px", background: paySubmitting ? "#94a3b8" : "#1e40af", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: "0.88rem", cursor: paySubmitting ? "not-allowed" : "pointer" }}
                    >
                      {paySubmitting ? "Submitting…" : "✓ I Sent Payment — Mark as Submitted"}
                    </button>
                    {payMsg && (
                      <div style={{ padding: "10px 14px", background: payMsg.ok ? "#dcfce7" : "#fee2e2", color: payMsg.ok ? "#15803d" : "#dc2626", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600 }}>
                        {payMsg.text}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Important notice */}
              <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "14px 16px", fontSize: "0.8rem", color: "#713f12", lineHeight: 1.6 }}>
                <strong>Important:</strong> Please include your company name and invoice number in the payment note when available.
                Manual payments must be reviewed and confirmed before account activation, upgrades, or continued service access are completed.
              </div>

              {/* Admin verify panel — shown when payment submitted */}
              {manualPayment?.manual_payment_status === "payment_submitted" && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0369a1", marginBottom: 12 }}>
                    🔐 Admin — Payment Verification
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.82rem", color: "#334155", marginBottom: 14 }}>
                    <div><strong>Method:</strong> {manualPayment.manual_payment_method ?? "—"}</div>
                    <div><strong>Amount:</strong> {manualPayment.manual_payment_amount ? `$${manualPayment.manual_payment_amount.toLocaleString()}` : "Not specified"}</div>
                    <div><strong>Reference:</strong> {manualPayment.manual_payment_reference ?? "—"}</div>
                    <div><strong>Submitted:</strong> {manualPayment.manual_payment_submitted_at ? new Date(manualPayment.manual_payment_submitted_at).toLocaleString() : "—"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleAdminAction("verify")}
                      style={{ padding: "9px 20px", background: "#15803d", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      ✓ Verify Payment
                    </button>
                    <button
                      onClick={() => handleAdminAction("reject")}
                      style={{ padding: "9px 20px", background: "transparent", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 8, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}

              {manualPayment?.manual_payment_status === "payment_verified" && (
                <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "14px 18px", fontSize: "0.85rem", color: "#15803d", fontWeight: 700 }}>
                  ✓ Payment verified on {manualPayment.manual_payment_confirmed_at ? new Date(manualPayment.manual_payment_confirmed_at).toLocaleDateString() : "—"}.
                  Access has been activated.
                </div>
              )}

              {manualPayment?.manual_payment_status === "payment_rejected" && (
                <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: 700, marginBottom: 8 }}>
                    Payment was not confirmed. Please try again or contact support.
                  </div>
                  <button
                    onClick={() => handleAdminAction("reset")}
                    style={{ fontSize: "0.78rem", color: "#1e40af", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Re-submit payment
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* ── Billing History ──────────────────────────── */}
          <Card>
            <SectionTitle>Billing History</SectionTitle>
            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              padding: "40px 24px",
              textAlign: "center",
              color: "#94a3b8",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>🧾</div>
              <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.95rem" }}>
                No billing records yet
              </div>
              <div style={{ fontSize: "0.8rem", marginTop: 6 }}>
                Billing history will appear here once Stripe is connected.
              </div>
            </div>
          </Card>

          {/* ── Overage Pricing ─────────────────────────── */}
          <Card>
            <SectionTitle>📊 Overage Pricing</SectionTitle>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 14 }}>
              When your usage exceeds your plan limits, overage rates apply automatically.
              Ticket scan volume matters most — if you scan more than your plan allows, consider upgrading.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Usage Type", "Rate", "Notes"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", borderBottom: "2px solid #e2e8f0", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { type: "📷 Extra ticket / OCR scans", rate: "$0.35 per scan", notes: "After your monthly scan limit" },
                    { type: "👤 Extra drivers", rate: "$5–$10 / driver / mo", notes: "After included driver limit" },
                    { type: "🚛 Extra trucks", rate: "$10–$20 / truck / mo", notes: "After included truck limit" },
                    { type: "👥 Extra staff users", rate: "$29 / user / mo", notes: "All plans" },
                    { type: "🏢 Extra company workspace", rate: "$149 / mo", notes: "Multi-entity setups" },
                    { type: "📋 Custom report", rate: "$750+", notes: "Per report, one-time" },
                    { type: "📦 Data import", rate: "$1,500–$10,000", notes: "Drivers, trucks, tickets, history" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 600 }}>{row.type}</td>
                      <td style={{ padding: "10px 14px", color: "#1e40af", fontWeight: 700 }}>{row.rate}</td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef9c3", borderRadius: 8, fontSize: "0.78rem", color: "#92400e", fontWeight: 600 }}>
              💡 Tip: Companies scanning 4,000+ tickets/month on an Operations plan (1,000 limit) should move to Pro — ticket volume drives the most value and cost in MoveAround TMS.
            </div>
          </Card>

          {/* ── Quick Links ──────────────────────────────── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/ronyx/settings/modules"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "#ede9fe",
                color: "#7c3aed",
                border: "1px solid #c4b5fd",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              → Module Marketplace
            </Link>
            <Link
              href="/ronyx/settings/company-profile"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 20px",
                background: "#dbeafe",
                color: "#1e40af",
                border: "1px solid #93c5fd",
                borderRadius: 9,
                fontWeight: 700,
                fontSize: "0.82rem",
                textDecoration: "none",
              }}
            >
              → Company Profile
            </Link>
          </div>

        </div>
      )}
    </div>
  );
}
