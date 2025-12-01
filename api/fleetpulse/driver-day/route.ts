import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// List all driver day reconstructions
export async function GET() {
  const { data, error } = await supa
    .from('fleetpulse_driver_day')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ days: data });
}

// Create a new driver day record
export async function POST(req) {
  const body = await req.json();
  const { data, error } = await supa
    .from('fleetpulse_driver_day')
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ day: data });
}
