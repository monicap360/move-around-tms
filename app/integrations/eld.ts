// ELD/Telematics Integration Layer
// This module provides integration points for Samsara, KeepTruckin, and Geotab ELD providers.
// It exposes functions to fetch driver/truck location, HOS, and load status.
//
// ---
// **Production Setup: Samsara API Key**
//
// To enable live ELD/telematics data, set your Samsara API key as an environment variable:
//   - For local/dev: add to your .env.local file:
//       SAMSARA_API_KEY=your_actual_api_key_here
//   - For Vercel/production: add SAMSARA_API_KEY in your project/environment settings.
//
// The integration will automatically use this key for all API calls.
// ---

export interface ELDProvider {
  name: string;
  fetchDriverLocations(): Promise<any[]>;
  fetchTruckStatus(): Promise<any[]>;
  fetchHOS(): Promise<any[]>;
}

type JsonRecord = Record<string, any>;

const defaultHeaders = (token?: string) => ({
  Accept: "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const getLatLng = (record: JsonRecord) => {
  const location = record.location || record.lastLocation || record.position;
  const lat =
    location?.latitude ??
    location?.lat ??
    record.latitude ??
    record.lat ??
    record.locationLatitude;
  const lon =
    location?.longitude ??
    location?.lon ??
    location?.lng ??
    record.longitude ??
    record.lon ??
    record.lng ??
    record.locationLongitude;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return { lat, lon };
};

const getSpeed = (record: JsonRecord) =>
  record.location?.speed ??
  record.speed ??
  record.velocity ??
  record.locationSpeed ??
  0;

const getUpdatedAt = (record: JsonRecord) =>
  record.location?.time ??
  record.location?.timestamp ??
  record.lastUpdate ??
  record.updatedAt ??
  record.timestamp ??
  record.dateTime ??
  new Date().toISOString();

const getHeading = (record: JsonRecord) =>
  record.location?.heading ??
  record.heading ??
  record.bearing ??
  record.direction;

async function tryFetchJson(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Example: Samsara integration stub
export const samsara: ELDProvider = {
  name: "Samsara",
  async fetchDriverLocations() {
    // Example: Fetch driver locations from Samsara API
    try {
      const apiKey = process.env.SAMSARA_API_KEY || "YOUR_SAMSARA_API_KEY";
      const res = await fetch(
        "https://api.samsara.com/v1/fleet/drivers/locations",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) throw new Error("Samsara API error: " + res.status);
      const data = await res.json();
      // Map to standard format
      return (data.drivers || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        lat: d.location?.latitude,
        lon: d.location?.longitude,
        status: d.status,
        updatedAt: d.location?.time,
      }));
    } catch (err) {
      console.error("Samsara fetchDriverLocations error", err);
      return [];
    }
  },
  async fetchTruckStatus() {
    try {
      const apiKey = process.env.SAMSARA_API_KEY || "YOUR_SAMSARA_API_KEY";
      const res = await fetch("https://api.samsara.com/v1/fleet/vehicles", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) throw new Error("Samsara API error: " + res.status);
      const data = await res.json();
      return (data.vehicles || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        status: v.status,
        lat: v.location?.latitude,
        lon: v.location?.longitude,
        updatedAt: v.location?.time,
      }));
    } catch (err) {
      console.error("Samsara fetchTruckStatus error", err);
      return [];
    }
  },
  async fetchHOS() {
    try {
      const apiKey = process.env.SAMSARA_API_KEY || "YOUR_SAMSARA_API_KEY";
      const res = await fetch(
        "https://api.samsara.com/v1/fleet/hos/duty_status",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) throw new Error("Samsara API error: " + res.status);
      const data = await res.json();
      return (data.drivers || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        hosStatus: d.hosStatus,
        updatedAt: d.hosStatusUpdatedAt,
      }));
    } catch (err) {
      console.error("Samsara fetchHOS error", err);
      return [];
    }
  },
};

