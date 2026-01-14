import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IncidentResponseAgent } from "@/lib/ops/incidentResponseAgent";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/incidents/[incidentId]
 * Get incident details with decision summary
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  try {
    const { incidentId } = params;
    const supabase = createSupabaseServerClient();

    // Get incident
    const { data: incident, error: incidentError } = await supabase
      .from('tms_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Get events
    const { data: events } = await supabase
      .from('tms_incident_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    // Get actions
    const { data: actions } = await supabase
      .from('tms_incident_actions')
      .select('*')
      .eq('incident_id', incidentId)
      .order('executed_at', { ascending: false });

    // Get recommendations
    const { data: recommendations } = await supabase
      .from('tms_incident_recommendations')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false });

    // Generate decision summary
    const incidentAgent = new IncidentResponseAgent();
    const decisionSummary = await incidentAgent.generateDecisionSummary(incidentId);

    return NextResponse.json({
      incident,
      events: events || [],
      actions: actions || [],
      recommendations: recommendations || [],
      decisionSummary,
    });
  } catch (error: any) {
    console.error("Get incident error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ops/incidents/[incidentId]
 * Update incident status or resolve
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  try {
    const { incidentId } = params;
    const body = await req.json();
    const supabase = createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.rootCause) updateData.root_cause = body.rootCause;
    if (body.preventionSteps) updateData.prevention_steps = body.preventionSteps;

    if (body.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: incident, error } = await supabase
      .from('tms_incidents')
      .update(updateData)
      .eq('id', incidentId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update incident" },
        { status: 500 }
      );
    }

    // Log resolution event
    if (body.status === 'resolved') {
      await supabase.from('tms_incident_events').insert({
        incident_id: incidentId,
        source: 'manual',
        event_type: 'resolution',
        payload: {
          resolved_by: user.id,
          root_cause: body.rootCause,
        },
      });
    }

    return NextResponse.json({ incident });
  } catch (error: any) {
    console.error("Update incident error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
