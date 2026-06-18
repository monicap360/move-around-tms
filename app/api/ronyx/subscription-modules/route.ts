import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TRIAL_ACCOUNT_TYPES = ["free_trial", "paid_pilot"];

// ── Resolve Ronyx org (by env UUID or organization_code) ─────────────────────
async function resolveRonyxOrg(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const envOrgId = process.env.RONYX_ORG_ID;
  const orFilter = envOrgId
    ? `id.eq.${envOrgId},organization_code.eq.RONYX`
    : `organization_code.eq.RONYX`;

  const { data: full, error: fullErr } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status, account_type, bypass_subscription, subscription_required, pilot_ends_at")
    .or(orFilter)
    .limit(1)
    .single();

  if (!fullErr && full) return { org: full as Record<string, unknown>, columnsMissing: false };

  const colMissing =
    fullErr?.message?.includes("account_type") ||
    fullErr?.message?.includes("bypass_subscription") ||
    fullErr?.code === "42703" ||
    fullErr?.message?.includes("does not exist");

  if (colMissing || !full) {
    const { data: minimal } = await supabase
      .from("organizations")
      .select("id, name, organization_code, status")
      .or(orFilter)
      .limit(1)
      .single();
    if (minimal) return { org: minimal as Record<string, unknown>, columnsMissing: true };
  }

  const { data: anyOrg } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status")
    .limit(1)
    .single();

  return { org: (anyOrg ?? null) as Record<string, unknown> | null, columnsMissing: true };
}

function isActiveTrial(org: Record<string, unknown> | null, columnsMissing: boolean): boolean {
  if (!org) return false;
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
  const isRonyxOrg =
    (org.organization_code as string)?.toUpperCase() === "RONYX" ||
    (org.name as string)?.toLowerCase().includes("ronyx");
  return isRonyxOrg && org.status === "active";
}

// Stable ordering for the view — sort_order lives in module_registry and is NOT
// exposed in organization_module_marketplace, so ordering by it causes a 42703
// error. Using category + module_name keeps results consistent.
async function queryMarketplaceView(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  orgId: string
) {
  return supabase
    .from("organization_module_marketplace")
    .select("*")
    .eq("organization_id", orgId)
    .order("category", { ascending: true })
    .order("module_name", { ascending: true });
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createSupabaseServerClient();
  const { org, columnsMissing } = await resolveRonyxOrg(supabase);
  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgId       = org.id as string;
  const trialActive = isActiveTrial(org, columnsMissing);

  // ── Marketplace view (primary path) ──────────────────────────────────────────
  const { data: viewRows, error: viewErr } = await queryMarketplaceView(supabase, orgId);

  const _debug = {
    orgId,
    orgCode:            org.organization_code,
    orgStatus:          org.status,
    accountType:        (org as Record<string, unknown>).account_type ?? "(column missing)",
    bypassSubscription: (org as Record<string, unknown>).bypass_subscription ?? "(column missing)",
    pilotEndsAt:        (org as Record<string, unknown>).pilot_ends_at ?? null,
    columnsMissing,
    trialActive,
    viewErr:            viewErr ? `${viewErr.code}: ${viewErr.message}` : null,
    viewRowCount:       viewRows?.length ?? 0,
    source:             "pending",
  };

  if (viewErr) {
    console.error("[subscription-modules] marketplace view error:", viewErr.code, viewErr.message);
  }

  if (!viewErr && viewRows && viewRows.length > 0) {
    const trialDaysLeft = (viewRows[0] as Record<string, unknown>).trial_days_left as number | null;

    const activeOrTrial   = viewRows.filter(r => ["active","in_trial"].includes((r as Record<string, unknown>).status as string)).length;
    const trialModules    = viewRows.filter(r => (r as Record<string, unknown>).status === "in_trial").length;
    const availableAddOns = viewRows.filter(r =>
      (r as Record<string, unknown>).status === "available" &&
      Number((r as Record<string, unknown>).price_monthly ?? 0) > 0
    ).length;
    const estAddOnCost = viewRows
      .filter(r => (r as Record<string, unknown>).status === "available")
      .reduce((sum, r) => sum + Number((r as Record<string, unknown>).price_monthly ?? 0), 0);

    // Log module access decisions
    for (const row of viewRows) {
      const r = row as Record<string, unknown>;
      console.log("[subscription-modules] module:", {
        moduleKey:   r.module_key,
        status:      r.status,
        trialActive,
        countsAsActive: ["active","in_trial"].includes(r.status as string),
        blocked:     !trialActive && !["active","in_trial"].includes(r.status as string),
      });
    }

    return NextResponse.json({
      modules: viewRows,
      trialActive,
      trialDaysLeft,
      stats: { activeOrTrial, trialModules, availableAddOns, estAddOnCost },
      source: "marketplace_view",
      _debug: { ..._debug, source: "marketplace_view", viewRowCount: viewRows.length },
    });
  }

  // ── Fallback: old modules table ───────────────────────────────────────────────
  // Only reached if the view itself doesn't exist yet (pre-migration 167) or
  // if the view returns 0 rows (org not yet seeded). A sort_order error would
  // have surfaced as viewErr; with the correct ordering above it should not occur.
  console.warn("[subscription-modules] falling back to legacy modules table. viewErr:", viewErr?.message, "rowCount:", viewRows?.length);

  const { data: allModules } = await supabase
    .from("modules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const orgModulesData = trialActive
    ? []
    : (await supabase
        .from("organization_modules")
        .select("module_slug, is_active, module_key, status")
        .eq("organization_id", orgId)
      ).data ?? [];

  const orgMap = new Map<string, boolean>(
    (orgModulesData as Array<Record<string, unknown>>).map(r => [
      ((r.module_key ?? r.module_slug) as string),
      trialActive ? true : (r.is_active as boolean),
    ])
  );

  const modules = (allModules ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    module_key:          m.slug,
    module_name:         m.name,
    module_subtitle:     null,
    status:              trialActive ? "in_trial" : (orgMap.get(m.slug as string) ? "active" : "available"),
    price_label:         m.monthly_price === 0
      ? `Included in ${(m.included_in_plans as string[])?.join(", ") ?? "plan"}`
      : `$${m.monthly_price}/mo add-on`,
    features:            [],
    is_enterprise_add_on: (m.slug as string) === "ccb",
  }));

  const estAddOnCost = modules
    .filter(m => m.status === "available")
    .reduce((sum, m) => sum + Number(m.monthly_price ?? 0), 0);

  return NextResponse.json({
    modules,
    trialActive,
    trialDaysLeft: null,
    stats: {
      activeOrTrial:    modules.filter(m => ["active","in_trial"].includes(m.status)).length,
      trialModules:     modules.filter(m => m.status === "in_trial").length,
      availableAddOns:  modules.filter(m => m.status === "available" && Number(m.monthly_price ?? 0) > 0).length,
      estAddOnCost,
    },
    source: "legacy_modules_table",
    _debug: { ..._debug, source: "legacy_modules_table" },
  });
}

