import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const SIGNUP_NOTIFY = "admin@ronyxlogistics.com";

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

  // Capture the insurance section. Agent fields go to real columns; coverage/VIN/ack are folded
  // into notes so they're preserved even if those columns don't exist.
  const insDetails = [
    body.gl_amount ? `GL ${body.gl_amount}` : "",
    body.al_amount ? `AL ${body.al_amount}` : "",
    body.insurance_expiration ? `expires ${body.insurance_expiration}` : "",
    body.truck_vins ? `VIN(s): ${String(body.truck_vins).replace(/\s*\n\s*/g, ", ").trim()}` : "",
  ].filter(Boolean).join(" · ");
  const ackLine = body.ack ? " ACKNOWLEDGED insurance requirements (4 certificate holders as Additional Insured + Waiver of Subrogation; GL/AL $1M; VIN on AL cert)." : "";
  const notes = `Self-registered via the owner-operator signup page.${ackLine}${insDetails ? " Insurance: " + insDetails + "." : ""}`;

  // Assign an in-house account number (RNX-####) so every OO — including self-signups — is
  // uniquely identifiable (e.g. to pick which record to keep if a duplicate ever appears).
  let inHouseAcct: string;
  {
    const { data: top } = await supabaseAdmin.from("ronyx_owner_operators").select("in_house_account_number").like("in_house_account_number", "RNX-%").order("in_house_account_number", { ascending: false }).limit(1).maybeSingle();
    const lastNum = top?.in_house_account_number ? parseInt(String(top.in_house_account_number).replace(/\D/g, ""), 10) : 1000;
    inHouseAcct = `RNX-${(isNaN(lastNum) ? 1000 : lastNum) + 1}`;
  }

  const insert: Record<string, unknown> = {
    organization_id:  RONYX_ORG_ID,
    company_name:     name,
    in_house_account_number: inHouseAcct,
    contact_name:     body.contact_name?.trim()     || null,
    contact_phone:    body.contact_phone?.trim()    || null,
    contact_email:    body.contact_email?.trim()    || null,
    business_address: body.business_address?.trim() || null,
    mc_number:        body.mc_number?.trim()        || null,
    dot_number:       body.dot_number?.trim()       || null,
    ein:              body.ein?.trim()              || null,
    insurance_agent_name:  body.insurance_agent_name?.trim()  || null,
    insurance_agent_email: body.insurance_agent_email?.trim() || null,
    insurance_agent_phone: body.insurance_agent_phone?.trim() || null,
    status:           "pending", // shows in the office list flagged for review/activation
    notes,
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

  // Notify the office (fire-and-forget — never blocks the signup).
  sendEmail({
    to: SIGNUP_NOTIFY,
    subject: `New Owner-Operator sign-up: ${name}`,
    text: `A new owner-operator self-registered.\n\nCompany: ${name}\nAccount #: ${inHouseAcct}\nContact: ${body.contact_name || "—"} · ${body.contact_phone || "—"} · ${body.contact_email || "—"}\nMC: ${body.mc_number || "—"} · DOT: ${body.dot_number || "—"}\nInsurance agent: ${body.insurance_agent_name || "—"} · ${body.insurance_agent_email || "—"}\n\nReview & activate in Owner Operators: /ronyx/owner-operators`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;color:#0f172a"><p><strong>New Owner-Operator sign-up</strong> — pending review.</p><p><strong>${name}</strong> · Account # <strong>${inHouseAcct}</strong></p><p>Contact: ${body.contact_name || "—"} · ${body.contact_phone || "—"} · ${body.contact_email || "—"}<br/>MC: ${body.mc_number || "—"} · DOT: ${body.dot_number || "—"}<br/>Insurance agent: ${body.insurance_agent_name || "—"} · ${body.insurance_agent_email || "—"}</p><p>Review &amp; activate in <strong>Owner Operators</strong>.</p></div>`,
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, id: data.id, company_name: name, in_house_account_number: inHouseAcct });
}
