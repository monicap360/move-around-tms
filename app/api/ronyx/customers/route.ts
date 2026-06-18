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

// Companies Ronyx actively hauls for — always ensure these exist
const REQUIRED_COMPANIES = [
  { customer_name: "TC Red Wine Services",                    customer_type: "general_contractor", payment_terms: "net_30" },
  { customer_name: "BAS Equipment & Trucking Services, LLC",  customer_type: "general_contractor", payment_terms: "net_30" },
  { customer_name: "Denesse Group Inc",                       customer_type: "subcontractor",      payment_terms: "net_30", billing_contact_name: "Denesse Duran", billing_email: "denesse4@gmail.com", billing_phone: "323-712-5010" },
];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const { data, error } = await supabase
    .from("ronyx_customers")
    .select("*")
    .eq("organization_id", orgId)
    .order("customer_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const existing = data || [];

  if (existing.length === 0) {
    // Seed defaults + required companies on first load
    const seedRows = [...DEFAULT_CUSTOMERS, ...REQUIRED_COMPANIES].map(r => ({ ...r, organization_id: orgId }));
    await supabase.from("ronyx_customers").insert(seedRows);
    const { data: seeded } = await supabase
      .from("ronyx_customers")
      .select("*")
      .eq("organization_id", orgId)
      .order("customer_name", { ascending: true });
    return NextResponse.json({ customers: seeded || [] });
  }

  // Always ensure required companies exist even if other customers are already present
  const existingNames = existing.map((c: any) => c.customer_name.toLowerCase());
  const missing = REQUIRED_COMPANIES.filter(
    (rc) => !existingNames.includes(rc.customer_name.toLowerCase())
  );
  if (missing.length > 0) {
    await supabase.from("ronyx_customers").insert(missing.map(r => ({ ...r, organization_id: orgId })));
    const { data: refreshed } = await supabase
      .from("ronyx_customers")
      .select("*")
      .eq("organization_id", orgId)
      .order("customer_name", { ascending: true });
    return NextResponse.json({ customers: refreshed || [] });
  }

  return NextResponse.json({ customers: existing });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";

  const { data, error } = await supabase
    .from("ronyx_customers")
    .insert({ ...payload, organization_id: orgId })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  if (!payload?.id) {
    return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const { data, error } = await supabase
    .from("ronyx_customers")
    .update(payload)
    .eq("id", payload.id)
    .eq("organization_id", orgId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ customer: data });
}