import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// List all driver day reconstructions
export async function GET() {
  const supa = createSupabaseServerClient();
  const { data, error } = await supa
    .from("fleetpulse_driver_day")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ days: data });
}

// Create a new driver day record
export async function POST(req) {
  const supa = createSupabaseServerClient();
  const body = await req.json();
  const { data, error } = await supa
    .from("fleetpulse_driver_day")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ day: data });
}
