import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Public driver self-registration. Gated by its own access PIN (default 1234, overridable
// via DRIVER_SIGNUP_PIN). NOT under /api/ronyx so the staff PIN middleware doesn't block it.
const RONYX_ORG_ID = "871e2c51-205c-4c1a-93dc-022a237f05ad";
const SIGNUP_PIN = process.env.DRIVER_SIGNUP_PIN || "1234";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (String(body.pin || "").trim() !== SIGNUP_PIN) {
    return NextResponse.json({ error: "Incorrect access PIN. Ask the office for the driver signup PIN." }, { status: 401 });
  }
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Driver name is required." }, { status: 400 });
  const carrier = (body.company_name || "").trim();
  if (!carrier) return NextResponse.json({ error: "Your trucking company / carrier name is required." }, { status: 400 });

  // Link the driver to their carrier: find the OO by name, or create a pending one.
  let ooId: string | null = null;
  const { data: oo } = await supabaseAdmin
    .from("ronyx_owner_operators")
    .select("id")
    .neq("status", "deleted")
    .ilike("company_name", carrier)
    .limit(1);
  if (oo && oo.length) {
    ooId = oo[0].id;
  } else {
    const { data: created } = await supabaseAdmin
      .from("ronyx_owner_operators")
      .insert({ organization_id: RONYX_ORG_ID, company_name: carrier, status: "pending", notes: "Auto-created from a driver self-signup." })
      .select("id")
      .single();
    ooId = created?.id || null;
  }
  if (!ooId) return NextResponse.json({ error: "Could not attach you to a carrier. Contact the office." }, { status: 500 });

  // Don't duplicate a driver already on that carrier (case-insensitive name).
  const { data: existing } = await supabaseAdmin
    .from("ronyx_oo_drivers")
    .select("id")
    .eq("oo_id", ooId)
    .ilike("name", name)
    .limit(1);
  if (existing && existing.length) {
    return NextResponse.json({ error: "A driver with this name is already on file for this carrier. Contact the office to update it." }, { status: 409 });
  }

  const insert: Record<string, unknown> = {
    oo_id:               ooId,
    name,
    phone:               body.phone?.trim()               || null,
    cdl_number:          body.cdl_number?.trim()          || null,
    cdl_state:           body.cdl_state?.trim()           || "TX",
    cdl_expiration:      body.cdl_expiration              || null,
    med_card_expiration: body.med_card_expiration         || null,
    address:             body.address?.trim()             || null,
    notes:               "Self-registered via the driver signup page.",
    status:              "active",
  };

  // strip-and-retry so a missing optional column never blocks a signup
  async function trySave(row: Record<string, unknown>): Promise<{ data: any; error: any }> {
    const res = await supabaseAdmin.from("ronyx_oo_drivers").insert(row).select("id").single();
    if (res.error) {
      const m = res.error.message?.match(/Could not find the '(.+?)' column/) || res.error.message?.match(/column "(.+?)" of relation/);
      if (m && m[1] in row && m[1] !== "name" && m[1] !== "oo_id") { const r = { ...row }; delete r[m[1]]; return trySave(r); }
    }
    return res;
  }
  const { data, error } = await trySave(insert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, name, carrier });
}
