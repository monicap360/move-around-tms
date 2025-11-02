// lib/dispatchLogic.ts
// Server-side dispatch helper functions — intended to be used from API routes.

import { supabase } from '@/lib/supabaseClient'

export async function findBackupTruck(driverId: string) {
  // Get the driver's qualified truck types
  const { data: driverQuals, error: dqError } = await supabase
    .from('driver_qualifications')
    .select('truck_type')
    .eq('driver_id', driverId)
    .eq('qualified', true)

  if (dqError) {
    console.error('Error fetching driver qualifications', dqError)
    return null
  }

  if (!driverQuals || driverQuals.length === 0) return null

  // pick first qualified type (could be improved to prefer certain types)
  const type = driverQuals[0].truck_type

  const { data: trucks, error: tError } = await supabase
    .from('trucks')
    .select('*')
    .eq('truck_type', type)
    .eq('status', 'Ready')
    .limit(1)

  if (tError) {
    console.error('Error fetching trucks', tError)
    return null
  }

  return trucks && trucks.length ? trucks[0] : null
}

export async function autoAssignBackupTruck(driverId: string) {
  const backup = await findBackupTruck(driverId)
  if (!backup) return { success: false, message: 'No backup truck found.' }

  // Update driver_assignments table - this assumes driver_assignments exists
  const { error } = await supabase
    .from('driver_assignments')
    .update({ truck_id: backup.id, status: 'Reassigned' })
    .eq('driver_id', driverId)

  if (error) return { success: false, message: error.message }
  return { success: true, message: `Driver reassigned to ${backup.unit_number || backup.unit || backup.id}` }
}
