import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req, { params }) {
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
