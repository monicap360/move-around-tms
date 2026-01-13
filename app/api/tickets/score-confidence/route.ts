import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { scoreFieldConfidence, isAnomaly, getAnomalySeverity } from "@/lib/data-confidence/confidence-scorer";

// POST: Score confidence for a ticket (called after ticket creation/update)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, driverId, siteId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    // Get ticket data
    const supabase = createSupabaseServerClient();
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("id, quantity, pay_rate, bill_rate, driver_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const results: any = {};
    const driver_id = driverId || ticket.driver_id;

    // Score quantity
    if (ticket.quantity !== null && ticket.quantity !== undefined) {
      const quantityScore = await scoreFieldConfidence(
        'ticket',
        ticketId,
        'quantity',
        parseFloat(ticket.quantity.toString()),
        driver_id || undefined,
        siteId || undefined,
        driver_id ? 30 : 90 // 30d for driver, 90d for site/global
      );

      // Record confidence event
      await supabase.rpc("record_confidence_event", {
        p_entity_type: 'ticket',
        p_entity_id: ticketId,
        p_field_name: 'quantity',
        p_confidence_score: quantityScore.score,
        p_reason: quantityScore.reason,
        p_baseline_type: quantityScore.baselineType,
        p_baseline_value: quantityScore.baselineValue,
        p_actual_value: quantityScore.actualValue,
        p_deviation_percentage: quantityScore.deviationPercentage,
      });

      results.quantity = quantityScore;

      // Record anomaly if low confidence
      if (isAnomaly(quantityScore)) {
        await supabase.rpc("record_anomaly_event", {
          p_entity_type: 'ticket',
          p_entity_id: ticketId,
          p_anomaly_type: 'deviation',
          p_severity: getAnomalySeverity(quantityScore),
          p_explanation: quantityScore.reason,
          p_baseline_reference: JSON.stringify({
            type: quantityScore.baselineType,
            value: quantityScore.baselineValue,
          }),
          p_field_name: 'quantity',
          p_baseline_value: quantityScore.baselineValue,
          p_actual_value: quantityScore.actualValue,
          p_deviation_percentage: quantityScore.deviationPercentage,
        });
      }
    }

    // Score pay_rate
    if (ticket.pay_rate !== null && ticket.pay_rate !== undefined) {
      const payRateScore = await scoreFieldConfidence(
        'ticket',
        ticketId,
        'pay_rate',
        parseFloat(ticket.pay_rate.toString()),
        driver_id || undefined,
        siteId || undefined,
        driver_id ? 30 : 90
      );

      await supabase.rpc("record_confidence_event", {
        p_entity_type: 'ticket',
        p_entity_id: ticketId,
        p_field_name: 'pay_rate',
        p_confidence_score: payRateScore.score,
        p_reason: payRateScore.reason,
        p_baseline_type: payRateScore.baselineType,
        p_baseline_value: payRateScore.baselineValue,
        p_actual_value: payRateScore.actualValue,
        p_deviation_percentage: payRateScore.deviationPercentage,
      });

      results.pay_rate = payRateScore;

      if (isAnomaly(payRateScore)) {
        await supabase.rpc("record_anomaly_event", {
          p_entity_type: 'ticket',
          p_entity_id: ticketId,
          p_anomaly_type: 'deviation',
          p_severity: getAnomalySeverity(payRateScore),
          p_explanation: payRateScore.reason,
          p_baseline_reference: JSON.stringify({
            type: payRateScore.baselineType,
            value: payRateScore.baselineValue,
          }),
          p_field_name: 'pay_rate',
          p_baseline_value: payRateScore.baselineValue,
          p_actual_value: payRateScore.actualValue,
          p_deviation_percentage: payRateScore.deviationPercentage,
        });
      }
    }

    // Score bill_rate
    if (ticket.bill_rate !== null && ticket.bill_rate !== undefined) {
      const billRateScore = await scoreFieldConfidence(
        'ticket',
        ticketId,
        'bill_rate',
        parseFloat(ticket.bill_rate.toString()),
        driver_id || undefined,
        siteId || undefined,
        driver_id ? 30 : 90
      );

      await supabase.rpc("record_confidence_event", {
        p_entity_type: 'ticket',
        p_entity_id: ticketId,
        p_field_name: 'bill_rate',
        p_confidence_score: billRateScore.score,
        p_reason: billRateScore.reason,
        p_baseline_type: billRateScore.baselineType,
        p_baseline_value: billRateScore.baselineValue,
        p_actual_value: billRateScore.actualValue,
        p_deviation_percentage: billRateScore.deviationPercentage,
      });

      results.bill_rate = billRateScore;

      if (isAnomaly(billRateScore)) {
        await supabase.rpc("record_anomaly_event", {
          p_entity_type: 'ticket',
          p_entity_id: ticketId,
          p_anomaly_type: 'deviation',
          p_severity: getAnomalySeverity(billRateScore),
          p_explanation: billRateScore.reason,
          p_baseline_reference: JSON.stringify({
            type: billRateScore.baselineType,
            value: billRateScore.baselineValue,
          }),
          p_field_name: 'bill_rate',
          p_baseline_value: billRateScore.baselineValue,
          p_actual_value: billRateScore.actualValue,
          p_deviation_percentage: billRateScore.deviationPercentage,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Error scoring ticket confidence:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
