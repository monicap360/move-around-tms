import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TMS_BUCKET } from "@/lib/storage-paths";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME: Record<string, boolean> = {
  "image/jpeg": true, "image/jpg": true, "image/png": true,
  "image/webp": true, "image/heic": true, "image/heif": true,
  "image/tiff": true, "image/bmp": true, "application/pdf": true,
};

function adminClient() {
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key!,
    { auth: { persistSession: false } }
  );
}

// org resolved per-request from the authenticated user via shared resolveOrgId()

// GET — list recent fast_scan_documents
export async function GET(req: NextRequest) {
  const sb = adminClient();
  const orgId = await resolveOrgId();
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "30");

  try {
    let q = sb
      .from("fast_scan_documents")
      .select("id, original_filename, document_kind, scan_status, ocr_status, review_status, payroll_status, billing_status, ticket_number, truck_number, driver_name, amount, object_path, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (orgId && orgId.length > 10) q = q.eq("organization_id", orgId);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ documents: data || [] });
  } catch {
    return NextResponse.json({ documents: [], note: "fast_scan_documents not yet migrated — run migration 159" });
  }
}

// POST — upload file, create DB record, return immediately
// OCR is NOT run here — the client calls /api/ronyx/fast-scan/process after this returns
export async function POST(request: NextRequest) {
  const sb = adminClient();

  const orgId = await resolveOrgId();

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file         = form.get("file")          as File   | null;
  const backFile     = form.get("back_file")     as File   | null;
  const scanType     = (form.get("scan_type")    as string) || "ticket";
  const ticketNumber = form.get("ticket_number") as string | null;
  const truckNumber  = form.get("truck_number")  as string | null;
  const driverName   = form.get("driver_name")   as string | null;
  const jobNumber    = form.get("job_number")    as string | null;
  const notes        = form.get("notes")         as string | null;

  if (!file)                return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  if (!ALLOWED_MIME[file.type]) {
    return NextResponse.json(
      { error: `${file.type || "unknown"} not supported — use PDF, JPG, PNG, HEIC, TIFF, or WebP` },
      { status: 400 }
    );
  }

  const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${orgId ?? "unassigned"}/fastscan/raw/${Date.now()}_${safeName}`;
  const bytes      = await file.arrayBuffer();

  // Ensure bucket exists — try to list; if that fails, create
  const { error: bucketErr } = await sb.storage.from(TMS_BUCKET).list("", { limit: 1 });
  if (bucketErr) {
    const { error: createErr } = await sb.storage.createBucket(TMS_BUCKET, { public: false, fileSizeLimit: 104857600 });
    if (createErr && !createErr.message.includes("already exists")) {
      return NextResponse.json({ error: `Storage bucket unavailable: ${createErr.message}. Please create the '${TMS_BUCKET}' bucket in Supabase Storage.` }, { status: 500 });
    }
  }

  // Upload to storage
  const { error: uploadErr } = await sb.storage
    .from(TMS_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // Store the BACK-of-ticket image too (signature/weight is often on the back) so it's
  // never lost — the driver portal sends it as back_file.
  let backObjectPath: string | null = null;
  if (backFile && backFile.size > 0 && ALLOWED_MIME[backFile.type]) {
    backObjectPath = `${orgId ?? "unassigned"}/fastscan/raw/${Date.now()}_back_${backFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    try { await sb.storage.from(TMS_BUCKET).upload(backObjectPath, await backFile.arrayBuffer(), { contentType: backFile.type, upsert: false }); }
    catch { /* keep going — front + metadata still saved */ }
  }

  // Short-lived signed URL for preview
  const { data: signed } = await sb.storage.from(TMS_BUCKET).createSignedUrl(objectPath, 60 * 30);

  const kindMap: Record<string, string> = {
    ticket: "ticket", pit_invoice: "pit_invoice", proof: "proof",
    payroll_packet: "payroll_packet", settlement_packet: "settlement_packet",
  };
  const documentKind = kindMap[scanType] || "other";

  // Create fast_scan_documents record
  const { data: doc, error: docErr } = await sb
    .from("fast_scan_documents")
    .insert({
      organization_id:   orgId,
      document_kind:     documentKind,
      bucket_id:         TMS_BUCKET,
      object_path:       objectPath,
      original_filename: file.name,
      scan_status:       "uploaded",
      ocr_status:        "pending",
      review_status:     "not_reviewed",
      payroll_status:    "not_ready",
      billing_status:    "not_ready",
      ticket_number:     ticketNumber || null,
      truck_number:      truckNumber  || null,
      driver_name:       driverName   || null,
    })
    .select("id, organization_id, document_kind, scan_status, ocr_status, review_status, payroll_status, billing_status, object_path, ticket_number, truck_number, driver_name, created_at")
    .single();

  if (docErr) {
    return NextResponse.json({
      document_id:  null,
      storage_path: objectPath,
      bucket:       TMS_BUCKET,
      signed_url:   signed?.signedUrl || null,
      db_warning:   `File uploaded to storage but DB record failed: ${docErr.message}. Run migration 159.`,
    }, { status: 207 });
  }

  // Audit: uploaded
  await sb.from("fast_scan_audit_events").insert({
    organization_id:        orgId,
    fast_scan_document_id:  doc.id,
    event_type:             "uploaded",
    event_note:             `Ticket scan uploaded — ${documentKind}`,
    event_payload:          { filename: file.name, size: file.size, scan_type: scanType, storage_path: objectPath, back_object_path: backObjectPath, job_number: jobNumber, notes },
  }).maybeSingle();

  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-REPLACE"));
  const isImage   = file.type.startsWith("image/");
  const canOcr    = hasApiKey && isImage;

  // Return immediately — client will call /process for OCR
  return NextResponse.json({
    document_id:  doc.id,
    storage_path: objectPath,
    bucket:       TMS_BUCKET,
    signed_url:   signed?.signedUrl || null,
    document:     doc,
    ocr_ready:    canOcr,
    next_step:    canOcr
      ? "ocr"  // signals the client to call /process next
      : !hasApiKey
        ? "Add ANTHROPIC_API_KEY to .env.local to enable automatic OCR."
        : "PDF uploaded — OCR not available for PDFs yet. Enter ticket data manually.",
  }, { status: 201 });
}
