import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* ── PUT /api/ronyx/owner-operators/[id]/drivers/[driver_id] ── update driver */
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string; driver_id: string }> }
) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const body = await req.json();

  const fields = ["name","phone","cdl_number","cdl_state","cdl_class","cdl_expiration","med_card_expiration","med_card_number","truck_number","job_assignment","notes","status","address"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of fields) {
    if (f in body) update[f] = body[f] ?? null;
  }

  // Strip-and-retry: if a column doesn't exist yet (e.g. address before its migration
  // lands), drop just that field and save the rest — never 500 the whole save.
  async function trySave(payload: Record<string, unknown>): Promise<{ data: any; error: any }> {
    const res = await sb.from("ronyx_oo_drivers").update(payload).eq("id", params.driver_id).eq("oo_id", params.id).select("*").single();
    if (res.error) {
      const m = res.error.message?.match(/Could not find the '(.+?)' column/) || res.error.message?.match(/column "(.+?)" of relation/);
      if (m && m[1] in payload && m[1] !== "name") { const p = { ...payload }; delete p[m[1]]; return trySave(p); }
    }
    return res;
  }
  const { data, error } = await trySave(update);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver: data });
}

/* ── DELETE /api/ronyx/owner-operators/[id]/drivers/[driver_id] ── remove driver */
export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string; driver_id: string }> }
) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const { error } = await sb.from("ronyx_oo_drivers").delete().eq("id", params.driver_id).eq("oo_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
