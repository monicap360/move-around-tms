import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABLE    = "ronyx_driver_documents";
const BUCKET   = "ronyx-driver-documents";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

// GET /api/ronyx/drivers/documents?driverId=<uuid>
export async function GET(request: NextRequest) {
  const sb       = createSupabaseServerClient();
  const driverId = new URL(request.url).searchParams.get("driverId");
  if (!driverId) return NextResponse.json({ error: "Missing driverId" }, { status: 400 });

  const { data, error } = await sb
    .from(TABLE)
    .select("id, driver_id, doc_type, file_url, status, expires_on, notes, uploaded_by, organization_id, created_at, updated_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}

// POST — multipart file upload OR JSON metadata-only
export async function POST(request: NextRequest) {
  const sb          = createSupabaseServerClient();
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form     = await request.formData();
    const file     = form.get("file")      as File   | null;
    const driverId = form.get("driver_id") as string | null;
    const docType  = form.get("doc_type")  as string | null;
    const expiresOn = form.get("expires_on") as string | null;

    if (!driverId || !docType) return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
    if (!file)                 return NextResponse.json({ error: "No file attached" }, { status: 400 });
    if (file.size > MAX_SIZE)  return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });

    const mimeOk = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!mimeOk) return NextResponse.json({ error: "Use PDF, JPG, PNG, WEBP, or HEIC" }, { status: 400 });

    // Ensure storage bucket exists
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.find((b: any) => b.id === BUCKET)) {
      await sb.storage.createBucket(BUCKET, { public: true });
    }

    const ext      = file.name.split(".").pop() || "bin";
    const filePath = `${driverId}/${Date.now()}-${(docType).replace(/\s+/g, "-")}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from(BUCKET)
      .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });

    if (uploadErr) return NextResponse.json({ error: "Storage upload failed: " + uploadErr.message }, { status: 500 });

    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    const { data: doc, error: insertErr } = await sb
      .from(TABLE)
      .insert({
        driver_id:  driverId,
        doc_type:   docType,
        file_url:   fileUrl,
        status:     "uploaded",
        expires_on: expiresOn || null,
      })
      .select("*")
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Auto-close matching open Sylvia compliance tasks
    const closeMap: Record<string, string[]> = {
      "CDL Front":        ["cdl_expiring","cdl_missing","cdl_front_missing","driver_doc"],
      "CDL Back":         ["cdl_back_missing","driver_doc"],
      "Medical Card":     ["medical_expiring","medical_missing","driver_doc"],
      "MVR":              ["mvr_expiring","mvr_missing","driver_doc"],
      "Drug Test":        ["drug_test_missing","driver_doc"],
      "Background Check": ["background_check_missing","driver_doc"],
    };
    const toClose = closeMap[docType] || [];
    if (toClose.length > 0) {
      await sb
        .from("ronyx_staff_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completion_notes: `${docType} uploaded`,
          updated_at: new Date().toISOString(),
        })
        .eq("entity_type", "driver")
        .eq("entity_id", driverId)
        .in("task_type", toClose)
        .eq("status", "open");
    }

    return NextResponse.json({ document: doc }, { status: 201 });
  }

  // JSON metadata-only path (e.g. bulk import without file)
  const payload = await request.json().catch(() => null);
  if (!payload?.driver_id || !payload?.doc_type) {
    return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
  }

  const { data: doc, error } = await sb
    .from(TABLE)
    .insert({
      driver_id:  payload.driver_id,
      doc_type:   payload.doc_type,
      file_url:   payload.file_url  || null,
      status:     payload.status    || "uploaded",
      expires_on: payload.expires_on || null,
      notes:      payload.notes      || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: doc }, { status: 201 });
}

// PUT — update a document record
export async function PUT(request: NextRequest) {
  const sb      = createSupabaseServerClient();
  const payload = await request.json().catch(() => null);
  if (!payload?.id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });

  const { id, ...rest } = payload;
  const { data, error } = await sb
    .from(TABLE)
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}
