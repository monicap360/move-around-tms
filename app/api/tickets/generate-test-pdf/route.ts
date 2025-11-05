import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      template_name,
      partner_name,
      form_data,
      template_fields
    } = body;

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Colors
    const brandBlue = rgb(0.04, 0.24, 0.57);
    const gray = rgb(0.4, 0.4, 0.4);
    const black = rgb(0, 0, 0);

    let yPos = height - 60;

    // Header
    page.drawRectangle({
      x: 0,
      y: yPos - 10,
      width: width,
      height: 80,
      color: brandBlue,
    });

    page.drawText('MOVE AROUND TMS', {
      x: 50,
      y: yPos + 30,
      size: 24,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page.drawText('Test Ticket Generation', {
      x: 50,
      y: yPos + 10,
      size: 10,
      font: font,
      color: rgb(0.9, 0.9, 0.9),
    });

    page.drawText('TEST DOCUMENT', {
      x: width - 170,
      y: yPos + 30,
      size: 20,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    yPos -= 120;

    // Template Info
    page.drawText(`Template: ${template_name}`, {
      x: 50,
      y: yPos,
      size: 14,
      font: fontBold,
      color: brandBlue,
    });

    if (partner_name) {
      yPos -= 20;
      page.drawText(`Partner: ${partner_name}`, {
        x: 50,
        y: yPos,
        size: 12,
        font: font,
        color: gray,
      });
    }

    yPos -= 20;
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: yPos,
      size: 10,
      font: font,
      color: gray,
    });

    yPos -= 40;

    // Form Data Section
    page.drawText('FORM DATA:', {
      x: 50,
      y: yPos,
      size: 12,
      font: fontBold,
      color: brandBlue,
    });

    yPos -= 25;

    // Table header
    page.drawRectangle({
      x: 50,
      y: yPos - 5,
      width: width - 100,
      height: 25,
      color: rgb(0.95, 0.95, 0.95),
    });

    page.drawText('FIELD', {
      x: 60,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    page.drawText('VALUE', {
      x: 300,
      y: yPos + 5,
      size: 10,
      font: fontBold,
      color: black,
    });

    yPos -= 30;

    // Form fields
    if (template_fields && template_fields.length > 0) {
      for (const field of template_fields) {
        const value = form_data[field.name] || '';
        
        // Check if we need a new page
        if (yPos < 100) {
          page = pdfDoc.addPage([612, 792]);
          yPos = height - 60;
        }

        page.drawText(field.label, {
          x: 60,
          y: yPos,
          size: 9,
          font: font,
          color: black,
        });

        page.drawText(String(value), {
          x: 300,
          y: yPos,
          size: 9,
          font: font,
          color: black,
        });

        yPos -= 18;
      }
    } else {
      page.drawText('No fields defined', {
        x: 60,
        y: yPos,
        size: 9,
        font: font,
        color: gray,
      });
      yPos -= 18;
    }

    yPos -= 30;

    // Footer note
    page.drawText('This is a test document generated from a ticket template.', {
      x: 50,
      y: 50,
      size: 8,
      font: font,
      color: gray,
    });

    page.drawText('© 2025 Move Around TMS™ - Template Testing System', {
      x: 50,
      y: 35,
      size: 8,
      font: font,
      color: gray,
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="test-ticket-${Date.now()}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Test PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate test PDF', details: error.message },
      { status: 500 }
    );
  }
}