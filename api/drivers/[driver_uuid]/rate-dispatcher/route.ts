import { NextRequest, NextResponse } from "next/server";
import { submitDispatcherRating } from "@/lib/driver";

export async function POST(
  req: NextRequest,
  { params }: { params: { driver_uuid: string } },
) {
  try {
    const { score, feedback } = await req.json();
    if (!score || score < 1 || score > 5) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }
    await submitDispatcherRating(params.driver_uuid, score, feedback || "");
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
}
