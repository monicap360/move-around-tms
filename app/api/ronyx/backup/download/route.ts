import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/ronyx/backup/download?path=...&bucket=...
// Returns a signed download URL for an original uploaded file
export async function GET(req: Request) {
  const sb     = createSupabaseServerClient();
  const url    = new URL(req.url);
  const path   = url.searchParams.get("path");
  const bucket = url.searchParams.get("bucket") || "ronyx-original-uploads";

  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

  // Create a signed URL valid for 1 hour
  const { data, error } = await sb.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || "Could not generate download URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
