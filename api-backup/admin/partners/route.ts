import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const expected = process.env.ADMIN_TOKEN
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('aggregate_partners')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, partners: data || [] })
}
