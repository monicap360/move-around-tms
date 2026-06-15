import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OFFICE_FIELDS = `
  id, ticket_number, ticket_date, driver_name, truck_number, truck_type,
  shift, material, quantity, customer_name, pickup_location, authorized_person,
  signature_present, start_time, end_time, total_hours, copy_color,
  status, reconciliation_status, payroll_hold, billing_hold,
  payroll_ready, billing_ready, payment_status,
  ocr_confidence, extraction_confidence, missing_fields, exception_flags,
  scan_source, document_type, source,
  qr_token, qr_url, qr_scan_count, last_qr_scanned_at,
  customer_approved, customer_signed_name, customer_signed_at, customer_notes,
  company_name_of_truck, invoice_number, job_name, work_order_number,
  ticket_notes, ocr_raw_text, ticket_image_url,
  created_at, updated_at
`.replace(/\s+/g, " ").trim();

const DRIVER_FIELDS = `
  id, ticket_number, ticket_date, truck_number, customer_name, pickup_location,
  material, quantity, start_time, end_time, total_hours, status, payment_status,
  signature_present, document_type
`.replace(/\s+/g, " ").trim();

const CUSTOMER_FIELDS = `
  id, ticket_number, ticket_date, truck_number, company_name_of_truck,
  customer_name, pickup_location, material, quantity, total_hours,
  start_time, end_time, authorized_person, signature_present,
  customer_approved, customer_signed_name, customer_signed_at, document_type
`.replace(/\s+/g, " ").trim();

// GET — look up ticket by QR token
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");
  const role  = (searchParams.get("r") || "unknown") as string;

  if (!token) {
    return NextResponse.json({ error: "Missing scan token" }, { status: 400 });
  }

  const fields = role === "office" ? OFFICE_FIELDS
    : role === "driver"   ? DRIVER_FIELDS
    : role === "customer" ? CUSTOMER_FIELDS
    : DRIVER_FIELDS; // safe default for unknown

  const { data: rawTicket, error } = await supabase
    .from("aggregate_tickets")
    .select(fields)
    .eq("qr_token", token)
    .single();

  // Cast to any — dynamic select string prevents Supabase from inferring the shape
  const ticket = rawTicket as Record<string, unknown> | null;

  if (error || !ticket) {
    // Log failed scan attempt
    await supabase.from("qr_scan_log").insert({
      qr_token:    token,
      scan_role:   role,
      scan_source: "qr_code",
      action_taken:"not_found",
      notes:       "Ticket not found for this QR token",
    }).maybeSingle();

    return NextResponse.json({ error: "Ticket not found or QR code is invalid." }, { status: 404 });
  }

  // Log successful scan
  await supabase.from("qr_scan_log").insert({
    ticket_id:   ticket.id,
    qr_token:    token,
    scan_role:   role,
    scan_source: "qr_code",
    action_taken:"viewed",
    device_info: req.headers.get("user-agent") || null,
    ip_address:  req.headers.get("x-forwarded-for") || null,
  }).maybeSingle();

  // Increment scan counter
  await supabase
    .from("aggregate_tickets")
    .update({
      qr_scan_count:      (Number(ticket.qr_scan_count) || 0) + 1,
      last_qr_scanned_at: new Date().toISOString(),
    })
    .eq("id", ticket.id)
    .maybeSingle();

  return NextResponse.json({ ticket, role });
}

// POST — customer signature submission
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { customer_signed_name, customer_notes, signature_data_url } = body;

  if (!customer_signed_name) {
    return NextResponse.json({ error: "Printed name is required" }, { status: 400 });
  }

  const { data: ticket } = await supabase
    .from("aggregate_tickets")
    .select("id, ticket_number, customer_approved")
    .eq("qr_token", token)
    .single();

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const { error } = await supabase
    .from("aggregate_tickets")
    .update({
      customer_approved:      true,
      customer_signed_name:   customer_signed_name.trim(),
      customer_signed_at:     new Date().toISOString(),
      customer_notes:         customer_notes || null,
      signature_present:      true,
      has_signature:          true,
    })
    .eq("id", ticket.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log scan action
  await supabase.from("qr_scan_log").insert({
    ticket_id:   ticket.id,
    qr_token:    token,
    scan_role:   "customer",
    scan_source: "qr_code",
    action_taken:"signed",
    notes:       `Signed by ${customer_signed_name}`,
  }).maybeSingle();

  // Audit trail
  await supabase.from("ticket_audit_log").insert({
    ticket_id:   ticket.id,
    action:      "customer_signature_submitted",
    description: `Customer ${customer_signed_name} approved ticket via QR scan`,
    metadata:    { signed_name: customer_signed_name, has_signature_image: Boolean(signature_data_url) },
  }).maybeSingle();

  return NextResponse.json({
    success: true,
    message: `Ticket #${ticket.ticket_number} approved by ${customer_signed_name}.`,
  });
}
