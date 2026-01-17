import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_CUSTOMERS = [
  {
    customer_name: "Metro Paving",
    contact_name: "L. Baxter",
    contact_email: "dispatch@metropaving.com",
    contact_phone: "(713) 555-0114",
  },
  {
    customer_name: "Gulf Aggregate",
    contact_name: "S. Nolan",
    contact_email: "orders@gulfaggregate.com",
    contact_phone: "(832) 555-0199",
  },
];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_customers").select("*").order("customer_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0) {
    const { error: insertError } = await supabase.from("ronyx_customers").insert(DEFAULT_CUSTOMERS);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_customers")
      .select("*")
      .order("customer_name", { ascending: true });
    return NextResponse.json({ customers: seeded || [] });
  }

  return NextResponse.json({ customers: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.from("ronyx_customers").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data });
}
