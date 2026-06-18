import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TRIAL_ACCOUNT_TYPES = ["free_trial", "paid_pilot"];

// ── Resolve org (same logic as /api/ronyx/subscription) ──────────────────────
async function resolveRonyxOrg(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const envOrgId = process.env.RONYX_ORG_ID;
  const orFilter = envOrgId
    ? `id.eq.${envOrgId},organization_code.eq.RONYX`
    : `organization_code.eq.RONYX`;

  // Full select (requires migration 166)
  const { data: full, error: fullErr } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status, account_type, bypass_subscription, subscription_required, pilot_ends_at")
    .or(orFilter)
    .limit(1)
    .single();

  if (!fullErr && full) return { org: full as Record<string, unknown>, columnsMissing: false };

  // Columns missing — minimal fallback
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

  // Last resort — any org
  const { data: any } = await supabase
    .from("organizations")
    .select("id, name, organization_code, status")
    .limit(1)
    .single();

  return { org: (any ?? null) as Record<string, unknown> | null, columnsMissing: true };
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
  // Bootstrap fallback: trust org_code=RONYX + active status
  const isRonyxOrg =
    (org.organization_code as string)?.toUpperCase() === "RONYX" ||
    (org.name as string)?.toLowerCase().includes("ronyx");
  return isRonyxOrg && org.status === "active";
}

// ── Build module list ─────────────────────────────────────────────────────────
async function getModulesWithStatus(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  orgId: string,
  trialActive: boolean
) {
  const [{ data: allModules }, { data: orgModules }] = await Promise.all([
    supabase
      .from("modules")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    trialActive
      ? Promise.resolve({ data: [] })              // skip the table read during trial
      : supabase
          .from("organization_modules")
          .select("module_slug, is_active")
          .eq("organization_id", orgId),
  ]);

  const orgMap = new Map<string, boolean>(
    (orgModules ?? []).map((r: { module_slug: string; is_active: boolean }) => [r.module_slug, r.is_active])
  );

  return (allModules ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    // During a trial every module is active; otherwise check org_modules table
    org_is_active: trialActive
      ? true
      : (orgMap.has(m.slug as string) ? orgMap.get(m.slug as string) : false),
  }));
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const supabase = createSupabaseServerClient();
  const { org, columnsMissing } = await resolveRonyxOrg(supabase);
  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgId = org.id as string;
  const trialActive = isActiveTrial(org, columnsMissing);
  const modules = await getModulesWithStatus(supabase, orgId, trialActive);
  return NextResponse.json({ modules, trialActive });
}

// ── POST (activate / deactivate) ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { org, columnsMissing } = await resolveRonyxOrg(supabase);
  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgId = org.id as string;
  const trialActive = isActiveTrial(org, columnsMissing);

  let body: { module_slug?: string; action?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { module_slug, action } = body;
  if (!module_slug || !action)
    return NextResponse.json({ error: "module_slug and action are required" }, { status: 400 });
  if (action !== "activate" && action !== "deactivate")
    return NextResponse.json({ error: "action must be 'activate' or 'deactivate'" }, { status: 400 });

  const { data: moduleRow, error: modErr } = await supabase
    .from("modules")
    .select("id, monthly_price, name")
    .eq("slug", module_slug)
    .single();

  if (modErr || !moduleRow)
    return NextResponse.json({ error: "Module not found" }, { status: 404 });

  if (action === "activate") {
    await supabase
      .from("organization_modules")
      .upsert(
        { organization_id: orgId, module_id: moduleRow.id, module_slug, is_active: true, activated_at: new Date().toISOString(), deactivated_at: null },
        { onConflict: "organization_id,module_slug" }
      );
  } else {
    await supabase
      .from("organization_modules")
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("module_slug", module_slug);
  }

  await supabase.from("organization_billing_events").insert({
    organization_id: orgId,
    event_type: action === "activate" ? "module_activated" : "module_deactivated",
    module_slug,
    amount: action === "activate" ? moduleRow.monthly_price : null,
    notes: `${action === "activate" ? "Activated" : "Deactivated"} module: ${moduleRow.name}`,
    metadata: { module_slug, action, module_name: moduleRow.name },
  });

  const modules = await getModulesWithStatus(supabase, orgId, trialActive);
  return NextResponse.json({ modules, success: true, trialActive });
}
