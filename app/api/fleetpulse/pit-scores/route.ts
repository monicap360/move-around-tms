import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// List all pit scores
export async function GET() {
  const supa = createSupabaseServerClient();
  const { data, error } = await supa
    .from("fleetpulse_pit_scores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ pits: data });
}

// Create a new pit score
export async function POST(req) {
  const supa = createSupabaseServerClient();
  const body = await req.json();
  const { data, error } = await supa
    .from("fleetpulse_pit_scores")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ pit: data });
}
