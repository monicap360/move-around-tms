import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get all documents related to a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const documents: any[] = [];

    // 1. Get ticket upload_url (scale ticket)
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("upload_url")
      .eq("id", ticketId)
      .single();

    if (!ticketError && ticket?.upload_url) {
      documents.push({
        id: `${ticketId}-scale-ticket`,
        type: "Scale Ticket",
        url: ticket.upload_url,
        name: "Scale Ticket",
        uploaded_at: null, // Would need to add created_at to ticket
      });
    }

    // 2. Get related loads and their documents (BOL, POD)
    const { data: loads } = await supabase
      .from("loads")
      .select("id")
      .eq("ticket_id", ticketId);

    if (loads && loads.length > 0) {
      const loadIds = loads.map((l) => l.id);

      // Get load documents
      const { data: loadDocs } = await supabase
        .from("load_documents")
        .select("*")
        .in("load_id", loadIds);

      if (loadDocs) {
        loadDocs.forEach((doc: any) => {
          // Determine document type from URL or metadata
          const docType = doc.document_type || "Other";
          documents.push({
            id: doc.id,
            type: docType === "BOL" ? "BOL" : docType === "POD" ? "POD" : "Other",
            url: doc.document_url,
            name: doc.name || docType,
            uploaded_at: doc.uploaded_at,
            thumbnail_url: doc.thumbnail_url,
          });
        });
      }
    }

    // 3. Get related invoices (if invoices table links to tickets)
    // This would require checking if invoices have ticket references
    // For now, we'll skip this and it can be added later

    // 4. Check for any ticket-specific documents table
    // If there's a ticket_documents table, query it here

    return NextResponse.json({ documents });
  } catch (err: any) {
    console.error("Error in ticket documents GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
