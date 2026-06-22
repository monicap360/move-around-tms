import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = supabaseAdmin;
  const { data, error } = await supabase.from("tickets").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ ticket: data });
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  const allowed: Record<string, boolean> = {
    status: true, priority: true, assigned_to: true, due_date: true,
    payroll_status: true, payroll_hold_reason: true, estimated_driver_pay: true,
    related_payroll_item_id: true, resolution_notes: true, resolved_at: true,
    description: true, title: true, impact: true,
  };

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allowed[k]) updates[k] = v;
  }

  if (body.status === "resolved" && !body.resolved_at) {
    updates.resolved_at = new Date().toISOString();
  }

  const { data, error } = await supabase.from("tickets").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = supabaseAdmin;
  const { error } = await supabase.from("tickets").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
