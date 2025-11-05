import { NextResponse } from 'next/server'
import { autoAssignBackupTruck } from '../../lib/dispatchLogic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { originalTruckId, loadId } = body
    if (!originalTruckId) return NextResponse.json({ ok: false, message: 'originalTruckId required' }, { status: 400 })
    if (!loadId) return NextResponse.json({ ok: false, message: 'loadId required' }, { status: 400 })

    const result = await autoAssignBackupTruck(originalTruckId, loadId)
    return NextResponse.json(result, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || String(err) }, { status: 500 })
  }
}
