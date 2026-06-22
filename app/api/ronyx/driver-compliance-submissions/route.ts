import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET  — list submissions (for office review)
// PATCH — mark a submission reviewed / rejected

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? "pending_match,applied";
  const statuses = status.split(",").map(s => s.trim()).filter(Boolean);

  const { data, error } = await supabaseAdmin
    .from("ronyx_driver_compliance_submissions")
    .select("*")
    .in("status", statuses)
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data || [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, reviewed_by, review_notes } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("ronyx_driver_compliance_submissions")
    .update({
      status:       status ?? "reviewed",
      reviewed_by:  reviewed_by ?? "office",
      reviewed_at:  new Date().toISOString(),
      review_notes: review_notes ?? null,
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
