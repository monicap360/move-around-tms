import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Generate PDF for evidence packet
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    const supabase = createSupabaseServerClient();

    // Get evidence packet data
    const { data: packet } = await supabase
      .from("evidence_packets")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    if (!packet) {
      return NextResponse.json(
        { error: "Evidence packet not found. Generate it first." },
        { status: 404 }
      );
    }

    // Get ticket data
    const { data: ticket } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    // Generate PDF content
    // Note: In production, use a proper PDF library like pdfkit or puppeteer
    const pdfContent = `
EVIDENCE PACKET
${"=".repeat(50)}

Ticket: ${ticket?.ticket_number || ticketId}
Generated: ${new Date(packet.generated_at).toLocaleString()}

${packet.narrative_summary || "No narrative available"}

CONFIDENCE ANALYSIS
${"-".repeat(50)}
Total Events: ${packet.confidence_summary?.total_events || 0}
Average Confidence: ${((packet.confidence_summary?.average_confidence || 0) * 100).toFixed(1)}%
Fields Checked: ${(packet.confidence_summary?.fields_checked || []).join(", ") || "None"}

ANOMALY DETECTION
${"-".repeat(50)}
Total Anomalies: ${packet.anomaly_summary?.total_anomalies || 0}
Critical: ${packet.anomaly_summary?.severity_breakdown?.critical || 0}
High: ${packet.anomaly_summary?.severity_breakdown?.high || 0}
Medium: ${packet.anomaly_summary?.severity_breakdown?.medium || 0}
Low: ${packet.anomaly_summary?.severity_breakdown?.low || 0}

RELATED TICKETS
${"-".repeat(50)}
${packet.related_tickets?.length || 0} related tickets found

This is a text-based PDF representation.
In production, use a PDF library for proper formatting.
    `.trim();

    // Return as text/plain for now (in production, generate actual PDF)
    return new NextResponse(pdfContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="evidence_packet_${ticket?.ticket_number || ticketId}.txt"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating PDF:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
