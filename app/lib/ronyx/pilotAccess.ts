export type PilotStatus = {
  allowed: boolean;
  isPilot: boolean;
  pilotExpired: boolean;
  pilotEndsAt: Date | null;
  daysRemaining: number | null;
};

// Supported trial account types. Checked last so bypass_subscription is the
// primary gate — adding a new type here is all that's needed to extend access.
const TRIAL_ACCOUNT_TYPES = ["free_trial", "paid_pilot"];

// Quick boolean check used in API routes and server components.
// Returns true for both active free-trial orgs and orgs with a paid active subscription.
export function hasOrganizationAccess(organization: Record<string, unknown> | null | undefined): boolean {
  if (!organization) return false;

  const trialEndsAt = organization.pilot_ends_at
    ? new Date(organization.pilot_ends_at as string)
    : null;
  const trialIsActive =
    trialEndsAt instanceof Date &&
    !Number.isNaN(trialEndsAt.getTime()) &&
    trialEndsAt > new Date();

  const hasFreeTrialAccess =
    organization.status               === "active" &&
    organization.account_type         === "free_trial" &&
    organization.subscription_status  === "trial_active" &&
    organization.bypass_subscription  === true &&
    organization.subscription_required === false &&
    trialIsActive;

  const hasPaidAccess =
    organization.status === "active" &&
    ["active", "paid", "current"].includes(
      String(organization.subscription_status ?? "").toLowerCase()
    );

  return hasFreeTrialAccess || hasPaidAccess;
}

export function checkPilotAccess(org: {
  bypass_subscription?: boolean | null;
  subscription_required?: boolean | null;
  status?: string | null;
  account_type?: string | null;
  pilot_ends_at?: string | null;
} | null): PilotStatus {
  if (!org) return { allowed: false, isPilot: false, pilotExpired: false, pilotEndsAt: null, daysRemaining: null };

  // Primary gate: structural flags. Does NOT depend on subscription_status value.
  // account_type must be a recognised trial type but bypass_subscription is the
  // real enforcement — if DB says bypass, we trust it.
  const isPilot =
    org.status              === "active" &&
    org.bypass_subscription === true     &&
    org.subscription_required === false  &&
    TRIAL_ACCOUNT_TYPES.includes(org.account_type ?? "");

  if (!isPilot) {
    return { allowed: false, isPilot: false, pilotExpired: false, pilotEndsAt: null, daysRemaining: null };
  }

  const pilotEndsAt  = org.pilot_ends_at ? new Date(org.pilot_ends_at) : null;
  const now          = new Date();
  const pilotExpired = pilotEndsAt ? pilotEndsAt <= now : false;
  const allowed      = !pilotExpired;

  let daysRemaining: number | null = null;
  if (pilotEndsAt && !pilotExpired) {
    daysRemaining = Math.ceil((pilotEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return { allowed, isPilot, pilotExpired, pilotEndsAt, daysRemaining };
}
