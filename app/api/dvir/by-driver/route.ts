import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const driver_uuid = searchParams.get("driver_uuid");
  if (!driver_uuid) return NextResponse.json([], { status: 200 });
  const { data, error } = await supabase
    .from("dvir")
    .select("*")
    .eq("driver_uuid", driver_uuid)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}
