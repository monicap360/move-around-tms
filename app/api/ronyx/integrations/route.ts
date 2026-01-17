import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_INTEGRATIONS = [
  { name: "QuickBooks", category: "Accounting", status: "disconnected", enabled: false },
  { name: "Sage Intacct", category: "Accounting", status: "disconnected", enabled: false },
  { name: "Samsara", category: "Telematics", status: "connected", enabled: true },
  { name: "Geotab", category: "Telematics", status: "disconnected", enabled: false },
  { name: "TruckStop", category: "Load Board", status: "disconnected", enabled: false },
  { name: "DAT", category: "Load Board", status: "disconnected", enabled: false },
];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_integrations").select("*").order("category", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0) {
    const { error: insertError } = await supabase.from("ronyx_integrations").insert(DEFAULT_INTEGRATIONS);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase.from("ronyx_integrations").select("*").order("category", { ascending: true });
    return NextResponse.json({ integrations: seeded || [] });
  }

  return NextResponse.json({ integrations: data || [] });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const { id, enabled } = payload || {};

  if (!id) {
    return NextResponse.json({ error: "Missing integration id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_integrations")
    .update({ enabled: Boolean(enabled), status: enabled ? "connected" : "disconnected", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}
