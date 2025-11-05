import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() { return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) }
function check(req: NextRequest) { const t = req.headers.get('authorization')||''; const e = process.env.ADMIN_TOKEN; return e && t===`Bearer ${e}` }

export async function GET(req: NextRequest) {
  if (!check(req)) return unauthorized()
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*, employees(full_name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data || [] })
}

export async function POST(req: NextRequest) {
  if (!check(req)) return unauthorized()
  let body: any; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }
  const { employee_id, contract_type, contract_terms, contract_url, start_date, end_date, renewal, signed_by } = body
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .insert([{ employee_id, contract_type, contract_terms, contract_url, start_date, end_date, renewal, signed_by }])
    .select('*, employees(full_name)')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data?.[0] })
}

export async function PATCH(req: NextRequest) {
  if (!check(req)) return unauthorized()
  let body: any; try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 }) }
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ ok: false, error: 'missing_id' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .update(updates)
    .eq('id', id)
    .select('*, employees(full_name)')
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}
