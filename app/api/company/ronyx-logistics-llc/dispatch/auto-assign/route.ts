import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ status: 'ok', message: 'Dispatch auto-assign for ronyx-logistics-llc.' });
}
