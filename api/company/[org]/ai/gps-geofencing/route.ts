import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type GeofenceStatus = {
  truck_number: string;
  location: string;
  geofence_status: "Inside" | "Outside" | "Unknown";
  last_update: string | null;
};

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const organizationId = params?.["org"];

  if (!organizationId) {
    return NextResponse.json(
      { error: "Missing organization id" },
      { status: 400 },
    );
  }

  const { data: trucks, error: trucksError } = await supabase
    .from("trucks")
    .select("id, truck_number")
    .eq("organization_id", organizationId);

  if (trucksError) {
    return NextResponse.json(
      { error: trucksError.message },
      { status: 500 },
    );
  }

  if (!trucks || trucks.length === 0) {
    return NextResponse.json([]);
  }

  const truckIds = trucks.map((truck: any) => truck.id);

  const { data: events, error: eventsError } = await supabase
    .from("driver_yard_events")
    .select("truck_id, yard_id, event_type, timestamp, yard:yards(name)")
    .in("truck_id", truckIds)
    .order("timestamp", { ascending: false })
    .limit(500);

  if (eventsError) {
    return NextResponse.json(
      { error: eventsError.message },
      { status: 500 },
    );
  }

  const latestByTruck = new Map<string, any>();
  (events || []).forEach((event: any) => {
    if (!latestByTruck.has(event.truck_id)) {
      latestByTruck.set(event.truck_id, event);
    }
  });

  const results: GeofenceStatus[] = trucks.map((truck: any) => {
    const event = latestByTruck.get(truck.id);
    const yardName = event?.yard?.name || "Unknown Yard";
    const status =
      event?.event_type === "enter"
        ? "Inside"
        : event?.event_type === "exit"
          ? "Outside"
          : "Unknown";
    return {
      truck_number: truck.truck_number || truck.id,
      location: yardName,
      geofence_status: status,
      last_update: event?.timestamp || null,
    };
  });

  return NextResponse.json(results);
}

export async function POST(req: NextRequest, { params }: any) {
  return GET(req, { params });
}
