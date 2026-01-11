import { NextResponse } from "next/server";

export async function GET() {
  // List all aggregates
  return NextResponse.json({ message: "List aggregates" });
}

export async function POST(request: Request) {
  // Create a new aggregate
  return NextResponse.json({ message: "Create aggregate" });
}
