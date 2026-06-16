import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* DELETE /api/ronyx/owner-operators/[id]/subcontractors/[sub_id] */
export async function DELETE(_req: Request, { params }: { params: { id: string; sub_id: string } }) {
  const sb = createSupabaseServerClient();
  // Cascade delete also removes drivers via FK
  const { error } = await sb
    .from("ronyx_oo_subcontractors")
    .delete()
    .eq("id", params.sub_id)
    .eq("oo_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
