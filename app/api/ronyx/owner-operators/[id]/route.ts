import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ── PUT /api/ronyx/owner-operators/[id] ── update OO fields */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const fields = [
    "company_name","contact_name","contact_phone","contact_email","business_address",
    "mc_number","dot_number","ein","insurance_agent_name","insurance_agent_email",
    "insurance_agent_phone","notes","last_contact_date","status",
    "reminder_log","compliance_history","changes_log",
  ];
  for (const f of fields) {
    if (f in body) updatePayload[f] = body[f] ?? null;
  }

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
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("ronyx_owner_operators").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
