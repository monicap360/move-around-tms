import { NextResponse } from "next/server";
import { getAlertEvents } from "@/alerts/history/alert.event.store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const events = await getAlertEvents(organizationId);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Alert history API error:", error);

    return NextResponse.json(
      { error: "Failed to load alert history" },
      { status: 500 }
    );
  }
}
