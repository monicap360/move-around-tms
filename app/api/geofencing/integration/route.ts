import { createClient } from '@supabase/supabase-js';
import {
  detectGeofenceEvents,
  checkGeofenceViolations,
  isLocationInGeofence,
} from '@/lib/geofencing';
import { optimizeGeofencesForCheck } from '@/lib/geofencing-business-rules';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Internal helper function to check geofences
 * This is called by the GPS ping handler
 */
export async function checkGeofencesInternal(
  location: { lat: number; lng: number },
  previousLocation: { lat: number; lng: number } | null,
  organizationId: string,
  vehicleId?: string,
  driverId?: string,
  truckId?: string,
  speed?: number,
  heading?: number
) {
  try {
    const supabase = createServerAdmin();

    // Fetch active geofences
    const { data: geofences, error: geofenceError } = await supabase
      .from('geofences')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true);

    if (geofenceError || !geofences || geofences.length === 0) {
      return {
        insideGeofences: [],
        events: [],
        violations: [],
      };
    }

    // Optimize geofences for performance (limit number checked)
    const optimizedGeofences = optimizeGeofencesForCheck(geofences);

    // Use the geofencing library to detect events
    const events = detectGeofenceEvents(location, previousLocation, optimizedGeofences as any);
    const violations = checkGeofenceViolations(location, optimizedGeofences as any);
    // Get current geofences vehicle is inside (use optimized list for consistency)
    const insideGeofences = optimizedGeofences.filter((geofence) =>
      isLocationInGeofence(location, geofence as any)
    );

    // Store events
    if (events.length > 0) {
      const { error: eventError } = await supabase.from('geofence_events').insert(
        events.map((event) => ({
          geofence_id: event.geofenceId,
          organization_id: organizationId,
          vehicle_id: vehicleId || null,
          driver_id: driverId || null,
          truck_id: truckId || null,
          event_type: event.eventType,
          location: event.location,
          speed: speed || null,
          heading: heading || null,
          timestamp: event.timestamp,
          metadata: event.metadata || {},
        }))
      );
      if (eventError) {
        console.error('Error storing geofence events:', eventError);
      }
    }

    // Store violations (with error handling)
    if (violations.length > 0) {
      const { error: violationError } = await supabase.from('geofence_events').insert(
        violations.map((violation) => ({
          geofence_id: violation.geofenceId,
          organization_id: organizationId,
          vehicle_id: vehicleId || null,
          driver_id: driverId || null,
          truck_id: truckId || null,
          event_type: 'violation',
          location: violation.location,
          speed: speed || null,
          heading: heading || null,
          timestamp: violation.timestamp,
          metadata: violation.metadata || {},
        }))
      );
      if (violationError) {
        console.error('Error storing geofence violations:', violationError);
      }
    }

    // Update vehicle geofence status
    for (const geofence of insideGeofences) {
      const isInside = isLocationInGeofence(location, geofence as any);
      const status = isInside ? 'inside' : 'outside';

      const uniqueKey = vehicleId
        ? { vehicle_id: vehicleId, geofence_id: geofence.id }
        : driverId
        ? { driver_id: driverId, geofence_id: geofence.id }
        : { truck_id: truckId, geofence_id: geofence.id };

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
            entered_at: isInside ? new Date().toISOString() : null,
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

    return {
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
    };
  } catch (error: any) {
    console.error('Geofence check error:', error);
    return {
      insideGeofences: [],
      events: [],
      violations: [],
    };
  }
}
