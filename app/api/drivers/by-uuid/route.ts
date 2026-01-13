import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const driver_uuid = searchParams.get("driver_uuid");
  if (!driver_uuid)
    return NextResponse.json({ error: "Missing driver_uuid" }, { status: 400 });
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("driver_uuid", driver_uuid)
    .single();
  if (error || !data)
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  return NextResponse.json(data);
}
