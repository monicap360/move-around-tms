import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const org = params.org;
  const { load_id, driver_id } = await req.json();

  // Assign the load to the driver
  const { error: loadError } = await supabase
    .from("loads")
    .update({ driver_id: driver_id, status: "assigned" })
    .eq("id", load_id)
    .eq("organization_id", org);

  // Set the driver's active load
  const { error: driverError } = await supabase
    .from("drivers")
    .update({ active_load: load_id })
    .eq("driver_uuid", driver_id)
    .eq("organization_id", org);

  if (loadError || driverError) {
    return NextResponse.json(
      { error: loadError?.message || driverError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
