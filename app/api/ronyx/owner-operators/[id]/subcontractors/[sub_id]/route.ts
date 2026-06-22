import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* DELETE /api/ronyx/owner-operators/[id]/subcontractors/[sub_id] */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string; sub_id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  // Cascade delete also removes drivers via FK
  const { error } = await sb
    .from("ronyx_oo_subcontractors")
    .delete()
    .eq("id", params.sub_id)
    .eq("oo_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
