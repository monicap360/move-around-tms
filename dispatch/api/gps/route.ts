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
    } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 },
      );
    }

    const locationData: any = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      updated_at: timestamp || new Date().toISOString(),
    };

    if (speed !== undefined) locationData.speed = Number(speed);
    if (heading !== undefined) locationData.heading = Number(heading);

    // Update driver location if driver_uuid provided
    if (driver_uuid) {
      const { error: driverError } = await supabase
        .from("drivers")
        .update(locationData)
        .eq("driver_uuid", driver_uuid);

      if (driverError) {
        console.error("Driver location update error:", driverError);
      }
    }

    // Update truck location if truck_id provided
    if (truck_id) {
      const { error: truckError } = await supabase
        .from("trucks")
        .update(locationData)
        .eq("id", truck_id);

      if (truckError) {
        console.error("Truck location update error:", truckError);
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
