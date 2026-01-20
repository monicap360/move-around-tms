import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import JSZip from "jszip";

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

    const zip = new JSZip();
    const ticketLabel = ticket?.ticket_number || ticketId;
    const generatedAt = new Date(packet.generated_at).toISOString();

    zip.file(
      "metadata.json",
      JSON.stringify(
        {
          ticket_number: ticketLabel,
          ticket_id: ticketId,
          generated_at: generatedAt,
        },
        null,
        2,
      ),
    );
    zip.file("narrative_summary.txt", packet.narrative_summary || "No narrative available.");
    zip.file("confidence_summary.json", JSON.stringify(packet.confidence_summary || {}, null, 2));
    zip.file("anomaly_summary.json", JSON.stringify(packet.anomaly_summary || {}, null, 2));
    zip.file("related_tickets.json", JSON.stringify(packet.related_tickets || [], null, 2));
    zip.file("related_documents.json", JSON.stringify(packet.related_documents || [], null, 2));
    zip.file("ticket.json", JSON.stringify(ticket || {}, null, 2));

    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="evidence_packet_${ticketLabel}.zip"`,
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
