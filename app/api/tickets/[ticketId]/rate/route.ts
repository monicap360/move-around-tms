import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateRate, DEFAULT_ACCESSORIALS } from "@/lib/rating/rating-engine";

// POST: Calculate rate for a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const body = await request.json();
    const { rateRule } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "ticketId is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("aggregate_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Use provided rate rule or default
    const rule = rateRule || {
      id: "default",
      name: "Default Rate",
      baseRate: ticket.rate || ticket.bill_rate || 0,
      rateType: "per_ton",
      accessorials: DEFAULT_ACCESSORIALS,
    };

    // Calculate rate
    const ratingResult = calculateRate(ticket, rule);

    return NextResponse.json({
      rating: ratingResult,
      ticket: ticket,
    });
  } catch (err: any) {
    console.error("Error calculating rate:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
