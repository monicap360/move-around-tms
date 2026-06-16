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

function dayOffset(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}

async function syncTaskForDoc(
  sb: ReturnType<typeof createSupabaseServerClient>,
  ooId: string, ooName: string,
  doc: { id: string; document_type: string; status: string; expiration_date?: string | null; coi_group?: string }
) {
  const { status, document_type, id: docId } = doc;
  const days = doc.expiration_date
    ? Math.ceil((new Date(doc.expiration_date).getTime() - Date.now()) / 86400000)
    : null;
  const label = COI_LABEL[document_type] || document_type;

  if (status === "complete") {
    // Close any open COI tasks for this document
    await sb.from("ronyx_staff_tasks")
      .update({ status:"completed", completed_at:new Date().toISOString(), completion_notes:"COI approved and complete", updated_at:new Date().toISOString() })
      .eq("owner_operator_id", ooId)
      .eq("document_type", document_type)
      .in("task_type", ["coi_missing","coi_expired","coi_expiring_7d","coi_expiring_30d","coi_needs_review","coi_rejected"])
      .eq("status", "open");
    return;
  }

  let taskType: string;
  let title:    string;
  let priority: string;
  let dueDate:  string;

  switch (status) {
    case "missing":
      taskType = "coi_missing";
      title    = `Missing ${label} — ${ooName}`;
      priority = doc.coi_group === "standard" ? "critical" : "high";
      dueDate  = dayOffset(0);
      break;
    case "expired":
      taskType = "coi_expired";
      title    = `EXPIRED: ${label} — ${ooName}`;
      priority = doc.coi_group === "standard" ? "critical" : "high";
      dueDate  = dayOffset(-1);
      break;
    case "rejected":
      taskType = "coi_rejected";
      title    = `Rejected COI: ${label} — ${ooName}`;
      priority = "high";
      dueDate  = dayOffset(0);
      break;
    case "expiring_soon":
      taskType = days !== null && days <= 7 ? "coi_expiring_7d" : "coi_expiring_30d";
      title    = `${label} expiring in ${days}d — ${ooName}`;
      priority = days !== null && days <= 7 ? "critical" : "high";
      dueDate  = dayOffset(days !== null && days <= 7 ? 0 : 7);
      break;
    case "needs_review":
      taskType = "coi_needs_review";
      title    = `Review uploaded ${label} — ${ooName}`;
      priority = "normal";
      dueDate  = dayOffset(1);
      break;
    default:
      return;
  }

  // Check for existing open task (dedup)
  const { data: existing } = await sb
    .from("ronyx_staff_tasks")
    .select("id, priority")
    .eq("owner_operator_id", ooId)
    .eq("document_type", document_type)
    .eq("task_type", taskType)
    .eq("status", "open")
    .maybeSingle();

  if (existing) {
    // Upgrade priority if new is higher
    const rank: Record<string,number> = { critical:4, high:3, normal:2, low:1 };
    if ((rank[priority]||3) > (rank[existing.priority]||3)) {
      await sb.from("ronyx_staff_tasks").update({ priority, updated_at:new Date().toISOString() }).eq("id", existing.id);
    }
    return;
  }

  await sb.from("ronyx_staff_tasks").insert({
    task_type:           taskType,
    title,
    priority,
    status:              "open",
    assigned_to_name:    "CCB",
    owner_operator_id:   ooId,
    owner_operator_name: ooName,
    document_type,
    coi_document_id:     docId,
    due_date:            dueDate,
    description:         `Auto-created. OO: ${ooName}. COI: ${label}. Status: ${status}.`,
    source_type:         "oo",
    source_label:        `OO: ${ooName}`,
    entity_type:         "oo",
    entity_id:           ooId,
  }).select("id").maybeSingle(); // ignore unique conflict silently
}

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
    if (days < 0)        status = "expired";
    else if (days <= 30) status = "expiring_soon";
    else                 status = "complete";
  }

  // Fetch OO name for task titles
  const { data: oo } = await sb
    .from("ronyx_owner_operators")
    .select("company_name")
    .eq("id", params.id)
    .single();
  const ooName = oo?.company_name || params.id;

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
      dispatch_blocked:    status === "expired" || status === "missing",
      settlement_hold:     status === "expired" || status === "missing",
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

  // Auto-create/close staff task based on new status
  await syncTaskForDoc(sb, params.id, ooName, { ...data, coi_group: body.coi_group });

  // Audit log
  await sb.from("ronyx_oo_coi_audit").insert({
    oo_id: params.id, coi_document_id: data.id,
    action: "upload", new_status: status,
    note: `Uploaded by ${body.uploaded_by || "staff"}. Provider: ${body.insurance_provider || "unknown"}.`,
    created_by: body.uploaded_by || null,
  });

  return NextResponse.json({ coi: data });
}
