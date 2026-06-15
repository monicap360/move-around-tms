import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

type RonyxPayload = {
  ticket_number?:        string;
  truck_number?:         string;
  ticket_date?:          string;
  truck_type?:           string;
  shift_type?:           string;
  loads?:                string | number;
  material?:             string;
  company_name_of_truck?: string;
  customer?:             string;
  location?:             string;
  driver_printed_name?:  string;
  authorized_person?:    string;
  signature_present?:    boolean;
  start_time?:           string;
  end_time?:             string;
  total_hours?:          string | number;
  copy_color?:           string;
  raw_ocr_text?:         string;
  ocr_confidence?:       number;
  extraction_confidence?: number;
  scan_source?:          string;
};

type ValidationResult = { missing_fields: string[]; exception_flags: string[] };

function validateRonyx(f: RonyxPayload): ValidationResult {
  const mf: string[] = [];
  const ef: string[] = [];

  if (!f.ticket_number?.trim())        { mf.push("ticket_number");       ef.push("MISSING_TICKET_NUMBER"); }
  if (!f.truck_number?.trim())         { mf.push("truck_number");        ef.push("MISSING_TRUCK_NUMBER"); }
  if (!f.ticket_date)                  { mf.push("ticket_date"); }
  if (!f.customer?.trim() || !f.location?.trim()) {
    if (!f.customer?.trim())  mf.push("customer");
    if (!f.location?.trim())  mf.push("location");
    ef.push("MISSING_CUSTOMER_LOCATION");
  }
  if (!f.driver_printed_name?.trim()) { mf.push("driver_printed_name"); ef.push("MISSING_DRIVER_NAME"); }
  if (!f.authorized_person?.trim())   { mf.push("authorized_person");   ef.push("MISSING_AUTHORIZED_PERSON"); }
  if (!f.signature_present)           { mf.push("signature_present");   ef.push("MISSING_SIGNATURE"); }
  if (!f.start_time?.trim() || !f.end_time?.trim()) {
    if (!f.start_time?.trim()) mf.push("start_time");
    if (!f.end_time?.trim())   mf.push("end_time");
    ef.push("MISSING_TIME");
  }
  if (!f.total_hours && f.total_hours !== 0) { mf.push("total_hours"); ef.push("MISSING_TOTAL_HOURS"); }
  if (!f.material?.trim() && !f.loads) { mf.push("material");          ef.push("MISSING_REQUIRED_TICKET_FIELD"); }

  if (mf.length > 0 && !ef.includes("MISSING_REQUIRED_TICKET_FIELD")) {
    ef.push("MISSING_REQUIRED_TICKET_FIELD");
  }
  return { missing_fields: [...new Set(mf)], exception_flags: [...new Set(ef)] };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body: RonyxPayload = await req.json();

    const { missing_fields, exception_flags } = validateRonyx(body);
    const loadsNum  = body.loads      ? parseInt(String(body.loads))   || null : null;
    const hoursNum  = body.total_hours ? parseFloat(String(body.total_hours)) || null : null;

    const row = {
      ticket_number:         body.ticket_number?.trim() || null,
      ticket_date:           body.ticket_date || new Date().toISOString().slice(0, 10),
      driver_name:           body.driver_printed_name?.trim() || null,
      truck_number:          body.truck_number?.trim() || null,
      truck_type:            body.truck_type || null,
      shift:                 body.shift_type || null,
      material:              body.material?.trim() || null,
      quantity:              loadsNum,
      company_name_of_truck: body.company_name_of_truck?.trim() || null,
      customer_name:         body.customer?.trim() || null,
      pickup_location:       body.location?.trim() || null,
      authorized_person:     body.authorized_person?.trim() || null,
      signature_present:     body.signature_present ?? false,
      start_time:            body.start_time?.trim() || null,
      end_time:              body.end_time?.trim() || null,
      total_hours:           hoursNum,
      copy_color:            body.copy_color || null,
      ocr_raw_text:          body.raw_ocr_text || null,
      ocr_confidence:        body.ocr_confidence ?? null,
      extraction_confidence: body.extraction_confidence ?? null,
      scan_source:           body.scan_source || "file_upload",
      document_type:         "ronyx_field_ticket",
      source:                "fast_scan_ocr",
      status:                "pending",
      reconciliation_status: "pending",
      payroll_hold:          true,
      billing_hold:          true,
      payroll_ready:         false,
      billing_ready:         false,
      payment_status:        "unpaid",
      has_photo:             true,
      has_signature:         body.signature_present ?? false,
      missing_fields:        missing_fields.length  > 0 ? missing_fields  : null,
      exception_flags:       exception_flags.length > 0 ? exception_flags : null,
    };

    // Auto-generate QR token
    const qrToken = randomBytes(20).toString("hex");
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL || "https://ronyx.movearoundtms.app";
    const qrUrl   = `${appUrl}/ronyx/scan?t=${qrToken}`;

    const { data: ticket, error } = await supabase
      .from("aggregate_tickets")
      .insert({ ...row, qr_token: qrToken, qr_url: qrUrl, qr_created_at: new Date().toISOString() })
      .select("id, ticket_number")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit trail
    type AuditRow = { ticket_id: string; action: string; description: string; metadata: Record<string, unknown> };
    const auditRows: AuditRow[] = [
      {
        ticket_id:   ticket.id,
        action:      "ronyx_ticket_scanned",
        description: `Ronyx field ticket scanned via ${body.scan_source || "file_upload"}`,
        metadata:    { scan_source: body.scan_source, document_type: "ronyx_field_ticket" },
      },
      {
        ticket_id:   ticket.id,
        action:      "ocr_extraction_completed",
        description: `OCR extraction complete — OCR conf: ${Math.round(body.ocr_confidence ?? 0)}%, extraction conf: ${Math.round(body.extraction_confidence ?? 0)}%`,
        metadata:    { ocr_confidence: body.ocr_confidence, extraction_confidence: body.extraction_confidence },
      },
    ];

    if (missing_fields.length > 0) {
      auditRows.push({
        ticket_id:   ticket.id,
        action:      "missing_field_detected",
        description: `Missing required fields: ${missing_fields.join(", ")}`,
        metadata:    { missing_fields, exception_flags },
      });
    }
    if (!body.signature_present) {
      auditRows.push({
        ticket_id:   ticket.id,
        action:      "signature_missing",
        description: "No authorized signature detected on ticket image",
        metadata:    {},
      });
    }
    auditRows.push({
      ticket_id:   ticket.id,
      action:      "ticket_sent_to_reconciliation",
      description: "Ticket routed to Ticket Reconciliation Command Center — payroll hold + billing hold active",
      metadata:    { payroll_hold: true, billing_hold: true },
    });

    // Insert audit rows — use maybeSingle to avoid error if table not available yet
    for (const entry of auditRows) {
      await supabase.from("ticket_audit_log").insert(entry).maybeSingle();
    }

    return NextResponse.json({
      ticket_id:      ticket.id,
      ticket_number:  ticket.ticket_number,
      missing_fields,
      exception_flags,
      payroll_hold:   true,
      billing_hold:   true,
      qr_token:       qrToken,
      qr_url:         qrUrl,
      message: missing_fields.length > 0
        ? `Ticket created with ${missing_fields.length} missing field(s). Routed to Reconciliation Command Center.`
        : "Ticket created successfully. Fast Scan™ QR generated. Routed to Reconciliation Command Center.",
    }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "OCR submission failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
