import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loadRequestId = searchParams.get('loadRequestId');

    if (!loadRequestId) {
      return NextResponse.json({ error: 'Load request ID is required' }, { status: 400 });
    }

    // Get load request with tracking updates
    const { data: loadRequest, error: loadError } = await supabaseAdmin
      .from('load_requests')
      .select(`
        *,
        tracking_updates (
          id,
          timestamp,
          status,
          location,
          notes,
          created_at
        )
      `)
      .eq('id', loadRequestId)
      .single();

    if (loadError) {
      console.error('Error fetching load request:', loadError);
      return NextResponse.json({ error: 'Failed to fetch tracking data' }, { status: 500 });
    }

    if (!loadRequest) {
      return NextResponse.json({ error: 'Load request not found' }, { status: 404 });
    }

    // Transform tracking updates
    const trackingData = {
      loadId: loadRequest.id,
      status: loadRequest.status,
      currentLocation: loadRequest.tracking_updates?.[0]?.location || 'Unknown',
      estimatedDelivery: loadRequest.delivery_date,
      updates: (loadRequest.tracking_updates || [])
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((update: any) => ({
          timestamp: update.timestamp,
          status: update.status,
          location: update.location,
          notes: update.notes
        }))
    };

    return NextResponse.json(trackingData);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loadRequestId, status, location, notes } = body;

    if (!loadRequestId || !status || !location) {
      return NextResponse.json({ 
        error: 'Load request ID, status, and location are required' 
      }, { status: 400 });
    }

    const trackingUpdate = {
      load_request_id: loadRequestId,
      timestamp: new Date().toISOString(),
      status,
      location,
      notes,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('tracking_updates')
      .insert([trackingUpdate])
      .select()
      .single();

    if (error) {
      console.error('Error creating tracking update:', error);
      return NextResponse.json({ error: 'Failed to create tracking update' }, { status: 500 });
    }

    // Also update the load request status if it's a status change
    if (status !== 'In transit') {
      await supabaseAdmin
        .from('load_requests')
        .update({ 
          status: status.toLowerCase().replace(' ', '_'),
          updated_at: new Date().toISOString()
        })
        .eq('id', loadRequestId);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}