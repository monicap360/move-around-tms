import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BUCKET = "oo-logos";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/* ── POST: upload logo ── */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = adminClient();

  // Ensure bucket exists
  const { data: buckets } = await sb.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await sb.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only image files allowed (JPG, PNG, WebP, SVG, GIF)" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${params.id}/logo.${ext}`;

  // Delete old logo first (upsert)
  await sb.storage.from(BUCKET).remove([path]);

  const bytes = await file.arrayBuffer();
  const { error: upErr } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "86400",
    upsert: true,
  });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Get public URL
  const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(path);
  const logoUrl = urlData.publicUrl;

  // Save to OO record
  const { error: dbErr } = await sb
    .from("ronyx_owner_operators")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ logo_url: logoUrl });
}

/* ── DELETE: remove logo ── */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const sb = adminClient();

  // Remove all files under this OO's folder
  const { data: files } = await sb.storage.from(BUCKET).list(params.id);
  if (files && files.length > 0) {
    await sb.storage.from(BUCKET).remove(files.map((f) => `${params.id}/${f.name}`));
  }

  await sb.from("ronyx_owner_operators").update({ logo_url: null, updated_at: new Date().toISOString() }).eq("id", params.id);

  return NextResponse.json({ ok: true });
}
