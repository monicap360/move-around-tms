import { NextResponse } from 'next/server';

export async function POST(req) {
  const { driver_uuid } = await req.json();

  return NextResponse.json({
    driver_uuid,
    reconstruction: [
      { event: 'loading', start: '07:30', end: '07:38' },
      { event: 'in_transit', start: '07:38', end: '08:15' },
      { event: 'dumping', start: '08:15', end: '08:20' },
    ],
  });
}
