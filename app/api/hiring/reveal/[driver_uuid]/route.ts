import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { driver_uuid: string } }) {
  const client = supabaseAdmin;
  const { driver_uuid } = params;

  const { data, error } = await client
    .from("drivers")
    .select("full_name, phone, email, rank, experience_years")
    .eq("driver_uuid", driver_uuid)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
