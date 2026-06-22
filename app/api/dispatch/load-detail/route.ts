import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const load_id = searchParams.get("load_id");
  if (!load_id)
    return NextResponse.json({ error: "Missing load_id" }, { status: 400 });
  const { data, error } = await supabase
    .from("loads")
    .select("*")
    .eq("id", load_id)
    .single();
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json(data);
}
