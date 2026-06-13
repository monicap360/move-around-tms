import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "ronyx-driver-documents";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const driverId = new URL(request.url).searchParams.get("driverId");
  if (!driverId) {
    return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("ronyx_driver_documents")
    .select("*")
    .eq("driver_id", driverId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ documents: data || [] });
}

// POST — supports both multipart (file upload) and JSON (metadata only)
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const supabase = createSupabaseServerClient();

  if (contentType.includes("multipart/form-data")) {
    // ── File upload path ──────────────────────────────────────────────────
    const formData = await request.formData();
    const file     = formData.get("file") as File | null;
    const driverId = formData.get("driver_id") as string | null;
    const docType  = formData.get("doc_type")  as string | null;
    const expiresOn = formData.get("expires_on") as string | null;

    if (!driverId || !docType) {
      return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "No file attached" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed. Use PDF, JPG, PNG, or WEBP.` }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b: any) => b.id === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true });
    }

    // Upload to Storage
    const ext      = file.name.split(".").pop() || "bin";
    const filePath = `${driverId}/${Date.now()}-${docType.replace(/\s+/g, "-")}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });

    if (uploadErr) {
      return NextResponse.json({ error: "Storage upload failed: " + uploadErr.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    // Save record
    const { data, error } = await supabase
      .from("ronyx_driver_documents")
      .insert({
        driver_id:   driverId,
        doc_type:    docType,
        status:      "uploaded",
        expires_on:  expiresOn || null,
        file_url:    fileUrl,
        updated_at:  new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ document: data }, { status: 201 });

  } else {
    // ── JSON metadata-only path (backward compat) ─────────────────────────
    const payload = await request.json();
    if (!payload?.driver_id || !payload?.doc_type) {
      return NextResponse.json({ error: "Missing driver_id or doc_type" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("ronyx_driver_documents")
      .insert({ ...payload, updated_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ document: data }, { status: 201 });
  }
}

export async function PUT(request: NextRequest) {
  const payload = await request.json();
  if (!payload?.id) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { id, ...rest } = payload;
  const { data, error } = await supabase
    .from("ronyx_driver_documents")
    .update({ ...rest, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ document: data });
}
