import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: any) {
  const supa = createSupabaseServerClient();
  const { driver_uuid } = params;

  const { data } = await supa
    .from("drivers")
    .select("*, driver_resume(*)")
    .eq("driver_uuid", driver_uuid)
    .single();

  return NextResponse.json(data);
}
