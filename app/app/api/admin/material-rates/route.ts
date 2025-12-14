// Material Rates Admin API
// Endpoints: GET list, POST create, PATCH update, DELETE delete

import { NextRequest, NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';

  let query = supabaseAdmin
    .from('material_rates')
    .select('*')
    .order('material_name', { ascending: true });

  if (activeOnly) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    material_name,
    material_code,
    default_bill_rate,
    default_pay_rate,
    unit_type,
    description,
    active = true,
  } = body;

  if (!material_name || default_bill_rate == null || default_pay_rate == null) {
    return NextResponse.json(
      { error: 'Missing required fields: material_name, default_bill_rate, default_pay_rate' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('material_rates')
    .insert({
      material_name,
      material_code,
      default_bill_rate,
      default_pay_rate,
      unit_type: unit_type || 'Load',
      description,
      active,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing material rate id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('material_rates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing material rate id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('material_rates').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
