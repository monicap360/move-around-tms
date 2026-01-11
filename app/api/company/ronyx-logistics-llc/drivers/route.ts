import { NextResponse } from "next/server";

export async function GET() {
  // List all drivers
  return NextResponse.json({ message: "List drivers" });
}

export async function POST(request: Request) {
  // Create a new driver
  return NextResponse.json({ message: "Create driver" });
}
