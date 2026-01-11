import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Replace with real available drivers logic
  return NextResponse.json({
    status: "ok",
    message: "Available drivers endpoint working.",
  });
}
