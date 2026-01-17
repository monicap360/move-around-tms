import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_TRUCKS = [
  { truck_number: "Truck 18", make: "Kenworth", model: "T880", year: 2020, status: "active" },
  { truck_number: "Truck 22", make: "Mack", model: "Granite", year: 2019, status: "active" },
  { truck_number: "Truck 31", make: "Freightliner", model: "122SD", year: 2018, status: "active" },
];

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_trucks").select("*").order("truck_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0) {
    const { error: insertError } = await supabase.from("ronyx_trucks").insert(DEFAULT_TRUCKS);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_trucks")
      .select("*")
      .order("truck_number", { ascending: true });
    return NextResponse.json({ trucks: seeded || [] });
  }

  return NextResponse.json({ trucks: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.from("ronyx_trucks").insert(payload).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ truck: data });
}
