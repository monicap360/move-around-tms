import { NextResponse } from 'next/server';

export async function GET() {
  // List all trucks
  return NextResponse.json({ message: 'List trucks' });
}

export async function POST(request: Request) {
  // Create a new truck
  return NextResponse.json({ message: 'Create truck' });
}
