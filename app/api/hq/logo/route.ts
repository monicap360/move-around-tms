import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "hq-assets";

async function ensurePublicBucket() {
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).list("", { limit: 1 });
    if (!error) return true;
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
    return !createErr;
  } catch { return false; }
}

// GET → current HQ logo url.
export async function GET() {
  const { data } = await supabaseAdmin.from("hq_settings").select("value").eq("key", "logo_url").maybeSingle();
  return NextResponse.json({ logo_url: data?.value || null });
}

// POST → upload a logo image; stores it publicly and saves the URL.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!/^image\//.test(file.type)) return NextResponse.json({ error: "Please upload an image (PNG, JPG, SVG…)." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Image too large (max 5MB)." }, { status: 400 });

  if (!(await ensurePublicBucket())) return NextResponse.json({ error: "Storage not available." }, { status: 500 });
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `logo/movearound_logo_${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = data?.publicUrl || null;
  if (!url) return NextResponse.json({ error: "Could not get public URL." }, { status: 500 });
  await supabaseAdmin.from("hq_settings").upsert({ key: "logo_url", value: url, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return NextResponse.json({ ok: true, logo_url: url });
}
