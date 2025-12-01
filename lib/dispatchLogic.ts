
// --- Types and Utilities ---
export interface Truck {
  id: string;
  number: string;
  status: 'available' | 'in_use' | 'maintenance' | 'Ready';
  driverId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  truck_type?: string;
  unit_number?: string;
  unit?: string;
}

export interface Assignment {
  id: string;
  loadId: string;
  truckId: string;
  driverId: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'Reassigned' | 'Dispatched';
}

// --- Mock-based dispatch logic ---
export async function dispatchNextLoad(driverId: string) {
  const { data: load, error } = await supabase
    .from("loads")
    .select("*")
    .eq("status", "Pending")
    .limit(1)
    .single();

  if (error || !load) return null;

  const { error: assignErr } = await supabase
    .from("driver_assignments")
    .insert({
      driver_id: driverId,
      load_id: load.id,
      status: "Dispatched",
    });

  if (assignErr) {
    console.error("Dispatch error:", assignErr);
    return null;
  }

  await supabase.from("loads").update({ status: "Dispatched" }).eq("id", load.id);
  return load;
}

export async function autoAssignBackupTruck(originalTruckIdOrDriverId: string, loadId?: string) {
  // If loadId is provided, use mock logic; else, use Supabase logic
  if (loadId) {
    // Mock implementation
    const availableTrucks: Truck[] = [
      {
        id: 'truck-backup-1',
        number: 'T-001',
        status: 'available',
        driverId: 'driver-1'
      },
      {
        id: 'truck-backup-2', 
        number: 'T-002',
        status: 'available',
        driverId: 'driver-2'
      }
    ];

    if (availableTrucks.length === 0) {
      return {
        success: false,
        message: 'No backup trucks available'
      };
    }

    const selectedTruck = availableTrucks[0];
    return {
      success: true,
      message: 'Backup truck assigned successfully',
      assignment: {
        truckId: selectedTruck.id,
        driverId: selectedTruck.driverId,
        truckNumber: selectedTruck.number
      }
    };
  } else {
    // Supabase-based logic
    const backup = await findBackupTruck(originalTruckIdOrDriverId);
    if (!backup) return { success: false, message: 'No backup truck found.' };

    const { error } = await supabase
      .from('driver_assignments')
      .update({ truck_id: backup.id, status: 'Reassigned' })
      .eq('driver_id', originalTruckIdOrDriverId);

    if (error) return { success: false, message: error.message };
    return { success: true, message: `Driver reassigned to ${backup.unit_number || backup.unit || backup.id}` };
  }
}

export async function findBackupTruck(driverId: string) {
  // Get the driver's qualified truck types
  const { data: driverQuals, error: dqError } = await supabase
    .from('driver_qualifications')
    .select('truck_type')
    .eq('driver_id', driverId)
    .eq('qualified', true);

  if (dqError) {
    console.error('Error fetching driver qualifications', dqError);
    return null;
  }

  if (!driverQuals || driverQuals.length === 0) return null;

  const type = driverQuals[0].truck_type;

  const { data: trucks, error: tError } = await supabase
    .from('trucks')
    .select('*')
    .eq('truck_type', type)
    .eq('status', 'Ready')
    .limit(1);

  if (tError) {
    console.error('Error fetching trucks', tError);
    return null;
  }

  return trucks && trucks.length ? trucks[0] : null;
}

export function calculateTruckEfficiency(truck: Truck, loadLocation: { latitude: number; longitude: number }) {
  if (!truck.location) return 0;
  const distance = calculateDistance(truck.location, loadLocation);
  return 1 / (distance + 1);
}

function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  const R = 3959;
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
