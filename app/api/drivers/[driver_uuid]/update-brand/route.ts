import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req, { params }) {
  const client = createSupabaseServerClient();
  const { driver_uuid } = params;
  const body = await req.json();
  const { truck_skin, custom_logo_url } = body;

  const { error } = await client
    .from("drivers")
    .update({ truck_skin, custom_logo_url })
    .eq("driver_uuid", driver_uuid);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
