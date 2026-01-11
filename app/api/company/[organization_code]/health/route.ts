import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Company health check working.",
  });
}
