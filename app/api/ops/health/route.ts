import { NextRequest, NextResponse } from "next/server";
import { HealthMonitor } from "@/lib/ops/healthMonitor";
import { IncidentResponseAgent } from "@/lib/ops/incidentResponseAgent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/health
 * Health check endpoint + collect metrics
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id') || undefined;

    const healthMonitor = new HealthMonitor();
    const metrics = await healthMonitor.collectMetrics(organizationId);

    // Check thresholds
    const thresholdCheck = await healthMonitor.checkThresholds(metrics);

    // If alert, create incident
    if (thresholdCheck.alert) {
      const incidentAgent = new IncidentResponseAgent();
      await incidentAgent.detectIncident(metrics, organizationId);
    }

    return NextResponse.json({
      status: thresholdCheck.alert ? 'degraded' : 'healthy',
      metrics,
      alerts: thresholdCheck.alert ? {
        violations: thresholdCheck.violations,
        severity: thresholdCheck.severity,
      } : null,
    });
  } catch (error: any) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { error: error.message || "Health check failed" },
      { status: 500 }
    );
  }
}
