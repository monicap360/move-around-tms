import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

// POST: Assign a driver and truck to a load for a given organization
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { load_id, driver_id, truck_id } = body;
    if (!load_id || !driver_id || !truck_id) {
      return NextResponse.json({ ok: false, error: 'Missing load_id, driver_id, or truck_id' }, { status: 400 });
    }

    // Update the load with driver and truck assignment
    const { error: loadError } = await supabaseAdmin
      .from('loads')
      .update({ driver_id, truck_id, status: 'Dispatched' })
      .eq('id', load_id);
    if (loadError) throw loadError;

    // Optionally, create a driver assignment record
    await supabaseAdmin
      .from('driver_assignments')
      .insert({
        driver_id,
        truck_id,
        load_id,
        status: 'Dispatched',
      });

    return NextResponse.json({ ok: true, message: 'Driver and truck assigned to load.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || 'Dispatch assign failed' }, { status: 500 });
  }
}
