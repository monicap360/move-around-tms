import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* GET — all COI docs for an OO */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("ronyx_oo_coi_documents")
    .select("*")
    .eq("oo_id", params.id)
    .order("coi_group")
    .order("document_type");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cois: data || [] });
}

/* POST — create or upsert a COI document record */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  if (!body.coi_group || !body.document_type) {
    return NextResponse.json({ error: "coi_group and document_type required" }, { status: 400 });
  }

  // Auto-compute status from expiration_date
  let status = body.status || "needs_review";
  if (body.expiration_date) {
    const days = Math.ceil((new Date(body.expiration_date).getTime() - Date.now()) / 86400000);
    if (days < 0)   status = "expired";
    else if (days <= 30) status = "expiring_soon";
    else status = "complete";
  }

  const { data, error } = await sb
    .from("ronyx_oo_coi_documents")
    .upsert({
      oo_id:               params.id,
      coi_group:           body.coi_group,
      document_type:       body.document_type,
      insurance_provider:  body.insurance_provider  || null,
      policy_number:       body.policy_number        || null,
      effective_date:      body.effective_date        || null,
      expiration_date:     body.expiration_date       || null,
      file_name:           body.file_name             || null,
      file_url:            body.file_url              || null,
      storage_path:        body.storage_path          || null,
      status,
      review_status:       body.review_status || "not_reviewed",
      dispatch_blocked:    body.dispatch_blocked ?? false,
      settlement_hold:     body.settlement_hold ?? false,
      customer_requirement: body.customer_requirement || null,
      project_requirement:  body.project_requirement  || null,
      uploaded_by:         body.uploaded_by || null,
      uploaded_at:         new Date().toISOString(),
      notes:               body.notes || null,
      updated_at:          new Date().toISOString(),
    }, { onConflict: "oo_id,document_type" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await sb.from("ronyx_oo_coi_audit").insert({
    oo_id: params.id, coi_document_id: data.id,
    action: "upload", new_status: status,
    created_by: body.uploaded_by || null,
  });

  return NextResponse.json({ coi: data });
}
