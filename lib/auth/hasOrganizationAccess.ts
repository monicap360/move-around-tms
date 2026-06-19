// Determines whether an organization row has valid access — either through
// an active free trial or through a live paid subscription.
// This is the single source of truth for subscription gate logic across
// all API routes and layout-level checks.
//
// Usage:
//   import { hasOrganizationAccess } from "@/lib/auth/hasOrganizationAccess";
//   if (!hasOrganizationAccess(org)) return /* blocked */;

export type OrgAccessRow = {
  status?: string | null;
  account_type?: string | null;
  subscription_status?: string | null;
  bypass_subscription?: boolean | null;
  subscription_required?: boolean | null;
  pilot_ends_at?: string | null;
};

export function hasOrganizationAccess(organization: OrgAccessRow | null): boolean {
  if (!organization) return false;

  const trialEndsAt = organization.pilot_ends_at
    ? new Date(organization.pilot_ends_at)
    : null;

  const pilotOpen =
    trialEndsAt !== null &&
    !Number.isNaN(trialEndsAt.getTime()) &&
    trialEndsAt > new Date();

  // Pilot window open — simplest check, works regardless of other field values.
  // If pilot_ends_at is a future date, the org has access.
  if (pilotOpen) return true;

  // Explicit bypass flag — set on Ronyx and any direct-access orgs.
  if (organization.bypass_subscription === true) return true;

  // Subscription not required for this org.
  if (organization.subscription_required === false) return true;

  // Legacy 6-field free-trial check (kept for backward compat).
  const hasFreeTrialAccess =
    organization.status              === "active"       &&
    organization.account_type        === "free_trial"   &&
    ["trial_active", "trialing"].includes(
      String(organization.subscription_status ?? "").toLowerCase()
    );

  if (hasFreeTrialAccess) return true;

  // Paid subscription: status active + subscription in a "paid" state.
  const hasPaidAccess =
    organization.status === "active" &&
    ["active", "paid", "current"].includes(
      String(organization.subscription_status ?? "").toLowerCase()
    );

  return hasPaidAccess;
}
