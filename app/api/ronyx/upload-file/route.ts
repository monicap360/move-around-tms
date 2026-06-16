import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/ronyx/upload-file
// Stores original uploaded file in Supabase Storage under ronyx-original-uploads bucket.
// Also inserts a record into original_uploads table.
// Original files are NEVER deleted or overwritten — they are read-only source evidence.
//
// FormData fields:
//   file        — the raw File object
//   module      — dispatch | payout | fastscan | payroll | drivers | compliance | billing | contracts
//   folder      — optional sub-path override (defaults to module/YYYY-MM-DD)
//
// Returns: { ok, upload_id, path, url }
export async function POST(req: Request) {
  const sb       = createSupabaseServerClient();
  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const module   = (formData.get("module") as string) || "general";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const today    = new Date().toISOString().split("T")[0];
  const timestamp = Date.now();
  const safeName  = file.name.replace(/[^a-zA-Z0-9._\-\(\) ]/g, "_");
  const path      = `${module}/${today}/${timestamp}_${safeName}`;
  const bucket    = "ronyx-original-uploads";

  const arrayBuffer = await file.arrayBuffer();

  // Try primary bucket first; fall back gracefully if it doesn't exist yet
  const { error: uploadErr } = await sb.storage
    .from(bucket)
    .upload(path, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  let storagePath = path;
  let storageBucket = bucket;
  let publicUrl: string | null = null;

  if (uploadErr) {
    // Fallback: try the existing company_assets bucket
    const fallbackPath = `ronyx/${module}/${today}/${timestamp}_${safeName}`;
    const { error: fallbackErr } = await sb.storage
      .from("company_assets")
      .upload(fallbackPath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (fallbackErr) {
      // Storage not available — still track the upload intent in the DB record
      storageBucket = "unavailable";
      storagePath   = path;
    } else {
      storagePath   = fallbackPath;
      storageBucket = "company_assets";
      const { data } = sb.storage.from("company_assets").getPublicUrl(fallbackPath);
      publicUrl = data?.publicUrl || null;
    }
  } else {
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    publicUrl = data?.publicUrl || null;
  }

  // Insert into original_uploads regardless of storage outcome
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const fileType = ["csv","txt"].includes(ext) ? "csv"
    : ext === "pdf" ? "pdf"
    : ["xls","xlsx"].includes(ext) ? "xlsx"
    : ["jpg","jpeg","png","webp","gif"].includes(ext) ? "image"
    : ext;

  const { data: uploadRecord, error: dbErr } = await sb
    .from("original_uploads")
    .insert({
      module,
      source_file_name:  file.name,
      storage_bucket:    storageBucket,
      storage_path:      storagePath,
      file_type:         fileType,
      file_size_bytes:   file.size,
      mime_type:         file.type || null,
      is_original:       true,
      is_deleted:        false,
    })
    .select("id")
    .single();

  if (dbErr) {
    return NextResponse.json({ ok: false, error: dbErr.message, path: storagePath, url: publicUrl, upload_id: null });
  }

  return NextResponse.json({
    ok:        true,
    upload_id: uploadRecord.id,
    path:      storagePath,
    bucket:    storageBucket,
    url:       publicUrl,
  });
}

// GET /api/ronyx/upload-file — list original uploads for backup center
export async function GET(req: Request) {
  const sb  = createSupabaseServerClient();
  const url = new URL(req.url);
  const mod = url.searchParams.get("module");

  let query = sb
    .from("original_uploads")
    .select("*")
    .eq("is_deleted", false)
    .order("uploaded_at", { ascending: false })
    .limit(200);

  if (mod) query = query.eq("module", mod);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ uploads: data || [] });
}
