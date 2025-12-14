import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const org = params.org;

  // Fetch all unassigned loads
  const { data: loads } = await supabase
    .from("loads")
    .select("*")
    .eq("organization_id", org)
    .is("driver_id", null);

  // Fetch all available drivers
  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .eq("organization_id", org)
    .is("active_load", null)
    .eq("status", "available");

  // Simple AI: assign nearest available driver to each load
  for (const load of loads || []) {
    // Find best driver (placeholder: first available)
    const bestDriver = drivers?.shift();
    if (!bestDriver) break;
    await supabase
      .from("loads")
      .update({ driver_id: bestDriver.driver_uuid, status: "assigned" })
      .eq("id", load.id)
      .eq("organization_id", org);
    await supabase
      .from("drivers")
      .update({ active_load: load.id })
      .eq("driver_uuid", bestDriver.driver_uuid)
      .eq("organization_id", org);
  }

  return NextResponse.json({ success: true });
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
