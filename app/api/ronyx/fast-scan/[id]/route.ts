import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TMS_BUCKET } from "@/lib/storage-paths";
import { syncScanToAgg, stripAndRetry } from "@/lib/fast-scan/syncToAgg";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
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
  const agg = await syncScanToAgg(sb, data);
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
