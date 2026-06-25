import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { TMS_BUCKET, tenantPath, tenantDatedPath } from "@/lib/storage-paths";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const BUCKET       = TMS_BUCKET;
const MAX_SIZE     = 25 * 1024 * 1024; // 25 MB
const ALLOWED_MIME: Record<string, boolean> = {
  "image/jpeg": true, "image/jpg": true, "image/png": true, "image/webp": true,
  "image/heic": true, "image/heif": true, "image/tiff": true, "image/bmp": true,
  "application/pdf": true,
};
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  heic: "image/heic", heif: "image/heif", tif: "image/tiff", tiff: "image/tiff",
  bmp: "image/bmp", pdf: "application/pdf",
};

export async function POST(request: NextRequest) {
  const supabase = supabaseAdmin;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file         = form.get("file")          as File   | null;
  const uploadSource = form.get("upload_source") as string | null;
  const entityType   = form.get("entity_type")   as string | null;
  const uploadedBy   = form.get("uploaded_by")   as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });

  const rawExt  = (file.name.split(".").pop() || "").toLowerCase();
  const mimeType = ALLOWED_MIME[file.type] ? file.type : EXT_MIME[rawExt] || "";
  if (!mimeType) {
    return NextResponse.json(
      { error: `File type not supported (${file.type || rawExt}) — use PDF, JPG, PNG, TIFF, HEIC, or BMP` },
      { status: 400 }
    );
  }

  // ── Step 1: Upload original to Supabase Storage ──────────────────────────
  // Path: {org_id}/fastscan/{ticketId_or_unknown}/{timestamp}_{filename}
  // If a ticket ID is provided use fastScanPath, otherwise fall back to generalUploadPath.
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Organization not resolved" }, { status: 400 });

  const ticketId    = form.get("ticket_id") as string | null;
  const storagePath = ticketId
    ? tenantPath(orgId, "fastscan", ticketId, file.name)
    : tenantDatedPath(orgId, uploadSource || "fastscan", file.name);
  const bytes     = await file.arrayBuffer();

  // Ensure bucket exists (tms-documents is created by migration 158;
  // this auto-creates it if the migration hasn't run yet)
  const { error: bucketErr } = await supabase.storage.from(BUCKET).list("", { limit: 1 });
  if (bucketErr) {
    await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 104857600 });
  }

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

  if (uploadErr) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadErr.message}. Original file was not saved.` },
      { status: 500 }
    );
  }

  // ── Step 2: Create original_uploads record ────────────────────────────────
  const { data: record, error: dbErr } = await supabase
    .from("original_uploads")
    .insert({
      organization_id: orgId,
      file_name:      file.name,
      storage_bucket: BUCKET,
      storage_path:   storagePath,
      file_size:      file.size,
      file_type:      mimeType,
      upload_status:  "uploaded",
      upload_source:  uploadSource || "fast_scan",
      entity_type:    entityType   || "ticket",
      uploaded_by:    uploadedBy   || "dispatcher",
    })
    .select("id, storage_path, created_at")
    .single();

  if (dbErr) {
    // Storage succeeded but DB failed — still return the storage path so OCR can proceed
    // but flag the DB issue
    console.error("original_uploads DB insert failed:", dbErr.message);
    return NextResponse.json({
      upload_id:    null,
      storage_path: storagePath,
      storage_bucket: BUCKET,
      db_warning:   "File uploaded to storage but metadata record could not be created: " + dbErr.message,
    }, { status: 207 }); // 207 Multi-Status: partial success
  }

  // ── Step 3: Generate a short-lived signed URL for client-side OCR ─────────
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 30); // 30-minute URL for OCR

  return NextResponse.json({
    upload_id:    record.id,
    storage_path: record.storage_path,
    storage_bucket: BUCKET,
    signed_url:   signed?.signedUrl || null,
    created_at:   record.created_at,
  }, { status: 201 });
}
