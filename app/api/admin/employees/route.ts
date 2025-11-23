import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
}

function checkAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const expected = process.env.ADMIN_TOKEN
  return expected && authHeader === `Bearer ${expected}`
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data || [] })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }
  const { full_name, role_type, worker_type, pay_type, hourly_rate, percentage_rate, salary_amount, phone, email, address, truck_id, contract_url, active } = body
  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert([{ full_name, role_type, worker_type, pay_type, hourly_rate, percentage_rate, salary_amount, phone, email, address, truck_id, contract_url, active }])
    .select()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data?.[0] })
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized()
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}
