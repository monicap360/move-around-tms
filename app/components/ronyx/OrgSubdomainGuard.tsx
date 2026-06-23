"use client";

import { useOrgSubdomain } from "@/hooks/useOrgSubdomain";

// Wraps pages to enforce that the logged-in user's org matches the subdomain.
// When auth is fully wired up, this reads profile.organization_id and compares
// it to the org resolved from the subdomain. For now it shows org context.
export function OrgSubdomainGuard({ children }: { children: React.ReactNode }) {
  const { slug, org, loading, error } = useOrgSubdomain();

  if (loading) return null;

  if (error === "Organization not found") {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", background: "#020817",
        fontFamily: "Inter, sans-serif", color: "#94a3b8", gap: 16, padding: 32,
      }}>
        <div style={{ fontSize: "2rem" }}>🚫</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f1f5f9" }}>
          Company not found
        </div>
        <div style={{ fontSize: "0.9rem", textAlign: "center", maxWidth: 400 }}>
          <strong style={{ color: "#f8fafc" }}>{slug}.movearoundtms.app</strong> is not
          registered on MoveAround TMS. If your company is being onboarded, contact
          your administrator.
        </div>
        <a
          href="https://movearoundtms.app"
          style={{
            marginTop: 8, padding: "10px 24px", background: "#1d4ed8", color: "#fff",
            borderRadius: 8, textDecoration: "none", fontSize: "0.85rem", fontWeight: 600,
          }}
        >
          Go to MoveAround TMS
        </a>
      </div>
    );
  }

  return <>{children}</>;
}

// Lightweight banner showing which company's workspace is loaded.
// Drop this into the sidebar or header so users always see their company name.
export function OrgSubdomainBanner() {
  const { slug, org } = useOrgSubdomain();
  if (!org || slug === "ronyx") return null;

  const isActive =
    org.bypass_subscription ||
    org.subscription_status === "trial_active" ||
    org.subscription_status === "active" ||
    org.subscription_status === "onboarding_paid";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 12px",
      background: isActive ? "#dcfce7" : "#fef3c7",
      borderRadius: 8,
      fontSize: "0.78rem",
      fontWeight: 700,
      color: isActive ? "#15803d" : "#b45309",
    }}>
      <span>{isActive ? "🟢" : "🟡"}</span>
      <span>{org.name}</span>
      {!isActive && <span style={{ fontWeight: 400 }}>· Subscription pending</span>}
    </div>
  );
}
