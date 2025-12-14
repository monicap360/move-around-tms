import { NextResponse } from 'next/server';

export async function GET() {
  // List all tickets
  return NextResponse.json({ message: 'List tickets' });
}

export async function POST(request: Request) {
  // Create a new ticket
  return NextResponse.json({ message: 'Create ticket' });
}
