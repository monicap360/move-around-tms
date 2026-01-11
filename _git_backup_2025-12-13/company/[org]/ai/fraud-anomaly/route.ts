import { NextRequest, NextResponse } from "next/server";

// Dummy data for Fraud/Anomaly Detection
const alerts = [
  {
    type: "Duplicate Ticket",
    details: "Ticket #1234 submitted twice.",
    detected_at: "2025-11-28 09:30",
  },
  {
    type: "Unusual Route",
    details: "Truck 202 deviated from planned route.",
    detected_at: "2025-11-28 08:50",
  },
  {
    type: "Late Arrival",
    details: "Truck 101 arrived 2 hours late.",
    detected_at: "2025-11-28 07:15",
  },
];

export async function GET(req: NextRequest) {
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  // In production, run fraud/anomaly detection logic here
  return NextResponse.json(alerts);
}
