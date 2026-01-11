import { NextResponse } from "next/server";

export async function GET() {
  // List all materials
  return NextResponse.json({ message: "List materials" });
}

export async function POST(request: Request) {
  // Create a new material
  return NextResponse.json({ message: "Create material" });
}
