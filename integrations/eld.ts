// ELD/Telematics Integration Layer
// Provides provider-aware fetch helpers for Samsara, Motive (KeepTruckin), and Geotab.

export type EldFetchOptions = {
  useProxy?: boolean;
  signal?: AbortSignal;
};

export type DriverLocation = {
  id: string;
  name: string;
  lat?: number;
  lon?: number;
  status?: string;
  updatedAt?: string;
  provider?: string;
};

export type TruckStatus = {
  id: string;
  name: string;
  status?: string;
  lat?: number;
  lon?: number;
  updatedAt?: string;
  provider?: string;
};

export type HosStatus = {
  id: string;
  name: string;
  hosStatus?: string;
  updatedAt?: string;
  provider?: string;
};

export interface ELDProvider {
  name: string;
  fetchDriverLocations(options?: EldFetchOptions): Promise<DriverLocation[]>;
  fetchTruckStatus(options?: EldFetchOptions): Promise<TruckStatus[]>;
  fetchHOS(options?: EldFetchOptions): Promise<HosStatus[]>;
}

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_LOOKBACK_HOURS = 6;

const isBrowser = typeof window !== "undefined";

function getTimeoutMs() {
  if (isBrowser) return DEFAULT_TIMEOUT_MS;
  const envValue = Number(process.env.ELD_TIMEOUT_MS);
  return Number.isFinite(envValue) ? envValue : DEFAULT_TIMEOUT_MS;
}

function shouldUseProxy(options?: EldFetchOptions) {
  if (options?.useProxy !== undefined) return options.useProxy;
  return isBrowser || process.env.ELD_FORCE_PROXY === "true";
}

function joinUrl(base: string, path: string) {
  const trimmedBase = base.replace(/\/$/, "");
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

function getProxyBase() {
  if (isBrowser) return "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return "http://localhost:3000";
}

async function fetchJson(
  url: string,
  options: RequestInit = {},
  timeoutMs = getTimeoutMs(),
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    ...options,
    signal: options.signal ?? controller.signal,
  });
  clearTimeout(timeout);

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `ELD request failed (${response.status}): ${
        text || response.statusText
      }`,
    );
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchFromProxy<T>(
  provider: string,
  endpoint: string,
  options?: EldFetchOptions,
): Promise<T[]> {
  const base = getProxyBase();
  const url = `${base}/api/eld/${provider}/${endpoint}`;
  const response = await fetchJson(url, { cache: "no-store" }, getTimeoutMs());
  return (response?.data ?? response) as T[];
}

function toNumber(value: any) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function normalizeSamsaraDrivers(payload: any): DriverLocation[] {
  const list = payload?.drivers || payload?.data || payload?.items || [];
  return list.map((driver: any) => ({
    id: driver.id || driver.driverId || driver.driver?.id || "unknown",
    name: driver.name || driver.driverName || driver.driver?.name || "Unknown",
    lat:
      toNumber(driver.location?.latitude) ??
      toNumber(driver.latitude) ??
      toNumber(driver.lat),
    lon:
      toNumber(driver.location?.longitude) ??
      toNumber(driver.longitude) ??
      toNumber(driver.lon),
    status:
      driver.status ||
      driver.driverStatus ||
      driver.hosStatus ||
      driver.dutyStatus,
    updatedAt:
      driver.location?.time ||
      driver.location?.timestamp ||
      driver.updatedAt ||
      driver.timestamp,
    provider: "samsara",
  }));
}

function normalizeSamsaraTrucks(payload: any): TruckStatus[] {
  const list = payload?.vehicles || payload?.data || payload?.items || [];
  return list.map((vehicle: any) => ({
    id: vehicle.id || vehicle.vehicleId || "unknown",
    name: vehicle.name || vehicle.label || vehicle.vin || "Vehicle",
    status: vehicle.status || vehicle.vehicleStatus,
    lat:
      toNumber(vehicle.location?.latitude) ??
      toNumber(vehicle.latitude) ??
      toNumber(vehicle.lat),
    lon:
      toNumber(vehicle.location?.longitude) ??
      toNumber(vehicle.longitude) ??
      toNumber(vehicle.lon),
    updatedAt:
      vehicle.location?.time ||
      vehicle.location?.timestamp ||
      vehicle.updatedAt ||
      vehicle.timestamp,
    provider: "samsara",
  }));
}

function normalizeSamsaraHOS(payload: any): HosStatus[] {
  const list = payload?.drivers || payload?.data || payload?.items || [];
  return list.map((driver: any) => ({
    id: driver.id || driver.driverId || "unknown",
    name: driver.name || driver.driverName || "Driver",
    hosStatus:
      driver.hosStatus ||
      driver.currentDutyStatus ||
      driver.dutyStatus ||
      driver.status,
    updatedAt:
      driver.hosStatusUpdatedAt ||
      driver.updatedAt ||
      driver.timestamp ||
      driver.location?.time,
    provider: "samsara",
  }));
}

