import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// ── Database proof ────────────────────────────────────────────────────────────
// Reads Ronyx org and the logged-in user's profile directly from Supabase.
// Shows every field the access gate depends on so you can see exactly what
// the app is reading — without guessing.
//
// Visit /api/ronyx/trial-debug in the browser to see the JSON.
// Remove this route once access is confirmed working.

export async function GET() {
  const supabase = supabaseAdmin;
  const orgId = await resolveOrgId();
  const now      = new Date();

  // 1. Read the org record
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status, account_type, subscription_status, bypass_subscription, subscription_required, pilot_started_at, pilot_ends_at")
    .or(`id.eq.${orgId},organization_code.eq.RONYX`)
    .limit(1)
    .single();

  // 2. Compute access result the same way the app gate does
  const TRIAL_TYPES = ["free_trial", "paid_pilot"];
  const checks = {
    status_is_active:          org?.status              === "active",
    bypass_subscription_true:  org?.bypass_subscription === true,
    subscription_not_required: org?.subscription_required === false,
    account_type_is_trial:     TRIAL_TYPES.includes(org?.account_type ?? ""),
    pilot_ends_at_exists:      !!org?.pilot_ends_at,
    pilot_ends_at_future:      !!org?.pilot_ends_at && new Date(org.pilot_ends_at) > now,
  };

  const hasTrialAccess = Object.values(checks).every(Boolean);

  const pilotEndsAt    = org?.pilot_ends_at ? new Date(org.pilot_ends_at) : null;
  const daysRemaining  = pilotEndsAt && pilotEndsAt > now
    ? Math.ceil((pilotEndsAt.getTime() - now.getTime()) / 86_400_000)
    : null;

  // 3. What would block access
  const failingChecks = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  const redirectReason = !hasTrialAccess
    ? failingChecks.length
      ? `Failing: ${failingChecks.join(", ")}`
      : "Unknown — all checks passed but hasTrialAccess is false"
    : null;

  return NextResponse.json({
    // ── Database values ──────────────────────────────────────────────────────
    database: {
      org_id:                org?.id                  ?? null,
      org_name:              org?.name                ?? null,
      organization_code:     org?.organization_code   ?? null,
      status:                org?.status              ?? null,
      account_type:          org?.account_type        ?? null,
      subscription_status:   org?.subscription_status ?? null,
      bypass_subscription:   org?.bypass_subscription ?? null,
      subscription_required: org?.subscription_required ?? null,
      pilot_started_at:      org?.pilot_started_at    ?? null,
      pilot_ends_at:         org?.pilot_ends_at       ?? null,
      db_error:              orgError?.message        ?? null,
    },

    // ── App-gate proof ───────────────────────────────────────────────────────
    app_gate: {
      current_time:      now.toISOString(),
      days_remaining:    daysRemaining,
      checks,
      has_trial_access:  hasTrialAccess,
      failing_checks:    failingChecks,
      redirect_reason:   redirectReason,
      resolved_org_id:   orgId,
    },

    // ── Summary ──────────────────────────────────────────────────────────────
    verdict: hasTrialAccess ? "ACCESS_ALLOWED" : "ACCESS_BLOCKED",
  }, { status: 200 });
}
