import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* ── GET — list inspections for an OO ─────────────────────────────────────── */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { data, error } = await supabaseAdmin
    .from("ronyx_oo_truck_inspections")
    .select("*")
    .eq("oo_id", params.id)
    .order("inspection_date", { ascending: false });
  // Table may not exist yet (migration pending) — never 500 the page over it.
  if (error) return NextResponse.json({ inspections: [] });
  return NextResponse.json({ inspections: data || [] });
}

/* ── POST — add an inspection record ──────────────────────────────────────── */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await req.json();

  const row: Record<string, unknown> = {
    oo_id:           params.id,
    truck_id:        body.truck_id        || null,
    truck_number:    body.truck_number    || null,
    inspection_type: body.inspection_type || null,
    inspection_date: body.inspection_date || null,
    expires_on:      body.expires_on      || null,
    result:          body.result          || null,
    inspector:       body.inspector       || null,
    notes:           body.notes           || null,
    file_name:       body.file_name       || null,
    file_url:        body.file_url         || null,
  };

  const { data, error } = await supabaseAdmin
    .from("ronyx_oo_truck_inspections")
    .insert(row)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inspection: data });
}

/* ── DELETE — remove an inspection (by ?inspection_id=) ───────────────────── */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const inspectionId = new URL(req.url).searchParams.get("inspection_id");
  if (!inspectionId) return NextResponse.json({ error: "Missing inspection_id" }, { status: 400 });
  const { error } = await supabaseAdmin
    .from("ronyx_oo_truck_inspections")
    .delete()
    .eq("id", inspectionId)
    .eq("oo_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
