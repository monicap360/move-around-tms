import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST — start a new scan batch
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));

  const { batch_name, scanner_used, uploaded_by, notes } = body;

  const { data, error } = await supabase
    .from("scan_batches")
    .insert({
      batch_name:   batch_name || `Batch ${new Date().toLocaleDateString("en-US")}`,
      scanner_used: scanner_used || "ricoh_fi8170",
      uploaded_by:  uploaded_by || null,
      notes:        notes || null,
      status:       "in_progress",
      started_at:   new Date().toISOString(),
    })
    .select("id, batch_name, scanner_used, started_at, status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await supabase.from("ticket_audit_log").insert({
    action:      "scan_batch_created",
    description: `Scan batch started: ${data.batch_name} using ${scanner_used || "Ricoh fi-8170"}`,
    metadata:    { batch_id: data.id, scanner_used, uploaded_by },
  }).maybeSingle();

  return NextResponse.json({ batch: data }, { status: 201 });
}

// PATCH — update batch counters or end batch
export async function PATCH(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));
  const { batch_id, ...updates } = body;

  if (!batch_id) return NextResponse.json({ error: "batch_id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.status             != null) patch.status             = updates.status;
  if (updates.ended_at           != null) patch.ended_at           = updates.ended_at;
  if (updates.ticket_count       != null) patch.ticket_count       = updates.ticket_count;
  if (updates.ocr_complete_count != null) patch.ocr_complete_count = updates.ocr_complete_count;
  if (updates.exceptions_count   != null) patch.exceptions_count   = updates.exceptions_count;
  if (updates.duplicate_count    != null) patch.duplicate_count    = updates.duplicate_count;
  if (updates.payroll_holds      != null) patch.payroll_holds      = updates.payroll_holds;
  if (updates.billing_holds      != null) patch.billing_holds      = updates.billing_holds;
  if (updates.page_count         != null) patch.page_count         = updates.page_count;
  if (updates.notes              != null) patch.notes              = updates.notes;

  const { data, error } = await supabase
    .from("scan_batches")
    .update(patch)
    .eq("id", batch_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (updates.status === "completed") {
    await supabase.from("ticket_audit_log").insert({
      action:      "scan_batch_completed",
      description: `Scan batch completed: ${data.batch_name} — ${data.ticket_count} tickets, ${data.exceptions_count} exceptions`,
      metadata:    { batch_id, ticket_count: data.ticket_count, exceptions_count: data.exceptions_count },
    }).maybeSingle();
  }

  return NextResponse.json({ batch: data });
}

// GET — fetch batch(es)
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("id");

  if (batchId) {
    const { data, error } = await supabase
      .from("scan_batches")
      .select("*")
      .eq("id", batchId)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ batch: data });
  }

  // Return recent batches
  const { data, error } = await supabase
    .from("scan_batches")
    .select("id, batch_name, scanner_used, status, started_at, ended_at, ticket_count, exceptions_count, page_count")
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ batches: data || [] });
}
