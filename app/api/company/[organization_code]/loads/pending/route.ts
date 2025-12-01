import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Replace with real pending loads logic
  return NextResponse.json({ status: 'ok', message: 'Pending loads endpoint working.' });
}
