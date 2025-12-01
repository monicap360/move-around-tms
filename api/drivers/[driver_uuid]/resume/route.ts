import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request, { params }: any) {
  const { driver_uuid } = params;

  const { data } = await supa
    .from("drivers")
    .select("*, driver_resume(*)")
    .eq("driver_uuid", driver_uuid)
    .single();

  return NextResponse.json(data);
}
