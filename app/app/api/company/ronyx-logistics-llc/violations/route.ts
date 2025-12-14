import { NextResponse } from 'next/server';

export async function GET() {
  // List all violations
  return NextResponse.json({ message: 'List violations' });
}

export async function POST(request: Request) {
  // Create a new violation
  return NextResponse.json({ message: 'Create violation' });
}
