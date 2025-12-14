// Generate Branded Quote PDF
// Creates professional quote PDF with company branding, pricing table, and terms

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
  const { quote_id } = body;

  if (!quote_id) {
    return NextResponse.json({ error: 'Missing quote_id' }, { status: 400 });
  }

  // Fetch quote
  const { data: quote, error } = await supabaseAdmin
    .from('aggregate_quotes')
    .select('*')
    .eq('id', quote_id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  try {
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const brandBlue = rgb(0.04, 0.24, 0.57); // #0a3d91
    const gray = rgb(0.4, 0.4, 0.4);
    const lightGray = rgb(0.95, 0.95, 0.95);
    const black = rgb(0, 0, 0);

    let yPos = height - 60;

    // Header - Company Branding
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

    page.drawText('QUOTE', {
      x: width - 150,
      y: yPos + 40,
      size: 28,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    yPos -= 130;

    // Quote Number and Date
    const quoteNum = `QUO-${quote.id.substring(0, 8).toUpperCase()}`;
    const quoteDate = new Date(quote.created_at).toLocaleDateString('en-US');

    page.drawText(`Quote #: ${quoteNum}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
      color: gray,
    });

    page.drawText(`Date: ${quoteDate}`, {
      x: 50,
      y: yPos - 15,
      size: 10,
      font: font,
      color: gray,
    });

    page.drawText(`Valid for 30 days`, {
      x: 50,
      y: yPos - 30,
      size: 10,
      font: font,
      color: gray,
    });

    yPos -= 60;

    // Customer Information
    page.drawText('QUOTE FOR:', {
      x: 50,
      y: yPos,
      size: 11,
      font: fontBold,
      color: brandBlue,
    });

    yPos -= 20;

    page.drawText(quote.company, {
      x: 50,
      y: yPos,
      size: 12,
      font: fontBold,
      color: black,
    });

    if (quote.contact_name) {
      yPos -= 15;
      page.drawText(`Attn: ${quote.contact_name}`, {
        x: 50,
        y: yPos,
        size: 10,
        font: font,
        color: black,
      });
    }

    yPos -= 15;
    page.drawText(quote.contact_email, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
      color: black,
    });

    yPos -= 40;

    // Services Table Header
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: width - 100,
      height: 25,
      color: lightGray,
    });

    page.drawText('SERVICE', {
      x: 60,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('UNIT', {
      x: 320,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('RATE', {
      x: 450,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    yPos -= 30;

    // Service Line Item
    const serviceName = quote.material || 'Aggregate Hauling';
    page.drawText(serviceName, {
      x: 60,
      y: yPos,
      size: 10,
      font: font,
      color: black,
    });

    page.drawText(`per ${quote.billing_type}`, {
      x: 320,
      y: yPos,
      size: 10,
      font: font,
      color: black,
    });

    page.drawText(`$${quote.rate.toFixed(2)}`, {
      x: 450,
      y: yPos,
      size: 10,
      font: font,
      color: black,
    });

    yPos -= 20;

    // Divider
    page.drawLine({
      start: { x: 50, y: yPos },
      end: { x: width - 50, y: yPos },
      thickness: 1,
      color: lightGray,
    });

    yPos -= 40;

    // Additional Notes
    if (quote.notes) {
      page.drawText('NOTES:', {
        x: 50,
        y: yPos,
        size: 11,
        font: fontBold,
        color: brandBlue,
      });

      yPos -= 20;

      const notesLines = quote.notes.match(/.{1,80}/g) || [quote.notes];
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

      yPos -= 20;
    }

    // Terms & Conditions
    page.drawText('TERMS & CONDITIONS:', {
      x: 50,
      y: yPos,
      size: 11,
      font: fontBold,
      color: brandBlue,
    });

    yPos -= 20;

    const terms = [
      '• This quote is valid for 30 days from the date above.',
      '• Rates subject to change based on fuel costs and market conditions.',
      '• Payment terms: Net 30 days from invoice date.',
      '• Minimum order quantities may apply.',
      '• Services subject to availability and scheduling.',
    ];

    for (const term of terms) {
      page.drawText(term, {
        x: 50,
        y: yPos,
        size: 9,
        font: font,
        color: gray,
      });
      yPos -= 14;
    }

    yPos -= 30;

    // Acceptance Section
    page.drawRectangle({
      x: 50,
      y: yPos - 60,
      width: width - 100,
      height: 80,
      color: lightGray,
      borderColor: gray,
      borderWidth: 1,
    });

    page.drawText('ACCEPTANCE:', {
      x: 60,
      y: yPos - 20,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('By signing below, you accept the terms of this quote:', {
      x: 60,
      y: yPos - 35,
      size: 9,
      font: font,
      color: black,
    });

    page.drawText('Signature: _________________________________', {
      x: 60,
      y: yPos - 55,
      size: 9,
      font: font,
      color: black,
    });

    page.drawText('Date: _______________', {
      x: 360,
      y: yPos - 55,
      size: 9,
      font: font,
      color: black,
    });

    // Footer
    page.drawText('© 2025 Ronyx Logistics LLC  •  Move Around TMS™  •  Professional Transportation Services', {
      x: 80,
      y: 30,
      size: 8,
      font: font,
      color: gray,
    });

    // Generate PDF
    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${quoteNum}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
