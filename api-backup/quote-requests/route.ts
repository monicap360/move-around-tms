import { NextRequest, NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import supabaseAdmin from '@/lib/supabaseAdmin'

// GET list (public server-side)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  let query = supabaseAdmin.from('quote_requests').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}

// PATCH update status/notes
export async function PATCH(req: NextRequest) {
  if (!requireSameOrigin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
