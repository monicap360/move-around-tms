import { NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabaseAdmin'

// POST /api/scheduler
// Secure endpoint for dispatcher/auto-assign. Basic bearer-token guard is
// applied; replace with full auth/roles before production use.

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: drivers } = await supabaseAdmin
      .from('driver_status')
      .select('driver_id')
      .eq('status', 'Available')

    const { data: trucks } = await supabaseAdmin
      .from('trucks')
      .select('id,unit_number')
      .eq('status', 'Ready')

    const assignments: any[] = []
    const count = Math.min(drivers?.length || 0, trucks?.length || 0)

    for (let i = 0; i < count; i++) {
      const d = drivers![i]
      const t = trucks![i]
      await supabaseAdmin.from('driver_assignments').insert({
        driver_id: d.driver_id,
        truck_id: t.id,
        status: 'Scheduled',
      })
      assignments.push({ driver: d.driver_id, truck: t.unit_number })
    }

    return NextResponse.json({ success: true, assignments })
  } catch (err: any) {
    console.error('Scheduler error:', err?.message || err)
    return NextResponse.json({ success: false, message: err?.message || 'error' }, { status: 500 })
  }
}
