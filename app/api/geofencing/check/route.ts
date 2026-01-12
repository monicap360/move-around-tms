import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  detectGeofenceEvents,
  checkGeofenceViolations,
  isLocationInGeofence,
} from '@/lib/geofencing';
import { addSecurityHeaders } from '@/app/lib/security';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * POST /api/geofencing/check
 * 
 * Check vehicle location against geofences and detect events
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await req.json();

    const {
      latitude,
      longitude,
      vehicleId,
      driverId,
      truckId,
      organizationId,
      previousLatitude,
      previousLongitude,
      speed,
      heading,
    } = body;

    if (!latitude || !longitude || !organizationId) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Missing required fields: latitude, longitude, organizationId' },
          { status: 400 }
        )
      );
    }

    // Validate coordinate ranges
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Invalid latitude or longitude values (lat: -90 to 90, lng: -180 to 180)' },
          { status: 400 }
        )
      );
    }

    const location = { lat, lng };
    const previousLocation =
      previousLatitude && previousLongitude
        ? (() => {
            const prevLat = Number(previousLatitude);
            const prevLng = Number(previousLongitude);
            if (
              isNaN(prevLat) ||
              isNaN(prevLng) ||
              prevLat < -90 ||
              prevLat > 90 ||
              prevLng < -180 ||
              prevLng > 180
            ) {
              return null; // Invalid previous location, treat as null
            }
            return { lat: prevLat, lng: prevLng };
          })()
        : null;

    // Validate speed if provided
    let validatedSpeed: number | null = null;
    if (speed !== undefined && speed !== null) {
      const speedNum = Number(speed);
      if (!isNaN(speedNum) && speedNum >= 0 && speedNum <= 200) {
        validatedSpeed = speedNum;
      }
    }

    // Validate heading if provided
    let validatedHeading: number | null = null;
    if (heading !== undefined && heading !== null) {
      const headingNum = Number(heading);
      if (!isNaN(headingNum) && headingNum >= 0 && headingNum < 360) {
        validatedHeading = headingNum;
      }
    }

    // Fetch active geofences for organization
    const { data: geofences, error: geofenceError } = await supabase
      .from('geofences')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true);

    if (geofenceError) {
      console.error('Error fetching geofences:', geofenceError);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to fetch geofences: ${geofenceError.message}` },
          { status: 500 }
        )
      );
    }

    if (!geofences || geofences.length === 0) {
      return addSecurityHeaders(
        NextResponse.json({
          insideGeofences: [],
          events: [],
          violations: [],
        })
      );
    }

    // Detect events
    const events = detectGeofenceEvents(location, previousLocation, geofences);

    // Check for violations
    const violations = checkGeofenceViolations(location, geofences);

    // Get current geofences vehicle is inside
    const insideGeofences = geofences.filter((geofence) =>
      isLocationInGeofence(location, geofence as any)
    );

    // Store events in database
    if (events.length > 0) {
      const eventsToInsert = events.map((event) => ({
        geofence_id: event.geofenceId,
        organization_id: organizationId,
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        truck_id: truckId || null,
        event_type: event.eventType,
        location: event.location,
          speed: validatedSpeed,
          heading: validatedHeading,
        timestamp: event.timestamp,
        metadata: event.metadata || {},
      }));

      await supabase.from('geofence_events').insert(eventsToInsert);
    }

    // Store violations
    if (violations.length > 0) {
      const violationsToInsert = violations.map((violation) => ({
        geofence_id: violation.geofenceId,
        organization_id: organizationId,
        vehicle_id: vehicleId || null,
        driver_id: driverId || null,
        truck_id: truckId || null,
        event_type: 'violation',
        location: violation.location,
          speed: validatedSpeed,
          heading: validatedHeading,
        timestamp: violation.timestamp,
        metadata: violation.metadata || {},
      }));

      await supabase.from('geofence_events').insert(violationsToInsert);
    }

    // Update vehicle geofence status
    for (const geofence of insideGeofences) {
      const isInside = isLocationInGeofence(location, geofence as any);
      const status = isInside ? 'inside' : 'outside';

      await supabase
        .from('vehicle_geofence_status')
        .upsert(
          {
            organization_id: organizationId,
            vehicle_id: vehicleId || null,
            driver_id: driverId || null,
            truck_id: truckId || null,
            geofence_id: geofence.id,
            status,
            entered_at: isInside && !previousLocation
              ? new Date().toISOString()
              : null,
            last_location: location,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: vehicleId
              ? 'vehicle_id,geofence_id'
              : driverId
              ? 'driver_id,geofence_id'
              : 'truck_id,geofence_id',
          }
        );
    }

    return addSecurityHeaders(
      NextResponse.json({
        insideGeofences: insideGeofences.map((g) => ({
          id: g.id,
          name: g.name,
          type: g.type,
        })),
        events: events.map((e) => ({
          geofenceId: e.geofenceId,
          eventType: e.eventType,
          timestamp: e.timestamp,
          metadata: e.metadata,
        })),
        violations: violations.map((v) => ({
          geofenceId: v.geofenceId,
          violationType: v.metadata?.violationType,
          message: v.metadata?.message,
          timestamp: v.timestamp,
        })),
      })
    );
  } catch (error: any) {
    console.error('Geofence check error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to check geofences' },
        { status: 500 }
      )
    );
  }
}
