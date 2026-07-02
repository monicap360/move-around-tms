import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// MoveAround HQ — 7-day free-trial signups from the marketing site (trial_signups).
export async function GET() {
  const { data, error } = await supabaseAdmin.from("trial_signups").select("*").order("created_at", { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ signups: [], error: error.message });
  return NextResponse.json({ signups: data || [] });
}

// PATCH — move a signup through the trial pipeline (new → contacted → provisioned → active → lost).
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.status) patch.status = b.status;
  const { data, error } = await supabaseAdmin.from("trial_signups").update(patch).eq("id", b.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, signup: data });
}
