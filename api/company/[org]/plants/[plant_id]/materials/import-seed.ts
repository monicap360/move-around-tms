// API route: POST /api/company/[org]/plants/[plant_id]/materials/import-seed
import { NextRequest, NextResponse } from 'next/server';
import aggregates from '../../../../../../company/[org]/plants/[plant_id]/materials/seed-aggregates.json';

export async function POST(req: NextRequest, { params }: any) {
  const { org, plant_id } = params;
  // Simulate DB insert for all aggregates for this plant
  // (Replace with actual DB logic as needed)
  for (const material of aggregates) {
    // Insert material for plant into DB
    // ...
  }
  return NextResponse.json({ status: 'success', message: 'Aggregates imported.' });
}
