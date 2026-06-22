import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/ronyx/view-doc?url=<file_url>
// Returns a 1-hour signed URL so private-bucket files can be opened in the browser.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get("url");
  if (!fileUrl) return NextResponse.json({ error: "url param required" }, { status: 400 });

  // Parse bucket + path from Supabase Storage URL
  // Formats:
  //   https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
  //   https://xxx.supabase.co/storage/v1/object/sign/BUCKET/PATH?token=...
  const match = fileUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+)/);
  if (!match) {
    // Not a Supabase storage URL — return it directly (e.g. external link)
    return NextResponse.json({ signed_url: fileUrl });
  }

  const bucket    = match[1];
  const rawPath   = match[2];
  const cleanPath = rawPath.split("?")[0]; // strip any existing token

  const sb = supabaseAdmin;
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(cleanPath, 3600);

  if (error) {
    // Fallback: return the original URL (may work if bucket was later made public)
    return NextResponse.json({ signed_url: fileUrl, warn: error.message });
  }

  return NextResponse.json({ signed_url: data.signedUrl });
}
