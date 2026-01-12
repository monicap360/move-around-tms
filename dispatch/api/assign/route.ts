import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST: Assign load to driver/truck
export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const { load_id, driver_id, driver_uuid, truck_id, status, organization_id } = body;

    if (!load_id) {
      return NextResponse.json(
        { error: "load_id is required" },
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

    // Verify load exists and get organization_id if not provided
    const { data: load, error: loadFetchError } = await supabase
      .from("loads")
      .select("id, organization_id")
      .eq("id", load_id)
      .single();

    if (loadFetchError || !load) {
      return NextResponse.json(
        { error: "Load not found" },
        { status: 404 },
      );
    }

    const orgId = organization_id || load.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify driver belongs to same organization
    const { data: driver, error: driverFetchError } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("driver_uuid", driverId)
      .single();

    if (!driverFetchError && driver && driver.organization_id !== orgId) {
      return NextResponse.json(
        { error: "Driver does not belong to the same organization" },
        { status: 403 },
      );
    }

    // Update load with driver and truck assignment
    const updateData: any = {
      driver_id: driverId,
      driver_uuid: driverId,
      assigned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: status || "assigned",
    };

    if (truck_id) {
      updateData.truck_id = truck_id;
    }

    const { error: loadError } = await supabase
      .from("loads")
      .update(updateData)
      .eq("id", load_id)
      .eq("organization_id", orgId);

    if (loadError) {
      return NextResponse.json(
        { error: loadError.message },
        { status: 500 },
      );
    }

    // Update driver's active load
    if (driverId) {
      const { error: driverError } = await supabase
        .from("drivers")
        .update({
          active_load: load_id,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("driver_uuid", driverId)
        .eq("id", driverId);

      if (driverError) {
        console.warn("Driver update error (non-fatal):", driverError);
      }
    }

    // Optionally, create a driver assignment record
    try {
      await supabase.from("driver_assignments").insert({
        driver_id: driverId,
        truck_id: truck_id || null,
        load_id: load_id,
        status: status || "Dispatched",
        assigned_at: new Date().toISOString(),
      });
    } catch (assignmentError) {
      // Non-fatal if table doesn't exist
      console.warn("Driver assignment record creation skipped:", assignmentError);
    }

    return NextResponse.json({
      success: true,
      load_id,
      driver_id: driverId,
      truck_id: truck_id || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Assignment failed" },
      { status: 500 },
    );
  }
}
