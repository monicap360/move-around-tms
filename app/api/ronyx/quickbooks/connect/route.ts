import { NextResponse } from "next/server";

import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("ronyx_integrations")
    .update({ enabled: true, status: "connected", updated_at: new Date().toISOString() })
    .eq("name", "QuickBooks")
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integration: data });
}
