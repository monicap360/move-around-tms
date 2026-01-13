import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req) {
  const client = createSupabaseServerClient();
  const body = await req.json();
  const { driver_uuid, load_id, weight_in, weight_out, plant_id, material_id } =
    body;
  const { data: driver } = await client
    .from("drivers")
    .select("id")
    .eq("driver_uuid", driver_uuid)
    .single();
  const payload = {
    driver_id: driver.id,
    load_id,
    weight_in,
    weight_out,
    plant_id,
    material_id,
    status: "completed",
    fastscan: true,
  };
  const { data, error } = await client
    .from("tickets")
    .insert(payload)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, ticket: data });
}
