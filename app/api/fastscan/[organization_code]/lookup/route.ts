import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req, { params }) {
  const client = createSupabaseServerClient();
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
