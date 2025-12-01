import { NextRequest, NextResponse } from "next/server";

// Dummy data for GPS/Geofencing
const locations = [
  { truck_number: 101, location: "Houston Yard", geofence_status: "Inside", last_update: "2025-11-28 10:12" },
  { truck_number: 202, location: "Dallas Terminal", geofence_status: "Outside", last_update: "2025-11-28 09:55" },
  { truck_number: 303, location: "San Antonio", geofence_status: "Inside", last_update: "2025-11-28 09:40" },
];

export async function GET(req: NextRequest) {
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  // In production, run GPS/geofencing logic here
  return NextResponse.json(locations);
}
