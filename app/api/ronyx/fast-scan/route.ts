import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// ── Payroll rules per scan type ────────────────────────────────────────────────
type PayrollAction = "none" | "create" | "hold" | "adjust" | "reimburse" | "release";

type ScanRule = {
  ticketCategory: string;
  payrollImpact: boolean;
  payrollAction: PayrollAction;
  payrollStatus: string;
  holdType?: string;
  holdReason?: string;
  payrollItemType?: string;
  priority: string;
};

const SCAN_RULES: Record<string, ScanRule> = {
  trip_proof: {
    ticketCategory:  "Completed Trip Proof",
    payrollImpact:   true,
    payrollAction:   "create",
    payrollStatus:   "pending_review",
    payrollItemType: "trip_pay",
    priority:        "high",
  },
  damage: {
    ticketCategory:  "Damage Report",
    payrollImpact:   true,
    payrollAction:   "hold",
    payrollStatus:   "hold",
    holdType:        "incident",
    holdReason:      "Damage report requires manager review before payroll release",
    priority:        "critical",
  },
  no_show: {
    ticketCategory:  "Driver No-Show",
    payrollImpact:   true,
    payrollAction:   "hold",
    payrollStatus:   "hold",
    holdType:        "manager_review",
    holdReason:      "No-show ticket requires manager decision on pay",
    payrollItemType: "no_show_pay",
    priority:        "high",
  },
  complaint: {
    ticketCategory:  "Customer Complaint",
    payrollImpact:   true,
    payrollAction:   "hold",
    payrollStatus:   "hold",
    holdType:        "dispute",
    holdReason:      "Customer complaint pending manager review before payroll",
    priority:        "high",
  },
  receipt: {
    ticketCategory:  "Receipt / Expense",
    payrollImpact:   true,
    payrollAction:   "reimburse",
    payrollStatus:   "pending_review",
    payrollItemType: "reimbursement",
    priority:        "medium",
  },
  fuel: {
    ticketCategory:  "Fuel / Toll / Parking",
    payrollImpact:   true,
    payrollAction:   "reimburse",
    payrollStatus:   "pending_review",
    payrollItemType: "reimbursement",
    priority:        "medium",
  },
  missing_proof: {
    ticketCategory:  "Missing Document",
    payrollImpact:   true,
    payrollAction:   "hold",
    payrollStatus:   "hold",
    holdType:        "missing_proof",
    holdReason:      "Payroll held until required proof is uploaded",
    priority:        "high",
  },
  incident: {
    ticketCategory:  "Incident Report",
    payrollImpact:   true,
    payrollAction:   "hold",
    payrollStatus:   "hold",
    holdType:        "incident",
    holdReason:      "Incident report under review",
    priority:        "critical",
  },
  other: {
    ticketCategory:  "Other",
    payrollImpact:   false,
    payrollAction:   "none",
    payrollStatus:   "none",
    priority:        "medium",
  },
};

