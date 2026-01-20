import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.event_type) {
      return NextResponse.json(
        { error: "event_type is required" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      received_at: new Date().toISOString(),
      event: body,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Invalid JSON" },
      { status: 400 },
    );
  }
}
