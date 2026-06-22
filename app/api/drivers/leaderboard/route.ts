import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supa = supabaseAdmin;
  const { data, error } = await supa
    .from("drivers")
    .select("*")
    .order("combined_score", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error });

  return NextResponse.json({ leaderboard: data });
}
