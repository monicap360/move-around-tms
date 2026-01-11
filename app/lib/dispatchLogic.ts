// Dispatch logic utilities
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
    console.log(
      `Finding backup truck for load ${loadId}, original truck ${originalTruckId}`,
    );

    // Mock implementation - in real app, this would:
    // 1. Query available trucks from database
    // 2. Find trucks with compatible drivers
    // 3. Calculate distance/efficiency scores
    // 4. Assign best available truck

    const availableTrucks: Truck[] = [
      {
        id: "truck-backup-1",
        number: "T-001",
        status: "available",
        driverId: "driver-1",
      },
      {
        id: "truck-backup-2",
        number: "T-002",
        status: "available",
        driverId: "driver-2",
      },
    ];

    if (availableTrucks.length === 0) {
      return {
        success: false,
        message: "No backup trucks available",
      };
    }

    // Select first available truck (in real app, use more sophisticated logic)
    const selectedTruck = availableTrucks[0];

    return {
      success: true,
      message: "Backup truck assigned successfully",
      assignment: {
        loadId,
        truckId: selectedTruck.id,
        driverId: selectedTruck.driverId,
        truckNumber: selectedTruck.number,
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
