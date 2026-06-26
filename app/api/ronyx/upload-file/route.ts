import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { TMS_BUCKET, tenantDatedPath } from "@/lib/storage-paths";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

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
async function ensureBucket(bucket: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).list("", { limit: 1 });
    if (!error) return true;

    const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, {
      public: false, // PRIVATE — documents are sensitive; opened only via short-lived signed URLs (view-doc)
      fileSizeLimit: 52428800, // 50MB
    });
    return !createErr;
  } catch {
    return false;
  }
}

// ─── POST /api/ronyx/upload-file ─────────────────────────
export async function POST(req: Request) {
  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const moduleOverride = formData.get("module") as string | null;
  const ooId           = formData.get("oo_id")  as string | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });
  }

  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ ok: false, error: "Organization not resolved" }, { status: 400 });

  const fileModule  = moduleOverride || detectModule(file.name, file.type);
  const filePath    = tenantDatedPath(orgId, fileModule, file.name);
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
    const candidatePath = candidateBucket === TMS_BUCKET
      ? filePath
      : `${orgId}/${fileModule}/${Date.now()}_${file.name.replace(/[<>:"/\\|?*]/g, "_")}`;
    const ready = await ensureBucket(candidateBucket);
    if (!ready) continue;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(candidateBucket)
      .upload(candidatePath, arrayBuffer, { contentType, upsert: false });

    if (!uploadErr) {
      storageOk   = true;
      usedBucket  = candidateBucket;
      storagePath = candidatePath;
      // Always capture the storage URL (bucket + path) — even for the PRIVATE
      // tms-documents bucket. This URL won't open directly, but /api/ronyx/view-doc
      // converts it to a short-lived signed URL on demand. Without this the doc
      // record got file_url=null and every doc showed "file not stored".
      const { data } = supabaseAdmin.storage.from(candidateBucket).getPublicUrl(candidatePath);
      publicUrl = data?.publicUrl || null;
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
    const row: Record<string, unknown> = {
      organization_id:   orgId,
      module:            fileModule,
      source_file_name:  file.name,
      storage_bucket:    storageOk ? usedBucket : "pending",
      storage_path:      storagePath,
      file_type:         fileType,
      file_size_bytes:   file.size,
      mime_type:         file.type || null,
      is_original:       true,
      is_deleted:        false,
    };
    if (ooId) row.notes = `oo_id:${ooId}`;
    const { data } = await supabaseAdmin
      .from("original_uploads")
      .insert(row)
      .select("id")
      .single();
    uploadId = data?.id || null;
  } catch {
    // Table doesn't exist yet — storage still worked, just no DB tracking
  }

  return NextResponse.json({
    ok:           storageOk,
    upload_id:    uploadId,
    path:         storagePath,
    bucket:       storageOk ? usedBucket : null,
    url:          publicUrl,
    module:       fileModule,
    file_name:    file.name,
    file_type:    fileType,
    storage_ok:   storageOk,
    db_tracked:   !!uploadId,
    routing_hint: getRoutingHint(fileModule, fileType, file.name),
  });
}

// ─── Routing hints for callers ────────────────────────────
function getRoutingHint(fileModule: string, fileType: string, fileName: string): string {
  if (fileModule === "dispatch")   return "dispatch-import";
  if (fileModule === "payout")     return "payout-import";
  if (fileModule === "compliance" && fileName.toLowerCase().includes("w-9")) return "oo-w9";
  if (fileModule === "compliance") return "oo-compliance-doc";
  if (fileModule === "contracts")  return "oo-contract";
  if (fileModule === "fastscan")   return "ticket-scan";
  if (fileModule === "drivers")    return "driver-doc";
  if (fileType === "image")        return "ticket-scan";
  return "general";
}

// ─── GET /api/ronyx/upload-file — list original uploads ──
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mod = url.searchParams.get("module");

  try {
    let query = supabaseAdmin
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
