import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

// GET: List all tickets
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("aggregate_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, tickets: data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch tickets" },
      { status: 500 },
    );
  }
}

// POST: Create a new ticket
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Generate ticket number if not provided
    const ticketNumber =
      body.ticket_number || `TKT-${Date.now().toString().slice(-8)}`;
    const total = (body.quantity || 0) * (body.rate || 0);
    const { data, error } = await supabaseAdmin
      .from("aggregate_tickets")
      .insert([
        {
          ...body,
          ticket_number: ticketNumber,
          total_amount: total,
          status: body.status || "pending",
        },
      ])
      .select()
      .single();
    if (error) throw error;
    
    // Score confidence for the new ticket (async, don't wait)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tickets/score-confidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketId: data.id,
        driverId: body.driver_id,
        siteId: body.site_id,
      }),
    }).catch(err => console.error('Error scoring ticket confidence:', err));
    
    return NextResponse.json({ ok: true, ticket: data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to create ticket" },
      { status: 500 },
    );
  }
}
