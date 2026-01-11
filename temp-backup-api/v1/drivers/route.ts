// API Route: /api/v1/drivers
// Driver management endpoints for external integrations

import { NextRequest } from "next/server";
import { DriverAPI, authenticateApiRequest } from "../../../lib/integrationApi";

export async function GET(request: NextRequest) {
  // Authenticate request
  const authError = await authenticateApiRequest(request);
  if (authError) return authError;

  // Get all drivers with filtering and pagination
  const result = await DriverAPI.getDrivers();

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 400,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  // Authenticate request
  const authError = await authenticateApiRequest(request);
  if (authError) return authError;

  try {
    const driverData = await request.json();
    return await DriverAPI.createDriver(driverData);
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON data" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
}
