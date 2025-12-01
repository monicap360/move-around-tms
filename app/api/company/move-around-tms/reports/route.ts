import { NextResponse } from 'next/server';

export async function GET() {
  // List all reports
  return NextResponse.json({ message: 'List reports' });
}

export async function POST(request: Request) {
  // Create a new report
  return NextResponse.json({ message: 'Create report' });
}
