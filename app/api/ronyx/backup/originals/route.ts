import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = supabaseAdmin;
    const { data, error } = await supabase
      .from("original_uploads")
      .select("id, file_name, upload_source, entity_type, file_size, upload_status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        return NextResponse.json({ uploads: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ uploads: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch originals";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
