import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") || "Q2 2024";
  return NextResponse.json({
    quarter,
    alerts: [
      {
        id: "alert-1",
        title: "Missing Fuel Receipts (12)",
        detail: "Fuel purchases not matched to receipts. Audit risk: HIGH. Truck #18: 3 missing • Truck #24: 2 missing.",
        actions: ["Request from Drivers", "Import from Cards"],
      },
      {
        id: "alert-2",
        title: "Quarter Ends in 14 Days",
        detail: "Q2 ends June 30. File by July 31.",
        actions: ["Start Preparation"],
      },
      {
        id: "alert-3",
        title: "Odometer Gaps Detected",
        detail: "3 trucks have mileage gaps (>50 mi unaccounted).",
        actions: ["Review Gaps"],
      },
    ],
  });
}
