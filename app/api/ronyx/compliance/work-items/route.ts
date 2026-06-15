import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const priority = searchParams.get("priority");
  const entity   = searchParams.get("entity_type");

  let q = supabase
    .from("compliance_work_items")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (status)   q = q.eq("status", status);
  if (priority) q = q.eq("priority", priority);
  if (entity)   q = q.eq("entity_type", entity);

  const { data, error } = await q;
  if (error) return NextResponse.json({ items: [], error: error.message });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("compliance_work_items")
    .insert({ ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("ticket_audit_log").insert({
    action:      "compliance_work_item_created",
    description: `Work item created: ${body.issue_type} for ${body.entity_name || "unknown"}`,
    metadata:    { work_item_id: data?.id, entity_type: body.entity_type, entity_name: body.entity_name },
  }).maybeSingle();

  return NextResponse.json({ ok: true, id: data?.id });
}
