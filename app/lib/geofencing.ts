/**
 * Geofencing & Geographic Boundary System
 * 
 * Provides geofence definition, detection, alerts, and geographic restrictions
 * for transportation management.
 */

export interface Geofence {
  id: string;
  name: string;
  organizationId: string;
  type: 'circle' | 'polygon' | 'rectangle';
  coordinates: GeofenceCoordinates;
  radius?: number; // For circle type (in meters)
  rules?: GeofenceRules;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeofenceCoordinates {
  // For circle: center point
  // For polygon: array of points
  // For rectangle: two corner points
  center?: { lat: number; lng: number };
  points?: Array<{ lat: number; lng: number }>;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface GeofenceRules {
  alertOnEntry?: boolean;
  alertOnExit?: boolean;
  restrictEntry?: boolean;
  restrictExit?: boolean;
  requirePermit?: boolean;
  speedLimit?: number; // mph
  notifyUsers?: string[]; // User IDs to notify
  autoActions?: Array<{
    action: 'log_event' | 'send_alert' | 'update_status' | 'require_checkin';
    params?: Record<string, any>;
  }>;
}

export interface GeofenceEvent {
  id: string;
  geofenceId: string;
  vehicleId?: string;
  driverId?: string;
  eventType: 'entry' | 'exit' | 'inside' | 'violation';
  location: { lat: number; lng: number };
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Calculate distance between two points (Haversine formula)
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if point is inside a circle geofence
 */
export function isPointInCircle(
  point: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radius: number
): boolean {
  const distance = calculateDistance(point, center);
  return distance <= radius;
}

/**
 * Check if point is inside a rectangle geofence
 */
export function isPointInRectangle(
  point: { lat: number; lng: number },
  bounds: { north: number; south: number; east: number; west: number }
): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
}

/**
 * Check if point is inside a polygon geofence (Ray casting algorithm)
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a location is inside a geofence
 */
export function isLocationInGeofence(
  location: { lat: number; lng: number },
  geofence: Geofence
): boolean {
  if (!geofence.active) return false;

  switch (geofence.type) {
    case 'circle':
      if (!geofence.coordinates.center || !geofence.radius) return false;
      return isPointInCircle(
        location,
        geofence.coordinates.center,
        geofence.radius
      );

    case 'rectangle':
      if (!geofence.coordinates.bounds) return false;
      return isPointInRectangle(location, geofence.coordinates.bounds);

    case 'polygon':
      if (!geofence.coordinates.points || geofence.coordinates.points.length < 3)
        return false;
      return isPointInPolygon(location, geofence.coordinates.points);

    default:
      return false;
  }
}

/**
 * Detect geofence events (entry/exit) by comparing current and previous locations
 */
export function detectGeofenceEvents(
  currentLocation: { lat: number; lng: number },
  previousLocation: { lat: number; lng: number } | null,
  geofences: Geofence[]
): GeofenceEvent[] {
  const events: GeofenceEvent[] = [];

  for (const geofence of geofences) {
    const currentlyInside = isLocationInGeofence(currentLocation, geofence);
    const previouslyInside = previousLocation
      ? isLocationInGeofence(previousLocation, geofence)
      : false;

    if (currentlyInside && !previouslyInside) {
      // Entry event
      events.push({
        id: `${geofence.id}-${Date.now()}`,
        geofenceId: geofence.id,
        eventType: 'entry',
        location: currentLocation,
        timestamp: new Date().toISOString(),
        metadata: {
          geofenceName: geofence.name,
          geofenceType: geofence.type,
        },
      });
    } else if (!currentlyInside && previouslyInside) {
      // Exit event
      events.push({
        id: `${geofence.id}-${Date.now()}`,
        geofenceId: geofence.id,
        eventType: 'exit',
        location: currentLocation,
        timestamp: new Date().toISOString(),
        metadata: {
          geofenceName: geofence.name,
          geofenceType: geofence.type,
        },
      });
    } else if (currentlyInside) {
      // Still inside
      events.push({
        id: `${geofence.id}-${Date.now()}`,
        geofenceId: geofence.id,
        eventType: 'inside',
        location: currentLocation,
        timestamp: new Date().toISOString(),
        metadata: {
          geofenceName: geofence.name,
        },
      });
    }
  }

  return events;
}

/**
 * Check for geofence violations (restrictions)
 */
export function checkGeofenceViolations(
  location: { lat: number; lng: number },
  geofences: Geofence[]
): GeofenceEvent[] {
  const violations: GeofenceEvent[] = [];

  for (const geofence of geofences) {
    if (!geofence.rules) continue;

    const isInside = isLocationInGeofence(location, geofence);

    // Check entry restriction
    if (
      isInside &&
      geofence.rules.restrictEntry &&
      geofence.rules.requirePermit
    ) {
      violations.push({
        id: `${geofence.id}-violation-${Date.now()}`,
        geofenceId: geofence.id,
        eventType: 'violation',
        location,
        timestamp: new Date().toISOString(),
        metadata: {
          violationType: 'unauthorized_entry',
          geofenceName: geofence.name,
          message: `Unauthorized entry into restricted area: ${geofence.name}`,
        },
      });
    }

    // Check exit restriction
    if (
      !isInside &&
      geofence.rules.restrictExit &&
      geofence.rules.requirePermit
    ) {
      violations.push({
        id: `${geofence.id}-violation-${Date.now()}`,
        geofenceId: geofence.id,
        eventType: 'violation',
        location,
        timestamp: new Date().toISOString(),
        metadata: {
          violationType: 'unauthorized_exit',
          geofenceName: geofence.name,
          message: `Unauthorized exit from restricted area: ${geofence.name}`,
        },
      });
    }
  }

  return violations;
}

/**
 * Get all geofences that contain a location
 */
export function getGeofencesForLocation(
  location: { lat: number; lng: number },
  geofences: Geofence[]
): Geofence[] {
  return geofences.filter((geofence) =>
    isLocationInGeofence(location, geofence)
  );
}

/**
 * Calculate geofence bounds from coordinates
 */
export function calculateGeofenceBounds(
  coordinates: GeofenceCoordinates
): { north: number; south: number; east: number; west: number } | null {
  if (coordinates.bounds) {
    return coordinates.bounds;
  }

  if (coordinates.points && coordinates.points.length > 0) {
    const lats = coordinates.points.map((p) => p.lat);
    const lngs = coordinates.points.map((p) => p.lng);
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  }

  if (coordinates.center) {
    // For circle, we'd need radius to calculate bounds
    // This is a simplified version
    return {
      north: coordinates.center.lat + 0.01,
      south: coordinates.center.lat - 0.01,
      east: coordinates.center.lng + 0.01,
      west: coordinates.center.lng - 0.01,
    };
  }

  return null;
}
