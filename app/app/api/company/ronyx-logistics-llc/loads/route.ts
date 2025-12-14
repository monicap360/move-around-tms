import { NextResponse } from 'next/server';

export async function GET() {
  // List all loads
  return NextResponse.json({ message: 'List loads' });
}

export async function POST(request: Request) {
  // Create a new load
  return NextResponse.json({ message: 'Create load' });
}
