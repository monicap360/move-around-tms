import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
function authorize(req: NextRequest) { return req.headers.get('authorization') === `Bearer ${ADMIN_TOKEN}` }

export async function GET(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  let query = supabaseAdmin.from('quote_requests').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}

export async function PATCH(req: NextRequest) {
  if (!authorize(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const id = body?.id
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const payload: any = {}
  if (body.status) payload.status = body.status
  if (body.internal_notes !== undefined) payload.internal_notes = body.internal_notes
  payload.updated_at = new Date().toISOString()
  const { data, error } = await supabaseAdmin.from('quote_requests').update(payload).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}
