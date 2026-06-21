import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* DELETE — remove a driver from a subcontractor */
export async function DELETE(_req: Request, { params }: { params: { id: string; sub_id: string; driver_id: string } }) {
  const sb = supabaseAdmin;
  const { error } = await sb
    .from("ronyx_oo_subcontractor_drivers")
    .delete()
    .eq("id", params.driver_id)
    .eq("sub_id", params.sub_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
