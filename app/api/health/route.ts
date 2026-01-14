import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Health Check API
 * Required endpoint for alerts and Incident Response Agent
 * 
 * This endpoint is what alerts and the Incident Agent rely on.
 * Must return 200 status for system to be considered healthy.
 */
export async function GET() {
  try {
    // Basic health check - application is responding
    return NextResponse.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  } catch (e: any) {
    // If health check itself fails, return 500
    return NextResponse.json(
      { 
        status: "error",
        error: e.message || "Health check failed",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
