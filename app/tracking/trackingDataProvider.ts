// GPS/ELD data provider and integration interface
// Client-safe entrypoint that calls server-side integrations

export type TrackingStatus = "on_schedule" | "delayed" | "critical";

export interface TrackingRecord {
  driverId: string;
  driverName: string;
  truckNumber: string;
  trailerNumber: string;
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  direction: string;
  status: TrackingStatus;
  loadId: string;
  route: string;
  eta: string;
  loadStatus: string;
  material: string;
  customer: string;
  jobSite: string;
}

const DEFAULT_MOCK_DATA: TrackingRecord[] = [
  {
    driverId: "D001",
    driverName: "Alice Smith",
    truckNumber: "T100",
    trailerNumber: "TR200",
    lat: 34.0522,
    lng: -118.2437,
    timestamp: new Date().toISOString(),
    speed: 55,
    direction: "NE",
    status: "on_schedule",
    loadId: "L001",
    route: "LA to SF",
    eta: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    loadStatus: "In Transit",
    material: "Gravel",
    customer: "Acme Construction",
    jobSite: "Site A",
  },
  {
    driverId: "D002",
    driverName: "Bob Jones",
    truckNumber: "T101",
    trailerNumber: "TR201",
    lat: 36.1699,
    lng: -115.1398,
    timestamp: new Date().toISOString(),
    speed: 0,
    direction: "N",
    status: "delayed",
    loadId: "L002",
    route: "Vegas to Reno",
    eta: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    loadStatus: "Idle",
    material: "Sand",
    customer: "BuildCo",
    jobSite: "Site B",
  },
  {
    driverId: "D003",
    driverName: "Carlos Diaz",
    truckNumber: "T102",
    trailerNumber: "TR202",
    lat: 37.7749,
    lng: -122.4194,
    timestamp: new Date().toISOString(),
    speed: 40,
    direction: "W",
    status: "critical",
    loadId: "L003",
    route: "SF to Sacramento",
    eta: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
    loadStatus: "Critical",
    material: "Cement",
    customer: "MegaBuild",
    jobSite: "Site C",
  },
];

export async function fetchMockTrackingData(): Promise<TrackingRecord[]> {
  return DEFAULT_MOCK_DATA;
}

export async function fetchTrackingData(
  provider?: string,
): Promise<TrackingRecord[]> {
  try {
    const selectedProvider =
      provider || process.env.NEXT_PUBLIC_ELD_PROVIDER || "samsara";
    const res = await fetch(
      `/api/tracking/locations?provider=${encodeURIComponent(selectedProvider)}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return DEFAULT_MOCK_DATA;
    }
    const data = await res.json();
    if (!Array.isArray(data.records)) return DEFAULT_MOCK_DATA;
    return data.records;
  } catch (error) {
    console.warn("Tracking data fetch failed, using mock data.", error);
    return DEFAULT_MOCK_DATA;
  }
}

// To integrate with a real provider, implement a function with the same signature as fetchMockTrackingData
// and swap it in the Tracking page/component.

// --- Provider Integration Skeletons ---

// 1. Geotab
export async function fetchGeotabTrackingData(): Promise<TrackingRecord[]> {
  return fetchTrackingData("geotab");
}

// 2. Motive (KeepTruckin)
export async function fetchMotiveTrackingData(): Promise<TrackingRecord[]> {
  return fetchTrackingData("keeptruckin");
}

// 3. Verizon Connect
export async function fetchVerizonTrackingData(): Promise<TrackingRecord[]> {
  return fetchTrackingData("verizon");
}

// 4. Omnitracs
export async function fetchOmnitracsTrackingData(): Promise<TrackingRecord[]> {
  return fetchTrackingData("omnitracs");
}

// 5. Fleet Complete
export async function fetchFleetCompleteTrackingData(): Promise<
  TrackingRecord[]
> {
  return fetchTrackingData("fleetcomplete");
}
