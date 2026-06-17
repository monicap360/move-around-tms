import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("file_archive_records")
      .select("id, file_name, entity_type, entity_id, archive_tier, archive_provider, file_size_bytes, archived_at, restore_status, original_path, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("relation")) {
        return NextResponse.json({ archives: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ archives: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch archives";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
