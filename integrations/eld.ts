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

// KeepTruckin (now Motive) integration
// API Documentation: https://developer-docs.gomotive.com/
// Set MOTIVE_API_KEY environment variable to enable
export const keepTruckin: ELDProvider = {
  name: "KeepTruckin (Motive)",
  async fetchDriverLocations() {
    try {
      const apiKey = process.env.MOTIVE_API_KEY || process.env.KEEPTRUCKIN_API_KEY;
      if (!apiKey) {
        console.warn("Motive/KeepTruckin API key not configured");
        return [];
      }
      
      const res = await fetch(
        "https://api.gomotive.com/v1/driver_locations",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) throw new Error("Motive API error: " + res.status);
      const data = await res.json();
      
      return (data.driver_locations || []).map((dl: any) => ({
        id: dl.user?.id,
        name: `${dl.user?.first_name || ""} ${dl.user?.last_name || ""}`.trim(),
        lat: dl.location?.lat,
        lon: dl.location?.lon,
        status: dl.user?.status,
        updatedAt: dl.location?.located_at,
        vehicleId: dl.vehicle?.id,
        vehicleName: dl.vehicle?.number,
      }));
    } catch (err) {
      console.error("Motive fetchDriverLocations error", err);
      return [];
    }
  },
  async fetchTruckStatus() {
    try {
      const apiKey = process.env.MOTIVE_API_KEY || process.env.KEEPTRUCKIN_API_KEY;
      if (!apiKey) {
        console.warn("Motive/KeepTruckin API key not configured");
        return [];
      }
      
      const res = await fetch(
        "https://api.gomotive.com/v1/vehicle_locations",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) throw new Error("Motive API error: " + res.status);
      const data = await res.json();
      
      return (data.vehicles || []).map((v: any) => ({
        id: v.vehicle?.id,
        name: v.vehicle?.number,
        status: v.vehicle?.status,
        lat: v.location?.lat,
        lon: v.location?.lon,
        updatedAt: v.location?.located_at,
        vin: v.vehicle?.vin,
        make: v.vehicle?.make,
        model: v.vehicle?.model,
        year: v.vehicle?.year,
        fuelType: v.vehicle?.fuel_type,
        currentDriverId: v.driver?.id,
        currentDriverName: v.driver?.first_name ? `${v.driver.first_name} ${v.driver.last_name || ""}`.trim() : null,
      }));
    } catch (err) {
      console.error("Motive fetchTruckStatus error", err);
      return [];
    }
  },
  async fetchHOS() {
    try {
      const apiKey = process.env.MOTIVE_API_KEY || process.env.KEEPTRUCKIN_API_KEY;
      if (!apiKey) {
        console.warn("Motive/KeepTruckin API key not configured");
        return [];
      }
      
      const res = await fetch(
        "https://api.gomotive.com/v1/logs",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) throw new Error("Motive API error: " + res.status);
      const data = await res.json();
      
      return (data.logs || []).map((log: any) => ({
        id: log.log?.id,
        driverId: log.log?.driver?.id,
        name: log.log?.driver?.first_name ? `${log.log.driver.first_name} ${log.log.driver.last_name || ""}`.trim() : null,
        date: log.log?.date,
        hosStatus: log.log?.driver_signed_at ? "signed" : "unsigned",
        totalMiles: log.log?.total_miles,
        drivingDuration: log.log?.driving_duration,
        onDutyDuration: log.log?.on_duty_duration,
        offDutyDuration: log.log?.off_duty_duration,
        sleeperDuration: log.log?.sleeper_duration,
        violations: log.log?.violations || [],
        updatedAt: log.log?.updated_at,
      }));
    } catch (err) {
      console.error("Motive fetchHOS error", err);
      return [];
    }
  },
};

