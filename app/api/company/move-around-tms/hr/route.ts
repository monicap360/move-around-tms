import { NextResponse } from 'next/server';

export async function GET() {
  // List all HR records
  return NextResponse.json({ message: 'List HR records' });
}

export async function POST(request: Request) {
  // Create a new HR record
  return NextResponse.json({ message: 'Create HR record' });
}
