import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req, { params }) {
  const { organization_code } = params;
  const body = await req.json();
  const { driver_uuid } = body;
  const { data: driver } = await client
    .from("drivers")
    .select("*")
    .eq("driver_uuid", driver_uuid)
    .eq("organization_code", organization_code)
    .single();
  return NextResponse.json({ driver });
}