async function fetchSamsaraEndpoint(path: string, options?: EldFetchOptions) {
  const apiKey = process.env.SAMSARA_API_KEY;
  if (!apiKey) {
    console.warn("Samsara API key missing. Returning empty results.");
    return null;
  }
  const baseUrl =
    process.env.SAMSARA_API_BASE_URL || "https://api.samsara.com";
  const url = joinUrl(baseUrl, path);
  return fetchJson(
    url,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: options?.signal,
    },
    getTimeoutMs(),
  );
}

async function fetchSamsaraDriversDirect(options?: EldFetchOptions) {
  const path =
    process.env.SAMSARA_DRIVER_LOCATIONS_PATH ||
    "/v1/fleet/drivers/locations";
  const data = await fetchSamsaraEndpoint(path, options);
  if (!data) return [];
  return normalizeSamsaraDrivers(data);
}

async function fetchSamsaraTrucksDirect(options?: EldFetchOptions) {
  const path =
    process.env.SAMSARA_TRUCK_STATUS_PATH || "/v1/fleet/vehicles";
  const data = await fetchSamsaraEndpoint(path, options);
  if (!data) return [];
  return normalizeSamsaraTrucks(data);
}

async function fetchSamsaraHosDirect(options?: EldFetchOptions) {
  const path =
    process.env.SAMSARA_HOS_STATUS_PATH || "/v1/fleet/hos/duty_status";
  const data = await fetchSamsaraEndpoint(path, options);
  if (!data) return [];
  return normalizeSamsaraHOS(data);
}

function normalizeMotiveDrivers(payload: any): DriverLocation[] {
  const list = payload?.users || payload?.drivers || payload?.data || payload || [];
  return (Array.isArray(list) ? list : []).map((driver: any) => ({
    id: driver.id || driver.driver_id || driver.user_id || "unknown",
    name:
      driver.name ||
      [driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
      "Driver",
    lat:
      toNumber(driver.location?.lat) ??
      toNumber(driver.location?.latitude) ??
      toNumber(driver.last_location?.lat) ??
      toNumber(driver.last_location?.latitude),
    lon:
      toNumber(driver.location?.lon) ??
      toNumber(driver.location?.longitude) ??
      toNumber(driver.last_location?.lon) ??
      toNumber(driver.last_location?.longitude),
    status: driver.status || driver.duty_status,
    updatedAt:
      driver.location?.timestamp ||
      driver.location?.time ||
      driver.last_location?.timestamp,
    provider: "motive",
  }));
}

function normalizeMotiveTrucks(payload: any): TruckStatus[] {
  const list = payload?.vehicles || payload?.data || payload || [];
  return (Array.isArray(list) ? list : []).map((vehicle: any) => ({
    id: vehicle.id || vehicle.vehicle_id || "unknown",
    name: vehicle.name || vehicle.label || vehicle.vin || "Vehicle",
    status: vehicle.status || vehicle.vehicle_status,
    lat:
      toNumber(vehicle.location?.lat) ??
      toNumber(vehicle.location?.latitude) ??
      toNumber(vehicle.last_location?.lat),
    lon:
      toNumber(vehicle.location?.lon) ??
      toNumber(vehicle.location?.longitude) ??
      toNumber(vehicle.last_location?.lon),
    updatedAt:
      vehicle.location?.timestamp ||
      vehicle.location?.time ||
      vehicle.last_location?.timestamp,
    provider: "motive",
  }));
}

function normalizeMotiveHOS(payload: any): HosStatus[] {
  const list = payload?.drivers || payload?.data || payload?.hos || payload || [];
  return (Array.isArray(list) ? list : []).map((driver: any) => ({
    id: driver.id || driver.driver_id || "unknown",
    name:
      driver.name ||
      [driver.first_name, driver.last_name].filter(Boolean).join(" ") ||
      "Driver",
    hosStatus:
      driver.hos_status ||
      driver.duty_status ||
      driver.status ||
      driver.current_status,
    updatedAt: driver.updated_at || driver.last_updated || driver.timestamp,
    provider: "motive",
  }));
}

async function fetchMotiveEndpoint(path: string, options?: EldFetchOptions) {
  const apiKey =
    process.env.MOTIVE_API_KEY || process.env.KEEPTRUCKIN_API_KEY;
  if (!apiKey) {
    console.warn("Motive API key missing. Returning empty results.");
    return null;
  }
  const baseUrl =
    process.env.KEEPTRUCKIN_API_BASE_URL ||
    process.env.MOTIVE_API_BASE_URL ||
    "https://api.gomotive.com/v1";
  const url = joinUrl(baseUrl, path);
  return fetchJson(
    url,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: options?.signal,
    },
    getTimeoutMs(),
  );
}

