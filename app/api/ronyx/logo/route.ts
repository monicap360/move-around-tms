import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const BUCKET = "hq-assets"; // reuse the public assets bucket

async function ensurePublicBucket() {
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 1 });
    if (!error) return true;
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    return !createErr;
  } catch { return false; }
}

async function getSetting(orgId: string) {
  const { data } = await supabaseAdmin.from("ronyx_admin_settings")
    .select("setting_value").eq("organization_id", orgId).eq("setting_group", "branding").eq("setting_key", "logo_url").maybeSingle();
  let v: any = data?.setting_value;
  if (typeof v === "string") { try { v = JSON.parse(v); } catch { /* plain string */ } }
  return (v && typeof v === "object" ? v.url : v) || null;
}

// GET → the tenant's uploaded logo url.
export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ logo_url: null });
  return NextResponse.json({ logo_url: await getSetting(orgId) });
}

// POST → upload a logo image (stored publicly), save the url per org.
export async function POST(req: Request) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Organization not resolved." }, { status: 400 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!/^image\//.test(file.type)) return NextResponse.json({ error: "Please upload an image (PNG, JPG, SVG…)." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 5MB)." }, { status: 400 });

  if (!(await ensurePublicBucket())) return NextResponse.json({ error: "Storage not available." }, { status: 500 });
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `tenant-logos/${orgId}/logo_${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = data?.publicUrl || null;
  if (!url) return NextResponse.json({ error: "Could not get public URL." }, { status: 500 });
  await supabaseAdmin.from("ronyx_admin_settings").upsert(
    { organization_id: orgId, setting_group: "branding", setting_key: "logo_url", setting_value: JSON.stringify({ url }), updated_at: new Date().toISOString() },
    { onConflict: "organization_id,setting_group,setting_key" }
  );
  return NextResponse.json({ ok: true, logo_url: url });
}
