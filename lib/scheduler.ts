// Scheduler utilities for automatic load scheduling
export interface Load {
  id: string;
  pickupLocation: string;
  deliveryLocation: string;
  pickupDate: string;
  deliveryDate: string;
  weight: number;
  rate: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  id: string;
  name: string;
  status: 'available' | 'on_duty' | 'off_duty';
      error: error instanceof Error ? error.message : 'Unknown error'

    };
}

export function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number {
  // Simple distance calculation (Haversine formula)
  const R = 3959; // Earth's radius in miles
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findOptimalAssignment(loads: Load[], drivers: Driver[], trucks: Truck[]) {
  // Simple assignment logic - in production, use more sophisticated algorithms
  const assignments: Array<{
    loadId: string;
    driverId: string;
    truckId: string;
    score: number;
  }> = [];

  for (const load of loads) {
    if (load.status !== 'pending') continue;

    let bestDriver: Driver | null = null;
    let bestTruck: Truck | null = null;
    let bestScore = 0;

    for (const driver of drivers) {
      if (driver.status !== 'available') continue;
      
      for (const truck of trucks) {
        if (truck.status !== 'available') continue;
        if (truck.driverId && truck.driverId !== driver.id) continue;

        // Simple scoring based on availability
        const score = Math.random(); // In real app, calculate based on location, capacity, etc.
        
        if (score > bestScore) {
          bestScore = score;
          bestDriver = driver;
          bestTruck = truck;
        }
      }
    }

    if (bestDriver && bestTruck) {
      assignments.push({
        loadId: load.id,
        driverId: bestDriver.id,
        truckId: bestTruck.id,
        score: bestScore
      });
    }
  }

  return assignments;
}
=======
// lib/scheduler.ts
// Simple auto-scheduler using Supabase client. Intended to run server-side.

import { supabase } from "@/lib/supabaseClient";

export async function autoScheduleLoads() {
  const { data: drivers, error: dErr } = await supabase
    .from("driver_status")
    .select("driver_id")
    .eq("status", "Available");

  if (dErr) {
    console.error('Error fetching available drivers', dErr)
    return []
  }

  const { data: trucks, error: tErr } = await supabase
    .from("trucks")
    .select("*")
    .eq("status", "Ready");

  if (tErr) {
    console.error('Error fetching ready trucks', tErr)
    return []
  }

  const assignments: Array<{ driver: string; truck: string }> = [];

  const count = Math.min((drivers || []).length, (trucks || []).length);

  for (let i = 0; i < count; i++) {
    const d = drivers![i];
    const t = trucks![i];
    const { error } = await supabase
      .from("driver_assignments")
      .insert({ driver_id: d.driver_id, truck_id: t.id, status: "Scheduled" });
    if (!error) assignments.push({ driver: d.driver_id, truck: t.unit || t.unit_number || t.id });
  }

  return assignments;
}
>>>>>>> 34e73bd382610bff689903bedc8d62eed355fc8a
