import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req, { params }) {
  const client = createSupabaseServerClient();
  const { driver_uuid } = params;
  const { data, error } = await client
    .from("drivers")
    .select("*, trucks(*)")
    .eq("driver_uuid", driver_uuid)
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
