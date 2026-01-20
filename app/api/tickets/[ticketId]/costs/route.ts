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
    let fuelGallons = 0;
    let tollsCost = 0;
    const missingSources: string[] = [];

    // Calculate fuel costs
    if (ticket.truck_id) {
      const { data: fuelPurchases, error: fuelError } = await supabase
        .from("fuel_purchases")
        .select("amount, gallons, purchase_date")
        .eq("truck_id", ticket.truck_id)
        .gte("purchase_date", dateRange.toISOString().split("T")[0])
        .lte("purchase_date", dateRangeEnd.toISOString().split("T")[0]);

      if (fuelError) {
        missingSources.push("fuel_purchases");
      }

      if (fuelPurchases) {
        fuelCost = fuelPurchases.reduce((sum, fp) => sum + (Number(fp.amount) || 0), 0);
        fuelGallons = fuelPurchases.reduce((sum, fp) => sum + (Number(fp.gallons) || 0), 0);
      }
    } else {
      missingSources.push("truck_id");
    }

    // Tolls/expenses table is not present in schema; return 0 and note missing source.
    missingSources.push("tolls");

    return NextResponse.json({
      fuel_cost: fuelCost,
      fuel_gallons: fuelGallons,
      tolls_cost: tollsCost,
      other_costs: 0,
      total_costs: fuelCost + tollsCost,
      missing_sources: missingSources,
    });
  } catch (err: any) {
    console.error("Error in ticket costs GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
