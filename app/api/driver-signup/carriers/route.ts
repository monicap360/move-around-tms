import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Carrier names for the driver-signup dropdown. PIN-gated (same driver signup PIN) so the
// full carrier list isn't scrapeable publicly. Returns names only.
const SIGNUP_PIN = process.env.DRIVER_SIGNUP_PIN || "1234";

export async function GET(req: Request) {
  const pin = (new URL(req.url).searchParams.get("pin") || "").trim();
  if (pin !== SIGNUP_PIN) return NextResponse.json({ carriers: [] }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("ronyx_owner_operators")
    .select("company_name")
    .neq("status", "deleted")
    .order("company_name", { ascending: true });

  const carriers = Array.from(new Set((data || []).map((o: any) => o.company_name).filter(Boolean)));
  return NextResponse.json({ carriers });
}
