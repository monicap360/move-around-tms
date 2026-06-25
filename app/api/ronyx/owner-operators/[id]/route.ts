import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

/* ── PUT /api/ronyx/owner-operators/[id] ── update OO fields */
export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const body = await req.json();

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  // Only REAL columns of ronyx_owner_operators. ("website" has no column;
  // "start_date" from the form maps to the real column date_of_hire — both were
  // causing the whole update to 500 with "Could not find the column".)
  const fields = [
    "company_name","contact_name","contact_phone","contact_email","business_address",
    "mc_number","dot_number","ein","insurance_agent_name","insurance_agent_email",
    "insurance_agent_phone","notes","last_contact_date","status",
    "reminder_log","compliance_history","changes_log",
  ];
  for (const f of fields) {
    if (f in body) updatePayload[f] = body[f] ?? null;
  }
  // Form sends start_date (hire date) -> real column is date_of_hire.
  if ("start_date" in body) updatePayload.date_of_hire = body.start_date ?? null;

  const { data, error } = await sb
    .from("ronyx_owner_operators")
    .update(updatePayload)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}

/* ── DELETE /api/ronyx/owner-operators/[id] ── delete OO company */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  let delQ = sb.from("ronyx_owner_operators").delete().eq("id", params.id);
  if (orgId) delQ = delQ.eq("organization_id", orgId);
  const { error } = await delQ;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
