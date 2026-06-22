import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// PATCH /api/ronyx/staff-tasks/[id]
// Body: { status, completed_by, completion_notes, priority, assigned_to_name, notes }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin;
  const body = await req.json();

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status)            patch.status            = body.status;
  if (body.completed_by)      patch.completed_by      = body.completed_by;
  if (body.completion_notes !== undefined) patch.completion_notes = body.completion_notes;
  if (body.priority)          patch.priority          = body.priority;
  if (body.assigned_to_name)  patch.assigned_to_name  = body.assigned_to_name;
  if (body.notes !== undefined) patch.notes           = body.notes;
  if (body.due_date !== undefined) patch.due_date     = body.due_date;

  // Auto-stamp completed_at when marking done
  if (body.status === "completed" || body.status === "cancelled") {
    patch.completed_at = new Date().toISOString();
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

// DELETE /api/ronyx/staff-tasks/[id]
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseAdmin;
  const { error } = await sb.from("ronyx_staff_tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
