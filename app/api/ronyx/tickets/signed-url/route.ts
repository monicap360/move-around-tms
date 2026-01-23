import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const supabase = createServerAdmin();
    const { data, error } = await supabase.storage
      .from("ticket-uploads")
      .createSignedUrl(path, 60 * 60);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Unable to sign URL" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Signed URL failed" }, { status: 500 });
  }
}
