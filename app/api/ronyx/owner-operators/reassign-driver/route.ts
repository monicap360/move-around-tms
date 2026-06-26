import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/owner-operators/reassign-driver
// Move a driver to a different carrier company (admin classification).
// Body: { driver_id, target_oo_id }
export async function POST(req: Request) {
  const sb = supabaseAdmin;

  let driver_id: string | undefined, target_oo_id: string | undefined;
  try { ({ driver_id, target_oo_id } = await req.json()); } catch {}
  if (!driver_id || !target_oo_id) {
    return NextResponse.json({ error: "driver_id and target_oo_id are required" }, { status: 400 });
  }

  const { error } = await sb.from("ronyx_oo_drivers")
    .update({ oo_id: target_oo_id })
    .eq("id", driver_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
