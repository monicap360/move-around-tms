import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ─── RMIS compliance classifier ───────────────────────────
function classifyRmis(note: string) {
  const clean = (note ?? "").toLowerCase().trim();

  if (clean.includes("missing medical")) {
    return { rmis_status: "blocked", compliance_status: "blocked", compliance_severity: "critical",
      compliance_issue: "Missing Medical Certificate",
      compliance_action: "Request medical certificate — driver blocked from dispatch and payroll",
      alert_type: "missing_medical" };
  }
  if (clean.includes("missing back of dl") || clean.includes("missing back of driver")) {
    return { rmis_status: "needs_docs", compliance_status: "needs_docs", compliance_severity: "high",
      compliance_issue: "Missing back of Driver License",
      compliance_action: "Request back of DL from driver",
      alert_type: "missing_dl_back" };
  }
  if (clean.includes("email") || clean.includes("call")) {
    return { rmis_status: "needs_follow_up", compliance_status: "needs_follow_up", compliance_severity: "warning",
      compliance_issue: "Documents requested but not yet received",
      compliance_action: "Follow up with driver or carrier",
      alert_type: "docs_requested" };
  }
  if (clean.includes("have dl medical & inspection") || clean.includes("have dl, medical & inspection")) {
    return { rmis_status: "verified_pending_match", compliance_status: "verified_pending_match", compliance_severity: "low",
      compliance_issue: "Docs listed as present in RMIS",
      compliance_action: "Verify documents are attached in the system",
      alert_type: "docs_verify" };
  }
  if (clean.includes("have dl medical") || clean.includes("have dl, medical")) {
    return { rmis_status: "inspection_check", compliance_status: "inspection_check", compliance_severity: "warning",
      compliance_issue: "DL and Medical present — Inspection may be missing",
      compliance_action: "Request inspection document from driver",
      alert_type: "inspection_check" };
  }
  if (clean === "standard" || clean === "") {
    return { rmis_status: "standard", compliance_status: "standard", compliance_severity: "clear",
      compliance_issue: null,
      compliance_action: null,
      alert_type: null };
  }
  return { rmis_status: "needs_review", compliance_status: "needs_review", compliance_severity: "warning",
    compliance_issue: "RMIS note unclear — review manually",
    compliance_action: "Review compliance status with dispatcher",
    alert_type: "needs_review" };
}

// ─── Job status → dispatch_status ─────────────────────────
function mapJobStatus(raw: string) {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("completed") || s.includes("complete")) return "completed";
  if (s.includes("in progress") || s.includes("inprogress")) return "in_progress";
  if (s.includes("to pickup") || s.includes("topickup")) return "to_pickup";
  if (s.includes("to dropoff") || s.includes("todropoff")) return "to_dropoff";
  if (s.includes("cancelled") || s.includes("canceled")) return "cancelled";
  return "unknown";
}

