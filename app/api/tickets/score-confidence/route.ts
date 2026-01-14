import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { 
  scoreFieldConfidenceWithVertical, 
  isAnomaly, 
  getAnomalySeverity,
  getOrganizationVerticalProfile 
} from "@/lib/data-confidence/confidence-scorer";

export const dynamic = 'force-dynamic';

// POST: Score confidence for a ticket (called after ticket creation/update)
// Now supports vertical-aware baseline windows based on organization's industry type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, driverId, siteId, organizationId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    // Get ticket data - try aggregate_tickets first, then tickets table
    const supabase = createSupabaseServerClient();
    let ticket: any = null;
    let ticketError: any = null;
    
    // Try aggregate_tickets first
    const { data: aggregateTicket, error: aggregateError } = await supabase
      .from("aggregate_tickets")
      .select("id, quantity, pay_rate, bill_rate, driver_id")
      .eq("id", ticketId)
      .single();

    if (!aggregateError && aggregateTicket) {
      ticket = aggregateTicket;
    } else {
      // Try tickets table as fallback (for FastScan, etc.)
      const { data: regularTicket, error: regularError } = await supabase
        .from("tickets")
        .select("id, quantity, pay_rate, bill_rate, driver_id, weight_in, weight_out")
        .eq("id", ticketId)
        .single();

      if (!regularError && regularTicket) {
        // Calculate quantity from weight_out - weight_in if quantity not present
        ticket = {
          ...regularTicket,
          quantity: regularTicket.quantity || (regularTicket.weight_out && regularTicket.weight_in 
            ? regularTicket.weight_out - regularTicket.weight_in 
            : null),
        };
      } else {
        ticketError = regularError || aggregateError;
      }
    }

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const results: any = {};
    const driver_id = driverId || ticket.driver_id;

    // Score quantity using vertical-aware baseline windows
    if (ticket.quantity !== null && ticket.quantity !== undefined) {
      const quantityScore = await scoreFieldConfidenceWithVertical(
        'ticket',
        ticketId,
        'quantity',
        parseFloat(ticket.quantity.toString()),
        organizationId || undefined,
        driver_id || undefined,
        siteId || undefined
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

    // Score pay_rate using vertical-aware baseline windows
    if (ticket.pay_rate !== null && ticket.pay_rate !== undefined) {
      const payRateScore = await scoreFieldConfidenceWithVertical(
        'ticket',
        ticketId,
        'pay_rate',
        parseFloat(ticket.pay_rate.toString()),
        organizationId || undefined,
        driver_id || undefined,
        siteId || undefined
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

    // Score bill_rate using vertical-aware baseline windows
    if (ticket.bill_rate !== null && ticket.bill_rate !== undefined) {
      const billRateScore = await scoreFieldConfidenceWithVertical(
        'ticket',
        ticketId,
        'bill_rate',
        parseFloat(ticket.bill_rate.toString()),
        organizationId || undefined,
        driver_id || undefined,
        siteId || undefined
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