// ── POST (activate / deactivate) ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { org, columnsMissing } = await resolveRonyxOrg(supabase);
  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgId       = org.id as string;
  const trialActive = isActiveTrial(org, columnsMissing);

  let body: { module_key?: string; module_slug?: string; action?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const moduleKey  = body.module_key ?? body.module_slug;
  const { action } = body;
  if (!moduleKey || !action)
    return NextResponse.json({ error: "module_key and action are required" }, { status: 400 });
  if (action !== "activate" && action !== "deactivate")
    return NextResponse.json({ error: "action must be 'activate' or 'deactivate'" }, { status: 400 });

  console.log("[subscription-modules] toggle:", { moduleKey, action, orgId, trialActive });

  // ── Try new organization_modules table (module_key column) ──────────────────
  const newStatus = action === "activate" ? "active" : "inactive";
  const { error: updErr } = await supabase
    .from("organization_modules")
    .update({
      status:         newStatus,
      activated_at:   action === "activate" ? new Date().toISOString() : undefined,
      deactivated_at: action === "deactivate" ? new Date().toISOString() : undefined,
    })
    .eq("organization_id", orgId)
    .eq("module_key", moduleKey);

  if (updErr) {
    console.warn("[subscription-modules] module_key update failed, trying module_slug fallback:", updErr.message);
    await supabase
      .from("organization_modules")
      .update({
        is_active:      action === "activate",
        activated_at:   action === "activate" ? new Date().toISOString() : undefined,
        deactivated_at: action === "deactivate" ? new Date().toISOString() : undefined,
      })
      .eq("organization_id", orgId)
      .eq("module_slug", moduleKey);
  }

  // Return updated list — use the same stable ordering as GET
  const { data: viewRows } = await queryMarketplaceView(supabase, orgId);

  return NextResponse.json({ modules: viewRows ?? [], success: true, trialActive });
}