// ─── POST /api/ronyx/dispatch-import ──────────────────────
export async function POST(req: Request) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();
  const { rows, file_name, schedule_date, import_name } = body as {
    rows:          Record<string, string>[];
    file_name:     string;
    schedule_date: string;
    import_name:   string;
  };

  if (!rows?.length) return NextResponse.json({ error: "No rows provided" }, { status: 400 });

  // Create import batch record
  const { data: importBatch, error: importErr } = await sb
    .from("dispatch_imports")
    .insert({ import_name: import_name || file_name, source_file_name: file_name, schedule_date, total_rows: rows.length })
    .select("id")
    .single();

  if (importErr) return NextResponse.json({ error: importErr.message }, { status: 500 });

  // Build job rows
  const jobRows = rows.map((row) => {
    const rmisNote = row["See Notes!!"] || row["RMIS Notes"] || row["Notes"] || "";
    const compliance = classifyRmis(rmisNote);
    const rawStatus  = row["Job Status"] || row["Status"] || "";
    const dispatchStatus = mapJobStatus(rawStatus);
    const qty = parseFloat(row["Job Quantity"] || "0") || 0;

    return {
      dispatch_import_id:       importBatch.id,
      start_time:               row["Start Time"] ? new Date(row["Start Time"]).toISOString() : null,
      truck_number:             row["Truck Number"]?.trim() || null,
      vendor_name:              row["Vendor"]?.trim() || row["Carrier"]?.trim() || null,
      driver_name:              row["Driver"]?.trim() || null,
      driver_phone:             row["Phone"]?.trim() || null,
      rmis_note:                rmisNote || null,
      rmis_status:              compliance.rmis_status,
      compliance_status:        compliance.compliance_status,
      compliance_severity:      compliance.compliance_severity,
      compliance_issue:         compliance.compliance_issue,
      compliance_action:        compliance.compliance_action,
      truck_id:                 row["Truck ID"]?.trim() || null,
      equipment_license_number: row["Equipment License Number"]?.trim() || null,
      customer_name:            row["Customer"]?.trim() || null,
      pickup_site_name:         row["Pickup Site Name"]?.trim() || null,
      dropoff_site_name:        row["Dropoff Site Name"]?.trim() || null,
      job_service:              row["Job Service"]?.trim() || null,
      job_status:               rawStatus,
      dispatch_status:          dispatchStatus,
      job_quantity:             qty,
      material:                 row["Material"]?.trim() || null,
      friendly_job_id:          row["Friendly Job ID"]?.trim() || null,
      expected_ticket_count:    qty,
      payroll_status:           compliance.compliance_severity === "critical" ? "blocked" : "not_ready",
      billing_status:           "not_ready",
      raw_row:                  row,
    };
  });

  const { data: jobs, error: jobsErr } = await sb
    .from("dispatch_jobs")
    .insert(jobRows)
    .select("id, compliance_severity, compliance_issue, compliance_action, alert_type, dispatch_status, driver_name, truck_number, friendly_job_id, rmis_note");

  if (jobsErr) return NextResponse.json({ error: jobsErr.message }, { status: 500 });

  // Build alerts for non-clear jobs
  const alertRows = (jobs || [])
    .filter((j: any) => j.compliance_severity !== "clear" && j.alert_type)
    .map((j: any) => ({
      dispatch_import_id: importBatch.id,
      dispatch_job_id:    j.id,
      severity:           j.compliance_severity,
      alert_type:         j.alert_type,
      title:              j.compliance_issue || "Compliance issue",
      message:            `Driver: ${j.driver_name || "Unknown"} | Truck: ${j.truck_number || "?"} | Job: ${j.friendly_job_id || "?"} | Note: ${j.rmis_note || ""}`,
      recommended_action: j.compliance_action,
      status:             "open",
    }));

  if (alertRows.length > 0) {
    await sb.from("dispatch_guard_alerts").insert(alertRows);
  }

  // Compute counts and update import batch
  const counts = (jobs || []).reduce((acc: Record<string, number>, j: any) => {
    acc[j.dispatch_status] = (acc[j.dispatch_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const complianceSeverityCounts = (jobs || []).reduce((acc: Record<string, number>, j: any) => {
    acc[j.compliance_severity] = (acc[j.compliance_severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  await sb.from("dispatch_imports").update({
    total_rows:       jobs?.length ?? 0,
    ready_count:      (complianceSeverityCounts["clear"] || 0) + (complianceSeverityCounts["low"] || 0),
    blocked_count:    complianceSeverityCounts["critical"] || 0,
    needs_docs_count: (complianceSeverityCounts["high"] || 0) + (complianceSeverityCounts["warning"] || 0),
    in_progress_count: counts["in_progress"] || 0,
    completed_count:   counts["completed"] || 0,
    to_pickup_count:   counts["to_pickup"] || 0,
    to_dropoff_count:  counts["to_dropoff"] || 0,
  }).eq("id", importBatch.id);

  return NextResponse.json({
    ok:               true,
    import_id:        importBatch.id,
    jobs_created:     jobs?.length ?? 0,
    alerts_created:   alertRows.length,
    compliance_summary: complianceSeverityCounts,
    dispatch_summary:   counts,
  });
}

// ─── GET /api/ronyx/dispatch-import ── list imports ───────
export async function GET() {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("dispatch_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imports: data || [] });
}
