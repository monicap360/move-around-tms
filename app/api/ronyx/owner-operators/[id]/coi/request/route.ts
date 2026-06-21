import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

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

/* POST /api/ronyx/owner-operators/[id]/coi/request
   Logs a COI request email, updates last_reminder_sent_at, increments staff task reminder count.
   Body: { coi_group, document_types: string[], sent_by?, message? }
*/
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb   = supabaseAdmin;
  const body = await req.json();

  const ooId = params.id;
  const { coi_group, document_types, sent_by, message } = body;

  if (!coi_group || !Array.isArray(document_types) || document_types.length === 0) {
    return NextResponse.json({ error: "coi_group and document_types[] required" }, { status: 400 });
  }

  // Fetch OO for email/name
  const { data: oo } = await sb
    .from("ronyx_owner_operators")
    .select("company_name, contact_name, contact_email")
    .eq("id", ooId)
    .single();

  const now = new Date().toISOString();

  // Log each request
  const requests = document_types.map(dt => ({
    oo_id:            ooId,
    coi_group,
    document_type:    dt,
    request_method:   "email",
    recipient_email:  oo?.contact_email || null,
    status:           "sent",
    message:          message || `Updated ${COI_LABEL[dt] || dt} needed for ${oo?.company_name || ooId}.`,
    sent_by:          sent_by || "Staff",
    sent_at:          now,
  }));

  const { error: reqErr } = await sb
    .from("ronyx_oo_coi_requests")
    .insert(requests);

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

  // Update last_reminder_sent_at on the COI documents
  const { error: docErr } = await sb
    .from("ronyx_oo_coi_documents")
    .update({ last_reminder_sent_at: now, updated_at: now })
    .eq("oo_id", ooId)
    .in("document_type", document_types);

  // Increment reminder_count on matching open staff tasks and update last_reminder_sent_at
  const { data: tasks } = await sb
    .from("ronyx_staff_tasks")
    .select("id, reminder_count")
    .eq("owner_operator_id", ooId)
    .in("document_type", document_types)
    .eq("status", "open");

  for (const task of tasks || []) {
    await sb.from("ronyx_staff_tasks").update({
      reminder_count:         (task.reminder_count || 0) + 1,
      last_reminder_sent_at:  now,
      updated_at:             now,
    }).eq("id", task.id);
  }

  // Audit log
  for (const dt of document_types) {
    await sb.from("ronyx_oo_coi_audit").insert({
      oo_id: ooId, action: "request_sent",
      note: `COI request sent for ${COI_LABEL[dt] || dt}. Recipient: ${oo?.contact_email || "unknown"}. Sent by: ${sent_by || "Staff"}.`,
      created_by: sent_by || "Staff",
    });
  }

  return NextResponse.json({
    ok: true,
    logged: document_types.length,
    doc_update_error: docErr?.message || null,
    email_template: {
      to:      oo?.contact_email || "",
      subject: `Updated COI Needed — ${oo?.company_name || ooId}`,
      body:    `Hi ${oo?.contact_name || oo?.company_name || "there"},\n\nWe need updated insurance documents for your file:\n\n${document_types.map(dt=>`• ${COI_LABEL[dt]||dt}`).join("\n")}\n\nPlease send the updated Certificates of Insurance as soon as possible. Dispatch and/or settlement may remain on hold until documents are received and verified.\n\nThank you.`,
    },
  });
}
