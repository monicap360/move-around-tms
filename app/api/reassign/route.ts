
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { findBackupTruck } from '@/lib/dispatchLogic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { driverId, loadId } = body;
    if (!driverId) {
      return NextResponse.json({ ok: false, message: 'Missing driverId' }, { status: 400 });
    }

    // Find a backup truck for this driver using production logic
    const backupTruck = await findBackupTruck(driverId);
    if (!backupTruck) {
      return NextResponse.json({ ok: false, message: 'No available qualified backup truck found.' }, { status: 200 });
    }

    // Update driver_assignments to reassign the driver to the new truck
    const { error: updateError } = await supabaseAdmin
      .from('driver_assignments')
      .update({ truck_id: backupTruck.id, status: 'Reassigned' })
      .eq('driver_id', driverId)
      .eq('status', 'Dispatched'); // Only reassign active assignments

    if (updateError) {
      return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
    }

    // Optionally, update the truck status to 'in_use' and previous truck to 'Ready'
    await supabaseAdmin
      .from('trucks')
      .update({ status: 'in_use' })
      .eq('id', backupTruck.id);

    // Optionally, update the previous truck to 'Ready' (if loadId or previous truck info is provided)
    // (This logic can be expanded if needed)

    return NextResponse.json({ ok: true, reassignedTruck: backupTruck }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || String(err) }, { status: 500 });
  }
}
