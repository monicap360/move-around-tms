import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { organization_code: string } }) {
  const client = supabaseAdmin;
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
