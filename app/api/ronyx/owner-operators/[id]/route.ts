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
  // Only REAL columns of ronyx_owner_operators. "start_date" from the form maps to
  // the real column date_of_hire (handled below). "website" now has a real column.
  const fields = [
    "company_name","contact_name","contact_phone","contact_email","business_address",
    "mc_number","dot_number","ein","insurance_agent_name","insurance_agent_email",
    "insurance_agent_phone","notes","last_contact_date","status","website",
    "reminder_log","compliance_history","changes_log",
    "dispatch_blocked_override","settlement_hold_override",
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

/* ── DELETE /api/ronyx/owner-operators/[id] ── SOFT-delete OO company ──────────
   Hard DELETE used to cascade and permanently destroy every driver/truck/document
   attached to the company — staff lost real data this way. We now mark the company
   status="deleted" (hidden from the list) so nothing is ever truly gone and it can
   be restored. Pass ?hard=true only for a deliberate, irreversible purge.            */
export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  const hard = new URL(req.url).searchParams.get("hard") === "true";

  if (hard) {
    let delQ = sb.from("ronyx_owner_operators").delete().eq("id", params.id);
    if (orgId) delQ = delQ.eq("organization_id", orgId);
    const { error } = await delQ;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, purged: true });
  }

  // Soft delete — keep the row + all attached drivers/docs, just hide it.
  let q = sb.from("ronyx_owner_operators").update({ status: "deleted", updated_at: new Date().toISOString() }).eq("id", params.id);
  if (orgId) q = q.eq("organization_id", orgId);
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, soft: true });
}
