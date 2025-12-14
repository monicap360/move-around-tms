import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function unauthorized() {
  return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const expectedToken = process.env.ADMIN_TOKEN
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const since = searchParams.get('since')

    let query = supabaseAdmin
      .from('notifications')
      .select('id, message, created_at, driver_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gte('created_at', since)
    }

    const { data, error } = await query
    if (error) throw error

    // Optional: enrich with driver name if needed
    // Skipping join for simplicity and speed

    return NextResponse.json({ ok: true, items: data || [] })
  } catch (e: any) {
    console.error('notifications list error:', e)
    return NextResponse.json({ ok: false, message: 'Failed to load notifications' }, { status: 500 })
  }
}
