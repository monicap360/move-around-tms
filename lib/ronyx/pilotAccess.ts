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
