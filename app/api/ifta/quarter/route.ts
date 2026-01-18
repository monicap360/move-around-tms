import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") || "Q2 2024";
  const snapshot = searchParams.get("snapshot");

  if (snapshot) {
    return NextResponse.json({
      quarter,
      snapshot: {
        totalMiles: "42,850",
        gallons: "6,425",
        avgMpg: "6.7",
        bestWorst: "Best: Truck #12 (7.2) | Worst: Truck #18 (6.1)",
        taxOwed: "$3,850",
        due: "July 31, 2024",
        costPerGallon: "$3.85/gal",
        fuelTotal: "$24,736",
      },
    });
  }

  return NextResponse.json({
    quarter,
    summary: {
      status: "🟡 Collecting Data (Quarter ends in 14 days)",
      projected: "$3,850 owed",
      risk: "LOW",
      alerts: "12 missing fuel receipts | 3 trucks need odometer readings",
    },
  });
}