async function fetchMotiveDriversDirect(options?: EldFetchOptions) {
  const path =
    process.env.MOTIVE_DRIVER_LOCATIONS_PATH ||
    process.env.KEEPTRUCKIN_DRIVER_LOCATIONS_PATH ||
    "/users";
  const data = await fetchMotiveEndpoint(path, options);
  if (!data) return [];
  return normalizeMotiveDrivers(data);
}

async function fetchMotiveTrucksDirect(options?: EldFetchOptions) {
  const path =
    process.env.MOTIVE_VEHICLE_STATUS_PATH ||
    process.env.KEEPTRUCKIN_VEHICLE_STATUS_PATH ||
    "/vehicles";
  const data = await fetchMotiveEndpoint(path, options);
  if (!data) return [];
  return normalizeMotiveTrucks(data);
}

async function fetchMotiveHosDirect(options?: EldFetchOptions) {
  const path =
    process.env.MOTIVE_HOS_PATH ||
    process.env.KEEPTRUCKIN_HOS_PATH ||
    "/hos";
  const data = await fetchMotiveEndpoint(path, options);
  if (!data) return [];
  return normalizeMotiveHOS(data);
}

type GeotabCredentials = {
  database: string;
  sessionId: string;
  userName: string;
};

async function geotabRpc(
  url: string,
  method: string,
  params: Record<string, any>,
  options?: EldFetchOptions,
) {
  const payload = {
    method,
    params,
    id: Math.floor(Math.random() * 100000),
  };
  return fetchJson(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: options?.signal,
    },
    getTimeoutMs(),
  );
}

async function geotabAuthenticate(options?: EldFetchOptions) {
  const userName = process.env.GEOTAB_USERNAME;
  const password = process.env.GEOTAB_PASSWORD;
  const database = process.env.GEOTAB_DATABASE;
  if (!userName || !password || !database) {
    console.warn("Geotab credentials missing. Returning empty results.");
    return null;
  }
  const server = process.env.GEOTAB_SERVER || "https://my.geotab.com";
  const url = server.endsWith("/apiv1") ? server : `${server}/apiv1`;
  const response = await geotabRpc(
    url,
    "Authenticate",
    {
      database,
      userName,
      password,
    },
    options,
  );
  const credentials = response?.result?.credentials || response?.result;
  if (!credentials?.sessionId) {
    console.warn("Geotab authentication failed.");
    return null;
  }
  return {
    url,
    credentials: {
      database: credentials.database || database,
      sessionId: credentials.sessionId,
      userName: credentials.userName || userName,
    } as GeotabCredentials,
  };
}

async function geotabGet(
  url: string,
  credentials: GeotabCredentials,
  typeName: string,
  search: Record<string, any>,
  options?: EldFetchOptions,
) {
  const response = await geotabRpc(
    url,
    "Get",
    {
      typeName,
      search,
      resultsLimit: 250,
      credentials,
    },
    options,
  );
  return response?.result || [];
}

