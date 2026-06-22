import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/driver-compliance/upload-doc
// Accepts a multipart file upload from the driver self-service portal.
// Stores the file in the driver-compliance-docs Supabase storage bucket
// and returns the public URL.
// No auth required — rate-limiting is handled at edge level.

const BUCKET = "driver-compliance-docs";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const label = (form.get("label") as string | null) ?? "doc";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP, HEIC, or PDF allowed" }, { status: 415 });
    }

    // Ensure bucket exists (idempotent)
    await supabaseAdmin.storage.createBucket(BUCKET, { public: false }).catch(() => {});

    const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safe = label.replace(/[^a-z0-9_-]/gi, "_");
    const path = `${safe}_${Date.now()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Return a signed URL valid for 7 days (office staff can open it from compliance view)
    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    return NextResponse.json({ url: signed?.signedUrl ?? null, path });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}
