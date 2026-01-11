import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Pending loads for move-around-tms.",
  });
}
