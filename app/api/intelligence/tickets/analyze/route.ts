import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase/server';

export async function POST(req) {
  const { ticket_id } = await req.json();

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticket_id)
    .single();

  return NextResponse.json({
    status: 'ok',
    forensic_score: 93,
    anomalies: ['weight_mismatch', 'date_offset'],
    ticket,
  });
}
