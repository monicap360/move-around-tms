import { NextResponse } from 'next/server';

export async function GET() {
  // List all plants
  return NextResponse.json({ message: 'List plants' });
}

export async function POST(request: Request) {
  // Create a new plant
  return NextResponse.json({ message: 'Create plant' });
}
