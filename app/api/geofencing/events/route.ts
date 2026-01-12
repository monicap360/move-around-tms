import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate, authorize, addSecurityHeaders } from '@/app/lib/security';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * GET /api/geofencing/events
 * 
 * Get geofence events for an organization
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication
    const { user, error: authError } = await authenticate(req);
    if (authError || !user) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    // Authorization - require read:geofences permission
    if (!authorize(user, 'read:geofences') && !authorize(user, '*')) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      );
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');
    const truckId = searchParams.get('truckId');
    const eventType = searchParams.get('eventType');
    const acknowledged = searchParams.get('acknowledged');

    if (!organizationId) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Missing organizationId parameter' },
          { status: 400 }
        )
      );
    }

    // Validate limit and offset
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100'), 1), 1000);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const supabase = createServerAdmin();
    let query = supabase
      .from('geofence_events')
      .select('*, geofences(name, type)')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (vehicleId) query = query.eq('vehicle_id', vehicleId);
    if (driverId) query = query.eq('driver_id', driverId);
    if (truckId) query = query.eq('truck_id', truckId);
    if (eventType) query = query.eq('event_type', eventType);
    if (acknowledged !== null)
      query = query.eq('acknowledged', acknowledged === 'true');

    const { data: events, error } = await query;

    if (error) {
      console.error('Error fetching geofence events:', error);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to fetch events: ${error.message}` },
          { status: 500 }
        )
      );
    }

    return addSecurityHeaders(
      NextResponse.json({ events: events || [] })
    );
  } catch (error: any) {
    console.error('Geofence events fetch error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to fetch events' },
        { status: 500 }
      )
    );
  }
}

/**
 * POST /api/geofencing/events/acknowledge
 * 
 * Acknowledge a geofence event
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication
    const { user, error: authError } = await authenticate(req);
    if (authError || !user) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    // Authorization - require write:geofences permission
    if (!authorize(user, 'write:geofences') && !authorize(user, '*')) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      );
    }

    const body = await req.json();
    const { eventId, acknowledgedBy } = body;

    if (!eventId) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Missing eventId' },
          { status: 400 }
        )
      );
    }

    // Validate eventId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Invalid eventId format' },
          { status: 400 }
        )
      );
    }

    const supabase = createServerAdmin();

    // Verify event exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('geofence_events')
      .select('organization_id')
      .eq('id', eventId)
      .single();

    if (fetchError || !existing) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        )
      );
    }

    const { data, error } = await supabase
      .from('geofence_events')
      .update({
        acknowledged: true,
        acknowledged_by: acknowledgedBy || user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .eq('organization_id', existing.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error acknowledging event:', error);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to acknowledge event: ${error.message}` },
          { status: 500 }
        )
      );
    }

    return addSecurityHeaders(NextResponse.json({ event: data }));
  } catch (error: any) {
    console.error('Event acknowledgment error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to acknowledge event' },
        { status: 500 }
      )
    );
  }
}
