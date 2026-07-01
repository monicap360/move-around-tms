import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/mailer";
import { TMS_BUCKET, tenantDatedPath } from "@/lib/storage-paths";

export const dynamic = "force-dynamic";

// PUBLIC e-signature endpoint — a carrier signs the Subhauler Agreement online
// (DocuSign-style). Stores the signature image, attaches a "Contract" document to
// the owner-operator, and stamps the record. Not under /api/ronyx (no staff gate).
const RONYX_ORG_ID = "871e2c51-205c-4c1a-93dc-022a237f05ad";
const SIGN_NOTIFY = "admin@ronyxlogistics.com";

async function ensureBucket(bucket: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.storage.from(bucket).list("", { limit: 1 });
    if (!error) return true;
    const { error: createErr } = await supabaseAdmin.storage.createBucket(bucket, { public: false, fileSizeLimit: 52428800 });
    return !createErr;
  } catch { return false; }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const signerName = String(body.signer_name || "").trim();
  const signerTitle = String(body.signer_title || "").trim();
  const dataUrl = String(body.signature_data_url || "");
  const signedAt = String(body.signed_at || new Date().toISOString());
  if (!signerName) return NextResponse.json({ ok: false, error: "Signer name is required." }, { status: 400 });
  if (!/^data:image\/png;base64,/.test(dataUrl)) return NextResponse.json({ ok: false, error: "A signature is required." }, { status: 400 });

  // Resolve the owner-operator: by id, or by company name.
  let oo: { id: string; company_name: string; notes: string | null } | null = null;
  if (body.oo_id) {
    const { data } = await supabaseAdmin.from("ronyx_owner_operators").select("id, company_name, notes").eq("id", body.oo_id).maybeSingle();
    oo = data as any;
  } else if (body.company_name) {
    const { data } = await supabaseAdmin.from("ronyx_owner_operators").select("id, company_name, notes").ilike("company_name", String(body.company_name).trim()).neq("status", "deleted").limit(1);
    oo = (data && data[0]) as any;
  }
  if (!oo) return NextResponse.json({ ok: false, error: "Could not find your company record. Complete the sign-up first." }, { status: 404 });

  // Store the signature PNG.
  const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
  const safeName = signerName.replace(/[^a-z0-9]+/gi, "_");
  const fileName = `Subhauler_Agreement_esigned_${safeName}.png`;
  let url: string | null = null;
  for (const bucket of [TMS_BUCKET, "ronyx-imports", "company_assets"]) {
    if (!(await ensureBucket(bucket))) continue;
    const path = bucket === TMS_BUCKET ? tenantDatedPath(RONYX_ORG_ID, "signed-agreements", fileName) : `${RONYX_ORG_ID}/signed-agreements/${Date.now()}_${fileName}`;
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, { contentType: "image/png", upsert: false });
    if (!error) { url = supabaseAdmin.storage.from(bucket).getPublicUrl(path).data?.publicUrl || null; break; }
  }
  if (!url) return NextResponse.json({ ok: false, error: "Could not store the signature." }, { status: 500 });

  // Attach as the OO's Contract doc + stamp the record.
  await supabaseAdmin.from("ronyx_oo_documents").delete().eq("oo_id", oo.id).eq("doc_type", "Contract");
  await supabaseAdmin.from("ronyx_oo_documents").insert({ oo_id: oo.id, doc_type: "Contract", file_name: `Subhauler Agreement — e-signed (${signerName})`, file_url: url });
  const stamp = `Subhauler Agreement e-signed ${signedAt} by ${signerName}${signerTitle ? " (" + signerTitle + ")" : ""}.`;
  await supabaseAdmin.from("ronyx_owner_operators").update({ notes: [oo.notes, stamp].filter(Boolean).join(" ") }).eq("id", oo.id);

  sendEmail({
    to: SIGN_NOTIFY,
    subject: `Subhauler Agreement signed: ${oo.company_name}`,
    text: `${oo.company_name} e-signed the Subhauler Agreement.\n\nSigner: ${signerName}${signerTitle ? " (" + signerTitle + ")" : ""}\nSigned: ${signedAt}\n\nThe signed copy is filed to their Contract document.`,
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, company_name: oo.company_name });
}
