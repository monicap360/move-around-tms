import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizeTicketSource(ticket: any) {
  return (
    ticket.ticket_source ||
    ticket.scan_source ||
    ticket.source ||
    ticket.upload_source ||
    ticket.ticket_notes?.match(/source:\s*([A-Za-z0-9\s]+)/i)?.[1]?.trim() ||
    "FastScan"
  );
}

function deriveProofStatus(ticket: any) {
  const driverSignature = Boolean(
    ticket.driver_signature ||
    ticket.has_driver_signature ||
    ticket.driver_signed ||
    ticket.has_signature ||
    ticket.signature_name ||
    ticket.digital_signature,
  );
  const customerSignature = Boolean(
    ticket.customer_signature ||
    ticket.has_customer_signature ||
    ticket.customer_signed,
  );
  const documentsComplete =
    ticket.documents_complete !== false &&
    ticket.proof_status?.toString().toLowerCase() !== "missing";

  if (!driverSignature && !customerSignature) return "Missing Required Documents";
  if (!driverSignature) return "Missing Driver Signature";
  if (!customerSignature) return "Missing Customer Signature";
  return documentsComplete ? "Complete" : "Missing Required Documents";
}

export async function GET(_request: NextRequest, { params }: { params: { ticketId: string } }) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("aggregate_tickets")
    .select("*")
    .eq("id", params.ticketId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = {
    ...data,
    ticket_source: normalizeTicketSource(data),
    proof_status: deriveProofStatus(data),
  };

  return NextResponse.json({ ticket: enriched });
}

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
    company_name: body.company_name || body.company || null,
    fuel_surcharge_amount: body.fuel_surcharge_amount ?? body.fuel_surcharge ?? null,
    spread_amount: body.spread_amount ?? null,
    detention_amount: body.detention_amount ?? null,
    detention_ref: body.detention_ref ?? null,
    source: body.source || body.scan_source || null,
    show_fuel: body.show_fuel ?? Boolean(body.fuel_surcharge_amount || body.fuel_surcharge),
    show_spread: body.show_spread ?? Boolean(body.spread_amount),
    show_detention: body.show_detention ?? Boolean(body.detention_amount),
    vendor_name: body.vendor_name || null,
    pit_location_name: body.pit_location_name || null,
    po_number: body.po_number || null,
    scan_type: body.scan_type || null,
    total_amount: body.total_amount ? Number(body.total_amount) : null,
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

  const enriched = {
    ...data,
    ticket_source: normalizeTicketSource(data),
    proof_status: deriveProofStatus(data),
  };

  return NextResponse.json({ ticket: enriched });
}

export async function DELETE(request: NextRequest, { params }: { params: { ticketId: string } }) {
  const supabase = createSupabaseServerClient();
  const body = await request.json().catch(() => ({}));
  const deletedBy = (body.deleted_by as string) || "dispatcher";
  const reason = (body.reason as string) || null;

  const fullUpdate = {
    voided: true,
    voided_at: new Date().toISOString(),
    voided_by: deletedBy,
    void_reason: reason,
    status: "voided",
  };

  let result = await supabase
    .from("aggregate_tickets")
    .update(fullUpdate)
    .eq("id", params.ticketId)
    .select("id, ticket_number, driver_name, truck_number")
    .single();

  if (result.error && result.error.message.includes("column")) {
    result = await supabase
      .from("aggregate_tickets")
      .update({ voided: true, voided_at: new Date().toISOString(), status: "voided" })
      .eq("id", params.ticketId)
      .select("id, ticket_number, driver_name, truck_number")
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  try {
    await supabase.from("ticket_audit_log").insert({
      ticket_id: params.ticketId,
      action: "deleted",
      description: `Ticket deleted by ${deletedBy}${reason ? `: ${reason}` : ""}`,
      old_value: "active",
      new_value: "voided",
      metadata: {
        deleted_by: deletedBy,
        reason,
        ticket_number: result.data?.ticket_number,
        driver_name: result.data?.driver_name,
        truck_number: result.data?.truck_number,
        deleted_at: new Date().toISOString(),
      },
    });
  } catch {
    // audit log failure is non-fatal
  }

  return NextResponse.json({ ok: true });
}
