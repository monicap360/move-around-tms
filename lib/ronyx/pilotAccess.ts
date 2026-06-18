export type PilotStatus = {
  allowed: boolean;
  isPilot: boolean;
  pilotExpired: boolean;
  pilotEndsAt: Date | null;
  daysRemaining: number | null;
};

export function checkPilotAccess(org: {
  bypass_subscription?: boolean | null;
  subscription_required?: boolean | null;
  status?: string | null;
  account_type?: string | null;
  pilot_ends_at?: string | null;
} | null): PilotStatus {
  if (!org) return { allowed: false, isPilot: false, pilotExpired: false, pilotEndsAt: null, daysRemaining: null };

  // Core bypass rule — does not depend on subscription_status value
  const isPilot =
    org.status              === 'active'     &&
    org.account_type        === 'free_trial' &&
    org.bypass_subscription === true         &&
    org.subscription_required === false;

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
