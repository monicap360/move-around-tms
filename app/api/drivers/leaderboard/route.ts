import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supa = createSupabaseServerClient();
  const { data, error } = await supa
    .from("drivers")
    .select("*")
    .order("combined_score", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error });

  return NextResponse.json({ leaderboard: data });
}
