import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get actual costs (fuel, tolls, etc.) for a ticket
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

    // Get ticket to find truck_id and ticket_date
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("truck_id, ticket_date, driver_id, created_at")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticketDate = ticket.ticket_date || ticket.created_at;
    const dateRange = new Date(ticketDate);
    dateRange.setDate(dateRange.getDate() - 1); // Look 1 day before ticket date
    const dateRangeEnd = new Date(ticketDate);
    dateRangeEnd.setDate(dateRangeEnd.getDate() + 1); // Look 1 day after ticket date

    let fuelCost = 0;
    let tollsCost = 0;

    // Calculate fuel costs
    if (ticket.truck_id) {
      // Get fuel purchases for this truck around the ticket date
      const { data: fuelPurchases } = await supabase
        .from("fuel_purchases")
        .select("total_cost, transaction_date")
        .eq("truck_id", ticket.truck_id)
        .gte("transaction_date", dateRange.toISOString().split("T")[0])
        .lte("transaction_date", dateRangeEnd.toISOString().split("T")[0]);

      if (fuelPurchases) {
        fuelCost = fuelPurchases.reduce((sum, fp) => sum + (Number(fp.total_cost) || 0), 0);
      }

      // Also check fuel_allocations if ticket is linked to a load
      // (This would require load_id in tickets, which may not exist yet)
    }

    // Calculate tolls/expenses
    // Note: Tolls table may not exist yet, but we'll check for expenses
    // For now, we'll use a placeholder query structure
    // In production, you'd have an expenses table with tolls, permits, etc.

    // Get other costs (maintenance, permits, etc.) if they exist
    // This would query an expenses table linked to truck_id or ticket_id

    return NextResponse.json({
      fuel_cost: fuelCost,
      tolls_cost: tollsCost,
      other_costs: 0, // Placeholder until expenses table is implemented
      total_costs: fuelCost + tollsCost,
    });
  } catch (err: any) {
    console.error("Error in ticket costs GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
