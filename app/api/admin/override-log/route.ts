import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("org");
  if (!organizationId) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("override_log")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
