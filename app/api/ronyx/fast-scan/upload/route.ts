import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TMS_BUCKET } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME: Record<string, boolean> = {
  "image/jpeg": true, "image/jpg": true, "image/png": true,
  "image/webp": true, "image/heic": true, "image/heif": true,
  "image/tiff": true, "image/bmp": true, "application/pdf": true,
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET /api/ronyx/fast-scan/upload — list recent fast_scan_documents
export async function GET(req: NextRequest) {
  const sb = adminClient();
  const orgId = process.env.RONYX_ORG_ID;
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30");

  try {
    let q = sb
      .from("fast_scan_documents")
      .select("id, original_filename, document_kind, scan_status, ocr_status, review_status, payroll_status, billing_status, ticket_number, truck_number, driver_name, amount, object_path, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (orgId) q = q.eq("organization_id", orgId);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ documents: data || [] });
  } catch {
    return NextResponse.json({ documents: [], note: "fast_scan_documents not yet migrated — run migration 159" });
  }
}

// POST /api/ronyx/fast-scan/upload — upload a ticket scan file
// FormData fields:
//   file           — the scan file (required)
//   scan_type      — "ticket" | "pit_invoice" | "proof" | "other" (default: "ticket")
//   ticket_number  — ticket # if already known
//   truck_number   — truck # if already known
//   driver_name    — driver name if already known
export async function POST(request: NextRequest) {
  const sb = adminClient();
  const orgId = process.env.RONYX_ORG_ID;

  if (!orgId || orgId === "00000000-0000-0000-0000-000000000000") {
    return NextResponse.json(
      { error: "RONYX_ORG_ID is not set in .env.local — run: SELECT id FROM public.organizations; and add the UUID." },
      { status: 500 }
    );
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file         = form.get("file")          as File   | null;
  const scanType     = (form.get("scan_type")    as string) || "ticket";
  const ticketNumber = form.get("ticket_number") as string | null;
  const truckNumber  = form.get("truck_number")  as string | null;
  const driverName   = form.get("driver_name")   as string | null;

  if (!file)             return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  if (!ALLOWED_MIME[file.type]) {
    return NextResponse.json({ error: `${file.type || "unknown"} not supported — use PDF, JPG, PNG, HEIC, TIFF, or WebP` }, { status: 400 });
  }

  // ── Path: {org_id}/fastscan/raw/{timestamp}_{safe_filename} ───────────────
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${orgId}/fastscan/raw/${Date.now()}_${safeName}`;
  const bytes      = await file.arrayBuffer();

  // ── Ensure bucket exists ──────────────────────────────────────────────────
  const { error: bucketErr } = await sb.storage.from(TMS_BUCKET).list("", { limit: 1 });
  if (bucketErr) {
    await sb.storage.createBucket(TMS_BUCKET, { public: false, fileSizeLimit: 104857600 });
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  const { error: uploadErr } = await sb.storage
    .from(TMS_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // ── Signed URL (30 min for OCR / preview) ────────────────────────────────
  const { data: signed } = await sb.storage.from(TMS_BUCKET).createSignedUrl(objectPath, 60 * 30);

  // ── Document kind from scan_type ──────────────────────────────────────────
  const kindMap: Record<string, string> = {
    ticket: "ticket", pit_invoice: "pit_invoice",
    proof: "proof", payroll_packet: "payroll_packet",
    settlement_packet: "settlement_packet",
  };
  const documentKind = kindMap[scanType] || "other";

  // ── Create fast_scan_documents record ────────────────────────────────────
  const { data: doc, error: docErr } = await sb
    .from("fast_scan_documents")
    .insert({
      organization_id:  orgId,
      document_kind:    documentKind,
      bucket_id:        TMS_BUCKET,
      object_path:      objectPath,
      original_filename: file.name,
      scan_status:      "uploaded",
      ocr_status:       "pending",
      review_status:    "not_reviewed",
      payroll_status:   "not_ready",
      billing_status:   "not_ready",
      ticket_number:    ticketNumber || null,
      truck_number:     truckNumber  || null,
      driver_name:      driverName   || null,
    })
    .select("id, organization_id, document_kind, scan_status, ocr_status, review_status, payroll_status, billing_status, object_path, ticket_number, truck_number, driver_name, created_at")
    .single();

  // Storage succeeded even if DB fails — return partial result with warning
  if (docErr) {
    return NextResponse.json({
      document_id:  null,
      storage_path: objectPath,
      bucket:       TMS_BUCKET,
      signed_url:   signed?.signedUrl || null,
      db_warning:   `File uploaded to storage but fast_scan_documents record failed: ${docErr.message}. Run migration 159.`,
    }, { status: 207 });
  }

  // ── Audit event ───────────────────────────────────────────────────────────
  await sb.from("fast_scan_audit_events").insert({
    organization_id:        orgId,
    fast_scan_document_id:  doc.id,
    event_type:             "uploaded",
    event_note:             `Ticket scan uploaded via Fast Scan UI — ${documentKind}`,
    event_payload:          { filename: file.name, size: file.size, scan_type: scanType, storage_path: objectPath },
  }).maybeSingle();

  return NextResponse.json({
    document_id:  doc.id,
    storage_path: objectPath,
    bucket:       TMS_BUCKET,
    signed_url:   signed?.signedUrl || null,
    document:     doc,
    next_step:    "OCR is pending — review extracted fields in the Needs Review queue.",
  }, { status: 201 });
}
