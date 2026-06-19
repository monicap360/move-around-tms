import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Returns all organizations with subscription + subdomain info for the
// Platform Admin Console at admin.movearoundtms.app
export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(`
      id,
      name,
      organization_code,
      organization_slug,
      slug_verified,
      status,
      account_type,
      subscription_status,
      bypass_subscription,
      subscription_required,
      onboarding_tier,
      onboarding_setup_fee,
      onboarding_monthly_fee,
      platform_notes,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgs = (data || []).map((o: any) => ({
    ...o,
    subdomain_url: o.organization_slug
      ? `https://${o.organization_slug}.movearoundtms.app`
      : null,
    is_ronyx: o.organization_slug === "ronyx",
  }));

  return NextResponse.json({ orgs });
}

// Update org subscription/onboarding fields from admin console
export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();
  const { org_id, ...updates } = body;

  if (!org_id) {
    return NextResponse.json({ error: "org_id is required" }, { status: 400 });
  }

  const allowed = [
    "status", "account_type", "subscription_status", "bypass_subscription",
    "subscription_required", "onboarding_tier", "onboarding_setup_fee",
    "onboarding_monthly_fee", "organization_slug", "slug_verified", "platform_notes",
  ];

  const safeUpdates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) safeUpdates[key] = updates[key];
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organizations")
    .update(safeUpdates)
    .eq("id", org_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ org: data });
}
