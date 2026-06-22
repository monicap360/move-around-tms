import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// List all truck scores
export async function GET() {
  const supa = supabaseAdmin;
  const { data, error } = await supa
    .from("fleetpulse_truck_scores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ trucks: data });
}

// Create a new truck score
export async function POST(req: Request) {
  const supa = supabaseAdmin;
  const body = await req.json();
  const { data, error } = await supa
    .from("fleetpulse_truck_scores")
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ truck: data });
}
