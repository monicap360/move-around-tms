// API route: POST /api/company/[org]/plants/import-seed
import { NextRequest, NextResponse } from "next/server";
import pitsPlants from "../../../../../../company/[org]/plants/seed-pits-plants.json";
import aggregates from "../../../../../../company/[org]/plants/[plant_id]/materials/seed-aggregates.json";

export async function POST(req: NextRequest, { params }: any) {
  const { org } = params;
  // Simulate DB insert for all plants
  // (Replace with actual DB logic as needed)
  for (const plant of pitsPlants) {
    // Insert plant into DB
    // ...
  }
  // Simulate DB insert for all aggregates for each plant
  for (const plant of pitsPlants) {
    for (const material of aggregates) {
      // Insert material for plant into DB
      // ...
    }
  }
  return NextResponse.json({
    status: "success",
    message: "Seed data imported.",
  });
}
