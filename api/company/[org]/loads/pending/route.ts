import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const org = params.org;

  // Fetch all unassigned loads for this org
  const { data, error } = await supabase
    .from("loads")
    .select("*")
    .eq("organization_id", org)
    .is("driver_id", null)
    .order("priority", { ascending: false });

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
