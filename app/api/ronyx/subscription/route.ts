import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveOrgId(supabase: ReturnType<typeof createSupabaseServerClient>): Promise<string | null> {
  if (process.env.RONYX_ORG_ID) return process.env.RONYX_ORG_ID;
  const { data } = await supabase.from("organizations").select("id").limit(1).single();
  return data?.id ?? null;
}

export async function GET() {
  const supabase = createSupabaseServerClient();

  const orgId = await resolveOrgId(supabase);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  // Fetch subscription + plan
  const { data: subRow } = await supabase
    .from("organization_subscriptions")
    .select(`
      *,
      plan:subscription_plans (*)
    `)
    .eq("organization_id", orgId)
    .single();

  // Fetch active module slugs for this org
  const { data: orgModulesRows } = await supabase
    .from("organization_modules")
    .select("module_slug, is_active")
    .eq("organization_id", orgId);

  const activeModules: string[] = (orgModulesRows ?? [])
    .filter((r: { module_slug: string; is_active: boolean }) => r.is_active)
    .map((r: { module_slug: string }) => r.module_slug);

  // Fetch all plans (for upgrade comparison)
  const { data: allPlans } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Fetch all modules with org active status
  const { data: allModulesRaw } = await supabase
    .from("modules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const orgModuleMap = new Map<string, boolean>(
    (orgModulesRows ?? []).map((r: { module_slug: string; is_active: boolean }) => [r.module_slug, r.is_active])
  );

  const allModules = (allModulesRaw ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    org_is_active: orgModuleMap.has(m.slug as string) ? orgModuleMap.get(m.slug as string) : false,
  }));

  if (!subRow) {
    // No subscription row yet — return defaults
    return NextResponse.json({
      subscription: {
        plan_slug: "starter",
        status: "trialing",
        trial_ends_at: null,
        current_period_start: null,
        current_period_end: null,
        billing_email: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        plan: (allPlans ?? []).find((p: Record<string, unknown>) => p.slug === "starter") ?? null,
      },
      activeModules: [],
      allPlans: allPlans ?? [],
      allModules,
    });
  }

  return NextResponse.json({
    subscription: subRow,
    activeModules,
    allPlans: allPlans ?? [],
    allModules,
  });
}
