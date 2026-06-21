import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* ── PUT /api/ronyx/owner-operators/[id]/drivers/[driver_id] ── update driver */
export async function PUT(req: Request, { params }: { params: { id: string; driver_id: string } }) {
  const sb = supabaseAdmin;
  const body = await req.json();

  const fields = ["name","phone","cdl_number","cdl_state","cdl_expiration","med_card_expiration","med_card_number","truck_number","job_assignment","notes","status"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of fields) {
    if (f in body) update[f] = body[f] ?? null;
  }

  const { data, error } = await sb
    .from("ronyx_oo_drivers")
    .update(update)
    .eq("id", params.driver_id)
    .eq("oo_id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver: data });
}

/* ── DELETE /api/ronyx/owner-operators/[id]/drivers/[driver_id] ── remove driver */
export async function DELETE(_req: Request, { params }: { params: { id: string; driver_id: string } }) {
  const sb = supabaseAdmin;
  const { error } = await sb.from("ronyx_oo_drivers").delete().eq("id", params.driver_id).eq("oo_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
