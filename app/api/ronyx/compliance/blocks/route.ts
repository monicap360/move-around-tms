import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const entityId   = searchParams.get("entity_id");
  const blockType  = searchParams.get("block_type");
  const statusFilt = searchParams.get("status") || "active";

  let q = supabase
    .from("compliance_blocks")
    .select("*")
    .eq("status", statusFilt)
    .order("blocked_at", { ascending: false })
    .limit(200);

  if (entityId)  q = q.eq("entity_id", entityId);
  if (blockType) q = q.eq("block_type", blockType);

  const { data, error } = await q;
  if (error) return NextResponse.json({ blocks: [], error: error.message });
  return NextResponse.json({ blocks: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  if (!body.entity_id || !body.block_type || !body.reason) {
    return NextResponse.json({ error: "entity_id, block_type, reason required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("compliance_blocks")
    .insert({
      entity_type:    body.entity_type    || "driver",
      entity_id:      body.entity_id,
      entity_name:    body.entity_name    || null,
      block_type:     body.block_type,
      reason:         body.reason,
      issue_type:     body.issue_type     || null,
      status:         "active",
      blocked_by_name: body.blocked_by_name || "Staff",
      blocked_at:     new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update drivers table eligibility flag if driver block
  if (body.entity_type === "driver" && body.block_type === "dispatch") {
    await supabase.from("drivers").update({ dispatch_eligible: false }).eq("id", body.entity_id);
  }
  if (body.entity_type === "driver" && body.block_type === "payroll") {
    await supabase.from("drivers").update({ payroll_eligible: false }).eq("id", body.entity_id);
  }

  await supabase.from("ticket_audit_log").insert({
    action:      `compliance_block_created`,
    description: `${body.block_type} block placed on ${body.entity_name || body.entity_id}: ${body.reason}`,
    metadata:    { block_id: data?.id, entity_type: body.entity_type, entity_id: body.entity_id, block_type: body.block_type },
  }).maybeSingle();

  return NextResponse.json({ ok: true, id: data?.id });
}

export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, unknown> = {
    status:         body.override_used ? "overridden" : "cleared",
    cleared_by_name: body.cleared_by_name || "Staff",
    cleared_at:     new Date().toISOString(),
  };
  if (body.override_used)   update.override_used   = true;
  if (body.override_reason) update.override_reason = body.override_reason;
  if (body.notes)           update.notes           = body.notes;

  const { data: block, error: fetchErr } = await supabase
    .from("compliance_blocks")
    .select("entity_id, entity_name, entity_type, block_type")
    .eq("id", body.id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 404 });

  const { error } = await supabase.from("compliance_blocks").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (block?.entity_type === "driver" && block.block_type === "dispatch") {
    await supabase.from("drivers").update({ dispatch_eligible: true }).eq("id", block.entity_id);
  }
  if (block?.entity_type === "driver" && block.block_type === "payroll") {
    await supabase.from("drivers").update({ payroll_eligible: true }).eq("id", block.entity_id);
  }

  await supabase.from("ticket_audit_log").insert({
    action:      `compliance_block_cleared`,
    description: `${block?.block_type} block cleared for ${block?.entity_name || block?.entity_id}${body.override_used ? " (manager override)" : ""}`,
    metadata:    { block_id: body.id, override_used: body.override_used, reason: body.override_reason },
  }).maybeSingle();

  return NextResponse.json({ ok: true });
}
