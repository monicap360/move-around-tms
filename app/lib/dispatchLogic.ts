// Dispatch logic utilities
import { createSupabaseServerClient } from "@/lib/supabase/server";
export interface Truck {
  id: string;
  number: string;
  status: "available" | "in_use" | "maintenance";
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
  status: "assigned" | "in_progress" | "completed";
}

export async function autoAssignBackupTruck(
  originalTruckId: string,
  loadId: string,
) {
  try {
    const supabase = createSupabaseServerClient();

    const { data: load, error: loadError } = await supabase
      .from("loads")
      .select("*")
      .eq("id", loadId)
      .single();

    if (loadError || !load) {
      return {
        success: false,
        message: "Load not found",
      };
    }

    const { data: backupTruck, error: truckError } = await supabase
      .from("trucks")
      .select("id, number, status, driver_id")
      .neq("id", originalTruckId)
      .in("status", ["available", "Ready"])
      .limit(1)
      .single();

    if (truckError || !backupTruck) {
      return {
        success: false,
        message: "No backup trucks available",
      };
    }

    const assignmentPayload: Record<string, any> = {
      truck_id: backupTruck.id,
      status: "Reassigned",
    };
    if (backupTruck.driver_id) {
      assignmentPayload.driver_id = backupTruck.driver_id;
    }

    const { error: assignmentError } = await supabase
      .from("driver_assignments")
      .update(assignmentPayload)
      .eq("load_id", loadId);

    if (assignmentError) {
      return {
        success: false,
        message: assignmentError.message,
      };
    }

    return {
      success: true,
      message: "Backup truck assigned successfully",
      assignment: {
        loadId,
        truckId: backupTruck.id,
        driverId: backupTruck.driver_id || null,
        truckNumber: backupTruck.number,
      },
    };
  } catch (error) {
    console.error("Auto-assign backup truck error:", error);
    return {
      success: false,
      message: "Failed to assign backup truck",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function calculateTruckEfficiency(
  truck: Truck,
  loadLocation: { latitude: number; longitude: number },
) {
  // Simple efficiency calculation
  if (!truck.location) return 0;

  const distance = calculateDistance(truck.location, loadLocation);
  return 1 / (distance + 1); // Inverse distance as efficiency score
}

function calculateDistance(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  // Haversine formula for distance calculation
  const R = 3959; // Earth's radius in miles
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
