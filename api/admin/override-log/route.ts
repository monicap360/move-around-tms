import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");
  if (!org) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("override_log")
    .select("*")
    .eq("organization_id", org)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
