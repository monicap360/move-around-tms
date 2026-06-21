import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string; truck_id: string } }) {
  const sb = supabaseAdmin;
  const { error } = await sb.from("ronyx_oo_trucks").delete().eq("id", params.truck_id).eq("oo_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, { params }: { params: { id: string; truck_id: string } }) {
  const sb = supabaseAdmin;
  const body = await req.json();
  const fields = ["truck_number","year","make","model","vin","last_inspection","inspection_result","status"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of fields) { if (f in body) update[f] = body[f] ?? null; }
  const { data, error } = await sb.from("ronyx_oo_trucks").update(update).eq("id", params.truck_id).eq("oo_id", params.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ truck: data });
}
