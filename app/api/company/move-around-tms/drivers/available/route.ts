import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Available drivers for move-around-tms.",
  });
}
