import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_UNITS = ["Load", "Yard", "Ton", "Hour"];
const ALLOWED_STATUSES = ["pending", "approved", "rejected", "paid", "invoiced"];
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

  const ticket_number =
    (body.ticket_number as string | undefined) ||
    `RNYX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

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

  const payload = {
    ticket_number,
    ticket_date,
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
    uom: body.uom || unit_type,
    ticket_image_url: body.ticket_image_url || null,
    delivery_receipt_url: body.delivery_receipt_url || null,
    pod_url: body.pod_url || null,
  };

  const { data, error } = await supabase.from("aggregate_tickets").insert(payload).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ticket: data });
}
