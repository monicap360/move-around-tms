// lib/dispatchLogic.ts
// Logic for assigning available drivers to pending loads.

import { supabase } from "@/lib/supabaseClient";

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
// Dispatch logic utilities
export interface Truck {
  id: string;
  number: string;
  status: 'available' | 'in_use' | 'maintenance';
  driverId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Assignment {
  id: string;
  loadId: string;
  truckId: string;
  driverId: string;
  status: 'assigned' | 'in_progress' | 'completed';
}

export async function autoAssignBackupTruck(originalTruckId: string, loadId: string) {
  try {
    console.log(`Finding backup truck for load ${loadId}, original truck ${originalTruckId}`);
    
    // Mock implementation - in real app, this would:
    // 1. Query available trucks from database
    // 2. Find trucks with compatible drivers
    // 3. Calculate distance/efficiency scores
    // 4. Assign best available truck
    
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

    // Select first available truck (in real app, use more sophisticated logic)
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
    
  } catch (error) {
    console.error('Auto-assign backup truck error:', error);
    return {
      success: false,
      message: 'Failed to assign backup truck',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function calculateTruckEfficiency(truck: Truck, loadLocation: { latitude: number; longitude: number }) {
  // Simple efficiency calculation
  if (!truck.location) return 0;
  
  const distance = calculateDistance(truck.location, loadLocation);
  return 1 / (distance + 1); // Inverse distance as efficiency score
}

function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  // Haversine formula for distance calculation
  const R = 3959; // Earth's radius in miles
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
=======
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
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
