import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasOrganizationAccess } from "@/lib/auth/hasOrganizationAccess";

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
  // Driver module slugs — all variants included so no driver page ever blocks
  "driver_management", "driver_compliance", "driver_documents",
  "drivers", "driver-compliance", "driver-documents",
  // New module_registry keys
  "owner_operator_hub", "fast_scan", "driver_management",
  "load_management", "maintenance_hub", "driver_compliance",
  "payroll_settlements", "billing_invoicing", "dispatch_guard",
  "reporting_analytics", "hr_compliance",
];

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
// columnsMissing = true means trial columns not yet in DB (migrations not run).
// Fail open in that case — never block users because a migration hasn't run yet.
function isActiveTrial(org: Record<string, unknown> | null, columnsMissing: boolean): boolean {
  if (!org) return false;
  if (columnsMissing) return true; // fail open — trial columns not deployed yet
  return hasOrganizationAccess(org as Parameters<typeof hasOrganizationAccess>[0]);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createSupabaseServerClient();

  const { org, columnsMissing } = await resolveRonyxOrg(supabase);

  if (!org) {
    // No org in DB yet (migrations pending) — fail open so no page is blocked
    return NextResponse.json({
      trialActive:  true,
      activeModules: FREE_TRIAL_MODULES,
      allPlans:     [],
      allModules:   [],
      subscription: { plan_slug: "free_trial", status: "trialing" },
      _debug:       { reason: "no org found — fail open" },
    });
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

  // Fetch org modules — select both old (module_slug/is_active) and new (module_key/status) columns.
  // Rows with status='in_trial' or status='active' are granted access even if the org-level
  // trial flags haven't been set yet (e.g. migration ran modules but not the org UPDATE).
  const { data: orgModulesRows } = await supabase
    .from("organization_modules")
    .select("module_slug, module_key, is_active, status")
    .eq("organization_id", orgId);

  type OrgModuleRow = { module_slug?: string; module_key?: string; is_active?: boolean; status?: string };
  const rows: OrgModuleRow[] = (orgModulesRows ?? []) as OrgModuleRow[];

  // A module counts as active if: is_active=true (legacy), OR status is 'active'/'in_trial' (new)
  const activeRows = rows.filter(r =>
    r.is_active === true ||
    r.status === "active" ||
    r.status === "in_trial"
  );

  // Collect both slug formats so both useModuleAccess("owner-operators") and
  // useModuleAccess("owner_operator_hub") resolve correctly.
  const activeModules: string[] = [
    ...new Set(
      activeRows.flatMap(r => [r.module_slug, r.module_key].filter((v): v is string => !!v))
    ),
  ];

  // If any modules are in_trial, treat the org as trial-active for the hook
  const hasInTrialModules = rows.some(r => r.status === "in_trial");

  const { data: allPlans } = await allPlansQuery;

  const activeSet = new Set(activeModules);
  const allModules = (allModulesRaw ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    org_is_active: activeSet.has(m.slug as string),
  }));

  if (!subRow) {
    return NextResponse.json({
      subscription: {
        plan_slug:     hasInTrialModules ? "free_trial" : "starter",
        status:        "trialing",
        trial_ends_at: null, current_period_start: null, current_period_end: null,
        billing_email: null, stripe_customer_id: null, stripe_subscription_id: null,
        plan: (allPlans ?? []).find((p: Record<string, unknown>) => p.slug === "starter") ?? null,
      },
      activeModules,
      trialActive: hasInTrialModules,
      allPlans:    allPlans ?? [],
      allModules,
      _debug: { orgId, columnsMissing, hasInTrialModules, reason: "no subscription row" },
    });
  }

  return NextResponse.json({
    subscription:  subRow,
    activeModules,
    trialActive:   hasInTrialModules,
    allPlans:      allPlans ?? [],
    allModules,
  });
}