// Geotab integration
// API Documentation: https://developers.geotab.com/myGeotab/apiReference
// Set GEOTAB_DATABASE, GEOTAB_USERNAME, GEOTAB_PASSWORD environment variables to enable
// Geotab uses a session-based authentication model
export const geotab: ELDProvider = {
  name: "Geotab",
  
  async fetchDriverLocations() {
    try {
      const credentials = getGeotabCredentials();
      if (!credentials) {
        console.warn("Geotab credentials not configured");
        return [];
      }
      
      const session = await authenticateGeotab(credentials);
      if (!session) return [];
      
      const res = await fetch(
        `https://${session.path}/apiv1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "Get",
            params: {
              typeName: "DeviceStatusInfo",
              credentials: session.credentials,
            },
          }),
        },
      );
      
      if (!res.ok) throw new Error("Geotab API error: " + res.status);
      const data = await res.json();
      
      return (data.result || []).map((status: any) => ({
        id: status.driver?.id,
        name: status.driver?.name,
        lat: status.latitude,
        lon: status.longitude,
        status: status.isDriving ? "driving" : "stopped",
        updatedAt: status.dateTime,
        vehicleId: status.device?.id,
        vehicleName: status.device?.name,
        speed: status.speed,
        bearing: status.bearing,
      }));
    } catch (err) {
      console.error("Geotab fetchDriverLocations error", err);
      return [];
    }
  },
  
  async fetchTruckStatus() {
    try {
      const credentials = getGeotabCredentials();
      if (!credentials) {
        console.warn("Geotab credentials not configured");
        return [];
      }
      
      const session = await authenticateGeotab(credentials);
      if (!session) return [];
      
      const res = await fetch(
        `https://${session.path}/apiv1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "Get",
            params: {
              typeName: "DeviceStatusInfo",
              credentials: session.credentials,
            },
          }),
        },
      );
      
      if (!res.ok) throw new Error("Geotab API error: " + res.status);
      const data = await res.json();
      
      return (data.result || []).map((status: any) => ({
        id: status.device?.id,
        name: status.device?.name,
        status: status.isDeviceCommunicating ? (status.isDriving ? "driving" : "stopped") : "offline",
        lat: status.latitude,
        lon: status.longitude,
        updatedAt: status.dateTime,
        speed: status.speed,
        bearing: status.bearing,
        currentDriverId: status.driver?.id,
        currentDriverName: status.driver?.name,
      }));
    } catch (err) {
      console.error("Geotab fetchTruckStatus error", err);
      return [];
    }
  },
  
  async fetchHOS() {
    try {
      const credentials = getGeotabCredentials();
      if (!credentials) {
        console.warn("Geotab credentials not configured");
        return [];
      }
      
      const session = await authenticateGeotab(credentials);
      if (!session) return [];
      
      const res = await fetch(
        `https://${session.path}/apiv1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "Get",
            params: {
              typeName: "DutyStatusLog",
              credentials: session.credentials,
              search: {
                fromDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              },
            },
          }),
        },
      );
      
      if (!res.ok) throw new Error("Geotab API error: " + res.status);
      const data = await res.json();
      
      return (data.result || []).map((log: any) => ({
        id: log.id,
        driverId: log.driver?.id,
        name: log.driver?.name,
        date: log.dateTime,
        hosStatus: log.status,
        location: log.location,
        origin: log.origin,
        state: log.state,
        updatedAt: log.dateTime,
      }));
    } catch (err) {
      console.error("Geotab fetchHOS error", err);
      return [];
    }
  },
};

// Geotab helper functions
interface GeotabCredentials {
  database: string;
  userName: string;
  password: string;
}

interface GeotabSession {
  path: string;
  credentials: {
    database: string;
    userName: string;
    sessionId: string;
  };
}

function getGeotabCredentials(): GeotabCredentials | null {
  const database = process.env.GEOTAB_DATABASE;
  const userName = process.env.GEOTAB_USERNAME;
  const password = process.env.GEOTAB_PASSWORD;
  
  if (!database || !userName || !password) {
    return null;
  }
  
  return { database, userName, password };
}

async function authenticateGeotab(credentials: GeotabCredentials): Promise<GeotabSession | null> {
  try {
    const res = await fetch(
      "https://my.geotab.com/apiv1",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "Authenticate",
          params: {
            database: credentials.database,
            userName: credentials.userName,
            password: credentials.password,
          },
        }),
      },
    );
    
    if (!res.ok) throw new Error("Geotab authentication error: " + res.status);
    const data = await res.json();
    
    if (data.error) {
      throw new Error("Geotab authentication failed: " + data.error.message);
    }
    
    return {
      path: data.result.path || "my.geotab.com",
      credentials: {
        database: credentials.database,
        userName: credentials.userName,
        sessionId: data.result.credentials.sessionId,
      },
    };
  } catch (err) {
    console.error("Geotab authentication error", err);
    return null;
  }
}

export const eldProviders = [samsara, keepTruckin, geotab];
