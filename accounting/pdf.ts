// PDF generation for invoices using pdf-lib (serverless-friendly)
import { Invoice } from "./invoice.types";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateInvoicePDF(
  invoice: Invoice,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText("INVOICE", {
    x: 50,
    y: 800,
    size: 24,
    font,
    color: rgb(0, 0, 0),
  });
  page.drawText(`Invoice ID: ${invoice.id}`, { x: 50, y: 770, size: 12, font });
  page.drawText(`Issued: ${invoice.issued_at}`, {
    x: 50,
    y: 755,
    size: 12,
    font,
  });
  page.drawText(`Due: ${invoice.due_at}`, { x: 50, y: 740, size: 12, font });
  page.drawText(`Status: ${invoice.status}`, { x: 50, y: 725, size: 12, font });
  page.drawText(`Customer: ${invoice.user_id}`, {
    x: 50,
    y: 710,
    size: 12,
    font,
  });
  page.drawText(`Description: ${invoice.description}`, {
    x: 50,
    y: 695,
    size: 12,
    font,
  });

  let y = 670;
  page.drawText("Line Items:", { x: 50, y, size: 14, font });
  y -= 20;
  invoice.line_items.forEach((item, idx) => {
    page.drawText(
      `${idx + 1}. ${item.description}  $${item.amount.toFixed(2)}${item.quantity ? " x" + item.quantity : ""}`,
      { x: 60, y, size: 12, font },
    );
    y -= 18;
  });

  page.drawText(`Total: $${invoice.amount.toFixed(2)} ${invoice.currency}`, {
    x: 50,
    y: y - 10,
    size: 14,
    font,
  });

  if (invoice.zelle_receipt_url) {
    page.drawText(`Zelle Receipt: ${invoice.zelle_receipt_url}`, {
      x: 50,
      y: y - 40,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
