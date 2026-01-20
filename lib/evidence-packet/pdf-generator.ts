/**
 * PDF Generation for Evidence Packets
 * Generates comprehensive PDF documents for ticket evidence packets
 */

export interface EvidencePacketData {
  ticket: any;
  confidenceSummary: any;
  anomalySummary: any;
  narrativeSummary: string;
  relatedTickets: any[];
  relatedDocuments: any[];
}

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import JSZip from "jszip";

/**
 * Generate PDF content for evidence packet (client-safe).
 */
export async function generateEvidencePDF(data: EvidencePacketData): Promise<Blob> {
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
    `Ticket: ${data.ticket.ticket_number || data.ticket.id}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "Narrative Summary",
    data.narrativeSummary || "No narrative available.",
    "",
    "Confidence Analysis",
    `Total Events: ${data.confidenceSummary.total_events}`,
    `Average Confidence: ${(data.confidenceSummary.average_confidence * 100).toFixed(1)}%`,
    `Fields Checked: ${data.confidenceSummary.fields_checked.join(", ")}`,
    "",
    "Anomaly Detection",
    `Total Anomalies: ${data.anomalySummary.total_anomalies}`,
    `Critical: ${data.anomalySummary.severity_breakdown.critical}`,
    `High: ${data.anomalySummary.severity_breakdown.high}`,
    `Medium: ${data.anomalySummary.severity_breakdown.medium}`,
    `Low: ${data.anomalySummary.severity_breakdown.low}`,
    "",
    "Related Tickets",
    `${data.relatedTickets.length} related tickets found`,
    "",
    "Related Documents",
    `${data.relatedDocuments.length} documents attached`,
  ];

  for (const line of lines) {
    addLine(line, line === "EVIDENCE PACKET");
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Generate ZIP file with all evidence packet documents
 */
export async function generateEvidenceZIP(data: EvidencePacketData): Promise<Blob> {
  const zip = new JSZip();
  zip.file(
    "metadata.json",
    JSON.stringify(
      {
        ticket_id: data.ticket.id,
        ticket_number: data.ticket.ticket_number,
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  zip.file("narrative_summary.txt", data.narrativeSummary || "No narrative available.");
  zip.file("confidence_summary.json", JSON.stringify(data.confidenceSummary, null, 2));
  zip.file("anomaly_summary.json", JSON.stringify(data.anomalySummary, null, 2));
  zip.file("related_tickets.json", JSON.stringify(data.relatedTickets, null, 2));
  zip.file("related_documents.json", JSON.stringify(data.relatedDocuments, null, 2));
  zip.file("ticket.json", JSON.stringify(data.ticket, null, 2));

  const zipBytes = await zip.generateAsync({ type: "uint8array" });
  return new Blob([zipBytes], { type: "application/zip" });
}
