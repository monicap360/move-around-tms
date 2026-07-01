import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Founding-100 progress: how many of the 100 half-off founding spots are claimed.
const TOTAL = 100;

export async function GET() {
  let claimed = 0;
  try {
    const { count } = await supabaseAdmin
      .from("trial_signups")
      .select("id", { count: "exact", head: true })
      .eq("founding", true);
    claimed = count || 0;
  } catch { /* table not migrated yet — treat as 0 claimed */ }
  return NextResponse.json({ total: TOTAL, claimed, remaining: Math.max(0, TOTAL - claimed) });
}
