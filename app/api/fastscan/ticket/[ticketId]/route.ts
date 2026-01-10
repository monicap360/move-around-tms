import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Auth: authenticated only (Bearer token required, RLS enforced)
export async function GET(req: NextRequest, { params }: { params: { ticketId: string } }) {
  const ticketId = params.ticketId;
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data, error } = await supabase
    .from('tickets')
    .select(`*, driver:driver_id(name), customer:customer_id(company_name)`)
    .eq('id', ticketId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Ticket not found' }, { status: 404 });
  }
  return NextResponse.json({ ticket: data });
}
