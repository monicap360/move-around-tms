import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_LOADS = [
  {
    load_number: "LD-6121",
    route: "Pit 7 → I‑45 Jobsite",
    status: "active",
    driver_name: "D. Perez",
    customer_name: "Metro Paving",
  },
  {
    load_number: "LD-6124",
    route: "Pit 3 → Beltway 8",
    status: "active",
    driver_name: "S. Grant",
    customer_name: "Gulf Aggregate",
  },
  {
    load_number: "LD-6129",
    route: "Pit 5 → Katy Site",
    status: "completed",
    driver_name: "J. Lane",
    customer_name: "City Site",
  },
  {
    load_number: "LD-6202",
    route: "Pit 2 → Downtown",
    status: "available",
    driver_name: "",
    customer_name: "Metro Paving",
  },
  {
    load_number: "LD-6204",
    route: "Pit 8 → Loop 610",
    status: "cancelled",
    driver_name: "S. Grant",
    customer_name: "Gulf Aggregate",
  },
];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_loads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0) {
    const { error: insertError } = await supabase.from("ronyx_loads").insert(DEFAULT_LOADS);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_loads")
      .select("*")
      .order("created_at", { ascending: false });
    return NextResponse.json({ loads: seeded || [] });
  }

  return NextResponse.json({ loads: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.from("ronyx_loads").insert(payload).select("*").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ load: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const { id, ...updates } = payload || {};

  if (!id) {
    return NextResponse.json({ error: "Missing load id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_loads")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ load: data });
}
