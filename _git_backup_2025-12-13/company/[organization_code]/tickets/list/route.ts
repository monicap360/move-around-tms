import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req, { params }) {
  const { organization_code } = params;
  const { data: org } = await supa
    .from('organizations')
    .select('id')
    .eq('organization_code', organization_code)
    .single();

  const { data, error } = await supa
    .from('tickets')
    .select('*')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json(data);
}
