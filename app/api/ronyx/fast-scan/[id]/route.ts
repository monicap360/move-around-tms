import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TMS_BUCKET } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// Insert/update tolerant of schema drift — drop unknown columns and retry.
async function stripAndRetry(run: (p: any) => PromiseLike<{ data: any; error: any }>, payload: Record<string, any>) {
  const p: Record<string, any> = { ...payload };
  for (let i = 0; i < 25; i++) {
    const { data, error } = await run(p);
    if (!error) return { data };
    const msg = error?.message || "";
    // Strip both unknown columns AND generated columns (total_pay/total_amount/etc. are
    // computed by the DB and reject explicit values).
    const m = /Could not find the '(.+?)' column/.exec(msg) || /non-DEFAULT value into column "(.+?)"/.exec(msg);
    if (m && Object.prototype.hasOwnProperty.call(p, m[1])) { delete p[m[1]]; continue; }
    return { error };
  }
  return { error: { message: "schema drift" } };
}

// Mirror an edited scan into aggregate_tickets (the "agg portion" payroll reads), so a
// scan with driver + truck + amount (+ signature) becomes payroll-ready. Keyed by ticket #.
async function syncToAgg(sb: any, scan: any): Promise<{ synced: boolean; reason?: string }> {
  const orgId = scan.organization_id;
  const ticketNo = String(scan.ticket_number || "").trim();
  if (!ticketNo) return { synced: false, reason: "no ticket number — add one to make it payroll-ready" };

  const amount = scan.amount != null ? num(scan.amount) : (num(scan.quantity) * num(scan.rate) || null);
  const payload: Record<string, any> = {
    organization_id: orgId,
    ticket_number: ticketNo,
    ticket_date: scan.ticket_date || null,
    driver_name: scan.driver_name || null,
    driver_id: scan.driver_id || null,
    truck_number: scan.truck_number || null,
    material: scan.material || null,
    customer_name: scan.customer_name || null,
    quantity: num(scan.quantity) || null,
    pay_rate: num(scan.rate) || null,
    bill_rate: num(scan.rate) || null,
    amount,
    total_pay: amount,
    total_amount: amount,
    signature_present: !!scan.has_driver_signature,
    has_signature: !!scan.has_driver_signature,
    status: "approved",
    source: "fast_scan",
    scan_source: "fast_scan",
    updated_at: new Date().toISOString(),
  };

  let existingId: string | null = null;
  if (orgId) {
    const { data } = await sb.from("aggregate_tickets").select("id").eq("ticket_number", ticketNo).eq("organization_id", orgId).maybeSingle();
    existingId = data?.id || null;
  }
  const { error } = existingId
    ? await stripAndRetry((p) => sb.from("aggregate_tickets").update(p).eq("id", existingId).select("id").single(), payload)
    : await stripAndRetry((p) => sb.from("aggregate_tickets").insert(p).select("id").single(), payload);
  return { synced: !error, reason: error?.message };
}

// GET /api/ronyx/fast-scan/[id] — return signed URL for the scan's stored file
export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = adminClient();

  const { data: doc, error } = await sb
    .from("fast_scan_documents")
    .select("object_path, original_filename")
    .eq("id", params.id)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!doc.object_path) {
    return NextResponse.json({ error: "No file stored for this record" }, { status: 404 });
  }

  const { data: signed, error: signErr } = await sb.storage
    .from(TMS_BUCKET)
    .createSignedUrl(doc.object_path, 3600);

  if (signErr || !signed) {
    return NextResponse.json({ error: signErr?.message || "Failed to generate signed URL" }, { status: 500 });
  }

  return NextResponse.json({ signed_url: signed.signedUrl, filename: doc.original_filename });
}

// PATCH /api/ronyx/fast-scan/[id] — update editable fields on a scan record, then mirror
// it into aggregate_tickets so the scan is ready for driver payroll.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = adminClient();
  const body = await req.json().catch(() => ({}));

  const allowed = [
    "ticket_number", "truck_number", "driver_name", "amount", "quantity", "rate",
    "has_driver_signature", "ticket_date", "material", "customer_name",
    "notes", "scan_status", "review_status", "payroll_status", "billing_status",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key] ?? null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await stripAndRetry(
    (p) => sb.from("fast_scan_documents").update(p).eq("id", params.id).select("*").single(),
    update,
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bridge to the agg ticket payroll reads (best-effort; never blocks the save).
  const agg = await syncToAgg(sb, data);
  return NextResponse.json({ document: data, agg_synced: agg.synced, agg_reason: agg.reason });
}

// DELETE /api/ronyx/fast-scan/[id] — permanently remove a scan record
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const sb = adminClient();

  const { error } = await sb
    .from("fast_scan_documents")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
