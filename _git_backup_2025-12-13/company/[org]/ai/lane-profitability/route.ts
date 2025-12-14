import { NextRequest, NextResponse } from "next/server";

// Dummy data for AI Lane Profitability
const lanes = [
  { lane: "Houston ↔ Dallas", profit: 12000, volume: 34, avg_cycle: 52 },
  { lane: "Dallas ↔ San Antonio", profit: 9500, volume: 28, avg_cycle: 48 },
  { lane: "Houston ↔ Austin", profit: 8000, volume: 19, avg_cycle: 56 },
  { lane: "Austin ↔ Laredo", profit: 6700, volume: 14, avg_cycle: 61 },
];

export async function GET(req: NextRequest) {
  return NextResponse.json(lanes);
}

export async function POST(req: NextRequest) {
  // In production, run AI/analytics logic here
  return NextResponse.json(lanes);
}