// Production-ready KeepTruckin integration stub
export const keepTruckin: ELDProvider = {
  name: "KeepTruckin",
  async fetchDriverLocations() {
    const apiKey = process.env.KEEPTRUCKIN_API_KEY;
    if (!apiKey) {
      console.warn("KeepTruckin API key missing. Returning empty results.");
      return [];
    }
    const baseUrl =
      process.env.KEEPTRUCKIN_API_BASE_URL || "https://api.gomotive.com/v1";
    const headers = defaultHeaders(apiKey);
    const endpoints = [
      `${baseUrl}/drivers/locations`,
      `${baseUrl}/drivers`,
      `${baseUrl}/vehicles/locations`,
      `${baseUrl}/vehicles`,
    ];
    for (const endpoint of endpoints) {
      const data = await tryFetchJson(endpoint, headers);
      if (!data) continue;
      const records = data.drivers || data.vehicles || data.data || data;
      if (!Array.isArray(records)) continue;
      return records
        .map((record: JsonRecord) => {
          const coords = getLatLng(record);
          if (!coords) return null;
          return {
            id: record.id || record.driverId || record.vehicleId,
            name: record.name || record.full_name || record.driverName,
            lat: coords.lat,
            lon: coords.lon,
            speed: getSpeed(record),
            heading: getHeading(record),
            status: record.status || record.state,
            updatedAt: getUpdatedAt(record),
          };
        })
        .filter(Boolean);
    }
    console.warn("KeepTruckin API returned no usable location data.");
    return [];
  },
  async fetchTruckStatus() {
    const apiKey = process.env.KEEPTRUCKIN_API_KEY;
    if (!apiKey) {
      console.warn("KeepTruckin API key missing. Returning empty results.");
      return [];
    }
    const baseUrl =
      process.env.KEEPTRUCKIN_API_BASE_URL || "https://api.gomotive.com/v1";
    const headers = defaultHeaders(apiKey);
    const data =
      (await tryFetchJson(`${baseUrl}/vehicles`, headers)) ??
      (await tryFetchJson(`${baseUrl}/vehicles/locations`, headers));
    const vehicles = data?.vehicles || data?.data || data;
    if (!Array.isArray(vehicles)) return [];
    return vehicles.map((vehicle: JsonRecord) => ({
      id: vehicle.id || vehicle.vehicleId,
      name: vehicle.name || vehicle.vehicleNumber,
      status: vehicle.status || vehicle.state,
      lat: getLatLng(vehicle)?.lat,
      lon: getLatLng(vehicle)?.lon,
      speed: getSpeed(vehicle),
      updatedAt: getUpdatedAt(vehicle),
    }));
  },
  async fetchHOS() {
    const apiKey = process.env.KEEPTRUCKIN_API_KEY;
    if (!apiKey) {
      console.warn("KeepTruckin API key missing. Returning empty results.");
      return [];
    }
    const baseUrl =
      process.env.KEEPTRUCKIN_API_BASE_URL || "https://api.gomotive.com/v1";
    const headers = defaultHeaders(apiKey);
    const data =
      (await tryFetchJson(`${baseUrl}/hos_logs`, headers)) ??
      (await tryFetchJson(`${baseUrl}/drivers/hos`, headers));
    const records = data?.logs || data?.drivers || data?.data || data;
    if (!Array.isArray(records)) return [];
    return records.map((record: JsonRecord) => ({
      id: record.id || record.driverId,
      name: record.driverName || record.name,
      hosStatus: record.hosStatus || record.status || record.dutyStatus,
      updatedAt: getUpdatedAt(record),
    }));
  },
};

