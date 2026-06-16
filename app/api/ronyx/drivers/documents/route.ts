import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET    = "ronyx-driver-documents";
const MAX_SIZE  = 20 * 1024 * 1024; // 20 MB
const ALLOWED   = ["application/pdf","image/jpeg","image/png","image/webp","image/heic","image/heif"];

export async function GET(request: NextRequest) {
  const supabase  = createSupabaseServerClient();
  const driverId  = new URL(request.url).searchParams.get("driverId");
  if (!driverId) return NextResponse.json({ error: "Missing driverId" }, { status: 400 });

  const { data, error } = await supabase
    .from("driver_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Normalize: expose doc_type and file_url aliases so the frontend works either way
  const documents = (data || []).map((d: any) => ({
    ...d,
    doc_type: d.document_type || d.doc_type || "",
    file_url: d.file_path     || d.file_url || d.image_url || "",
  }));

  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const supabase    = createSupabaseServerClient();

  if (contentType.includes("multipart/form-data")) {
    const formData  = await request.formData();
    const file      = formData.get("file")      as File   | null;
    const driverId  = formData.get("driver_id") as string | null;
    const docType   = formData.get("doc_type")  as string | null;
    const expiresOn = formData.get("expires_on")as string | null;

    if (!driverId || !docType) return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
    if (!file)                 return NextResponse.json({ error: "No file attached" }, { status: 400 });
    if (file.size > MAX_SIZE)  return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });

    // Accept any image or PDF — HEIC from iPhone comes as image/heic or image/heif
    const mimeOk = ALLOWED.includes(file.type) || file.type.startsWith("image/") || file.type === "application/pdf";
    if (!mimeOk) return NextResponse.json({ error: "Use PDF, JPG, PNG, WEBP, or HEIC" }, { status: 400 });

    // Resolve org_id from the driver record
    const { data: driver } = await supabase
      .from("drivers")
      .select("organization_id")
      .eq("id", driverId)
      .maybeSingle();
    const orgId = driver?.organization_id ?? null;

    // Upload to Storage
    const ext      = file.name.split(".").pop() || "bin";
    const filePath = `${driverId}/${Date.now()}-${docType.replace(/\s+/g, "-")}.${ext}`;

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b: any) => b.id === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });

    if (uploadErr) return NextResponse.json({ error: "Storage upload failed: " + uploadErr.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Insert record using actual column names
    const { data: doc, error: insertErr } = await supabase
      .from("driver_documents")
      .insert({
        driver_id:       driverId,
        organization_id: orgId,
        document_type:   docType,
        file_path:       publicUrl,
        expires_on:      expiresOn || null,
      })
      .select("*")
      .single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Close any open Sylvia compliance tasks tied to this driver + doc type
    const closeTypes: Record<string, string[]> = {
      "CDL Front":       ["cdl_expiring","cdl_missing","cdl_front_missing","driver_doc"],
      "CDL Back":        ["cdl_back_missing","driver_doc"],
      "Medical Card":    ["medical_expiring","medical_missing","driver_doc"],
      "MVR":             ["mvr_expiring","mvr_missing","driver_doc"],
      "Drug Test":       ["drug_test_missing","driver_doc"],
      "Background Check":["background_check_missing","driver_doc"],
    };
    const taskTypesToClose = closeTypes[docType || ""] || [];
    if (taskTypesToClose.length > 0) {
      await supabase
        .from("ronyx_staff_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString(), completion_notes: `${docType} uploaded`, updated_at: new Date().toISOString() })
        .eq("entity_type", "driver")
        .eq("entity_id", driverId)
        .in("task_type", taskTypesToClose)
        .eq("status", "open");
    }

    // Return with aliased fields for frontend compatibility
    return NextResponse.json({
      document: { ...doc, doc_type: doc.document_type, file_url: doc.file_path }
    }, { status: 201 });
  }

  // JSON metadata-only path
  const payload = await request.json().catch(() => null);
  if (!payload?.driver_id || !payload?.doc_type) {
    return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
  }
  const { data: driver } = await supabase
    .from("drivers")
    .select("organization_id")
    .eq("id", payload.driver_id)
    .maybeSingle();

  const { data: doc, error } = await supabase
    .from("driver_documents")
    .insert({
      driver_id:       payload.driver_id,
      organization_id: driver?.organization_id ?? null,
      document_type:   payload.doc_type,
      file_path:       payload.file_url || null,
      expires_on:      payload.expires_on || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: { ...doc, doc_type: doc.document_type, file_url: doc.file_path } }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload?.id) return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  const supabase = createSupabaseServerClient();
  const { id, doc_type, file_url, ...rest } = payload;
  const { data, error } = await supabase
    .from("driver_documents")
    .update({
      ...rest,
      ...(doc_type  ? { document_type: doc_type  } : {}),
      ...(file_url  ? { file_path:     file_url   } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: { ...data, doc_type: data.document_type, file_url: data.file_path } });
}
