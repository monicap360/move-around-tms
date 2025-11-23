// Generate Branded Invoice PDF
// Creates professional invoice PDF from tickets or quotes

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import supabaseAdmin from '@/lib/supabaseAdmin';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    company,
    contact_name,
    contact_email,
    billing_address,
    line_items = [],
    notes,
    invoice_number,
    invoice_date,
    due_date,
  } = body;

  if (!company || !line_items.length) {
    return NextResponse.json(
      { error: 'Missing required fields: company, line_items' },
      { status: 400 }
    );
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const brandBlue = rgb(0.04, 0.24, 0.57);
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const black = rgb(0, 0, 0);
    const green = rgb(0.09, 0.64, 0.29);

    let yPos = height - 60;

    // Header
    page.drawRectangle({
      x: 0,
      y: yPos - 10,
      width: width,
      height: 100,
      color: brandBlue,
    });

    page.drawText('RONYX LOGISTICS LLC', {
      x: 50,
      y: yPos + 50,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('Professional Aggregate Hauling Services', {
      x: 50,
      y: yPos + 30,
      size: 10,
      font: font,
      color: rgb(0.9, 0.9, 0.9),
    });

    // Space reserved for logo underneath company name
    // Logo placeholder area: x: 50, y: yPos + 5, width: 40, height: 20
    
    page.drawText('INVOICE', {
      x: width - 170,
      y: yPos + 40,
      size: 28,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    yPos -= 130;

    // Invoice Details
    const invNum = invoice_number || `INV-${Date.now().toString().slice(-8)}`;
    const invDate = invoice_date || new Date().toLocaleDateString('en-US');
    const dueDate = due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US');

    page.drawText(`Invoice #: ${invNum}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
      color: gray,
    });

    page.drawText(`Invoice Date: ${invDate}`, {
      x: 50,
      y: yPos - 15,
      size: 10,
      font: font,
      color: gray,
    });

    page.drawText(`Due Date: ${dueDate}`, {
      x: 50,
      y: yPos - 30,
      size: 10,
      font: fontBold,
      color: green,
    });

    yPos -= 60;

    // Bill To
    page.drawText('BILL TO:', {
      x: 50,
      y: yPos,
      size: 11,
      font: fontBold,
      color: brandBlue,
    });

    yPos -= 20;

    page.drawText(company, {
      x: 50,
      y: yPos,
      size: 12,
      font: fontBold,
      color: black,
    });

    if (contact_name) {
      yPos -= 15;
      page.drawText(`Attn: ${contact_name}`, {
        x: 50,
        y: yPos,
        size: 10,
        font: font,
        color: black,
      });
    }

    if (contact_email) {
      yPos -= 15;
      page.drawText(contact_email, {
        x: 50,
        y: yPos,
        size: 10,
        font: font,
        color: black,
      });
    }

    if (billing_address) {
      yPos -= 15;
      const addressLines = billing_address.split('\n');
      for (const line of addressLines) {
        page.drawText(line, {
          x: 50,
          y: yPos,
          size: 10,
          font: font,
          color: black,
        });
        yPos -= 12;
      }
    }

    yPos -= 30;

    // Line Items Table Header
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: width - 100,
      height: 25,
      color: lightGray,
    });

    page.drawText('DESCRIPTION', {
      x: 60,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('QTY', {
      x: 330,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('RATE', {
      x: 400,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('AMOUNT', {
      x: 480,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    yPos -= 30;

    // Line Items
    let subtotal = 0;
    for (const item of line_items) {
      const description = item.description || '';
      const quantity = item.quantity || 0;
      const unit_price = item.unit_price || 0;
      const amount = item.amount || (quantity * unit_price);

      subtotal += amount;

      page.drawText(description.substring(0, 40), {
        x: 60,
        y: yPos,
        size: 9,
        font: font,
        color: black,
      });

      page.drawText(quantity.toString(), {
        x: 330,
        y: yPos,
        size: 9,
        font: font,
        color: black,
      });

      page.drawText(`$${unit_price.toFixed(2)}`, {
        x: 400,
        y: yPos,
        size: 9,
        font: font,
        color: black,
      });

      page.drawText(`$${amount.toFixed(2)}`, {
        x: 480,
        y: yPos,
        size: 9,
        font: font,
        color: black,
      });

      yPos -= 18;
    }

    yPos -= 10;

    // Divider
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 1,
      color: lightGray,
    });

    yPos -= 25;

    // Totals
    page.drawText('Subtotal:', {
      x: 400,
      y: yPos,
      size: 10,
      font: font,
      color: black,
    });

    page.drawText(`$${subtotal.toFixed(2)}`, {
      x: 480,
      y: yPos,
      size: 10,
      font: font,
      color: black,
    });

    yPos -= 20;

    page.drawText('TOTAL:', {
      x: 400,
      y: yPos,
      size: 12,
      font: fontBold,
      color: brandBlue,
    });

    page.drawText(`$${subtotal.toFixed(2)}`, {
      x: 480,
      y: yPos,
      size: 12,
      font: fontBold,
      color: brandBlue,
    });

    yPos -= 40;

    // Notes
    if (notes) {
      page.drawText('NOTES:', {
        x: 50,
        y: yPos,
        size: 11,
        font: fontBold,
        color: brandBlue,
      });

      yPos -= 20;

      const notesLines = notes.match(/.{1,80}/g) || [notes];
      for (const line of notesLines) {
        page.drawText(line, {
          x: 50,
          y: yPos,
          size: 9,
          font: font,
          color: black,
        });
        yPos -= 12;
      }
    }

    // Payment Terms (footer area)
    yPos = 120;
    page.drawText('PAYMENT TERMS:', {
      x: 50,
      y: yPos,
      size: 10,
      font: fontBold,
      color: black,
    });

    yPos -= 15;

    const paymentTerms = [
      '• Payment due within 30 days of invoice date',
      '• Make checks payable to: Ronyx Logistics LLC',
      '• Wire transfer and ACH payment accepted',
      '• Late payments subject to 1.5% monthly interest',
    ];

    for (const term of paymentTerms) {
      page.drawText(term, {
        x: 50,
        y: yPos,
        size: 8,
        font: font,
        color: gray,
      });
      yPos -= 11;
    }

    // Footer
    page.drawText('© 2025 Ronyx Logistics LLC  •  Move Around TMS™  •  Thank you for your business!', {
      x: 90,
      y: 30,
      size: 8,
      font: font,
      color: gray,
    });

    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invNum}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Invoice PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF', details: error.message },
      { status: 500 }
    );
  }
}
