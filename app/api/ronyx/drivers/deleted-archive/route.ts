import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("deleted_drivers_archive")
    .select("*")
    .order("actioned_at", { ascending: false })
    .limit(200);

  if (error) {
    // Table may not exist yet — return empty gracefully
    return NextResponse.json({ alerts: [], error: error.message });
  }

  return NextResponse.json({ alerts: data || [] });
}
