import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET: Get all legs for a ticket
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

    // Get all legs for this ticket
    const { data: legs, error: legsError } = await supabase
      .from("ticket_legs")
      .select(`
        *,
        financials:ticket_leg_financials(*),
        documents:ticket_leg_documents(*)
      `)
      .eq("ticket_id", ticketId)
      .order("leg_number", { ascending: true });

    if (legsError) {
      console.error("Error fetching ticket legs:", legsError);
      return NextResponse.json(
        { error: "Failed to fetch ticket legs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ legs: legs || [] });
  } catch (err: any) {
    console.error("Error in ticket legs GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create a new leg for a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { ticketId } = params;
    const body = await request.json();
    const {
      leg_number,
      leg_type,
      location_name,
      address,
      city,
      state,
      zip_code,
      latitude,
      longitude,
      scheduled_date,
      quantity,
      material,
      notes,
      bol_number,
      pay_rate,
      bill_rate,
    } = body;

    if (!leg_number || !leg_type || !location_name) {
      return NextResponse.json(
        { error: "leg_number, leg_type, and location_name are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Create leg
    const { data: leg, error: legError } = await supabase
      .from("ticket_legs")
      .insert({
        ticket_id: ticketId,
        leg_number,
        leg_type,
        location_name,
        address,
        city,
        state,
        zip_code,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        scheduled_date,
        quantity: quantity ? Number(quantity) : null,
        material,
        notes,
        bol_number,
      })
      .select()
      .single();

    if (legError) {
      console.error("Error creating leg:", legError);
      return NextResponse.json(
        { error: "Failed to create leg" },
        { status: 500 }
      );
    }

    // Create financials if rates provided
    if (pay_rate && bill_rate && quantity) {
      await supabase.from("ticket_leg_financials").insert({
        leg_id: leg.id,
        pay_rate: Number(pay_rate),
        bill_rate: Number(bill_rate),
        quantity: Number(quantity),
      });
    }

    return NextResponse.json({ leg }, { status: 201 });
  } catch (err: any) {
    console.error("Error in ticket legs POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
