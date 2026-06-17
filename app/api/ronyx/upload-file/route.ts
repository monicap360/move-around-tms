import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TMS_BUCKET, generalUploadPath } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

// ─── Auto-detect module from filename + MIME type ─────────
function detectModule(fileName: string, mimeType: string): string {
  const name  = fileName.toLowerCase();
  const mime  = (mimeType || "").toLowerCase();

  if (name.includes("dispatch") || name.includes("rmis") || name.includes("schedule") || name.includes("tabitha"))
    return "dispatch";
  if (name.includes("payout") || name.includes("indiana") || name.includes("invoices"))
    return "payout";
  if (name.includes("w-9") || name.includes("w9") || name.includes("tax"))
    return "compliance";
  if (name.includes("coi") || name.includes("certificate") || name.includes("insurance"))
    return "compliance";
  if (name.includes("contract") || name.includes("agreement") || name.includes("subhauler"))
    return "contracts";
  if (name.includes("driver") || name.includes("cdl") || name.includes("mvr"))
    return "drivers";
  if (name.includes("payroll") || name.includes("settlement"))
    return "payroll";
  if (name.includes("ticket") || name.includes("scan"))
    return "fastscan";
  if (name.includes("invoice") || name.includes("billing"))
    return "billing";
  if (mime.includes("image"))
    return "images";
  return "general";
}

// ─── Get or create a storage bucket ──────────────────────
async function ensureBucket(sb: ReturnType<typeof createSupabaseServerClient>, bucket: string): Promise<boolean> {
  try {
    // Try to list — if bucket exists this succeeds
    const { error } = await sb.storage.from(bucket).list("", { limit: 1 });
    if (!error) return true;

    // Bucket doesn't exist — try to create it
    const { error: createErr } = await sb.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    return !createErr;
  } catch {
    return false;
  }
}

// ─── POST /api/ronyx/upload-file ─────────────────────────
// Universal file upload for all Ronyx modules.
// Accepts ANY file type. Auto-detects module from filename.
// Self-healing: creates storage bucket if needed.
// Works even if original_uploads table hasn't been migrated yet.
//
// FormData fields:
//   file    — the File (required)
//   module  — override auto-detection (optional)
//   oo_id   — owner operator ID if this is a compliance/contract doc (optional)
//
// Returns: { ok, upload_id, path, bucket, url, module, file_name, file_type }
export async function POST(req: Request) {
  const sb       = createSupabaseServerClient();
  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const moduleOverride = formData.get("module") as string | null;
  const ooId           = formData.get("oo_id")  as string | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  const module      = moduleOverride || detectModule(file.name, file.type);
  const filePath    = generalUploadPath(module, file.name);
  const arrayBuffer = await file.arrayBuffer();
  const contentType = file.type || "application/octet-stream";

  // ── Try tms-documents first, fall back to legacy buckets if not yet created ──
  const BUCKET_ORDER = [TMS_BUCKET, "ronyx-imports", "company_assets"];
  let usedBucket  = TMS_BUCKET;
  let storagePath = filePath;
  let publicUrl: string | null = null;
  let storageOk = false;

  for (const candidateBucket of BUCKET_ORDER) {
    if (storageOk) break;
    const candidatePath = candidateBucket === TMS_BUCKET ? filePath : `ronyx/${module}/${Date.now()}_${file.name.replace(/[<>:"/\\|?*]/g, "_")}`;
    const ready = await ensureBucket(sb, candidateBucket);
    if (!ready) continue;

    const { error: uploadErr } = await sb.storage
      .from(candidateBucket)
      .upload(candidatePath, arrayBuffer, { contentType, upsert: false });

    if (!uploadErr) {
      storageOk   = true;
      usedBucket  = candidateBucket;
      storagePath = candidatePath;
      // tms-documents is private — no public URL; caller uses view-doc to get signed URL
      if (candidateBucket !== TMS_BUCKET) {
        const { data } = sb.storage.from(candidateBucket).getPublicUrl(candidatePath);
        publicUrl = data?.publicUrl || null;
      }
    }
  }

  // ── Derive file_type ──
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const fileType = ["csv","txt"].includes(ext) ? "csv"
    : ext === "pdf" ? "pdf"
    : ["xls","xlsx"].includes(ext) ? "xlsx"
    : ["doc","docx"].includes(ext) ? "doc"
    : ["jpg","jpeg","png","webp","gif","bmp","tiff"].includes(ext) ? "image"
    : ext || "bin";

  // ── Track in original_uploads (graceful — table may not exist yet) ──
  let uploadId: string | null = null;
  try {
    const row: Record<string, any> = {
      module,
      source_file_name:  file.name,
      storage_bucket:    storageOk ? usedBucket : "pending",
      storage_path:      storagePath,
      file_type:         fileType,
      file_size_bytes:   file.size,
      mime_type:         file.type || null,
      is_original:       true,
      is_deleted:        false,
    };
    if (ooId) {
      row.notes = `oo_id:${ooId}`;
    }
    const { data } = await sb
      .from("original_uploads")
      .insert(row)
      .select("id")
      .single();
    uploadId = data?.id || null;
  } catch {
    // Table doesn't exist yet — storage still worked, just no DB tracking
  }

  return NextResponse.json({
    ok:        storageOk,
    upload_id: uploadId,
    path:      storagePath,
    bucket:    storageOk ? usedBucket : null,
    url:       publicUrl,
    module,
    file_name: file.name,
    file_type: fileType,
    storage_ok: storageOk,
    db_tracked: !!uploadId,
    // Hint for caller about what to do with this file
    routing_hint: getRoutingHint(module, fileType, file.name),
  });
}

// ─── Routing hints for callers ────────────────────────────
function getRoutingHint(module: string, fileType: string, fileName: string): string {
  if (module === "dispatch")   return "dispatch-import";
  if (module === "payout")     return "payout-import";
  if (module === "compliance" && fileName.toLowerCase().includes("w-9")) return "oo-w9";
  if (module === "compliance") return "oo-compliance-doc";
  if (module === "contracts")  return "oo-contract";
  if (module === "fastscan")   return "ticket-scan";
  if (module === "drivers")    return "driver-doc";
  if (fileType === "image")    return "ticket-scan";
  return "general";
}

// ─── GET /api/ronyx/upload-file — list original uploads ──
export async function GET(req: Request) {
  const sb  = createSupabaseServerClient();
  const url = new URL(req.url);
  const mod = url.searchParams.get("module");

  try {
    let query = sb
      .from("original_uploads")
      .select("*")
      .eq("is_deleted", false)
      .order("uploaded_at", { ascending: false })
      .limit(200);

    if (mod) query = query.eq("module", mod);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ uploads: data || [] });
  } catch {
    return NextResponse.json({ uploads: [], note: "original_uploads table not yet migrated" });
  }
}
