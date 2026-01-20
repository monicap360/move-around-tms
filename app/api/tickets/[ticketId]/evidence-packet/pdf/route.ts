import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

    const pdfDoc = await PDFDocument.create();
    let currentPage = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 48;
    const lineHeight = 16;
    const maxWidth = currentPage.getWidth() - margin * 2;
    let y = currentPage.getHeight() - margin;

    const addLine = (text: string, bold = false) => {
      if (y < margin + lineHeight) {
        currentPage = pdfDoc.addPage([612, 792]);
        y = currentPage.getHeight() - margin;
        currentPage.drawText(text, {
          x: margin,
          y,
          size: 12,
          font: bold ? fontBold : font,
          color: rgb(0, 0, 0),
          maxWidth,
        });
        y -= lineHeight;
        return;
      }

      currentPage.drawText(text, {
        x: margin,
        y,
        size: 12,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0),
        maxWidth,
      });
      y -= lineHeight;
    };

    const lines = [
      "EVIDENCE PACKET",
      `Ticket: ${ticket?.ticket_number || ticketId}`,
      `Generated: ${new Date(packet.generated_at).toLocaleString()}`,
      "",
      "Narrative Summary",
      packet.narrative_summary || "No narrative available.",
      "",
      "Confidence Analysis",
      `Total Events: ${packet.confidence_summary?.total_events || 0}`,
      `Average Confidence: ${((packet.confidence_summary?.average_confidence || 0) * 100).toFixed(1)}%`,
      `Fields Checked: ${(packet.confidence_summary?.fields_checked || []).join(", ") || "None"}`,
      "",
      "Anomaly Detection",
      `Total Anomalies: ${packet.anomaly_summary?.total_anomalies || 0}`,
      `Critical: ${packet.anomaly_summary?.severity_breakdown?.critical || 0}`,
      `High: ${packet.anomaly_summary?.severity_breakdown?.high || 0}`,
      `Medium: ${packet.anomaly_summary?.severity_breakdown?.medium || 0}`,
      `Low: ${packet.anomaly_summary?.severity_breakdown?.low || 0}`,
      "",
      "Related Tickets",
      `${packet.related_tickets?.length || 0} related tickets found`,
      "",
      "Related Documents",
      `${packet.related_documents?.length || 0} documents attached`,
    ];

    for (const line of lines) {
      addLine(line, line === "EVIDENCE PACKET");
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evidence_packet_${ticket?.ticket_number || ticketId}.pdf"`,
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
