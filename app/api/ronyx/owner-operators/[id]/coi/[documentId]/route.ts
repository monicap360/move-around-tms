import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* PATCH — update a COI document (approve, reject, mark reviewed, update dates, etc.) */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  // Recompute status if expiration_date changes
  const patch: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };
  if (body.expiration_date) {
    const days = Math.ceil((new Date(body.expiration_date).getTime() - Date.now()) / 86400000);
    if (!body.status) {
      patch.status = days < 0 ? "expired" : days <= 30 ? "expiring_soon" : "complete";
    }
  }

  if (body.review_status === "approved") patch.reviewed_at = new Date().toISOString();

  const { data, error } = await sb
    .from("ronyx_oo_coi_documents")
    .update(patch)
    .eq("id", params.documentId)
    .eq("oo_id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  if (body.review_status || body.status) {
    await sb.from("ronyx_oo_coi_audit").insert({
      oo_id: params.id, coi_document_id: params.documentId,
      action: body.review_status ? `review_${body.review_status}` : "status_change",
      old_status: null, new_status: data.status,
      created_by: body.updated_by || null,
    });
  }

  return NextResponse.json({ coi: data });
}

/* GET — single COI document */
export async function GET(
  _req: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("ronyx_oo_coi_documents")
    .select("*")
    .eq("id", params.documentId)
    .eq("oo_id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coi: data });
}

/* DELETE */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; documentId: string } }
) {
  const sb = createSupabaseServerClient();
  const { error } = await sb
    .from("ronyx_oo_coi_documents")
    .delete()
    .eq("id", params.documentId)
    .eq("oo_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
