import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
}

export async function PATCH(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const expectedToken = process.env.ADMIN_TOKEN
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) return unauthorized()

  let body: {
    documentId: string
    action: 'approve' | 'deny' | 'edit' | 'reassign'
    driverId?: string
    edits?: {
      full_name?: string
      license_number?: string
      state?: string
      issue_date?: string
      expiration_date?: string
    }
    notes?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 }) }

  const { documentId, action, driverId, edits, notes } = body
  if (!documentId || !action) return NextResponse.json({ ok: false, message: 'Missing fields' }, { status: 400 })

  let update: any = {}
  switch (action) {
    case 'approve': update = { status: 'Approved' }; break
    case 'deny': update = { status: 'Denied', notes: notes || 'Denied by manager' }; break
    case 'reassign':
      if (!driverId) return NextResponse.json({ ok: false, message: 'driverId required' }, { status: 400 })
      update = { driver_id: driverId, auto_matched: false }
      break
    case 'edit':
      if (!edits) return NextResponse.json({ ok: false, message: 'edits required' }, { status: 400 })
      update = { ...edits }
      break
    default:
      return NextResponse.json({ ok: false, message: 'Invalid action' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('driver_documents')
    .update(update)
    .eq('id', documentId)
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, action, document: data })
}
