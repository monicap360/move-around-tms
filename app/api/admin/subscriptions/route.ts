import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

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
  const result = (data || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    plan_tier: org.plan_tier,
    created_at: org.created_at,
    status: org.status,
    payment_status: org.payment_status,
    admin_override: org.subscriptions?.admin_override || false,
    override_expires_at: org.subscriptions?.override_expires_at || null,
    subscription_status: org.subscriptions?.status || null,
  }));

  return NextResponse.json(result);
}
