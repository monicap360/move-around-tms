import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const org = params.org;

  // Fetch all available drivers for this org
  const { data, error } = await supabase
    .from("drivers")
    .select("*")
    .eq("organization_id", org)
    .is("active_load", null)
    .eq("status", "available");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
