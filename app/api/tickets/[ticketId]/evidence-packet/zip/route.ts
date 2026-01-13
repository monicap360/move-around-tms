import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Generate ZIP for evidence packet
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

    // Generate ZIP content
    // Note: In production, use JSZip library to create actual ZIP files
    const zipManifest = `
Evidence Packet ZIP Manifest
${"=".repeat(50)}

Ticket: ${ticket?.ticket_number || ticketId}
Generated: ${new Date(packet.generated_at).toLocaleString()}

Contents:
- Evidence Packet Summary (narrative_summary.txt)
- Confidence Analysis (confidence_summary.json)
- Anomaly Report (anomaly_summary.json)
- Related Tickets List (related_tickets.json)
- Related Documents List (related_documents.json)

Note: This is a placeholder. In production, use JSZip to create actual ZIP files.
    `.trim();

    // Return as text/plain for now (in production, generate actual ZIP)
    return new NextResponse(zipManifest, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="evidence_packet_${ticket?.ticket_number || ticketId}.zip"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating ZIP:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
