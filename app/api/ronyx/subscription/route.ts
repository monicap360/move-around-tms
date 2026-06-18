import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// All module slugs/keys unlocked during a free trial.
// Includes both legacy hyphenated slugs (used by useModuleAccess calls in pages)
// and new underscore keys (used by module_registry). Both must be present so
// pages using either convention are unblocked.
const FREE_TRIAL_MODULES = [
  // Legacy page slugs (useModuleAccess calls these strings directly)
  "owner-operators", "fast-scan", "maintenance", "compliance",
  "billing", "payroll", "dispatch", "tickets", "drivers",
  "loads", "reports", "hr-compliance", "dispatch-guard",
  // New module_registry keys
  "owner_operator_hub", "fast_scan", "driver_management",
  "load_management", "maintenance_hub", "driver_compliance",
  "payroll_settlements", "billing_invoicing", "dispatch_guard",
  "reporting_analytics", "hr_compliance",
];

const TRIAL_ACCOUNT_TYPES = ["free_trial", "paid_pilot"];

// ── Resolve org ───────────────────────────────────────────────────────────────
// Tries: env var ID → organization_code RONYX → first org in table.
// Returns the org row with trial columns if available, otherwise just id/name.
async function resolveRonyxOrg(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const envOrgId = process.env.RONYX_ORG_ID;

  // Build OR filter: match by env UUID if set, always also match by org code
  const orFilter = envOrgId
    ? `id.eq.${envOrgId},organization_code.eq.RONYX`
    : `organization_code.eq.RONYX`;

  // First attempt: full select including trial columns (requires migration 166)
  const { data: full, error: fullErr } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status, account_type, bypass_subscription, subscription_required, pilot_ends_at")
    .or(orFilter)
    .limit(1)
    .single();

  if (!fullErr && full) return { org: full, columnsMissing: false };

  // Second attempt: columns may not exist yet (migration 166 not run) — try minimal select
  const colMissing = fullErr?.message?.includes("account_type") ||
                     fullErr?.message?.includes("bypass_subscription") ||
                     fullErr?.code === "42703" ||
                     // also catches "column X of relation Y does not exist"
                     fullErr?.message?.includes("does not exist");

  if (colMissing || !full) {
    const { data: minimal } = await supabase
      .from("organizations")
      .select("id, name, organization_code, status")
      .or(orFilter)
      .limit(1)
      .single();

    if (minimal) return { org: minimal, columnsMissing: true };
  }

  // Last resort: grab any org (single-tenant assumption)
  const { data: any } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status")
    .limit(1)
    .single();

  return { org: any ?? null, columnsMissing: true };
}

// ── Trial check ───────────────────────────────────────────────────────────────
function isActiveTrial(org: Record<string, unknown> | null, columnsMissing: boolean): boolean {
  if (!org) return false;

  // If trial columns exist: use them
  if (!columnsMissing) {
    return (
      org.status               === "active" &&
      org.bypass_subscription  === true     &&
      org.subscription_required === false   &&
      TRIAL_ACCOUNT_TYPES.includes(org.account_type as string) &&
      !!org.pilot_ends_at &&
      new Date(org.pilot_ends_at as string) > new Date()
    );
  }

  // Columns missing (migration 166 not run yet):
  // Trust that Ronyx org code means trial access during this bootstrap period.
  // Remove this fallback after migration 166 has been confirmed to run.
  const isRonyxOrg =
    (org.organization_code as string)?.toUpperCase() === "RONYX" ||
    (org.name as string)?.toLowerCase().includes("ronyx");

  return isRonyxOrg && org.status === "active";
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createSupabaseServerClient();

  const { org, columnsMissing } = await resolveRonyxOrg(supabase);

  if (!org) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  const orgId = org.id as string;

  // Fetch all available modules
  const { data: allModulesRaw } = await supabase
    .from("modules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const allPlansQuery = supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Free trial → unlock everything
  if (isActiveTrial(org, columnsMissing)) {
    const { data: allPlans } = await allPlansQuery;
    const dbSlugs = (allModulesRaw ?? []).map((m: Record<string, unknown>) => m.slug as string);
    // Always union DB slugs + FREE_TRIAL_MODULES so both old hyphenated and new
    // underscore key formats are present regardless of which DB table has data.
    const activeModules = [...new Set([...dbSlugs, ...FREE_TRIAL_MODULES])];
    const allModules = (allModulesRaw ?? []).map((m: Record<string, unknown>) => ({
      ...m, org_is_active: true,
    }));

    return NextResponse.json({
      subscription: {
        plan_slug:              "free_trial",
        status:                 "trialing",
        trial_ends_at:          (org as Record<string, unknown>).pilot_ends_at ?? null,
        current_period_start:   null,
        current_period_end:     (org as Record<string, unknown>).pilot_ends_at ?? null,
        billing_email:          null,
        stripe_customer_id:     null,
        stripe_subscription_id: null,
        plan:                   null,
        bypass_subscription:    true,
        account_type:           (org as Record<string, unknown>).account_type ?? "free_trial",
      },
      activeModules,
      allPlans:    allPlans ?? [],
      allModules,
      trialActive: true,
      _debug: {
        orgId,
        columnsMissing,
        org_code: org.organization_code,
        account_type: (org as Record<string, unknown>).account_type ?? "(column missing)",
        bypass_subscription: (org as Record<string, unknown>).bypass_subscription ?? "(column missing)",
      },
    });
  }

  // Normal subscription path
  const { data: subRow } = await supabase
    .from("organization_subscriptions")
    .select(`*, plan:subscription_plans (*)`)
    .eq("organization_id", orgId)
    .single();

  const { data: orgModulesRows } = await supabase
    .from("organization_modules")
    .select("module_slug, is_active")
    .eq("organization_id", orgId);

  const activeModules: string[] = (orgModulesRows ?? [])
    .filter((r: { module_slug: string; is_active: boolean }) => r.is_active)
    .map((r: { module_slug: string }) => r.module_slug);

  const { data: allPlans } = await allPlansQuery;

  const orgModuleMap = new Map<string, boolean>(
    (orgModulesRows ?? []).map((r: { module_slug: string; is_active: boolean }) => [r.module_slug, r.is_active])
  );

  const allModules = (allModulesRaw ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    org_is_active: orgModuleMap.has(m.slug as string) ? orgModuleMap.get(m.slug as string) : false,
  }));

  if (!subRow) {
    return NextResponse.json({
      subscription: {
        plan_slug: "starter", status: "trialing",
        trial_ends_at: null, current_period_start: null, current_period_end: null,
        billing_email: null, stripe_customer_id: null, stripe_subscription_id: null,
        plan: (allPlans ?? []).find((p: Record<string, unknown>) => p.slug === "starter") ?? null,
      },
      activeModules: [],
      allPlans:      allPlans ?? [],
      allModules,
      _debug: { orgId, columnsMissing, reason: "no subscription row, trial check failed" },
    });
  }

  return NextResponse.json({
    subscription: subRow,
    activeModules,
    allPlans:  allPlans ?? [],
    allModules,
  });
}
