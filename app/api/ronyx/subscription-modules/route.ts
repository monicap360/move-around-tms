import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveOrgId(supabase: ReturnType<typeof createSupabaseServerClient>): Promise<string | null> {
  if (process.env.RONYX_ORG_ID) return process.env.RONYX_ORG_ID;
  const { data } = await supabase.from("organizations").select("id").limit(1).single();
  return data?.id ?? null;
}

async function getModulesWithStatus(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  orgId: string
) {
  const [{ data: allModules }, { data: orgModules }] = await Promise.all([
    supabase
      .from("modules")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("organization_modules")
      .select("module_slug, is_active")
      .eq("organization_id", orgId),
  ]);

  const orgMap = new Map<string, boolean>(
    (orgModules ?? []).map((r: { module_slug: string; is_active: boolean }) => [r.module_slug, r.is_active])
  );

  return (allModules ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    org_is_active: orgMap.has(m.slug as string) ? orgMap.get(m.slug as string) : false,
  }));
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const orgId = await resolveOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const modules = await getModulesWithStatus(supabase, orgId);
  return NextResponse.json({ modules });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const orgId = await resolveOrgId(supabase);
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  let body: { module_slug?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { module_slug, action } = body;
  if (!module_slug || !action) {
    return NextResponse.json({ error: "module_slug and action are required" }, { status: 400 });
  }
  if (action !== "activate" && action !== "deactivate") {
    return NextResponse.json({ error: "action must be 'activate' or 'deactivate'" }, { status: 400 });
  }

  // Fetch the module to get its id + price
  const { data: moduleRow, error: modErr } = await supabase
    .from("modules")
    .select("id, monthly_price, name")
    .eq("slug", module_slug)
    .single();

  if (modErr || !moduleRow) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  if (action === "activate") {
    const { error: upsertErr } = await supabase
      .from("organization_modules")
      .upsert(
        {
          organization_id: orgId,
          module_id: moduleRow.id,
          module_slug,
          is_active: true,
          activated_at: new Date().toISOString(),
          deactivated_at: null,
        },
        { onConflict: "organization_id,module_slug" }
      );

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
  } else {
    // deactivate
    const { error: updErr } = await supabase
      .from("organization_modules")
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("module_slug", module_slug);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  // Log billing event
  await supabase.from("organization_billing_events").insert({
    organization_id: orgId,
    event_type: action === "activate" ? "module_activated" : "module_deactivated",
    module_slug,
    amount: action === "activate" ? moduleRow.monthly_price : null,
    notes: `${action === "activate" ? "Activated" : "Deactivated"} module: ${moduleRow.name}`,
    metadata: { module_slug, action, module_name: moduleRow.name },
  });

  // Return updated module list
  const modules = await getModulesWithStatus(supabase, orgId);
  return NextResponse.json({ modules, success: true });
}
