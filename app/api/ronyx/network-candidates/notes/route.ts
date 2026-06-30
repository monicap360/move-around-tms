import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// GET ?candidate_id= — the conversation / note log for one candidate.
export async function GET(req: NextRequest) {
  try {
    await resolveOrgId();
    const id = new URL(req.url).searchParams.get("candidate_id");
    if (!id) return NextResponse.json({ notes: [] });
    const { data, error } = await supabaseAdmin.from("network_candidate_notes").select("*").eq("candidate_id", id).order("created_at", { ascending: false }).limit(200);
    if (error) return NextResponse.json({ notes: [] });
    return NextResponse.json({ notes: data || [] });
  } catch (e: any) { return NextResponse.json({ notes: [], error: e?.message }); }
}
