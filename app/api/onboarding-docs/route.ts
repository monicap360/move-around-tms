import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { TMS_BUCKET, tenantDatedPath } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

// PUBLIC onboarding document upload — used by the owner-operator and driver
// self-signup pages so a new carrier/driver can attach their documents directly.
// Deliberately NOT under /api/ronyx (no staff PIN gate). Attaches the file to the
// owner-operator record as a ronyx_oo_documents row with an explicit doc_type.
const RONYX_ORG_ID = "871e2c51-205c-4c1a-93dc-022a237f05ad";

async function ensureBucket(bucket: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).list("", { limit: 1 });
    if (!error) return true;
    const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, { public: false, fileSizeLimit: 52428800 });
    return !createErr;
  } catch { return false; }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = /\.(pdf|png|jpe?g|webp|gif|bmp|tiff?|heic|heif|doc|docx|xls|xlsx|csv|txt)$/i;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const ooId = String(form.get("oo_id") || "");
  const docType = String(form.get("doc_type") || "Onboarding Document").slice(0, 120);
  if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (!UUID_RE.test(ooId)) return NextResponse.json({ ok: false, error: "Invalid record id" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "File too large (max 25 MB)." }, { status: 400 });
  if (!ALLOWED_EXT.test(file.name)) return NextResponse.json({ ok: false, error: "Unsupported file type." }, { status: 400 });

  // Only allow attaching to a NEW self-signup (status "pending"). Once the office
  // activates the carrier, these public endpoints can no longer touch its documents.
  const { data: oo } = await supabaseAdmin.from("ronyx_owner_operators").select("id, status").eq("id", ooId).maybeSingle();
  if (!oo) return NextResponse.json({ ok: false, error: "Record not found" }, { status: 404 });
  if ((oo.status || "").toLowerCase() !== "pending") return NextResponse.json({ ok: false, error: "This company is already active — contact the office to update documents." }, { status: 403 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";
  const candidates = [TMS_BUCKET, "ronyx-imports", "company_assets"];
  let url: string | null = null;
  for (const bucket of candidates) {
    if (!(await ensureBucket(bucket))) continue;
    const path = bucket === TMS_BUCKET ? tenantDatedPath(RONYX_ORG_ID, "onboarding", file.name)
      : `${RONYX_ORG_ID}/onboarding/${Date.now()}_${file.name.replace(/[<>:"/\\|?*]/g, "_")}`;
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, { contentType, upsert: false });
    if (!error) { url = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data?.publicUrl || null; break; }
  }
  if (!url) return NextResponse.json({ ok: false, error: "Could not store the file" }, { status: 500 });

  // Replace any existing doc of the same type, then attach.
  await supabaseAdmin.from("ronyx_oo_documents").delete().eq("oo_id", ooId).eq("doc_type", docType);
  const { error: insErr } = await supabaseAdmin.from("ronyx_oo_documents").insert({ oo_id: ooId, doc_type: docType, file_name: file.name, file_url: url });
  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, doc_type: docType, file_name: file.name });
}
