// API Route: /api/v1/drivers/[id]
// Individual driver management endpoints

import { NextRequest } from 'next/server';
import { 
  DriverAPI, 
  authenticateApiRequest 
} from '../../../../lib/integrationApi';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate request
  const authError = await authenticateApiRequest(request);
  if (authError) return authError;

  const resolvedParams = await params;
  const result = await DriverAPI.getDriver(resolvedParams.id);
  
  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Authenticate request
  const authError = await authenticateApiRequest(request);
  if (authError) return authError;

  try {
    const resolvedParams = await params;
    const updates = await request.json();
    return await DriverAPI.updateDriver(resolvedParams.id, updates);
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid JSON data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}