import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// POST: Receive GPS pings from drivers/trucks
export async function POST(req: Request) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();
    const {
      driver_uuid,
      truck_id,
      latitude,
      longitude,
      speed,
      heading,
      timestamp,
      organization_id,
    } = body;

    // Validate required fields
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 },
      );
    }

    // Validate coordinate ranges
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude values" },
        { status: 400 },
      );
    }

    // Validate speed if provided
    if (speed !== undefined) {
      const speedNum = Number(speed);
      if (isNaN(speedNum) || speedNum < 0 || speedNum > 200) {
        return NextResponse.json(
          { error: "Invalid speed value (must be 0-200)" },
          { status: 400 },
        );
      }
    }

    // Validate heading if provided
    if (heading !== undefined) {
      const headingNum = Number(heading);
      if (isNaN(headingNum) || headingNum < 0 || headingNum >= 360) {
        return NextResponse.json(
          { error: "Invalid heading value (must be 0-359)" },
          { status: 400 },
        );
      }
    }

    const locationData: any = {
      latitude: lat,
      longitude: lng,
      updated_at: timestamp || new Date().toISOString(),
    };

    if (speed !== undefined) locationData.speed = Number(speed);
    if (heading !== undefined) locationData.heading = Number(heading);

    // Update driver location if driver_uuid provided
    if (driver_uuid) {
      // Verify driver exists and get organization_id if needed
      const { data: driver, error: driverFetchError } = await supabase
        .from("drivers")
        .select("id, organization_id")
        .eq("driver_uuid", driver_uuid)
        .single();

      if (driverFetchError || !driver) {
        return NextResponse.json(
          { error: "Driver not found" },
          { status: 404 },
        );
      }

      const orgId = organization_id || driver.organization_id;
      if (orgId) {
        const { error: driverError } = await supabase
          .from("drivers")
          .update(locationData)
          .eq("driver_uuid", driver_uuid)
          .eq("organization_id", orgId);

        if (driverError) {
          console.error("Driver location update error:", driverError);
          return NextResponse.json(
            { error: "Failed to update driver location" },
            { status: 500 },
          );
        }
      }
    }

    // Update truck location if truck_id provided
    if (truck_id) {
      // Verify truck exists and get organization_id if needed
      const { data: truck, error: truckFetchError } = await supabase
        .from("trucks")
        .select("id, organization_id")
        .eq("id", truck_id)
        .single();

      if (truckFetchError || !truck) {
        return NextResponse.json(
          { error: "Truck not found" },
          { status: 404 },
        );
      }

      const orgId = organization_id || truck.organization_id;
      if (orgId) {
        const { error: truckError } = await supabase
          .from("trucks")
          .update(locationData)
          .eq("id", truck_id)
          .eq("organization_id", orgId);

        if (truckError) {
          console.error("Truck location update error:", truckError);
          return NextResponse.json(
            { error: "Failed to update truck location" },
            { status: 500 },
          );
        }
      }
    }

    // Optionally, create a location tracking record
    // If you have a gps_tracking or location_updates table, insert here
    // For now, we'll just update the driver/truck records

    return NextResponse.json({
      success: true,
      driver_uuid: driver_uuid || null,
      truck_id: truck_id || null,
      location: { latitude, longitude },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "GPS ping failed" },
      { status: 500 },
    );
  }
}
