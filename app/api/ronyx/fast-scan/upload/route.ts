import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { TMS_BUCKET } from "@/lib/storage-paths";
import { runOcr } from "@/lib/fast-scan-ocr";

export const dynamic = "force-dynamic";
export const maxDuration = 90; // upload + OCR can take up to 90s

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

// Auto-detect the org ID from the organizations table if not set in env
async function resolveOrgId(sb: ReturnType<typeof adminClient>): Promise<string | null> {
  const fromEnv = process.env.RONYX_ORG_ID;
  if (fromEnv && fromEnv !== "00000000-0000-0000-0000-000000000000" && fromEnv.length > 10) {
    return fromEnv;
  }
  // Look up from DB — use first organization (single-tenant setup)
  const { data } = await sb.from("organizations").select("id").limit(1).single();
  return data?.id || null;
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

    if (orgId && orgId.length > 10) q = q.eq("organization_id", orgId);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ documents: data || [] });
  } catch {
    return NextResponse.json({ documents: [], note: "fast_scan_documents not yet migrated — run migration 159" });
  }
}

// POST /api/ronyx/fast-scan/upload — upload a ticket scan file and run OCR
export async function POST(request: NextRequest) {
  const sb = adminClient();

  // Resolve org ID (env var or DB lookup)
  const orgId = await resolveOrgId(sb);
  if (!orgId) {
    return NextResponse.json(
      { error: "Cannot resolve organization ID. Run: SELECT id FROM public.organizations; and add RONYX_ORG_ID to .env.local" },
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

  if (!file)               return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  if (!ALLOWED_MIME[file.type]) {
    return NextResponse.json(
      { error: `${file.type || "unknown"} not supported — use PDF, JPG, PNG, HEIC, TIFF, or WebP` },
      { status: 400 }
    );
  }

  // ── Path: {org_id}/fastscan/raw/{timestamp}_{safe_filename} ─────────────
  const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${orgId}/fastscan/raw/${Date.now()}_${safeName}`;
  const bytes      = await file.arrayBuffer();

  // ── Ensure bucket exists ─────────────────────────────────────────────────
  const { error: bucketErr } = await sb.storage.from(TMS_BUCKET).list("", { limit: 1 });
  if (bucketErr) {
    await sb.storage.createBucket(TMS_BUCKET, { public: false, fileSizeLimit: 104857600 });
  }

  // ── Upload ───────────────────────────────────────────────────────────────
  const { error: uploadErr } = await sb.storage
    .from(TMS_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // ── Signed URL (30 min for preview) ─────────────────────────────────────
  const { data: signed } = await sb.storage.from(TMS_BUCKET).createSignedUrl(objectPath, 60 * 30);

  // ── Document kind ────────────────────────────────────────────────────────
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
    // Storage succeeded but DB failed — return partial result
    return NextResponse.json({
      document_id:  null,
      storage_path: objectPath,
      bucket:       TMS_BUCKET,
      signed_url:   signed?.signedUrl || null,
      db_warning:   `File uploaded to storage but fast_scan_documents record failed: ${docErr.message}. Run migration 159.`,
    }, { status: 207 });
  }

  // ── Audit: uploaded ──────────────────────────────────────────────────────
  await sb.from("fast_scan_audit_events").insert({
    organization_id:        orgId,
    fast_scan_document_id:  doc.id,
    event_type:             "uploaded",
    event_note:             `Ticket scan uploaded via Fast Scan UI — ${documentKind}`,
    event_payload:          { filename: file.name, size: file.size, scan_type: scanType, storage_path: objectPath },
  }).maybeSingle();

  // ── Run OCR inline (Claude vision) ───────────────────────────────────────
  // Skip OCR if no API key — return uploaded state so user can see the file
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-REPLACE"));

  if (!hasApiKey) {
    return NextResponse.json({
      document_id:  doc.id,
      storage_path: objectPath,
      bucket:       TMS_BUCKET,
      signed_url:   signed?.signedUrl || null,
      document:     { ...doc, ocr_status: "pending" },
      ocr_skipped:  true,
      next_step:    "Add ANTHROPIC_API_KEY to .env.local to enable automatic OCR.",
    }, { status: 201 });
  }

  // Only images get inline OCR — PDFs will need a dedicated PDF processor
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    return NextResponse.json({
      document_id:  doc.id,
      storage_path: objectPath,
      bucket:       TMS_BUCKET,
      signed_url:   signed?.signedUrl || null,
      document:     { ...doc, ocr_status: "pending" },
      ocr_skipped:  true,
      next_step:    "PDF uploaded. Use the Ticket form below to enter data manually, or convert to JPG/PNG for automatic OCR.",
    }, { status: 201 });
  }

  try {
    const { fields } = await runOcr(TMS_BUCKET, objectPath, doc.id);

    // Submit to ticket-creation endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let ticket: { ticket_id?: string; ticket_number?: string; missing_fields?: string[]; qr_url?: string } | null = null;

    try {
      const ocrRes = await fetch(`${baseUrl}/api/ronyx/fast-scan/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          scan_source:        "fast_scan_upload",
          original_upload_id: doc.id,
        }),
      });
      if (ocrRes.ok || ocrRes.status === 201) {
        ticket = await ocrRes.json();
        // Update billing/payroll status on doc
        await sb.from("fast_scan_documents")
          .update({ scan_status: "processed", review_status: (ticket?.missing_fields?.length ?? 0) > 0 ? "needs_review" : "approved" })
          .eq("id", doc.id)
          .maybeSingle();
      }
    } catch {
      // OCR ran OK but ticket creation failed — still return OCR results
    }

    // Audit event
    await sb.from("fast_scan_audit_events").insert({
      organization_id:       orgId,
      fast_scan_document_id: doc.id,
      event_type:            "ocr_completed",
      event_note:            `Claude OCR — conf: ${fields.ocr_confidence}%, extraction: ${fields.extraction_confidence}%`,
      event_payload:         {
        ocr_confidence:        fields.ocr_confidence,
        extraction_confidence: fields.extraction_confidence,
        ticket_id:             ticket?.ticket_id || null,
      },
    }).maybeSingle();

    return NextResponse.json({
      document_id:           doc.id,
      storage_path:          objectPath,
      bucket:                TMS_BUCKET,
      signed_url:            signed?.signedUrl || null,
      document:              { ...doc, ocr_status: "completed", scan_status: "processed" },
      ocr_confidence:        fields.ocr_confidence,
      extraction_confidence: fields.extraction_confidence,
      extracted: {
        ticket_number: fields.ticket_number,
        truck_number:  fields.truck_number,
        driver_name:   fields.driver_printed_name,
        ticket_date:   fields.ticket_date,
        customer:      fields.customer,
        material:      fields.material,
        loads:         fields.loads,
        total_hours:   fields.total_hours,
        signature:     fields.signature_present,
      },
      ticket_id:      ticket?.ticket_id     || null,
      ticket_number:  ticket?.ticket_number || fields.ticket_number || null,
      missing_fields: ticket?.missing_fields || [],
      qr_url:         ticket?.qr_url        || null,
      next_step: (ticket?.missing_fields?.length ?? 0) > 0
        ? `Ticket created with ${ticket?.missing_fields?.length} missing field(s) — review in Reconciliation.`
        : "Ticket created and routed to Reconciliation Command Center.",
    }, { status: 201 });

  } catch (ocrErr: unknown) {
    const msg = ocrErr instanceof Error ? ocrErr.message : "OCR failed";
    // Upload succeeded, OCR failed — return what we have
    return NextResponse.json({
      document_id:  doc.id,
      storage_path: objectPath,
      bucket:       TMS_BUCKET,
      signed_url:   signed?.signedUrl || null,
      document:     { ...doc, ocr_status: "failed" },
      ocr_error:    msg,
      next_step:    "File uploaded. OCR failed — check ANTHROPIC_API_KEY and try again.",
    }, { status: 207 });
  }
}