// Production-ready Geotab integration stub
export const geotab: ELDProvider = {
  name: "Geotab",
  async fetchDriverLocations() {
    const username = process.env.GEOTAB_USERNAME;
    const password = process.env.GEOTAB_PASSWORD;
    const database = process.env.GEOTAB_DATABASE;
    if (!username || !password || !database) {
      console.warn("Geotab credentials missing. Returning empty results.");
      return [];
    }
    const server = process.env.GEOTAB_SERVER || "https://my.geotab.com";
    const endpoint = server.endsWith("/apiv1")
      ? server
      : `${server.replace(/\/$/, "")}/apiv1`;
    const rpc = async (method: string, params: JsonRecord) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
      });
      if (!res.ok) throw new Error(`Geotab API error: ${res.status}`);
      const data = await res.json();
      if (data?.error) throw new Error(data.error.message || "Geotab API error");
      return data.result;
    };
    try {
      const auth = await rpc("Authenticate", {
        database,
        userName: username,
        password,
      });
      const credentials = auth?.credentials;
      if (!credentials) return [];
      const devices = await rpc("Get", {
        typeName: "Device",
        credentials,
      });
      const deviceMap = new Map(
        (devices || []).map((device: JsonRecord) => [device.id, device.name]),
      );
      const statuses = await rpc("Get", {
        typeName: "DeviceStatusInfo",
        credentials,
        resultsLimit: 250,
      });
      if (!Array.isArray(statuses)) return [];
      return statuses
        .map((status: JsonRecord) => {
          if (typeof status.latitude !== "number" || typeof status.longitude !== "number") {
            return null;
          }
          return {
            id: status.device?.id || status.deviceId || status.id,
            name: deviceMap.get(status.device?.id || status.deviceId) || "Vehicle",
            lat: status.latitude,
            lon: status.longitude,
            speed: status.speed || 0,
            heading: status.bearing || status.direction,
            status: status.status ?? (status.isMoving ? "moving" : "idle"),
            updatedAt: status.dateTime || status.updatedAt,
          };
        })
        .filter(Boolean);
    } catch (err) {
      console.error("Geotab fetchDriverLocations error", err);
      return [];
    }
  },
  async fetchTruckStatus() {
    const username = process.env.GEOTAB_USERNAME;
    const password = process.env.GEOTAB_PASSWORD;
    const database = process.env.GEOTAB_DATABASE;
    if (!username || !password || !database) {
      console.warn("Geotab credentials missing. Returning empty results.");
      return [];
    }
    const server = process.env.GEOTAB_SERVER || "https://my.geotab.com";
    const endpoint = server.endsWith("/apiv1")
      ? server
      : `${server.replace(/\/$/, "")}/apiv1`;
    const rpc = async (method: string, params: JsonRecord) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
      });
      if (!res.ok) throw new Error(`Geotab API error: ${res.status}`);
      const data = await res.json();
      if (data?.error) throw new Error(data.error.message || "Geotab API error");
      return data.result;
    };
    try {
      const auth = await rpc("Authenticate", {
        database,
        userName: username,
        password,
      });
      const credentials = auth?.credentials;
      if (!credentials) return [];
      const statuses = await rpc("Get", {
        typeName: "DeviceStatusInfo",
        credentials,
        resultsLimit: 250,
      });
      if (!Array.isArray(statuses)) return [];
      return statuses.map((status: JsonRecord) => ({
        id: status.device?.id || status.deviceId || status.id,
        name: status.device?.name || status.deviceName,
        status: status.status ?? (status.isMoving ? "moving" : "idle"),
        lat: status.latitude,
        lon: status.longitude,
        speed: status.speed || 0,
        updatedAt: status.dateTime || status.updatedAt,
      }));
    } catch (err) {
      console.error("Geotab fetchTruckStatus error", err);
      return [];
    }
  },
  async fetchHOS() {
    const username = process.env.GEOTAB_USERNAME;
    const password = process.env.GEOTAB_PASSWORD;
    const database = process.env.GEOTAB_DATABASE;
    if (!username || !password || !database) {
      console.warn("Geotab credentials missing. Returning empty results.");
      return [];
    }
    const server = process.env.GEOTAB_SERVER || "https://my.geotab.com";
    const endpoint = server.endsWith("/apiv1")
      ? server
      : `${server.replace(/\/$/, "")}/apiv1`;
    const rpc = async (method: string, params: JsonRecord) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params }),
      });
      if (!res.ok) throw new Error(`Geotab API error: ${res.status}`);
      const data = await res.json();
      if (data?.error) throw new Error(data.error.message || "Geotab API error");
      return data.result;
    };
    try {
      const auth = await rpc("Authenticate", {
        database,
        userName: username,
        password,
      });
      const credentials = auth?.credentials;
      if (!credentials) return [];
      const dutyStatus = await rpc("Get", {
        typeName: "DutyStatusLog",
        credentials,
        resultsLimit: 250,
      });
      if (!Array.isArray(dutyStatus)) return [];
      return dutyStatus.map((log: JsonRecord) => ({
        id: log.driver?.id || log.driverId || log.id,
        name: log.driver?.name || log.driverName,
        hosStatus: log.status || log.dutyStatus,
        updatedAt: log.dateTime || log.updatedAt,
      }));
    } catch (err) {
      console.error("Geotab fetchHOS error", err);
      return [];
    }
  },
};

export const eldProviders = [samsara, keepTruckin, geotab];
