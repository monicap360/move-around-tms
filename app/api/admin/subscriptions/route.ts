import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();

  // Join organizations and subscriptions for admin view
  const { data, error } = await supabase.from("organizations").select(`
      id,
      name,
      plan_tier,
      created_at,
      status,
      payment_status,
      subscriptions:subscriptions(
        status,
        admin_override,
        override_expires_at
      )
    `);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten subscriptions for easier UI
  const result = (data || []).map((organization: any) => ({
    id: organization.id,
    name: organization.name,
    plan_tier: organization.plan_tier,
    created_at: organization.created_at,
    status: organization.status,
    payment_status: organization.payment_status,
    admin_override: organization.subscriptions?.admin_override || false,
    override_expires_at: organization.subscriptions?.override_expires_at || null,
    subscription_status: organization.subscriptions?.status || null,
  }));

  return NextResponse.json(result);
}
