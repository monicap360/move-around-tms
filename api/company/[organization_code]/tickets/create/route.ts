import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req, { params }) {
  const { organization_code } = params;
  const body = await req.json();

  const { data: org } = await supa
    .from('organizations')
    .select('id')
    .eq('organization_code', organization_code)
    .single();

  const { data, error } = await supa
    .from('tickets')
    .insert({
      ...body,
      organization_id: org.id,
      fastscan: true
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ ticket: data });
}
