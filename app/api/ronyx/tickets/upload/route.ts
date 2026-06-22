import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FALLBACK_BUCKETS = ["ticket-uploads", "ronyx-imports", "ronyx-files"];
const MAX_SIZE = 30 * 1024 * 1024; // 30 MB — covers HP Envy 300dpi scans

const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/tiff", "image/bmp", "image/heic", "image/heif",
  "application/pdf",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  webp: "image/webp", tiff: "image/tiff", tif: "image/tiff",
  bmp: "image/bmp", heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf",
};

async function ensureBucket(sb: typeof supabaseAdmin, bucket: string): Promise<boolean> {
  try {
    const { error } = await sb.storage.from(bucket).list("", { limit: 1 });
    if (!error) return true;
    const { error: ce } = await sb.storage.createBucket(bucket, { public: false, fileSizeLimit: MAX_SIZE });
    return !ce;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const formData  = await req.formData();
    const file      = formData.get("file")      as File   | null;
    const ticketId  = formData.get("ticket_id") as string | null;
    const docType   = (formData.get("doc_type") as string) || "ticket";

    if (!file || !ticketId) {
      return NextResponse.json({ error: "Missing file or ticket_id" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `File too large (max ${Math.round(MAX_SIZE / 1024 / 1024)} MB)` }, { status: 400 });
    }

    // Resolve MIME type — fall back to extension if browser didn't report one
    const ext      = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = (file.type && ALLOWED_TYPES.has(file.type)) ? file.type : EXT_TO_MIME[ext] || "";
    if (!mimeType) {
      return NextResponse.json({ error: `File type not supported (${file.type || ext || "unknown"}) — use JPG, PNG, PDF, TIFF, or BMP` }, { status: 400 });
    }

    const objectPath = `tickets/${ticketId}/${docType}-${Date.now()}.${ext || "bin"}`;

    // Try buckets in order until one works
    let uploadedBucket = "";
    for (const bucket of FALLBACK_BUCKETS) {
      const ready = await ensureBucket(supabase, bucket);
      if (!ready) continue;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(objectPath, await file.arrayBuffer(), { contentType: mimeType, upsert: true });

      if (!uploadErr) { uploadedBucket = bucket; break; }
    }

    if (!uploadedBucket) {
      return NextResponse.json({ error: "Storage upload failed — no available bucket" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(uploadedBucket).getPublicUrl(objectPath);
    const publicUrl = urlData.publicUrl;

    // Map docType to the correct aggregate_tickets column
    const column =
      docType === "receipt" ? "delivery_receipt_url" :
      docType === "pod"     ? "pod_url" :
                              "ticket_image_url";

    // Try with has_photo first; fall back to url-only if column doesn't exist (migration 103 not run)
    const updateFull = await supabase
      .from("aggregate_tickets")
      .update({ [column]: publicUrl, has_photo: true })
      .eq("id", ticketId);

    if (updateFull.error?.message?.includes("column")) {
      await supabase
        .from("aggregate_tickets")
        .update({ [column]: publicUrl })
        .eq("id", ticketId);
    }

    // Fire-and-forget OCR — don't let it fail the response
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const { data: signed } = await supabase.storage
          .from(uploadedBucket)
          .createSignedUrl(objectPath, 3600);

        if (signed?.signedUrl) {
          fetch(`${supabaseUrl}/functions/v1/ocr-scan`, {
            method: "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ file_url: signed.signedUrl, ticket_id: ticketId, kind: "ticket" }),
          }).catch(() => { /* OCR is best-effort */ });
        }
      } catch { /* OCR failure is non-fatal */ }
    }

    return NextResponse.json({ path: objectPath, url: publicUrl, bucket: uploadedBucket });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