async function fetchGeotabStatusInfo(options?: EldFetchOptions) {
  const auth = await geotabAuthenticate(options);
  if (!auth) return { devices: [], statusInfo: [], users: [] };

  const since = new Date(
    Date.now() - DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const [devices, statusInfo, users] = await Promise.all([
    geotabGet(auth.url, auth.credentials, "Device", {}, options),
    geotabGet(
      auth.url,
      auth.credentials,
      "DeviceStatusInfo",
      { fromDate: since },
      options,
    ),
    geotabGet(
      auth.url,
      auth.credentials,
      "User",
      { isDriver: true },
      options,
    ),
  ]);

  return { devices, statusInfo, users };
}

async function fetchGeotabDriversDirect(options?: EldFetchOptions) {
  const { statusInfo, users, devices } = await fetchGeotabStatusInfo(options);
  const deviceMap = new Map(
    devices.map((device: any) => [device.id, device.name]),
  );
  const userMap = new Map(users.map((user: any) => [user.id, user.name]));

  return statusInfo.map((info: any) => {
    const deviceId =
      info.device?.id || info.deviceId || info.device?.deviceId || "unknown";
    const driverId = info.driver?.id || info.driverId || deviceId;
    return {
      id: driverId,
      name:
        userMap.get(driverId) ||
        info.driver?.name ||
        deviceMap.get(deviceId) ||
        "Driver",
      lat: toNumber(info.latitude) ?? toNumber(info.position?.latitude),
      lon: toNumber(info.longitude) ?? toNumber(info.position?.longitude),
      status: info.status || info.driverStatus || info.engineStatus,
      updatedAt: info.dateTime || info.timestamp,
      provider: "geotab",
    };
  });
}

async function fetchGeotabTrucksDirect(options?: EldFetchOptions) {
  const { statusInfo, devices } = await fetchGeotabStatusInfo(options);
  const deviceMap = new Map(
    devices.map((device: any) => [device.id, device.name]),
  );

  return statusInfo.map((info: any) => {
    const deviceId =
      info.device?.id || info.deviceId || info.device?.deviceId || "unknown";
    return {
      id: deviceId,
      name: deviceMap.get(deviceId) || info.device?.name || "Vehicle",
      status: info.status || info.engineStatus,
      lat: toNumber(info.latitude) ?? toNumber(info.position?.latitude),
      lon: toNumber(info.longitude) ?? toNumber(info.position?.longitude),
      updatedAt: info.dateTime || info.timestamp,
      provider: "geotab",
    };
  });
}

async function fetchGeotabHosDirect(options?: EldFetchOptions) {
  const auth = await geotabAuthenticate(options);
  if (!auth) return [];

  const since = new Date(
    Date.now() - DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const [logs, users] = await Promise.all([
    geotabGet(
      auth.url,
      auth.credentials,
      "DutyStatusLog",
      { fromDate: since },
      options,
    ),
    geotabGet(auth.url, auth.credentials, "User", { isDriver: true }, options),
  ]);

  const userMap = new Map(users.map((user: any) => [user.id, user.name]));
  const latestByDriver = new Map<string, any>();

  (logs || []).forEach((log: any) => {
    const driverId = log.driver?.id || log.user?.id || log.driverId;
    if (!driverId || latestByDriver.has(driverId)) return;
    latestByDriver.set(driverId, log);
  });

  return Array.from(latestByDriver.entries()).map(([driverId, log]) => ({
    id: driverId,
    name: userMap.get(driverId) || log.driver?.name || "Driver",
    hosStatus: log.status || log.dutyStatus || log.state || "Unknown",
    updatedAt: log.dateTime || log.timestamp,
    provider: "geotab",
  }));
}

export const samsara: ELDProvider = {
  name: "Samsara",
  async fetchDriverLocations(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("samsara", "driver-locations", options);
    }
    try {
      return await fetchSamsaraDriversDirect(options);
    } catch (error) {
      console.error("Samsara fetchDriverLocations error", error);
      return [];
    }
  },
  async fetchTruckStatus(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("samsara", "truck-status", options);
    }
    try {
      return await fetchSamsaraTrucksDirect(options);
    } catch (error) {
      console.error("Samsara fetchTruckStatus error", error);
      return [];
    }
  },
  async fetchHOS(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("samsara", "hos", options);
    }
    try {
      return await fetchSamsaraHosDirect(options);
    } catch (error) {
      console.error("Samsara fetchHOS error", error);
      return [];
    }
  },
};

export const keepTruckin: ELDProvider = {
  name: "Motive",
  async fetchDriverLocations(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("motive", "driver-locations", options);
    }
    try {
      return await fetchMotiveDriversDirect(options);
    } catch (error) {
      console.error("Motive fetchDriverLocations error", error);
      return [];
    }
  },
  async fetchTruckStatus(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("motive", "truck-status", options);
    }
    try {
      return await fetchMotiveTrucksDirect(options);
    } catch (error) {
      console.error("Motive fetchTruckStatus error", error);
      return [];
    }
  },
  async fetchHOS(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("motive", "hos", options);
    }
    try {
      return await fetchMotiveHosDirect(options);
    } catch (error) {
      console.error("Motive fetchHOS error", error);
      return [];
    }
  },
};

export const geotab: ELDProvider = {
  name: "Geotab",
  async fetchDriverLocations(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("geotab", "driver-locations", options);
    }
    try {
      return await fetchGeotabDriversDirect(options);
    } catch (error) {
      console.error("Geotab fetchDriverLocations error", error);
      return [];
    }
  },
  async fetchTruckStatus(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("geotab", "truck-status", options);
    }
    try {
      return await fetchGeotabTrucksDirect(options);
    } catch (error) {
      console.error("Geotab fetchTruckStatus error", error);
      return [];
    }
  },
  async fetchHOS(options) {
    if (shouldUseProxy(options)) {
      return fetchFromProxy("geotab", "hos", options);
    }
    try {
      return await fetchGeotabHosDirect(options);
    } catch (error) {
      console.error("Geotab fetchHOS error", error);
      return [];
    }
  },
};

export const motive = keepTruckin;
export const eldProviders = [samsara, keepTruckin, geotab];
