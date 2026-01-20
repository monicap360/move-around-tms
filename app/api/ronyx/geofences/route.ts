import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("location_geofences")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ geofences: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("location_geofences")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ geofence: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  if (!payload?.geofence_id) {
    return NextResponse.json({ error: "Missing geofence_id" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("location_geofences")
    .update(payload)
    .eq("geofence_id", payload.geofence_id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ geofence: data });
}
