import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IncidentResponseAgent } from "@/lib/ops/incidentResponseAgent";

export const dynamic = 'force-dynamic';

/**
 * POST /api/ops/incidents/[incidentId]/recommendations/[recommendationId]/approve
 * Approve and execute a recommendation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { incidentId: string; recommendationId: string } }
) {
  try {
    const { incidentId, recommendationId } = params;
    const supabase = createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recommendation
    const { data: recommendation, error: recError } = await supabase
      .from('tms_incident_recommendations')
      .select('*')
      .eq('id', recommendationId)
      .eq('incident_id', incidentId)
      .single();

    if (recError || !recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      );
    }

    // Update recommendation status
    await supabase
      .from('tms_incident_recommendations')
      .update({
        status: 'approved',
        approved_by: user.id,
      })
      .eq('id', recommendationId);

    // Execute action if provided
    if (recommendation.action_type) {
      const incidentAgent = new IncidentResponseAgent();
      const result = await (incidentAgent as any).executeSafeAction(
        recommendation.action_type,
        incidentId
      );

      if (result.success) {
        await supabase
          .from('tms_incident_recommendations')
          .update({ status: 'executed' })
          .eq('id', recommendationId);
      }
    }

    return NextResponse.json({ success: true, recommendation });
  } catch (error: any) {
    console.error("Approve recommendation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
