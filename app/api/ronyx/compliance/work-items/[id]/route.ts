import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));
  const { id } = params;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status !== undefined)               update.status               = body.status;
  if (body.priority !== undefined)             update.priority             = body.priority;
  if (body.assigned_to !== undefined)          update.assigned_to          = body.assigned_to;
  if (body.assigned_to_name !== undefined)     update.assigned_to_name     = body.assigned_to_name;
  if (body.assigned_at !== undefined)          update.assigned_at          = body.assigned_at;
  if (body.snoozed_until !== undefined)        update.snoozed_until        = body.snoozed_until;
  if (body.owner_review_required !== undefined) update.owner_review_required = body.owner_review_required;
  if (body.last_reminder_at !== undefined)     update.last_reminder_at     = body.last_reminder_at;
  if (body.notes !== undefined)                update.notes                = body.notes;
  if (body.resolved_at !== undefined)          update.resolved_at          = body.resolved_at;
  if (body.resolved_by_name !== undefined)     update.resolved_by_name     = body.resolved_by_name;

  const { error } = await supabase
    .from("compliance_work_items")
    .update(update)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("ticket_audit_log").insert({
    action:      `compliance_work_item_${body.status || "updated"}`,
    description: `Work item ${id} updated: ${body.status || JSON.stringify(update)}`,
    metadata:    { work_item_id: id, ...update },
  }).maybeSingle();

  return NextResponse.json({ ok: true });
}