// ── GET: list fast scan uploads ────────────────────────────────────────────────
export async function GET(req: Request) {
  const supabase = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase.from("fast_scan_uploads").select("*").order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("upload_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ scans: data || [] });
}

// ── POST: process a fast scan upload ──────────────────────────────────────────
export async function POST(req: Request) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));

  if (!body.file_url) {
    return NextResponse.json({ error: "file_url is required" }, { status: 400 });
  }

  const scanType = (body.scan_type || "other") as string;
  const rule = SCAN_RULES[scanType] || SCAN_RULES.other;

  // 1. Log the upload
  const { data: scan, error: scanErr } = await supabase
    .from("fast_scan_uploads")
    .insert({
      file_url:            body.file_url,
      file_name:           body.file_name || null,
      file_type:           body.file_type || "image",
      upload_status:       "processing",
      scan_type:           scanType,
      detected_job_id:     body.detected_job_id || null,
      detected_driver_id:  body.detected_driver_id || null,
      detected_vehicle:    body.detected_vehicle || null,
      detected_amount:     body.detected_amount || null,
      extracted_text:      body.extracted_text || null,
      confidence_score:    body.confidence_score || 0.8,
      creates_payroll_item: rule.payrollImpact,
      payroll_action:      rule.payrollAction,
      uploaded_by:         body.uploaded_by || "system",
    })
    .select()
    .single();

  if (scanErr || !scan) return NextResponse.json({ error: scanErr?.message || "Scan failed" }, { status: 500 });

  // 2. Create linked ticket
  const { data: ticket, error: tErr } = await supabase
    .from("tickets")
    .insert({
      title:             body.title || `${rule.ticketCategory} — ${scanType} scan`,
      description:       body.description || body.extracted_text || null,
      category:          rule.ticketCategory,
      status:            "new",
      priority:          rule.priority,
      source:            "fast_scan",
      impact:            rule.payrollImpact ? ["payroll"] : [],
      related_job_id:    body.detected_job_id || body.job_id || null,
      related_driver_id: body.detected_driver_id || body.driver_id || null,
      related_vehicle_id: body.detected_vehicle || body.vehicle_id || null,
      fast_scan_id:      scan.id,
      scan_type:         scanType,
      payroll_impact:    rule.payrollImpact,
      payroll_status:    rule.payrollStatus,
      payroll_hold_reason: rule.holdReason || null,
      estimated_driver_pay: body.estimated_driver_pay || body.detected_amount || null,
      created_by:        body.uploaded_by || "system",
    })
    .select()
    .single();

  if (tErr || !ticket) {
    await supabase.from("fast_scan_uploads").update({ upload_status: "reviewed" }).eq("id", scan.id);
    return NextResponse.json({ error: tErr?.message || "Ticket creation failed", scan }, { status: 500 });
  }

  let payrollItem = null;

  // 3. Create payroll item if needed
  if (rule.payrollImpact && rule.payrollAction !== "none") {
    const driverId = body.detected_driver_id || body.driver_id;
    if (driverId || body.driver_name) {
      const { data: pi } = await supabase
        .from("payroll_items")
        .insert({
          driver_id:         driverId || null,
          driver_name:       body.driver_name || body.detected_driver_name || null,
          related_job_id:    body.detected_job_id || body.job_id || null,
          job_number:        body.job_number || null,
          item_type:         rule.payrollItemType || "adjustment",
          description:       ticket.title,
          gross_amount:      body.estimated_driver_pay || body.detected_amount || 0,
          status:            rule.payrollAction === "hold" ? "hold" : "pending",
          hold_reason:       rule.holdReason || null,
          source:            "fast_scan",
          related_ticket_id: ticket.id,
          related_scan_id:   scan.id,
          created_by:        body.uploaded_by || "system",
        })
        .select()
        .single();

      if (pi) {
        payrollItem = pi;

        // Update ticket with payroll item id
        await supabase.from("tickets").update({ related_payroll_item_id: pi.id }).eq("id", ticket.id);

        // Create hold record if needed
        if (rule.payrollAction === "hold" && rule.holdType) {
          await supabase.from("payroll_holds").insert({
            payroll_item_id: pi.id,
            hold_reason:     rule.holdReason || "Scan-triggered hold",
            hold_type:       rule.holdType,
            held_by:         body.uploaded_by || "system",
          });
        }

        // Update scan with payroll item reference
        await supabase.from("fast_scan_uploads").update({
          related_payroll_item_id: pi.id,
        }).eq("id", scan.id);
      }
    }
  }

  // 4. Mark scan as linked
  await supabase.from("fast_scan_uploads").update({
    upload_status:       "linked",
    resulting_ticket_id: ticket.id,
  }).eq("id", scan.id);

  // 5. Audit log
  await supabase.from("audit_logs").insert({
    table_name:  "tickets",
    record_id:   ticket.id,
    action:      "fast_scan_created",
    new_values:  { scan_type: scanType, payroll_action: rule.payrollAction, payroll_impact: rule.payrollImpact },
    performed_by: body.uploaded_by || "system",
  }).maybeSingle();

  return NextResponse.json({
    scan,
    ticket,
    payroll_item: payrollItem,
    payroll_action: rule.payrollAction,
    payroll_impact: rule.payrollImpact,
    message: rule.payrollImpact
      ? `Ticket created. Payroll action: ${rule.payrollAction}.`
      : "Ticket created. No payroll impact.",
  }, { status: 201 });
}
