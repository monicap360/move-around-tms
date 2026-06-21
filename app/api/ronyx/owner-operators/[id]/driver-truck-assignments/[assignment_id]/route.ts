import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* DELETE — remove a driver-truck assignment */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; assignment_id: string } }
) {
  const sb = supabaseAdmin;
  const { error } = await sb
    .from("ronyx_driver_truck_assignments")
    .delete()
    .eq("id", params.assignment_id)
    .eq("oo_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* PATCH — update assignment (e.g., change priority or manager approval) */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; assignment_id: string } }
) {
  const sb   = supabaseAdmin;
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_driver_truck_assignments")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.assignment_id)
    .eq("oo_id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}
