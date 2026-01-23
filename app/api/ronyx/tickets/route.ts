import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildTicketId,
  calculateDistanceMiles,
  calculateWaitingMinutes,
} from "@/lib/ronyx/phase1/ticketGenerator";
import { logValidations, validateTicket } from "@/lib/ronyx/aiValidationEngine";

export const dynamic = "force-dynamic";

const ALLOWED_UNITS = ["Load", "Yard", "Ton", "Hour"];
const ALLOWED_STATUSES = ["pending", "approved", "rejected", "paid", "invoiced", "voided"];
const ALLOWED_PAYMENT = ["unpaid", "processing", "paid"];

function normalizeStatus(status?: string) {
  if (!status) return "pending";
  const lower = status.toLowerCase();
  return ALLOWED_STATUSES.includes(lower) ? lower : "pending";
}

function normalizePayment(status?: string) {
  if (!status) return "unpaid";
  const lower = status.toLowerCase();
  return ALLOWED_PAYMENT.includes(lower) ? lower : "unpaid";
}

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase.from("aggregate_tickets").select("*").order("ticket_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (from) {
    query = query.gte("ticket_date", from);
  }
  if (to) {
    query = query.lte("ticket_date", to);
  }

  const { data, error } = await query.limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tickets: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const body = await request.json();

  let ticket_id = body.ticket_id as string | undefined;
  if (!ticket_id) {
    const projectCode =
      (body.project_code as string | undefined) ||
      body.project_id ||
      "TMS";
    ticket_id = await buildTicketId(projectCode);
  }

  const ticket_number =
    (body.ticket_number as string | undefined) || ticket_id;

  const unit_type = ALLOWED_UNITS.includes(body.unit_type) ? body.unit_type : "Load";
  const ticket_date = body.ticket_date || new Date().toISOString().slice(0, 10);

  const quantity = Number(body.quantity || 0);
  const pay_rate = Number(body.pay_rate || 0);
  const bill_rate = Number(body.bill_rate || body.rate_amount || 0);

  const gross_weight = body.gross_weight ? Number(body.gross_weight) : null;
  const tare_weight = body.tare_weight ? Number(body.tare_weight) : null;
  const net_weight =
    body.net_weight !== undefined && body.net_weight !== null
      ? Number(body.net_weight)
      : gross_weight !== null && tare_weight !== null
        ? Number(gross_weight) - Number(tare_weight)
        : null;

  const calculated_distance =
    body.pickup_gps_lat && body.pickup_gps_lon && body.dump_gps_lat && body.dump_gps_lon
      ? calculateDistanceMiles(
          { lat: Number(body.pickup_gps_lat), lon: Number(body.pickup_gps_lon) },
          { lat: Number(body.dump_gps_lat), lon: Number(body.dump_gps_lon) },
        )
      : body.calculated_distance
        ? Number(body.calculated_distance)
        : null;

  const waiting_minutes =
    body.waiting_minutes !== undefined && body.waiting_minutes !== null
      ? Number(body.waiting_minutes)
      : calculateWaitingMinutes(body.load_time, body.dump_time);

  const payload = {
    ticket_id,
    ticket_number,
    ticket_date,
    project_id: body.project_id || null,
    customer_id: body.customer_id || null,
    driver_id: body.driver_id || null,
    driver_name: body.driver_name || null,
    truck_id: body.truck_id || null,
    truck_number: body.truck_number || null,
    trailer_number: body.trailer_number || null,
    material: body.material || null,
    unit_type,
    load_type: body.load_type || null,
    quantity: isNaN(quantity) ? null : quantity,
    pay_rate: isNaN(pay_rate) ? null : pay_rate,
    bill_rate: isNaN(bill_rate) ? null : bill_rate,
    rate_type: body.rate_type || unit_type,
    rate_amount: isNaN(bill_rate) ? null : bill_rate,
    customer_name: body.customer_name || null,
    job_name: body.job_name || null,
    pickup_location: body.pickup_location || null,
    delivery_location: body.delivery_location || null,
    delivery_site: body.delivery_location || body.delivery_site || null,
    dump_location: body.dump_location || body.delivery_location || null,
    pickup_gps_lat: body.pickup_gps_lat || null,
    pickup_gps_lon: body.pickup_gps_lon || null,
    dump_gps_lat: body.dump_gps_lat || null,
    dump_gps_lon: body.dump_gps_lon || null,
    calculated_distance,
    status: normalizeStatus(body.status),
    payment_status: normalizePayment(body.payment_status),
    invoice_number: body.invoice_number || null,
    driver_settlement_reference: body.driver_settlement_reference || null,
    approved_at: body.approved_at || null,
    approved_by: body.approved_by || null,
    ticket_notes: body.ticket_notes || null,
    digital_signature: body.digital_signature || null,
    signature_name: body.signature_name || null,
    signed_at: body.signed_at || null,
    odometer: body.odometer || null,
    shift: body.shift || null,
    work_order_number: body.work_order_number || null,
    gross_weight,
    tare_weight,
    net_weight,
    load_weight: body.load_weight ?? net_weight ?? null,
    cubic_yards: body.cubic_yards || null,
    load_count: body.load_count || null,
    weight_ticket_number: body.weight_ticket_number || null,
    load_time: body.load_time || null,
    dump_time: body.dump_time || null,
    waiting_minutes,
    has_photo: body.has_photo ?? Boolean(body.ticket_image_url || body.delivery_receipt_url),
    has_signature: body.has_signature ?? Boolean(body.digital_signature || body.signature_name),
    weight_ticket_verified: body.weight_ticket_verified ?? false,
    uom: body.uom || unit_type,
    ticket_image_url: body.ticket_image_url || null,
    delivery_receipt_url: body.delivery_receipt_url || null,
    pod_url: body.pod_url || null,
  };

  const { data, error } = await supabase.from("aggregate_tickets").insert(payload).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    const validations = await validateTicket({
      ticket_id: data.ticket_id,
      project_id: data.project_id,
      customer_id: data.customer_id,
      truck_id: data.truck_id,
      driver_id: data.driver_id,
      material_type: data.material_type,
      load_weight: data.load_weight,
      cubic_yards: data.cubic_yards,
      calculated_distance: data.calculated_distance,
      pickup_gps_lat: data.pickup_gps_lat,
      pickup_gps_lon: data.pickup_gps_lon,
      dump_gps_lat: data.dump_gps_lat,
      dump_gps_lon: data.dump_gps_lon,
      load_time: data.load_time,
      dump_time: data.dump_time,
      waiting_minutes: data.waiting_minutes,
      has_photo: data.has_photo,
      has_signature: data.has_signature,
      weight_ticket_verified: data.weight_ticket_verified,
    });
    await logValidations(data.ticket_id, validations);
    const hasErrors = validations.errors.length > 0;
    const hasWarnings = validations.warnings.length > 0;
    const validationStatus = hasErrors
      ? "error"
      : hasWarnings
        ? "warning"
        : "passed";
    const validationErrors = {
      errors: validations.errors,
      warnings: validations.warnings,
      corrections: validations.corrections,
    };

    await supabase
      .from("aggregate_tickets")
      .update({
        validation_status: validationStatus,
        validation_score: validations.confidenceScore,
        validation_errors: validationErrors,
        status: hasErrors ? "in_review" : data.status,
      })
      .eq("id", data.id);
  } catch (validationError) {
    console.warn("Ticket validation failed:", validationError);
  }

  return NextResponse.json({ ticket: data });
}
