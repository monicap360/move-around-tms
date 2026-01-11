// app/api/alerts/acknowledge.ts
import { NextRequest, NextResponse } from "next/server";
import { acknowledgeAlertEvent } from "@/src/alerts/history/alert.event.store";

export async function POST(req: NextRequest) {
  try {
    const { id, user } = await req.json();
    if (!id || !user) throw new Error("Missing id or user");
    const ok = acknowledgeAlertEvent(id, user);
    if (!ok) throw new Error("Alert not found or already acknowledged");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to acknowledge alert" },
      { status: 400 },
    );
  }
}
