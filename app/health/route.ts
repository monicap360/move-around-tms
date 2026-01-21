import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "move-around-tms",
    timestamp: new Date().toISOString(),
  });
}
