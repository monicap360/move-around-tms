import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Fetch multiple tickets by IDs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { error: "ids parameter is required (comma-separated)" },
        { status: 400 }
      );
    }

    const ticketIds = ids.split(",").filter((id) => id.trim());

    if (ticketIds.length === 0) {
      return NextResponse.json(
        { error: "At least one ticket ID is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    const { data: tickets, error } = await supabase
      .from("aggregate_tickets")
      .select(`
        *,
        driver:driver_id (
          full_name
        ),
        truck:truck_id (
          truck_number
        )
      `)
      .in("id", ticketIds);

    if (error) {
      console.error("Error fetching tickets:", error);
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      );
    }

    // Transform the data to include driver_name and truck_number
    const transformedTickets = (tickets || []).map((ticket: any) => ({
      ...ticket,
      driver_name: ticket.driver?.full_name,
      truck_number: ticket.truck?.truck_number,
    }));

    return NextResponse.json({ tickets: transformedTickets });
  } catch (err: any) {
    console.error("Error in batch tickets GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
