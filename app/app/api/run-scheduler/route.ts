import { NextResponse } from 'next/server'
import { autoScheduleLoads } from '@/lib/scheduler'

export async function POST(req: Request) {
  try {
    // Run the server-side scheduler and return the assignments
    const assignments = await autoScheduleLoads()
    return NextResponse.json({ ok: true, assignments }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || String(err) }, { status: 500 })
  }
}
