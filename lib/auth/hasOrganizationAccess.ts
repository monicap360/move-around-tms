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

  const trialActive =
    trialEndsAt !== null &&
    !Number.isNaN(trialEndsAt.getTime()) &&
    trialEndsAt > new Date();

  // Free trial: all six flags must be set correctly AND trial window is open
  const hasFreeTrialAccess =
    organization.status                === "active"       &&
    organization.account_type          === "free_trial"   &&
    organization.subscription_status   === "trial_active" &&
    organization.bypass_subscription   === true           &&
    organization.subscription_required === false          &&
    trialActive;

  // Paid subscription: status active + subscription in a "paid" state
  // (handles Stripe-managed subscriptions once billing goes live)
  const hasPaidAccess =
    organization.status === "active" &&
    ["active", "paid", "current"].includes(
      String(organization.subscription_status ?? "").toLowerCase()
    );

  return hasFreeTrialAccess || hasPaidAccess;
}
