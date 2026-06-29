import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Public owner-operator self-registration. Gated by its own access PIN (default 1234,
// overridable via OO_SIGNUP_PIN). Deliberately NOT under /api/ronyx so the staff PIN
// middleware doesn't block a new carrier from registering themselves.
const RONYX_ORG_ID = "871e2c51-205c-4c1a-93dc-022a237f05ad";
const SIGNUP_PIN = process.env.OO_SIGNUP_PIN || "1234";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (String(body.pin || "").trim() !== SIGNUP_PIN) {
    return NextResponse.json({ error: "Incorrect access PIN. Ask the office for the owner-operator signup PIN." }, { status: 401 });
  }
  const name = (body.company_name || "").trim();
  if (!name) return NextResponse.json({ error: "Company / owner-operator name is required." }, { status: 400 });

  // Don't create a duplicate of an existing carrier.
  const { data: existing } = await supabaseAdmin
    .from("ronyx_owner_operators")
    .select("id, company_name")
    .neq("status", "deleted")
    .ilike("company_name", name)
    .limit(1);
  if (existing && existing.length) {
    return NextResponse.json({ error: "A company with this name is already in the system. Please contact the office to update it." }, { status: 409 });
  }

  const insert: Record<string, unknown> = {
    organization_id:  RONYX_ORG_ID,
    company_name:     name,
    contact_name:     body.contact_name?.trim()     || null,
    contact_phone:    body.contact_phone?.trim()    || null,
    contact_email:    body.contact_email?.trim()    || null,
    business_address: body.business_address?.trim() || null,
    mc_number:        body.mc_number?.trim()        || null,
    dot_number:       body.dot_number?.trim()       || null,
    ein:              body.ein?.trim()              || null,
    status:           "pending", // shows in the office list flagged for review/activation
    notes:            "Self-registered via the owner-operator signup page.",
  };

  // strip-and-retry so a missing optional column never blocks a signup
  async function trySave(row: Record<string, unknown>): Promise<{ data: any; error: any }> {
    const res = await supabaseAdmin.from("ronyx_owner_operators").insert(row).select("id").single();
    if (res.error) {
      const m = res.error.message?.match(/Could not find the '(.+?)' column/) || res.error.message?.match(/column "(.+?)" of relation/);
      if (m && m[1] in row && m[1] !== "company_name" && m[1] !== "organization_id") { const r = { ...row }; delete r[m[1]]; return trySave(r); }
    }
    return res;
  }
  const { data, error } = await trySave(insert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id, company_name: name });
}
