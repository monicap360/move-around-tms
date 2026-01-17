import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createSupabaseServerClient();
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
