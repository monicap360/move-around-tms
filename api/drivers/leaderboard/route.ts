import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  const { data, error } = await supa
    .from("drivers")
    .select("*")
    .order("combined_score", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error });

  return NextResponse.json({ leaderboard: data });
}
