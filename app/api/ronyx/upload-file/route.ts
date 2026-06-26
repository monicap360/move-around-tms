import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { TMS_BUCKET, tenantDatedPath } from "@/lib/storage-paths";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { extractDocRouting } from "@/lib/doc-ai-extract";

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

  // ── Auto-route the file to the right place: an Owner-Operator COMPANY (contract /
  // insurance / W-9) OR a DRIVER (CDL / medical / MVR) — matched by name in the filename.
  let routedToOO: { oo_id: string; company_name: string; doc_type: string; driver?: string } | null = null;
  if (storageOk && publicUrl) {
    try {
      const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const fileNorm = norm(file.name);
      const l = file.name.toLowerCase();
      const isDriverDoc = fileModule === "drivers" || /\b(cdl|dl|licen|medical|med.?card|mvr|psp)\b/.test(l);

      const { data: oos } = await supabaseAdmin
        .from("ronyx_owner_operators").select("id, company_name").eq("organization_id", orgId);
      const ooIds = (oos || []).map((o: any) => o.id);

      // every name token (>2 chars) must appear in the filename
      const nameInFile = (nm: string) => {
        const toks = norm(nm).split(" ").filter((t) => t.length > 2);
        return toks.length > 0 && toks.every((t) => fileNorm.includes(t));
      };

      // 1) DRIVER docs → match an OO driver by name, attach to that OO with a driver-tagged type
      let driverHit: { name: string; oo_id: string } | null = null;
      if (isDriverDoc && ooIds.length) {
        const { data: ooDrivers } = await supabaseAdmin
          .from("ronyx_oo_drivers").select("name, oo_id").in("oo_id", ooIds);
        for (const d of ooDrivers || []) { if (d.name && nameInFile(d.name)) { driverHit = { name: d.name, oo_id: d.oo_id }; break; } }
      }

      // 2) COMPANY docs → match an OO by company name in the filename (longest match wins)
      let bestOO: any = null;
      for (const oo of oos || []) {
        const co = norm(oo.company_name);
        const core = co.replace(/\b(llc|inc|trucking|transport|transportation|logistics|company|co|services|corp|group)\b/g, "").replace(/\s+/g, " ").trim();
        if (co && fileNorm.includes(co)) { if (!bestOO || co.length > norm(bestOO.company_name).length) bestOO = oo; }
        else if (core.length > 3 && fileNorm.includes(core) && !bestOO) bestOO = oo;
      }

      const attach = async (oo_id: string, company_name: string, doc_type: string, driver?: string) => {
        await supabaseAdmin.from("ronyx_oo_documents").delete().eq("oo_id", oo_id).eq("doc_type", doc_type);
        await supabaseAdmin.from("ronyx_oo_documents").insert({ oo_id, doc_type, file_name: file.name, file_url: publicUrl });
        routedToOO = { oo_id, company_name, doc_type, driver };
      };

      const docTypeFromText = (t0: string) => {
        const t = t0.toLowerCase();
        return /w-?9|tax|ein/.test(t)              ? "W-9 / Tax Form" :
               /auto.?liab/.test(t)                ? "Auto Liability Insurance" :
               /general.?liab/.test(t)             ? "General Liability Insurance" :
               /cargo/.test(t)                     ? "Cargo Insurance" :
               /coi|certificate/.test(t)           ? "Insurance Certificate (COI)" :
               (/contract|agreement|subhauler/.test(t)) ? "Contract" :
               "Compliance Document";
      };
      const driverDocType = (nm: string, hint: string) =>
        /medical|med.?card/.test(hint.toLowerCase()) ? `[${nm}] Medical Card`
        : /mvr/.test(hint.toLowerCase())             ? `[${nm}] MVR`
        :                                              `[${nm}] CDL License`;

      if (driverHit) {
        const oo = (oos || []).find((o: any) => o.id === driverHit!.oo_id);
        await attach(driverHit.oo_id, oo?.company_name || "", driverDocType(driverHit.name, l), driverHit.name);
      } else if (bestOO && ["compliance", "contracts"].includes(fileModule)) {
        await attach(bestOO.id, bestOO.company_name, fileModule === "contracts" ? "Contract" : docTypeFromText(l));
      } else {
        // 3) Filename didn't match — READ THE DOCUMENT with AI (Claude vision) and route by its CONTENT.
        const ai = await extractDocRouting(Buffer.from(arrayBuffer), contentType);
        if (ai) {
          // (a) driver match by AI-extracted driver name
          if (ai.driver_name && ooIds.length) {
            const aiToks = norm(ai.driver_name).split(" ").filter((t) => t.length > 2);
            const { data: ooDrivers } = await supabaseAdmin.from("ronyx_oo_drivers").select("name, oo_id").in("oo_id", ooIds);
            const hit = (ooDrivers || []).find((d: any) => { const dn = norm(d.name); return aiToks.length > 0 && aiToks.every((t) => dn.includes(t)); });
            if (hit) {
              const oo = (oos || []).find((o: any) => o.id === hit.oo_id);
              await attach(hit.oo_id, oo?.company_name || "", driverDocType(hit.name, ai.doc_type || ""), hit.name);
            }
          }
          // (b) company match by AI-extracted company name (bidirectional contains)
          if (!routedToOO && ai.company_name) {
            const aiCo = norm(ai.company_name);
            const strip = (s: string) => s.replace(/\b(llc|inc|trucking|transport|transportation|logistics|company|co|services|corp|group)\b/g, "").replace(/\s+/g, " ").trim();
            const aiCore = strip(aiCo);
            let match: any = null;
            for (const oo of oos || []) {
              const co = norm(oo.company_name);
              if (co && (aiCo.includes(co) || co.includes(aiCo))) { if (!match || co.length > norm(match.company_name).length) match = oo; }
              else if (aiCore.length > 3 && strip(co).length > 3 && (aiCore.includes(strip(co)) || strip(co).includes(aiCore)) && !match) match = oo;
            }
            if (match) {
              const dt = ai.doc_type && ai.doc_type !== "Other" ? ai.doc_type : docTypeFromText(file.name);
              await attach(match.id, match.company_name, dt);
            }
          }
        }
      }
    } catch { /* best-effort routing — file is still stored regardless */ }
  }

  return NextResponse.json({
    ok:           storageOk,
    routed_to_oo: routedToOO,
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
