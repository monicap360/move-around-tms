import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { randomBytes } from "crypto";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

type RonyxPayload = {
  ticket_number?:         string;
  truck_number?:          string;
  ticket_date?:           string;
  truck_type?:            string;
  shift_type?:            string;
  loads?:                 string | number;
  material?:              string;
  company_name_of_truck?: string;
  customer?:              string;
  location?:              string;
  driver_printed_name?:   string;
  authorized_person?:     string;
  signature_present?:     boolean;
  start_time?:            string;
  end_time?:              string;
  total_hours?:           string | number;
  copy_color?:            string;
  raw_ocr_text?:          string;
  ocr_confidence?:        number;
  extraction_confidence?: number;
  scan_source?:           string;
  scan_batch_id?:         string;
  scan_quality_flags?:    string[];
  original_upload_id?:    string | null;
};

type ValidationResult = { missing_fields: string[]; exception_flags: string[] };

function validateRonyx(f: RonyxPayload): ValidationResult {
  const mf: string[] = [];  // missing fields (warnings — ticket still created)
  const ef: string[] = [];  // exception flags (hard errors — need reconciliation)

  // Hard required: ticket cannot be matched or paid without these
  if (!f.ticket_number?.trim())       { mf.push("ticket_number");       ef.push("MISSING_TICKET_NUMBER"); }
  if (!f.truck_number?.trim())        { mf.push("truck_number");        ef.push("MISSING_TRUCK_NUMBER"); }
  if (!f.driver_printed_name?.trim()) { mf.push("driver_printed_name"); ef.push("MISSING_DRIVER_NAME"); }

  // Soft required: important but ticket can still be routed for reconciliation without them
  if (!f.ticket_date)                                 mf.push("ticket_date");
  if (!f.customer?.trim())                            mf.push("customer");
  if (!f.authorized_person?.trim())                   mf.push("authorized_person");
  if (!f.signature_present)                           mf.push("signature_present");
  if (!f.start_time?.trim())                          mf.push("start_time");
  if (!f.end_time?.trim())                            mf.push("end_time");
  if (!f.total_hours && f.total_hours !== 0)          mf.push("total_hours");

  // Location: warning only — aggregate tickets often use pit/quarry/project names
  // which may not look like a traditional address. Do not hard-flag.
  if (!f.location?.trim())                            mf.push("location");

  // Material OR loads: at least one must be present for a valid aggregate ticket
  if (!f.material?.trim() && !f.loads)               { mf.push("material"); ef.push("MISSING_MATERIAL_OR_LOADS"); }

  if (ef.length > 0 && !ef.includes("MISSING_REQUIRED_TICKET_FIELD"))
    ef.push("MISSING_REQUIRED_TICKET_FIELD");

  return { missing_fields: [...new Set(mf)], exception_flags: [...new Set(ef)] };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    const body: RonyxPayload = await req.json();
    const orgId = await resolveOrgId();

    const { missing_fields, exception_flags } = validateRonyx(body);
    const loadsNum = body.loads ? parseInt(String(body.loads)) || null : null;
    const hoursNum = body.total_hours ? parseFloat(String(body.total_hours)) || null : null;

    const qrToken = randomBytes(20).toString("hex");
    const appUrl  = process.env.NEXT_PUBLIC_APP_URL || "https://ronyx.movearoundtms.app";
    const qrUrl   = `${appUrl}/ronyx/scan?t=${qrToken}`;

    // ── Map to existing aggregate_tickets columns only ──────────────────────
    // NOTE: This live aggregate_tickets table does NOT have columns for
    // shift / pickup_location / load_type / signature_name / payment_status /
    // ocr_json / original_upload_id (schema drift vs the repo migrations).
    // We only insert columns that exist, and preserve the extra OCR detail
    // inside validation_errors (an existing jsonb column) so nothing is lost.
    // The scan↔ticket link is also recorded in fast_scan_audit_events.
    const row: Record<string, unknown> = {
      organization_id:  orgId,
      ticket_number:    body.ticket_number?.trim()       || null,
      ticket_date:      body.ticket_date                  || new Date().toISOString().slice(0, 10),
      driver_name:      body.driver_printed_name?.trim()  || null,
      truck_number:     body.truck_number?.trim()         || null,
      material:         body.material?.trim()             || null,
      quantity:         loadsNum,
      company_name:     body.company_name_of_truck?.trim() || null,  // mapped: company_name_of_truck → company_name
      customer_name:    body.customer?.trim()             || null,
      has_signature:    body.signature_present            ?? false,
      source:           body.scan_source                  || "fast_scan_ocr",
      status:           "pending",
      has_photo:        true,
      payroll_hold:     true,
      billing_hold:     true,
      payroll_matched:  false,
      billing_matched:  false,
      qr_token:         qrToken,
      qr_url:           qrUrl,
      qr_created_at:    new Date().toISOString(),
      validation_status: exception_flags.length > 0 ? "error" : missing_fields.length > 0 ? "warning" : "passed",
      validation_errors: {
        errors:      exception_flags,
        warnings:    missing_fields.map(f => `Missing: ${f}`),
        corrections: [],
        // Extra OCR detail with no dedicated column on this table (full raw data is on the fast_scan_documents record):
        ocr: {
          start_time:            body.start_time            || null,
          end_time:              body.end_time              || null,
          total_hours:           hoursNum,
          copy_color:            body.copy_color            || null,
          ocr_confidence:        body.ocr_confidence        ?? null,
          extraction_confidence: body.extraction_confidence ?? null,
          scan_batch_id:         body.scan_batch_id         || null,
          location:              body.location?.trim()      || null,
          shift:                 body.shift_type            || null,
          load_type:             body.truck_type            || null,
          signed_by:             body.authorized_person?.trim() || null,
          original_upload_id:    body.original_upload_id    || null,
          document_type:         "ronyx_field_ticket",
        },
      },
    };

    const { data: ticket, error } = await supabase
      .from("aggregate_tickets")
      .insert(row)
      .select("id, ticket_number")
      .single();

    if (error) {
      // Retry with progressively more minimal inserts to handle unmigrated tables
      const baseRow = {
        organization_id: row.organization_id,
        ticket_number:   row.ticket_number,
        ticket_date:     row.ticket_date,
        driver_name:     row.driver_name,
        truck_number:    row.truck_number,
        material:        row.material,
        customer_name:   row.customer_name,
        status:          row.status,
        source:          row.source,
      };

      // Try with mid-level columns first
      const { data: t2, error: e2 } = await supabase
        .from("aggregate_tickets")
        .insert({ ...baseRow, quantity: row.quantity })
        .select("id, ticket_number")
        .single();

      if (!e2) {
        return NextResponse.json({
          ticket_id: t2!.id, ticket_number: t2!.ticket_number,
          missing_fields, exception_flags,
          qr_token: qrToken, qr_url: qrUrl,
          message: missing_fields.length > 0
            ? `Ticket created with ${missing_fields.length} missing field(s). Routed to Reconciliation.`
            : "Ticket created. Fast Scan™ QR generated.",
        }, { status: 201 });
      }

      // Last resort — absolute minimum
      const { data: t3, error: e3 } = await supabase
        .from("aggregate_tickets")
        .insert(baseRow)
        .select("id, ticket_number")
        .single();

      if (e3) return NextResponse.json({ error: `${error.message} | fallback: ${e3.message}` }, { status: 500 });
      return NextResponse.json({
        ticket_id: t3!.id, ticket_number: t3!.ticket_number,
        missing_fields, exception_flags,
        qr_token: qrToken, qr_url: qrUrl,
        message: "Ticket created (minimal schema). Run DB migrations for full feature support.",
      }, { status: 201 });
    }

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
        description: `OCR extraction — OCR conf: ${Math.round(body.ocr_confidence ?? 0)}%, extraction conf: ${Math.round(body.extraction_confidence ?? 0)}%`,
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
      description: "Ticket routed to Reconciliation — payroll hold + billing hold active",
      metadata:    { payroll_hold: true, billing_hold: true },
    });

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
