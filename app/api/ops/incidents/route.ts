import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IncidentResponseAgent } from "@/lib/ops/incidentResponseAgent";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/incidents
 * List incidents for organization
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');
    const status = searchParams.get('status'); // 'open', 'resolved', etc.

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('tms_incidents')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(50);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: incidents, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ incidents: incidents || [] });
  } catch (error: any) {
    console.error("Get incidents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ops/incidents
 * Create manual incident or trigger health check
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, organizationId, description } = body;

    if (type === 'health_check') {
      // Trigger health check and auto-detect
      const { HealthMonitor } = await import("@/lib/ops/healthMonitor");
      const { IncidentResponseAgent } = await import("@/lib/ops/incidentResponseAgent");
      
      const healthMonitor = new HealthMonitor();
      const metrics = await healthMonitor.collectMetrics(organizationId);
      const incidentAgent = new IncidentResponseAgent();
      const incident = await incidentAgent.detectIncident(metrics, organizationId);

      return NextResponse.json({ incident, metrics });
    }

    // Manual incident creation
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: incident, error } = await supabase
      .from('tms_incidents')
      .insert({
        organization_id: organizationId || null,
        severity: body.severity || 'warning',
        status: 'open',
        incident_type: body.incidentType || 'unknown',
        summary: body.summary || description || 'Manual incident',
        description,
        source: 'manual',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create incident" },
        { status: 500 }
      );
    }

    return NextResponse.json({ incident });
  } catch (error: any) {
    console.error("Create incident error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
