/**
 * Business Rules for Geofencing System
 * 
 * Defines business logic, validation rules, and constraints
 * for the geofencing system.
 */

export interface GeofenceValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Business Rules Configuration
 */
export const GEOFENCING_RULES = {
  // Limits
  MAX_GEOFENCES_PER_ORG: 1000,
  MAX_POLYGON_POINTS: 1000,
  MAX_RADIUS_METERS: 100000, // 100 km
  MIN_RADIUS_METERS: 1,
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 1000,

  // Performance
  MAX_ACTIVE_GEOFENCES_PER_CHECK: 100, // Limit checks for performance
  GEOFENCE_CHECK_INTERVAL_MS: 5000, // Minimum time between checks for same vehicle

  // Validation
  COORDINATE_PRECISION: 6, // Decimal places
  REQUIRED_FIELDS: ['name', 'type', 'coordinates', 'organizationId'],
} as const;

/**
 * Validate geofence before creation/update
 */
export function validateGeofence(geofence: any): GeofenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!geofence.name || geofence.name.trim().length === 0) {
    errors.push('Geofence name is required');
  }

  if (!geofence.type) {
    errors.push('Geofence type is required');
  }

  if (!geofence.coordinates) {
    errors.push('Geofence coordinates are required');
  }

  if (!geofence.organizationId) {
    errors.push('Organization ID is required');
  }

  // Name validation
  if (geofence.name && geofence.name.length > GEOFENCING_RULES.MAX_NAME_LENGTH) {
    errors.push(`Name must be ${GEOFENCING_RULES.MAX_NAME_LENGTH} characters or less`);
  }

  // Description validation
  if (
    geofence.description &&
    geofence.description.length > GEOFENCING_RULES.MAX_DESCRIPTION_LENGTH
  ) {
    errors.push(
      `Description must be ${GEOFENCING_RULES.MAX_DESCRIPTION_LENGTH} characters or less`
    );
  }

  // Type validation
  if (geofence.type && !['circle', 'polygon', 'rectangle'].includes(geofence.type)) {
    errors.push('Invalid geofence type. Must be: circle, polygon, or rectangle');
  }

  // Circle validation
  if (geofence.type === 'circle') {
    if (!geofence.coordinates?.center) {
      errors.push('Circle geofence requires center coordinates');
    }
    if (!geofence.radius) {
      errors.push('Circle geofence requires radius');
    }
    if (geofence.radius) {
      if (geofence.radius < GEOFENCING_RULES.MIN_RADIUS_METERS) {
        errors.push(`Radius must be at least ${GEOFENCING_RULES.MIN_RADIUS_METERS} meters`);
      }
      if (geofence.radius > GEOFENCING_RULES.MAX_RADIUS_METERS) {
        errors.push(`Radius cannot exceed ${GEOFENCING_RULES.MAX_RADIUS_METERS} meters`);
      }
    }
    if (geofence.coordinates?.center) {
      const { lat, lng } = geofence.coordinates.center;
      if (lat < -90 || lat > 90) {
        errors.push('Latitude must be between -90 and 90');
      }
      if (lng < -180 || lng > 180) {
        errors.push('Longitude must be between -180 and 180');
      }
    }
  }

  // Polygon validation
  if (geofence.type === 'polygon') {
    if (!geofence.coordinates?.points || !Array.isArray(geofence.coordinates.points)) {
      errors.push('Polygon geofence requires an array of points');
    }
    if (geofence.coordinates?.points) {
      if (geofence.coordinates.points.length < 3) {
        errors.push('Polygon must have at least 3 points');
      }
      if (geofence.coordinates.points.length > GEOFENCING_RULES.MAX_POLYGON_POINTS) {
        errors.push(
          `Polygon cannot have more than ${GEOFENCING_RULES.MAX_POLYGON_POINTS} points`
        );
      }
      // Validate all points
      geofence.coordinates.points.forEach((point: any, index: number) => {
        if (!point.lat || !point.lng) {
          errors.push(`Point ${index + 1} is missing lat or lng`);
        }
        if (point.lat < -90 || point.lat > 90) {
          errors.push(`Point ${index + 1} has invalid latitude`);
        }
        if (point.lng < -180 || point.lng > 180) {
          errors.push(`Point ${index + 1} has invalid longitude`);
        }
      });
      // Check if polygon is closed (first and last point should be the same)
      const points = geofence.coordinates.points;
      if (points.length > 0) {
        const first = points[0];
        const last = points[points.length - 1];
        if (
          Math.abs(first.lat - last.lat) > 0.0001 ||
          Math.abs(first.lng - last.lng) > 0.0001
        ) {
          warnings.push('Polygon is not closed. First and last points should be the same.');
        }
      }
    }
  }

  // Rectangle validation
  if (geofence.type === 'rectangle') {
    if (!geofence.coordinates?.bounds) {
      errors.push('Rectangle geofence requires bounds');
    }
    if (geofence.coordinates?.bounds) {
      const { north, south, east, west } = geofence.coordinates.bounds;
      if (north < -90 || north > 90 || south < -90 || south > 90) {
        errors.push('Bounds latitudes must be between -90 and 90');
      }
      if (east < -180 || east > 180 || west < -180 || west > 180) {
        errors.push('Bounds longitudes must be between -180 and 180');
      }
      if (north <= south) {
        errors.push('North bound must be greater than south bound');
      }
      if (east <= west) {
        errors.push('East bound must be greater than west bound');
      }
    }
  }

  // Rules validation
  if (geofence.rules) {
    if (typeof geofence.rules !== 'object') {
      errors.push('Rules must be an object');
    }
    if (geofence.rules.speedLimit !== undefined) {
      const speedLimit = Number(geofence.rules.speedLimit);
      if (isNaN(speedLimit) || speedLimit < 0 || speedLimit > 200) {
        errors.push('Speed limit must be between 0 and 200 mph');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if organization has reached geofence limit
 */
export async function checkGeofenceLimit(
  supabase: any,
  organizationId: string
): Promise<{ allowed: boolean; current: number; limit: number; message?: string }> {
  const { count, error } = await supabase
    .from('geofences')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('active', true);

  if (error) {
    return {
      allowed: false,
      current: 0,
      limit: GEOFENCING_RULES.MAX_GEOFENCES_PER_ORG,
      message: 'Error checking geofence limit',
    };
  }

  const currentCount = count || 0;
  const allowed = currentCount < GEOFENCING_RULES.MAX_GEOFENCES_PER_ORG;

  return {
    allowed,
    current: currentCount,
    limit: GEOFENCING_RULES.MAX_GEOFENCES_PER_ORG,
    message: allowed
      ? undefined
      : `Maximum of ${GEOFENCING_RULES.MAX_GEOFENCES_PER_ORG} active geofences per organization`,
  };
}

/**
 * Optimize geofence check - limit number of geofences checked
 * for performance
 */
export function optimizeGeofencesForCheck(geofences: any[]): any[] {
  if (geofences.length <= GEOFENCING_RULES.MAX_ACTIVE_GEOFENCES_PER_CHECK) {
    return geofences;
  }

  // Prioritize geofences by:
  // 1. Most recently updated
  // 2. Has rules (more important)
  // 3. Has restrictions (most important)

  return geofences
    .sort((a, b) => {
      // Check for restrictions
      const aHasRestriction = a.rules?.restrictEntry || a.rules?.restrictExit;
      const bHasRestriction = b.rules?.restrictEntry || b.rules?.restrictExit;
      if (aHasRestriction && !bHasRestriction) return -1;
      if (!aHasRestriction && bHasRestriction) return 1;

      // Check for rules
      const aHasRules = a.rules && Object.keys(a.rules).length > 0;
      const bHasRules = b.rules && Object.keys(b.rules).length > 0;
      if (aHasRules && !bHasRules) return -1;
      if (!aHasRules && bHasRules) return 1;

      // Sort by updated_at
      const aDate = new Date(a.updated_at || 0).getTime();
      const bDate = new Date(b.updated_at || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, GEOFENCING_RULES.MAX_ACTIVE_GEOFENCES_PER_CHECK);
}

/**
 * Calculate geofence area (in square meters) - for reporting
 */
export function calculateGeofenceArea(geofence: any): number | null {
  if (geofence.type === 'circle' && geofence.radius) {
    return Math.PI * geofence.radius * geofence.radius;
  }

  if (geofence.type === 'rectangle' && geofence.coordinates?.bounds) {
    const { north, south, east, west } = geofence.coordinates.bounds;
    // Approximate area calculation (for rectangles, not perfect but close enough)
    const latDiff = (north - south) * 111000; // meters per degree latitude
    const lngDiff = (east - west) * 111000 * Math.cos(((north + south) / 2) * Math.PI / 180);
    return latDiff * lngDiff;
  }

  // Polygon area calculation (Shoelace formula)
  if (geofence.type === 'polygon' && geofence.coordinates?.points) {
    const points = geofence.coordinates.points;
    if (points.length < 3) return null;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].lng * points[j].lat;
      area -= points[j].lng * points[i].lat;
    }
    area = Math.abs(area / 2);

    // Convert to square meters (approximate)
    const centerLat = points.reduce((sum: number, p: any) => sum + p.lat, 0) / points.length;
    const metersPerDegree = 111000 * Math.cos(centerLat * Math.PI / 180);
    return area * metersPerDegree * metersPerDegree;
  }

  return null;
}

/**
 * Check if two geofences overlap (for conflict detection)
 */
export function checkGeofenceOverlap(geofence1: any, geofence2: any): boolean {
  // This is a simplified check - full implementation would require
  // more complex geometric calculations
  
  if (geofence1.type === 'circle' && geofence2.type === 'circle') {
    const dist = calculateDistance(
      geofence1.coordinates.center,
      geofence2.coordinates.center
    );
    return dist < (geofence1.radius + geofence2.radius);
  }

  // For other combinations, return false (would need more complex logic)
  return false;
}
