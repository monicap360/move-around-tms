import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// GET: Get comprehensive ticket summary with all related data
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

    // Fetch ticket with related data
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select(`
        *,
        driver:driver_id (
          id,
          full_name,
          phone,
          cdl_number,
          driver_uuid
        ),
        truck:truck_id (
          id,
          truck_number,
          make,
          model,
          year
        )
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Fetch confidence scores
    const { data: confidenceEvents } = await supabase
      .from("data_confidence_events")
      .select("*")
      .eq("entity_type", "ticket")
      .eq("entity_id", ticketId)
      .order("created_at", { ascending: false });

    // Group confidence by field
    const confidence: Record<string, any> = {};
    confidenceEvents?.forEach((event: any) => {
      if (!confidence[event.field_name] || 
          new Date(event.created_at) > new Date(confidence[event.field_name].created_at)) {
        confidence[event.field_name] = {
          score: event.confidence_score,
          reason: event.reason,
          baselineType: event.baseline_type,
          baselineValue: event.baseline_value,
          actualValue: event.actual_value,
          deviationPercentage: event.deviation_percentage,
        };
      }
    });

    // Fetch related loads
    const { data: relatedLoads } = await supabase
      .from("loads")
      .select("id, status, load_start, load_end, material, plant")
      .eq("ticket_id", ticketId)
      .order("load_start", { ascending: false });

    // Fetch related documents (if document table exists)
    // Note: Adjust table/column names based on your schema
    let relatedDocuments: any[] = [];
    try {
      const { data: docs } = await supabase
        .from("load_documents")
        .select("id, document_url, uploaded_at")
        .in("load_id", relatedLoads?.map(l => l.id) || []);
      relatedDocuments = docs || [];
    } catch (e) {
      // Documents table might not exist or have different structure
      console.log("Could not fetch documents:", e);
    }

    // Calculate financial breakdown
    const quantity = ticket.quantity || 0;
    const payRate = ticket.pay_rate || 0;
    const billRate = ticket.bill_rate || 0;
    const totalPay = quantity * payRate;
    const totalBill = quantity * billRate;
    const totalProfit = totalBill - totalPay;
    const margin = totalBill > 0 ? (totalProfit / totalBill) * 100 : 0;

    // Build status timeline (simplified - can be enhanced with audit table)
    const statusTimeline = [
      {
        status: "created",
        timestamp: ticket.created_at,
        description: "Ticket created",
      },
    ];

    if (ticket.status && ticket.status !== "pending") {
      statusTimeline.push({
        status: ticket.status,
        timestamp: ticket.updated_at || ticket.created_at,
        description: `Ticket ${ticket.status}`,
      });
    }

    // Build summary response
    const summary = {
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        ticket_date: ticket.ticket_date,
        status: ticket.status,
        material: ticket.material || ticket.material_type,
        quantity: quantity,
        unit: ticket.unit_type || ticket.unit,
        notes: ticket.notes,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      },
      driver: ticket.driver ? {
        id: ticket.driver.id,
        name: ticket.driver.full_name,
        phone: ticket.driver.phone,
        cdl_number: ticket.driver.cdl_number,
        driver_uuid: ticket.driver.driver_uuid,
      } : null,
      truck: ticket.truck ? {
        id: ticket.truck.id,
        truck_number: ticket.truck.truck_number,
        make: ticket.truck.make,
        model: ticket.truck.model,
        year: ticket.truck.year,
      } : null,
      financial: {
        payRate,
        billRate,
        quantity,
        totalPay,
        totalBill,
        totalProfit,
        margin: parseFloat(margin.toFixed(2)),
      },
      confidence,
      relatedLoads: relatedLoads || [],
      relatedDocuments: relatedDocuments || [],
      statusTimeline,
    };

    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error("Error in ticket summary GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
