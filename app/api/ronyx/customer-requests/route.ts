import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_REQUESTS = [
  {
    request_number: "CR-1204",
    company_name: "Metro Paving",
    contact_name: "L. Baxter",
    contact_email: "dispatch@metropaving.com",
    contact_phone: "(713) 555-0114",
    material_type: "Base Rock",
    quantity: 260,
    unit: "tons",
    pickup_location: "Pit 7 - North",
    delivery_location: "Beltway 8 Jobsite",
    requested_at: new Date().toISOString(),
    rate_type: "per_ton",
    rate_amount: 21.5,
    status: "new",
    priority: "high",
    notes: "Need delivery before noon.",
  },
  {
    request_number: "CR-1205",
    company_name: "Gulf Aggregate",
    contact_name: "S. Nolan",
    contact_email: "orders@gulfaggregate.com",
    contact_phone: "(832) 555-0199",
    material_type: "Sand",
    quantity: 140,
    unit: "tons",
    pickup_location: "Pit 3 - East",
    delivery_location: "I-45 Expansion",
    requested_at: new Date().toISOString(),
    rate_type: "per_load",
    rate_amount: 325,
    status: "quoted",
    priority: "standard",
    notes: "Split into 6 loads if possible.",
  },
];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_customer_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0) {
    const { error: insertError } = await supabase.from("ronyx_customer_requests").insert(DEFAULT_REQUESTS);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_customer_requests")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json({ requests: seeded || [] });
  }

  return NextResponse.json({ requests: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_customer_requests").insert(payload).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const { id, ...updates } = payload || {};

  if (!id) {
    return NextResponse.json({ error: "Missing request id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_customer_requests")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data });
}
