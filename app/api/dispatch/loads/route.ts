import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase.from("loads").select("*");
  if (error) return NextResponse.json([], { status: 200 });
  return NextResponse.json(data);
}
