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
  name: 'Samsara',
  async fetchDriverLocations() {
    // Example: Fetch driver locations from Samsara API
    try {
      const apiKey = process.env.SAMSARA_API_KEY || "YOUR_SAMSARA_API_KEY";
      const res = await fetch("https://api.samsara.com/v1/fleet/drivers/locations", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        }
      });
      if (!res.ok) throw new Error("Samsara API error: " + res.status);
      const data = await res.json();
      // Map to standard format
      return (data.drivers || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        lat: d.location?.latitude,
        lon: d.location?.longitude,
        status: d.status,
        updatedAt: d.location?.time
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
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        }
      });
      if (!res.ok) throw new Error("Samsara API error: " + res.status);
      const data = await res.json();
      return (data.vehicles || []).map((v: any) => ({
        id: v.id,
        name: v.name,
        status: v.status,
        lat: v.location?.latitude,
        lon: v.location?.longitude,
        updatedAt: v.location?.time
      }));
    } catch (err) {
      console.error("Samsara fetchTruckStatus error", err);
      return [];
    }
  },
  async fetchHOS() {
    try {
      const apiKey = process.env.SAMSARA_API_KEY || "YOUR_SAMSARA_API_KEY";
      const res = await fetch("https://api.samsara.com/v1/fleet/hos/duty_status", {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        }
      });
      if (!res.ok) throw new Error("Samsara API error: " + res.status);
      const data = await res.json();
      return (data.drivers || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        hosStatus: d.hosStatus,
        updatedAt: d.hosStatusUpdatedAt
      }));
    } catch (err) {
      console.error("Samsara fetchHOS error", err);
      return [];
    }
  },
};

// Example: KeepTruckin integration (demo/mock)
export const keepTruckin: ELDProvider = {
  name: 'KeepTruckin',
  async fetchDriverLocations() {
    // Demo/mock data
    return [
      { id: 'kt-1', name: 'KT Driver 1', lat: 36.1627, lon: -86.7816, status: 'on_duty', updatedAt: new Date().toISOString() },
      { id: 'kt-2', name: 'KT Driver 2', lat: 39.7392, lon: -104.9903, status: 'off_duty', updatedAt: new Date().toISOString() },
    ];
  },
  async fetchTruckStatus() {
    return [
      { id: 'kt-t1', name: 'KT Truck 1', status: 'active', lat: 36.1627, lon: -86.7816, updatedAt: new Date().toISOString() },
      { id: 'kt-t2', name: 'KT Truck 2', status: 'inactive', lat: 39.7392, lon: -104.9903, updatedAt: new Date().toISOString() },
    ];
  },
  async fetchHOS() {
    return [
      { id: 'kt-1', name: 'KT Driver 1', hosStatus: 'ON_DUTY', updatedAt: new Date().toISOString() },
      { id: 'kt-2', name: 'KT Driver 2', hosStatus: 'OFF_DUTY', updatedAt: new Date().toISOString() },
    ];
  },
};

// Example: Geotab integration (demo/mock)
export const geotab: ELDProvider = {
  name: 'Geotab',
  async fetchDriverLocations() {
    return [
      { id: 'gt-1', name: 'Geotab Driver 1', lat: 32.7767, lon: -96.7970, status: 'on_duty', updatedAt: new Date().toISOString() },
      { id: 'gt-2', name: 'Geotab Driver 2', lat: 29.7604, lon: -95.3698, status: 'off_duty', updatedAt: new Date().toISOString() },
    ];
  },
  async fetchTruckStatus() {
    return [
      { id: 'gt-t1', name: 'Geotab Truck 1', status: 'active', lat: 32.7767, lon: -96.7970, updatedAt: new Date().toISOString() },
      { id: 'gt-t2', name: 'Geotab Truck 2', status: 'inactive', lat: 29.7604, lon: -95.3698, updatedAt: new Date().toISOString() },
    ];
  },
  async fetchHOS() {
    return [
      { id: 'gt-1', name: 'Geotab Driver 1', hosStatus: 'ON_DUTY', updatedAt: new Date().toISOString() },
      { id: 'gt-2', name: 'Geotab Driver 2', hosStatus: 'OFF_DUTY', updatedAt: new Date().toISOString() },
    ];
  },
};

export const eldProviders = [samsara, keepTruckin, geotab];
