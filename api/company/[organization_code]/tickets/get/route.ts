import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req, { params }) {
  const { organization_code } = params;
  const { searchParams } = new URL(req.url);
  const ticket_id = searchParams.get('ticket_id');

  if (!ticket_id) {
    return NextResponse.json({ error: 'Missing ticket_id' }, { status: 400 });
  }

  const { data: org } = await supa
    .from('organizations')
    .select('id')
    .eq('organization_code', organization_code)
    .single();

  const { data, error } = await supa
    .from('tickets')
    .select('*')
    .eq('id', ticket_id)
    .eq('organization_id', org.id)
    .single();

  if (error) return NextResponse.json({ error }, { status: 404 });

  return NextResponse.json({ ticket: data });
}
