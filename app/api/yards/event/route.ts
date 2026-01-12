import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const data = await req.json();
    const { driver_id, driver_uuid, event_type, organization_id } = data;

    // Validate required fields
    if (!event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 },
      );
    }

    if (!driver_id && !driver_uuid) {
      return NextResponse.json(
        { error: "driver_id or driver_uuid is required" },
        { status: 400 },
      );
    }

    const driverId = driver_uuid || driver_id;

    // Verify driver exists and get organization_id if not provided
    const { data: driver, error: driverFetchError } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("driver_uuid", driverId)
      .single();

    if (driverFetchError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 },
      );
    }

    const orgId = organization_id || driver.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Sanitize and validate event data
    const eventData: any = {
      driver_id: driverId,
      organization_id: orgId,
      event_type: String(event_type).substring(0, 100),
      timestamp: data.timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Add optional fields with validation
    if (data.location) eventData.location = String(data.location).substring(0, 500);
    if (data.notes) eventData.notes = String(data.notes).substring(0, 2000);
    if (data.truck_id) eventData.truck_id = data.truck_id;
    if (data.load_id) eventData.load_id = data.load_id;

    const { data: insertedEvent, error } = await supabase
      .from("driver_yard_events")
      .insert([eventData])
      .select()
      .single();

    if (error) {
      console.error("Yard event insert error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create yard event" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, event: insertedEvent });
  } catch (err: any) {
    console.error("Yard event error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create yard event" },
      { status: 500 },
    );
  }
}
