import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/owner-operators/from-driver
// Promote a DRIVER into their own owner-operator company (e.g. they got their own
// authority). Creates the OO from the driver and removes the driver record.
// Body: { driver_id }
export async function POST(req: Request) {
  const sb = supabaseAdmin;

  let driver_id: string | undefined;
  try { ({ driver_id } = await req.json()); } catch {}
  if (!driver_id) return NextResponse.json({ error: "driver_id is required" }, { status: 400 });

  const { data: drv } = await sb.from("ronyx_oo_drivers")
    .select("name, phone, oo_id, cdl_number").eq("id", driver_id).single();
  if (!drv) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  // Inherit the organization from the driver's current parent company.
  const { data: parent } = await sb.from("ronyx_owner_operators")
    .select("organization_id").eq("id", drv.oo_id).single();

  const { data: newOO, error } = await sb.from("ronyx_owner_operators")
    .insert({
      organization_id: parent?.organization_id || null,
      company_name:    drv.name,
      contact_name:    drv.name,
      contact_phone:   drv.phone || null,
      status:          "active",
    })
    .select("id, company_name").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("ronyx_oo_drivers").delete().eq("id", driver_id);
  return NextResponse.json({ ok: true, oo_id: newOO.id, company_name: newOO.company_name });
}
