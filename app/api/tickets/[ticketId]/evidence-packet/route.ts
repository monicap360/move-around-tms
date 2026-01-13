import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST: Generate evidence packet for a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const body = await request.json();
    const { user_id } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // 1. Get ticket data
    const { data: ticket } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // 2. Get related confidence events
    const { data: confidenceEvents } = await supabase
      .from("data_confidence_events")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("created_at", { ascending: false });

    // 3. Get related anomaly events
    const { data: anomalyEvents } = await supabase
      .from("anomaly_events")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("created_at", { ascending: false });

    // 4. Get related tickets (same driver, same date range)
    const { data: relatedTickets } = await supabase
      .from("aggregate_tickets")
      .select("id")
      .eq("driver_id", ticket.driver_id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .neq("id", ticketId)
      .limit(10);

    // 5. Build summaries
    const confidenceSummary = {
      total_events: confidenceEvents?.length || 0,
      average_confidence: confidenceEvents?.length
        ? confidenceEvents.reduce((sum: number, e: any) => sum + (e.confidence_score || 0), 0) /
          confidenceEvents.length
        : 0,
      fields_checked: [...new Set(confidenceEvents?.map((e: any) => e.field_name) || [])],
    };

    const anomalySummary = {
      total_anomalies: anomalyEvents?.length || 0,
      severity_breakdown: {
        critical: anomalyEvents?.filter((a: any) => a.severity === "critical").length || 0,
        high: anomalyEvents?.filter((a: any) => a.severity === "high").length || 0,
        medium: anomalyEvents?.filter((a: any) => a.severity === "medium").length || 0,
        low: anomalyEvents?.filter((a: any) => a.severity === "low").length || 0,
      },
    };

    // 6. Generate narrative summary
    const narrativeSummary = `Ticket ${ticket.ticket_number} Evidence Packet

Generated: ${new Date().toLocaleString()}

TICKET SUMMARY:
- Ticket Number: ${ticket.ticket_number}
- Status: ${ticket.status}
- Date: ${ticket.ticket_date || ticket.created_at}
- Driver: ${ticket.driver_id}
- Material: ${ticket.material_type || ticket.material || "N/A"}
- Quantity: ${ticket.quantity} ${ticket.unit_type || ticket.unit || ""}
- Total Amount: $${ticket.total_amount || ticket.total_bill || 0}

CONFIDENCE ANALYSIS:
- Total Confidence Events: ${confidenceSummary.total_events}
- Average Confidence Score: ${(confidenceSummary.average_confidence * 100).toFixed(1)}%
- Fields Checked: ${confidenceSummary.fields_checked.join(", ") || "None"}

ANOMALY DETECTION:
- Total Anomalies: ${anomalySummary.total_anomalies}
- Critical: ${anomalySummary.severity_breakdown.critical}
- High: ${anomalySummary.severity_breakdown.high}
- Medium: ${anomalySummary.severity_breakdown.medium}
- Low: ${anomalySummary.severity_breakdown.low}

RELATED TICKETS:
- Found ${relatedTickets?.length || 0} related tickets from the same driver
`;

    // 7. Create evidence packet record
    const { data: packet, error: packetError } = await supabase
      .from("evidence_packets")
      .insert({
        entity_type: "ticket",
        entity_id: ticketId,
        packet_name: `Evidence Packet - ${ticket.ticket_number}`,
        generated_by: user_id,
        confidence_summary: confidenceSummary,
        anomaly_summary: anomalySummary,
        narrative_summary: narrativeSummary,
        related_tickets: relatedTickets?.map((t: any) => t.id) || [],
        related_confidence_events: confidenceEvents?.map((e: any) => e.id) || [],
        related_anomaly_events: anomalyEvents?.map((e: any) => e.id) || [],
      })
      .select()
      .single();

    if (packetError) {
      console.error("Error creating evidence packet:", packetError);
      return NextResponse.json(
        { error: "Failed to create evidence packet" },
        { status: 500 }
      );
    }

    return NextResponse.json({ packet });
  } catch (err: any) {
    console.error("Error in evidence packet POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Get evidence packet
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    const supabase = createSupabaseServerClient();

    const { data: packet, error } = await supabase
      .from("evidence_packets")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !packet) {
      return NextResponse.json(
        { error: "Evidence packet not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ packet });
  } catch (err: any) {
    console.error("Error in evidence packet GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
