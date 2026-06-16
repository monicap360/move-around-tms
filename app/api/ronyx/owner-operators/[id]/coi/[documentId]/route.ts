import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COI_LABEL: Record<string,string> = {
  "auto_liability_coi":                     "Auto Liability COI",
  "general_liability_coi":                  "General Liability COI",
  "cargo_coi":                              "Cargo / Motor Truck Cargo COI",
  "ronyx_contractor_auto_liability_coi":    "Ronyx Contractor Auto Liability COI",
  "ronyx_contractor_general_liability_coi": "Ronyx Contractor General Liability COI",
  "ronyx_contractor_cargo_coi":             "Ronyx Contractor Cargo COI",
  "ma_morrison_auto_liability_coi":         "MA Morrison Auto Liability COI",
  "ma_morrison_general_liability_coi":      "MA Morrison General Liability COI",
  "ma_morrison_cargo_coi":                  "MA Morrison Cargo COI",
};

/* PATCH — update a COI document (approve, reject, update dates, etc.) */
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
    // Update dispatch/settlement flags
    const newStatus = (patch.status as string) || body.status;
    patch.dispatch_blocked = newStatus === "expired" || newStatus === "missing";
    patch.settlement_hold  = newStatus === "expired" || newStatus === "missing";
  }

  if (body.review_status === "approved") {
    patch.reviewed_at      = new Date().toISOString();
    patch.dispatch_blocked = false;
    patch.settlement_hold  = false;
    if (!patch.status) patch.status = "complete";
  }
  if (body.review_status === "rejected") {
    patch.dispatch_blocked = true;
    if (!patch.status) patch.status = "rejected";
  }

  const { data, error } = await sb
    .from("ronyx_oo_coi_documents")
    .update(patch)
    .eq("id", params.documentId)
    .eq("oo_id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create/close staff tasks based on new status
  if (data.status === "complete") {
    await sb.from("ronyx_staff_tasks")
      .update({ status:"completed", completed_at:new Date().toISOString(), completion_notes:"COI approved — auto-closed", updated_at:new Date().toISOString() })
      .eq("owner_operator_id", params.id)
      .eq("document_type", data.document_type)
      .in("task_type", ["coi_missing","coi_expired","coi_expiring_7d","coi_expiring_30d","coi_needs_review","coi_rejected"])
      .eq("status", "open");
  } else if (data.status === "rejected") {
    // Close needs_review task, open rejected task
    await sb.from("ronyx_staff_tasks")
      .update({ status:"cancelled", updated_at:new Date().toISOString() })
      .eq("owner_operator_id", params.id)
      .eq("document_type", data.document_type)
      .eq("task_type", "coi_needs_review")
      .eq("status", "open");

    // Fetch OO name
    const { data: oo } = await sb.from("ronyx_owner_operators").select("company_name").eq("id", params.id).single();
    const ooName = oo?.company_name || params.id;

    // Create rejected task (ignore if duplicate)
    await sb.from("ronyx_staff_tasks").insert({
      task_type:           "coi_rejected",
      title:               `Rejected COI: ${COI_LABEL[data.document_type] || data.document_type} — ${ooName}`,
      priority:            "high",
      status:              "open",
      assigned_to_name:    "Sylvia",
      owner_operator_id:   params.id,
      owner_operator_name: ooName,
      document_type:       data.document_type,
      coi_document_id:     data.id,
      due_date:            new Date().toISOString().split("T")[0],
      description:         `COI was rejected. Please request a new certificate from the owner operator.`,
    }).select("id").maybeSingle();
  }

  // Audit log
  const auditAction =
    body.review_status === "approved" ? "review_approved" :
    body.review_status === "rejected" ? "review_rejected" :
    body.expiration_date              ? "dates_updated"   : "status_change";

  await sb.from("ronyx_oo_coi_audit").insert({
    oo_id:           params.id,
    coi_document_id: params.documentId,
    action:          auditAction,
    old_status:      null,
    new_status:      data.status,
    note:            body.review_status
      ? `${body.review_status === "approved" ? "Approved" : "Rejected"} by ${body.updated_by || "staff"}.`
      : body.expiration_date ? `Expiration updated to ${body.expiration_date}.` : "Status updated.",
    created_by: body.updated_by || null,
  });

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
