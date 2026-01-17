import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const updates = {
    status: body.status || null,
    payment_status: body.payment_status || null,
    invoice_number: body.invoice_number || null,
    approved_at: body.approved_at || null,
    approved_by: body.approved_by || null,
    driver_settlement_reference: body.driver_settlement_reference || null,
    ticket_notes: body.ticket_notes || null,
  };

  const { data, error } = await supabase
    .from("aggregate_tickets")
    .update(updates)
    .eq("id", params.ticketId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ticket: data });
}
