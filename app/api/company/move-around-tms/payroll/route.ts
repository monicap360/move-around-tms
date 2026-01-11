import { NextResponse } from "next/server";

export async function GET() {
  // List all payroll entries
  return NextResponse.json({ message: "List payroll" });
}

export async function POST(request: Request) {
  // Create a new payroll entry
  return NextResponse.json({ message: "Create payroll" });
}
