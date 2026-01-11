import { NextResponse } from "next/server";

export async function GET() {
  // List all safety records
  return NextResponse.json({ message: "List safety records" });
}

export async function POST(request: Request) {
  // Create a new safety record
  return NextResponse.json({ message: "Create safety record" });
}
