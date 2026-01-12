import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate, authorize, addSecurityHeaders } from '@/app/lib/security';
import {
  validateGeofence,
  checkGeofenceLimit,
  GEOFENCING_RULES,
} from '@/lib/geofencing-business-rules';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * GET /api/geofencing/geofences
 * 
 * Get all geofences for an organization
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
    const activeOnly = searchParams.get('activeOnly') === 'true';

    if (!organizationId) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Missing organizationId parameter' },
          { status: 400 }
        )
      );
    }

    const supabase = createServerAdmin();
    let query = supabase
      .from('geofences')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data: geofences, error } = await query;

    if (error) {
      console.error('Error fetching geofences:', error);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to fetch geofences: ${error.message}` },
          { status: 500 }
        )
      );
    }

    return addSecurityHeaders(
      NextResponse.json({ geofences: geofences || [] })
    );
  } catch (error: any) {
    console.error('Geofence fetch error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to fetch geofences' },
        { status: 500 }
      )
    );
  }
}

/**
 * POST /api/geofencing/geofences
 * 
 * Create a new geofence
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

    const supabase = createServerAdmin();
    const body = await req.json();

    const {
      organizationId,
      name,
      description,
      type,
      coordinates,
      radius,
      rules,
      active = true,
      createdBy,
    } = body;

    if (!organizationId || !name || !type || !coordinates) {
      return addSecurityHeaders(
        NextResponse.json(
          {
            error:
              'Missing required fields: organizationId, name, type, coordinates',
          },
          { status: 400 }
        )
      );
    }

    // Business logic validation
    const validation = validateGeofence({
      name,
      type,
      coordinates,
      radius,
      organizationId,
      description,
      rules,
    });

    if (!validation.valid) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Validation failed', errors: validation.errors, warnings: validation.warnings },
          { status: 400 }
        )
      );
    }

    // Check geofence limit
    const limitCheck = await checkGeofenceLimit(supabase, organizationId);
    if (!limitCheck.allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          {
            error: limitCheck.message,
            current: limitCheck.current,
            limit: limitCheck.limit,
          },
          { status: 403 }
        )
      );
    }

    // Sanitize input
    const sanitizedName = name.trim().substring(0, GEOFENCING_RULES.MAX_NAME_LENGTH);

    // Validate coordinates based on type
    if (type === 'circle') {
      if (!coordinates.center || !radius) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Circle geofence requires center coordinates and radius' },
            { status: 400 }
          )
        );
      }
      // Validate coordinate ranges
      if (
        coordinates.center.lat < -90 ||
        coordinates.center.lat > 90 ||
        coordinates.center.lng < -180 ||
        coordinates.center.lng > 180
      ) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Invalid coordinate values (lat: -90 to 90, lng: -180 to 180)' },
            { status: 400 }
          )
        );
      }
      // Validate radius (1m to 100km)
      if (radius < 1 || radius > 100000) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Radius must be between 1 and 100,000 meters' },
            { status: 400 }
          )
        );
      }
    } else if (type === 'polygon') {
      if (!coordinates.points || coordinates.points.length < 3) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Polygon geofence requires at least 3 points' },
            { status: 400 }
          )
        );
      }
      // Validate all points
      for (const point of coordinates.points) {
        if (
          point.lat < -90 ||
          point.lat > 90 ||
          point.lng < -180 ||
          point.lng > 180
        ) {
          return addSecurityHeaders(
            NextResponse.json(
              { error: 'Invalid coordinate values in polygon points' },
              { status: 400 }
            )
          );
        }
      }
      // Limit polygon points (performance)
      if (coordinates.points.length > 1000) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Polygon cannot have more than 1000 points' },
            { status: 400 }
          )
        );
      }
    } else if (type === 'rectangle') {
      if (!coordinates.bounds) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Rectangle geofence requires bounds' },
            { status: 400 }
          )
        );
      }
      // Validate bounds
      const { north, south, east, west } = coordinates.bounds;
      if (
        north < -90 ||
        north > 90 ||
        south < -90 ||
        south > 90 ||
        east < -180 ||
        east > 180 ||
        west < -180 ||
        west > 180 ||
        north <= south ||
        east <= west
      ) {
        return addSecurityHeaders(
          NextResponse.json(
            { error: 'Invalid bounds values' },
            { status: 400 }
          )
        );
      }
    }

    const { data: geofence, error } = await supabase
      .from('geofences')
      .insert({
        organization_id: organizationId,
        name: sanitizedName,
        description: (description || '').trim().substring(0, 1000) || null,
        type,
        coordinates,
        radius: radius || null,
        rules: rules || {},
        active: Boolean(active),
        created_by: createdBy || user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating geofence:', error);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to create geofence: ${error.message}` },
          { status: 500 }
        )
      );
    }

    return addSecurityHeaders(NextResponse.json({ geofence }));
  } catch (error: any) {
    console.error('Geofence creation error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to create geofence' },
        { status: 500 }
      )
    );
  }
}

/**
 * PUT /api/geofencing/geofences
 * 
 * Update a geofence
 */
export async function PUT(req: NextRequest) {
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

    const supabase = createServerAdmin();
    const body = await req.json();

    const { id, ...updates } = body;

    if (!id) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Missing geofence id' }, { status: 400 })
      );
    }

    // Verify geofence exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('geofences')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Geofence not found' }, { status: 404 })
      );
    }

    // Sanitize updates
    const sanitizedUpdates: any = {};
    if (updates.name) sanitizedUpdates.name = updates.name.trim().substring(0, 255);
    if (updates.description !== undefined)
      sanitizedUpdates.description = updates.description?.trim().substring(0, 1000) || null;
    if (updates.active !== undefined) sanitizedUpdates.active = Boolean(updates.active);
    if (updates.coordinates) sanitizedUpdates.coordinates = updates.coordinates;
    if (updates.radius !== undefined) sanitizedUpdates.radius = updates.radius;
    if (updates.rules) sanitizedUpdates.rules = updates.rules;
    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data: geofence, error } = await supabase
      .from('geofences')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('organization_id', existing.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating geofence:', error);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to update geofence: ${error.message}` },
          { status: 500 }
        )
      );
    }

    return addSecurityHeaders(NextResponse.json({ geofence }));
  } catch (error: any) {
    console.error('Geofence update error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to update geofence' },
        { status: 500 }
      )
    );
  }
}

/**
 * DELETE /api/geofencing/geofences
 * 
 * Delete a geofence
 */
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Missing geofence id' }, { status: 400 })
      );
    }

    const supabase = createServerAdmin();

    // Verify geofence exists and user has access
    const { data: existing, error: fetchError } = await supabase
      .from('geofences')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Geofence not found' }, { status: 404 })
      );
    }

    // Soft delete by setting active to false instead of hard delete
    // This preserves historical data
    const { error } = await supabase
      .from('geofences')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', existing.organization_id);

    if (error) {
      console.error('Error deleting geofence:', error);
      return addSecurityHeaders(
        NextResponse.json(
          { error: `Failed to delete geofence: ${error.message}` },
          { status: 500 }
        )
      );
    }

    return addSecurityHeaders(NextResponse.json({ success: true }));
  } catch (error: any) {
    console.error('Geofence deletion error:', error);
    return addSecurityHeaders(
      NextResponse.json(
        { error: error.message || 'Failed to delete geofence' },
        { status: 500 }
      )
    );
  }
}
