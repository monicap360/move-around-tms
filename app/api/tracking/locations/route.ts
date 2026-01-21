import { NextRequest, NextResponse } from "next/server";
import { geotab, keepTruckin, samsara } from "@/integrations/eld";
import type { TrackingRecord, TrackingStatus } from "@/app/tracking/trackingDataProvider";

type ProviderLocation = {
  id?: string;
  name?: string;
  lat?: number;
  lon?: number;
  speed?: number;
  heading?: number | string;
  status?: string;
  updatedAt?: string;
};

const providers = {
  samsara,
  keeptruckin: keepTruckin,
  motive: keepTruckin,
  geotab,
};

const toDirection = (heading?: number | string) => {
  if (heading === undefined || heading === null) return "N";
  const value = typeof heading === "string" ? Number(heading) : heading;
  if (!Number.isFinite(value)) return "N";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const index = Math.round(value / 45);
  return directions[Math.min(index, directions.length - 1)];
};

const toStatus = (status?: string, speed?: number): TrackingStatus => {
  const normalized = status?.toLowerCase() || "";
  if (normalized.includes("critical") || normalized.includes("alert")) return "critical";
  if (normalized.includes("delayed") || normalized.includes("idle") || normalized.includes("stopped")) {
    return "delayed";
  }
  if (typeof speed === "number" && speed <= 1) return "delayed";
  return "on_schedule";
};

const toTrackingRecord = (record: ProviderLocation): TrackingRecord => ({
  driverId: record.id || "unknown",
  driverName: record.name || "Unknown Driver",
  truckNumber: record.name || "Truck",
  trailerNumber: "",
  lat: record.lat ?? 0,
  lng: record.lon ?? 0,
  timestamp: record.updatedAt || new Date().toISOString(),
  speed: record.speed ?? 0,
  direction: toDirection(record.heading),
  status: toStatus(record.status, record.speed),
  loadId: "",
  route: "",
  eta: "",
  loadStatus: "",
  material: "",
  customer: "",
  jobSite: "",
});

export async function GET(req: NextRequest) {
  const providerName = (req.nextUrl.searchParams.get("provider") || "samsara")
    .toLowerCase()
    .trim();
  const provider = providers[providerName as keyof typeof providers] ?? samsara;

  try {
    const [drivers, trucks] = await Promise.all([
      provider.fetchDriverLocations(),
      provider.fetchTruckStatus(),
    ]);
    const combined = [...drivers, ...trucks]
      .map((entry: any) => ({
        id: entry.id,
        name: entry.name,
        lat: entry.lat ?? entry.latitude,
        lon: entry.lon ?? entry.lng ?? entry.longitude,
        speed: entry.speed,
        heading: entry.heading,
        status: entry.status,
        updatedAt: entry.updatedAt,
      }))
      .filter((entry) => typeof entry.lat === "number" && typeof entry.lon === "number");

    return NextResponse.json({
      provider: provider.name,
      records: combined.map(toTrackingRecord),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tracking data" },
      { status: 500 },
    );
  }
}
