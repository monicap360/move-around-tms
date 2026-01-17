import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_driver_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updates: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ronyx_driver_updates")
    .insert({
      driver_name: payload?.driver_name || null,
      status: payload?.status || null,
      notes: payload?.notes || null,
      ticket_id: payload?.ticket_id || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ update: data });
}
