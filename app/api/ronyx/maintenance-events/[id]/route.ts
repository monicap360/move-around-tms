import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* PATCH — update maintenance event (change status, resolve, etc.) */
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const body = await req.json();

  const patch: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };

  if (body.status === "resolved" && !body.resolved_at) {
    patch.resolved_at      = new Date().toISOString();
    patch.actual_return_at = new Date().toISOString();
  }

  const { data, error } = await sb
    .from("ronyx_maintenance_events")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If resolving, restore truck status to active
  if (body.status === "resolved" && data?.truck_id) {
    await sb
      .from("ronyx_oo_trucks")
      .update({ status: "active" })
      .eq("id", data.truck_id);
  }

  return NextResponse.json({ event: data });
}

/* GET — single event */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from("ronyx_maintenance_events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}
