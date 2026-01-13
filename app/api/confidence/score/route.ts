import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreFieldConfidence, isAnomaly, getAnomalySeverity } from "@/lib/data-confidence/confidence-scorer";

// POST: Score confidence for a field value
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      fieldName,
      actualValue,
      driverId,
      siteId,
      days = 90,
    } = body;

    if (!entityType || !entityId || !fieldName || actualValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: entityType, entityId, fieldName, actualValue" },
        { status: 400 }
      );
    }

    // Calculate confidence score
    const confidenceScore = await scoreFieldConfidence(
      entityType,
      entityId,
      fieldName,
      parseFloat(actualValue),
      driverId,
      siteId,
      days
    );

    // Record confidence event in database
    const supabase = createSupabaseServerClient();
    await supabase.rpc("record_confidence_event", {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_field_name: fieldName,
      p_confidence_score: confidenceScore.score,
      p_reason: confidenceScore.reason,
      p_baseline_type: confidenceScore.baselineType,
      p_baseline_value: confidenceScore.baselineValue,
      p_actual_value: confidenceScore.actualValue,
      p_deviation_percentage: confidenceScore.deviationPercentage,
    });

    // Check for anomalies
    if (isAnomaly(confidenceScore)) {
      const severity = getAnomalySeverity(confidenceScore);
      
      // Record anomaly event
      await supabase.rpc("record_anomaly_event", {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_anomaly_type: "deviation",
        p_severity: severity,
        p_explanation: confidenceScore.reason,
        p_baseline_reference: JSON.stringify({
          type: confidenceScore.baselineType,
          value: confidenceScore.baselineValue,
        }),
        p_field_name: fieldName,
        p_baseline_value: confidenceScore.baselineValue,
        p_actual_value: confidenceScore.actualValue,
        p_deviation_percentage: confidenceScore.deviationPercentage,
      });
    }

    return NextResponse.json({
      confidence: confidenceScore,
      isAnomaly: isAnomaly(confidenceScore),
      severity: isAnomaly(confidenceScore) ? getAnomalySeverity(confidenceScore) : null,
    });
  } catch (err: any) {
    console.error("Error scoring confidence:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
