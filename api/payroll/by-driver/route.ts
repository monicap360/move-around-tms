import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const driver_uuid = searchParams.get('driver_uuid');
  if (!driver_uuid) return NextResponse.json(null, { status: 200 });
  const { data, error } = await supabase
    .from('payroll_entries')
    .select('*')
    .eq('driver_id', driver_uuid)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return NextResponse.json(null, { status: 200 });
  return NextResponse.json(data);
}
