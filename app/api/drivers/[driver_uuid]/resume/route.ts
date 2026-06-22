import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: any) {
  const supa = supabaseAdmin;
  const { driver_uuid } = params;

  const { data } = await supa
    .from("drivers")
    .select("*, driver_resume(*)")
    .eq("driver_uuid", driver_uuid)
    .single();

  return NextResponse.json(data);
}
