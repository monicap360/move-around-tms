import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: { params: Promise<{ driver_uuid: string }> }) {
  const params = await props.params;
  const client = supabaseAdmin;
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
