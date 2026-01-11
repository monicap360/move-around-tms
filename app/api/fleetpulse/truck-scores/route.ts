import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// List all truck scores
export async function GET() {
  const { data, error } = await supa
    .from("fleetpulse_truck_scores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ trucks: data });
}

// Create a new truck score
export async function POST(req) {
  const body = await req.json();
  const { data, error } = await supa
    .from("fleetpulse_truck_scores")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ truck: data });
}
