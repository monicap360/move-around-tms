import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") || "Q2 2024";

  return NextResponse.json({
    quarter,
    rows: [
      { state: "TEXAS", miles: 18200, pct: "42.5%", gallons: 2716, mpg: "6.7", taxRate: "$0.20/gal", tax: "+$543.20", proof: "✅ ELD logs" },
      { state: "LOUISIANA", miles: 12150, pct: "28.3%", gallons: 1813, mpg: "6.7", taxRate: "$0.20/gal", tax: "+$362.60", proof: "✅ ELD + GPS" },
      { state: "ARKANSAS", miles: 8570, pct: "20.0%", gallons: 1279, mpg: "6.7", taxRate: "$0.22/gal", tax: "+$281.38", proof: "⚠️ Gap: 150 mi", needsFix: true },
      { state: "OKLAHOMA", miles: 4930, pct: "10.0%", gallons: 739, mpg: "6.7", taxRate: "$0.19/gal", tax: "+$163.00", proof: "✅ ELD logs" },
    ],
  });
}
