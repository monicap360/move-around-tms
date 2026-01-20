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
  const result = (data || []).map((company: any) => ({
    id: company.id,
    name: company.name,
    plan_tier: company.plan_tier,
    created_at: company.created_at,
    status: company.status,
    payment_status: company.payment_status,
    admin_override: company.subscriptions?.admin_override || false,
    override_expires_at: company.subscriptions?.override_expires_at || null,
    subscription_status: company.subscriptions?.status || null,
  }));

  return NextResponse.json(result);
}

