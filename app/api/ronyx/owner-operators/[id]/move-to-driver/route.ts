import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/owner-operators/[id]/move-to-driver
// Reclassify an owner-operator record that is actually a DRIVER: create a driver
// under the chosen company (target_oo_id) and remove the mis-filed OO record.
// Body: { target_oo_id }
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const sb = supabaseAdmin;

  let target_oo_id: string | undefined;
  try { ({ target_oo_id } = await req.json()); } catch {}
  if (!target_oo_id) return NextResponse.json({ error: "target_oo_id is required" }, { status: 400 });
  if (target_oo_id === id) return NextResponse.json({ error: "Choose a different company to move the driver under." }, { status: 400 });

  const { data: src } = await sb.from("ronyx_owner_operators")
    .select("company_name, contact_phone, contact_email").eq("id", id).single();
  if (!src) return NextResponse.json({ error: "Owner-operator not found" }, { status: 404 });

  // Create the driver under the target company.
  const { data: driver, error: dErr } = await sb.from("ronyx_oo_drivers")
    .insert({ oo_id: target_oo_id, name: src.company_name, phone: src.contact_phone || null, status: "active" })
    .select("id").single();
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

  // Remove the mis-filed OO record (and any empty sub-records to satisfy FKs).
  await sb.from("ronyx_oo_documents").delete().eq("oo_id", id);
  await sb.from("ronyx_oo_drivers").delete().eq("oo_id", id);
  await sb.from("ronyx_oo_trucks").delete().eq("oo_id", id);
  const { error: delErr } = await sb.from("ronyx_owner_operators").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: `Driver created but could not remove the old company: ${delErr.message}`, driver_id: driver.id }, { status: 207 });

  return NextResponse.json({ ok: true, driver_id: driver.id });
}
