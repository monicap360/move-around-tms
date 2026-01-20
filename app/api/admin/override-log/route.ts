import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();

  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company");
  if (!company) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("override_log")
    .select("*")
    .eq("organization_id", company)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

