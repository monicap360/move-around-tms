import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  const updates = {
    ticket_number: body.ticket_number || null,
    ticket_date: body.ticket_date || null,
    driver_id: body.driver_id || null,
    driver_name: body.driver_name || null,
    truck_number: body.truck_number || null,
    trailer_number: body.trailer_number || null,
    material: body.material || null,
    unit_type: body.unit_type || null,
    load_type: body.load_type || null,
    quantity: body.quantity || null,
    pay_rate: body.pay_rate || null,
    bill_rate: body.bill_rate || body.rate_amount || null,
    rate_type: body.rate_type || null,
    rate_amount: body.rate_amount || null,
    customer_name: body.customer_name || null,
    job_name: body.job_name || null,
    pickup_location: body.pickup_location || null,
    delivery_location: body.delivery_location || null,
    delivery_site: body.delivery_site || body.delivery_location || null,
    dump_location: body.dump_location || null,
    pickup_gps_lat: body.pickup_gps_lat ?? null,
    pickup_gps_lon: body.pickup_gps_lon ?? null,
    dump_gps_lat: body.dump_gps_lat ?? null,
    dump_gps_lon: body.dump_gps_lon ?? null,
    calculated_distance: body.calculated_distance ?? null,
    load_time: body.load_time || null,
    dump_time: body.dump_time || null,
    waiting_minutes: body.waiting_minutes ?? null,
    has_photo: body.has_photo ?? null,
    has_signature: body.has_signature ?? null,
    weight_ticket_verified: body.weight_ticket_verified ?? null,
    gross_weight: body.gross_weight || null,
    tare_weight: body.tare_weight || null,
    net_weight: body.net_weight || null,
    uom: body.uom || null,
    status: body.status || null,
    payment_status: body.payment_status || null,
    invoice_number: body.invoice_number || null,
    approved_at: body.approved_at || null,
    approved_by: body.approved_by || null,
    driver_settlement_reference: body.driver_settlement_reference || null,
    ticket_notes: body.ticket_notes || null,
    odometer: body.odometer || null,
    shift: body.shift || null,
    work_order_number: body.work_order_number || null,
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
