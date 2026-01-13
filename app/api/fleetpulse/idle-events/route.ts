import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// List all idle/delay events
export async function GET() {
  const supa = createSupabaseServerClient();
  const { data, error } = await supa
    .from("fleetpulse_idle_events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ events: data });
}

// Create a new idle/delay event
export async function POST(req) {
  const supa = createSupabaseServerClient();
  const body = await req.json();
  const { data, error } = await supa
    .from("fleetpulse_idle_events")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ event: data });
}
