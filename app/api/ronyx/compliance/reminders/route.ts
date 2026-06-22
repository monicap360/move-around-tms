import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("compliance_reminders")
    .insert({
      work_item_id:      body.work_item_id   || null,
      entity_type:       body.entity_type    || null,
      entity_id:         body.entity_id      || null,
      recipient_name:    body.recipient_name || null,
      recipient_contact: body.recipient_contact || null,
      message:           body.message        || null,
      reminder_type:     body.reminder_type  || "manual",
      status:            "logged",
      sent_by_name:      body.sent_by_name   || "Staff",
      sent_at:           new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.work_item_id) {
    await supabase
      .from("compliance_work_items")
      .update({ last_reminder_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", body.work_item_id);
  }

  await supabase.from("ticket_audit_log").insert({
    action:      "compliance_reminder_sent",
    description: `Compliance reminder logged for ${body.recipient_name || "unknown"}`,
    metadata:    { reminder_id: data?.id, entity_type: body.entity_type, entity_id: body.entity_id, message: body.message },
  }).maybeSingle();

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function GET(req: NextRequest) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const entityId = searchParams.get("entity_id");

  let q = supabase
    .from("compliance_reminders")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(100);

  if (entityId) q = q.eq("entity_id", entityId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ reminders: [], error: error.message });
  return NextResponse.json({ reminders: data || [] });
}
