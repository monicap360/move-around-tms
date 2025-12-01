import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// List all Excel compare results
export async function GET() {
  const { data, error } = await supa
    .from('ai_excel_compare_results')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ results: data });
}

// Create a new Excel compare result
export async function POST(req) {
  const body = await req.json();
  const { data, error } = await supa
    .from('ai_excel_compare_results')
    .insert(body)
    .select()
    .single();
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ result: data });
}
