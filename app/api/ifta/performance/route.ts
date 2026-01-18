import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") || "Q2 2024";
  return NextResponse.json({
    quarter,
    mpgRows: [
      { rank: 1, truck: "#12", driver: "D. Perez", mpg: "7.2", costPerMile: "$0.534", action: "Reward" },
      { rank: 2, truck: "#07", driver: "M. Chen", mpg: "6.9", costPerMile: "$0.558", action: "Coach" },
      { rank: 12, truck: "#18", driver: "S. Grant", mpg: "6.1", costPerMile: "$0.634", action: "Training" },
    ],
    analysis: [
      { title: "Avg Cost/Gallon", value: "$3.85", trend: "↓ $0.12 from Q1" },
      { title: "Fuel Cost/Mile", value: "$0.577", trend: "Industry avg: $0.592" },
      { title: "Potential Savings", value: "$3,240/yr", trend: "If all trucks matched #12 MPG" },
    ],
  });
}
