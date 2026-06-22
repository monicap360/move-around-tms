import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/* GET /api/ronyx/staff/tasks/[id] */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const { data, error } = await sb
    .from("ronyx_staff_tasks")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

/* PATCH /api/ronyx/staff/tasks/[id]
   Supports: status change, completion, adding notes, reminder increment, reassign.
   If completing a COI task: validates underlying COI is resolved (warns but allows manager_override).
*/
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const body = await req.json();

  // Fetch current task
  const { data: task, error: fetchErr } = await sb
    .from("ronyx_staff_tasks")
    .select("*")
    .eq("id", params.id)
    .single();

  if (fetchErr || !task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const patch: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() };

  // Completing a task — validate underlying COI if applicable
  if (body.status === "completed") {
    if (task.coi_document_id && !body.manager_override) {
      const { data: doc } = await sb
        .from("ronyx_oo_coi_documents")
        .select("status, document_type")
        .eq("id", task.coi_document_id)
        .single();

      if (doc && (doc.status === "missing" || doc.status === "expired" || doc.status === "rejected")) {
        return NextResponse.json({
          error: `Cannot complete: ${doc.document_type.replace(/_/g," ")} is still ${doc.status}. Set manager_override:true to force-close.`,
          coi_status: doc.status,
          requires_override: true,
        }, { status: 422 });
      }
    }
    patch.completed_at = new Date().toISOString();
    patch.completed_by = body.completed_by || "Staff";
    if (!patch.completion_notes) patch.completion_notes = "Marked complete by staff";
  }

  if (body.increment_reminder) {
    patch.reminder_count = (task.reminder_count || 0) + 1;
    patch.last_reminder_sent_at = new Date().toISOString();
    delete patch.increment_reminder;
  }

  const { data, error } = await sb
    .from("ronyx_staff_tasks")
    .update(patch)
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

/* DELETE /api/ronyx/staff/tasks/[id] — cancel */
export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = supabaseAdmin;
  const { error } = await sb
    .from("ronyx_staff_tasks")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
