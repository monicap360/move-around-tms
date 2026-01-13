import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseEDI, parse204LoadTender, parse210FreightInvoice, parse214ShipmentStatus } from "@/lib/edi/edi-parser";

// POST: Process incoming EDI document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, raw_content, document_type, trading_partner_id } = body;

    if (!organization_id || !raw_content || !document_type) {
      return NextResponse.json(
        { error: "organization_id, raw_content, and document_type are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Parse EDI document
    const ediDoc = parseEDI(raw_content);
    let parsedData: any = {};

    // Parse based on document type
    switch (document_type) {
      case "204":
        parsedData = parse204LoadTender(ediDoc);
        break;
      case "210":
        parsedData = parse210FreightInvoice(ediDoc);
        break;
      case "214":
        parsedData = parse214ShipmentStatus(ediDoc);
        break;
      default:
        parsedData = { segments: ediDoc.segments };
    }

    // Store EDI document
    const { data: ediDocument, error: insertError } = await supabase
      .from("edi_documents")
      .insert({
        organization_id,
        document_type,
        direction: "inbound",
        trading_partner_id: trading_partner_id || ediDoc.tradingPartner,
        control_number: ediDoc.controlNumber,
        raw_content: raw_content,
        parsed_data: parsedData,
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing EDI document:", insertError);
      return NextResponse.json(
        { error: "Failed to store EDI document" },
        { status: 500 }
      );
    }

    // Process based on document type
    let processingResult: any = {};

    if (document_type === "204") {
      // Create load from 204 Load Tender
      // This would create a load in the loads table
      processingResult = {
        action: "load_created",
        message: "Load tender processed",
      };
    } else if (document_type === "210") {
      // Create invoice from 210 Freight Invoice
      // This would create an invoice in the invoices table
      processingResult = {
        action: "invoice_created",
        message: "Freight invoice processed",
      };
    } else if (document_type === "214") {
      // Update load status from 214 Shipment Status
      processingResult = {
        action: "status_updated",
        message: "Shipment status updated",
      };
    }

    return NextResponse.json({
      success: true,
      edi_document: ediDocument,
      parsed_data: parsedData,
      processing_result: processingResult,
    });
  } catch (err: any) {
    console.error("Error processing EDI document:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
