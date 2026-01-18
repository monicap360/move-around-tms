import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter") || "Q2 2024";
  return NextResponse.json({
    quarter,
    today: [
      "08:15 AM • ⛽ 42.5 gal @ $3.82 - Pilot #45, Dallas, TX • ✅ OCR verified",
      "05:30 AM • ⛽ 38.0 gal @ $3.87 - Love's, Shreveport, LA • ✅ Card sync",
    ],
    queue: [
      "✅ pilot_0517_receipt.jpg — Truck #12, 42.5 gal @ $3.82, Dallas, TX",
      "⚠️ loves_0516_receipt.jpg — Low confidence, needs review",
      "❌ flyingj_0515.jpg — Duplicate detected",
    ],
  });
}

export async function POST() {
  return NextResponse.json({ ok: true, message: "Receipts queued for OCR processing." });
}
