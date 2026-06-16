import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Returns structured block reasons for a dispatch job, driver, truck, or OO.
// GET /api/ronyx/admin/why-blocked?type=dispatch_job&id=<uuid>
// GET /api/ronyx/admin/why-blocked?type=driver&id=<uuid>
// GET /api/ronyx/admin/why-blocked?type=truck&id=<uuid>
// GET /api/ronyx/admin/why-blocked?type=owner_operator&id=<uuid>

type BlockReason = {
  code:    string;
  label:   string;
  detail:  string;
  severity: "critical" | "warning" | "info";
  fix_label: string;
  fix_href:  string;
  fix_action?: string; // for in-page one-click actions
};

export async function GET(req: Request) {
  const sb  = createSupabaseServerClient();
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const id   = url.searchParams.get("id")   || "";

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  const reasons: BlockReason[] = [];
  let subject = "";
  let decision: "Blocked" | "Needs Review" | "Clear" = "Clear";

  // ── DISPATCH JOB ──────────────────────────────────────────
  if (type === "dispatch_job") {
    const { data: job } = await sb.from("dispatch_jobs").select("*").eq("id", id).maybeSingle();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    subject = `${job.driver_name || "Unknown Driver"} — Truck ${job.truck_number || "?"} — ${job.customer_name || ""}`;

    if (!job.driver_name) {
      reasons.push({
        code: "missing_driver", label: "No driver assigned",
        detail: "This dispatch row has no driver name. The job cannot be released until a driver is assigned.",
        severity: "critical", fix_label: "Assign Driver",
        fix_href: "/ronyx/drivers", fix_action: "assign_driver",
      });
    }
    if (!job.truck_number) {
      reasons.push({
        code: "missing_truck", label: "No truck assigned",
        detail: "This dispatch row has no truck number. Assign a truck before releasing to dispatch.",
        severity: "critical", fix_label: "Assign Truck",
        fix_href: "/ronyx/trucks", fix_action: "assign_truck",
      });
    }
    if (job.compliance_severity === "critical") {
      reasons.push({
        code: "rmis_block", label: `RMIS Compliance Block: ${job.compliance_issue || "Unknown issue"}`,
        detail: job.compliance_action || "Review RMIS note and resolve the compliance issue.",
        severity: "critical", fix_label: "Upload Document",
        fix_href: `/ronyx/drivers${job.driver_name ? `?search=${encodeURIComponent(job.driver_name)}` : ""}`,
        fix_action: "upload_document",
      });
    } else if (job.compliance_severity === "high" || job.compliance_severity === "warning") {
      reasons.push({
        code: "rmis_warning", label: `RMIS Note: ${job.compliance_issue || "Needs review"}`,
        detail: job.compliance_action || "Follow up on the RMIS note before dispatch.",
        severity: "warning", fix_label: "Review & Clear",
        fix_href: "/ronyx/compliance", fix_action: "review_compliance",
      });
    }
    if (job.rmis_note && job.rmis_note.toLowerCase() !== "standard" && job.compliance_severity === "clear") {
      reasons.push({
        code: "rmis_nonstandard", label: `Non-standard RMIS note`,
        detail: `Note: "${job.rmis_note}" — verify this does not indicate a compliance issue.`,
        severity: "info", fix_label: "View Compliance",
        fix_href: "/ronyx/compliance",
      });
    }
    if (job.payroll_status === "blocked") {
      reasons.push({
        code: "payroll_blocked", label: "Payroll blocked",
        detail: "Payroll is blocked for this job. Compliance or documentation must be resolved first.",
        severity: "critical", fix_label: "View Payroll",
        fix_href: "/ronyx/payroll",
      });
    }

    decision = reasons.some(r => r.severity === "critical") ? "Blocked"
      : reasons.some(r => r.severity === "warning") ? "Needs Review"
      : "Clear";
  }

  // ── DRIVER ───────────────────────────────────────────────
  if (type === "driver") {
    const { data: driver } = await sb.from("drivers").select("*").eq("id", id).maybeSingle();
    if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

    subject = `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || driver.id;

    // Check documents
    const { data: docs } = await sb.from("driver_documents").select("*").eq("driver_id", id);
    const docMap: Record<string, any> = {};
    for (const d of (docs || [])) docMap[d.document_type] = d;

    const today = new Date();
    const checkDoc = (key: string, label: string) => {
      const d = docMap[key];
      if (!d) {
        reasons.push({
          code: `missing_${key}`, label: `${label} missing`,
          detail: `No ${label} on file. This is required before dispatch.`,
          severity: "critical", fix_label: `Upload ${label}`,
          fix_href: `/ronyx/drivers?id=${id}&tab=documents`, fix_action: "upload_document",
        });
      } else if (d.expiration_date) {
        const exp = new Date(d.expiration_date);
        const daysLeft = Math.floor((exp.getTime() - today.getTime()) / 86400000);
        if (daysLeft < 0) {
          reasons.push({
            code: `expired_${key}`, label: `${label} expired ${Math.abs(daysLeft)} days ago`,
            detail: `${label} expired on ${d.expiration_date}. Driver is blocked until renewed.`,
            severity: "critical", fix_label: `Upload New ${label}`,
            fix_href: `/ronyx/drivers?id=${id}&tab=documents`, fix_action: "upload_document",
          });
        } else if (daysLeft <= 30) {
          reasons.push({
            code: `expiring_${key}`, label: `${label} expires in ${daysLeft} days`,
            detail: `${label} expires on ${d.expiration_date}. Request renewal now.`,
            severity: "warning", fix_label: `Request Renewal`,
            fix_href: `/ronyx/drivers?id=${id}&tab=documents`, fix_action: "send_reminder",
          });
        }
      }
    };

    checkDoc("cdl", "CDL");
    checkDoc("medical_card", "Medical Card");
    checkDoc("mvr", "MVR");
    checkDoc("drug_test", "Drug Test");

    if (!driver.company_name && !driver.carrier) {
      reasons.push({
        code: "missing_company", label: "No company assigned",
        detail: "Driver has no company or carrier assigned. This is required for dispatch and payroll.",
        severity: "critical", fix_label: "Assign Company",
        fix_href: `/ronyx/drivers?id=${id}`, fix_action: "assign_company",
      });
    }

    decision = reasons.some(r => r.severity === "critical") ? "Blocked"
      : reasons.some(r => r.severity === "warning") ? "Needs Review"
      : "Clear";
  }

  // ── TRUCK ────────────────────────────────────────────────
  if (type === "truck") {
    const { data: truck } = await sb.from("trucks").select("*").eq("id", id).maybeSingle();
    if (!truck) return NextResponse.json({ error: "Truck not found" }, { status: 404 });

    subject = `Truck ${truck.truck_number || truck.id}`;

    if (truck.status === "out_of_service") {
      reasons.push({
        code: "oos", label: "Truck is Out of Service",
        detail: truck.status_note || "This truck has been marked out of service. Check maintenance records.",
        severity: "critical", fix_label: "View Maintenance",
        fix_href: `/ronyx/maintenance?truck=${truck.truck_number}`, fix_action: "assign_backup",
      });
    }
    if (truck.dot_inspection_expiry) {
      const days = Math.floor((new Date(truck.dot_inspection_expiry).getTime() - Date.now()) / 86400000);
      if (days < 0) {
        reasons.push({ code: "dot_expired", label: `DOT Inspection expired ${Math.abs(days)} days ago`, detail: `Expired ${truck.dot_inspection_expiry}. Schedule inspection before dispatch.`, severity: "critical", fix_label: "Schedule Inspection", fix_href: `/ronyx/maintenance`, fix_action: "create_task" });
      } else if (days <= 30) {
        reasons.push({ code: "dot_expiring", label: `DOT Inspection expires in ${days} days`, detail: `Expires ${truck.dot_inspection_expiry}.`, severity: "warning", fix_label: "Schedule Inspection", fix_href: `/ronyx/maintenance` });
      }
    }
    if (truck.registration_expiry) {
      const days = Math.floor((new Date(truck.registration_expiry).getTime() - Date.now()) / 86400000);
      if (days < 0) {
        reasons.push({ code: "reg_expired", label: `Registration expired`, detail: `Expired ${truck.registration_expiry}.`, severity: "critical", fix_label: "Upload Registration", fix_href: `/ronyx/trucks?id=${id}`, fix_action: "upload_document" });
      }
    }

    decision = reasons.some(r => r.severity === "critical") ? "Blocked"
      : reasons.some(r => r.severity === "warning") ? "Needs Review"
      : "Clear";
  }

  // ── OWNER OPERATOR ───────────────────────────────────────
  if (type === "owner_operator") {
    const { data: oo } = await sb.from("owner_operators").select("*").eq("id", id).maybeSingle();
    if (!oo) return NextResponse.json({ error: "OO not found" }, { status: 404 });

    subject = oo.company_name || oo.id;

    const cois = ["auto_liability_coi","general_liability_coi","cargo_coi","workers_comp"];
    const labels: Record<string, string> = {
      auto_liability_coi:    "Auto Liability COI",
      general_liability_coi: "General Liability COI",
      cargo_coi:             "Cargo COI",
      workers_comp:          "Workers Compensation",
    };

    const today = new Date();
    for (const coi of cois) {
      const expField = `${coi}_expiry` as keyof typeof oo;
      const fileField = `${coi}_file` as keyof typeof oo;
      if (!oo[fileField] && !oo[expField]) {
        reasons.push({
          code: `missing_${coi}`, label: `${labels[coi]} missing`,
          detail: `No ${labels[coi]} on file. Required for customer dispatch.`,
          severity: "critical", fix_label: `Upload ${labels[coi]}`,
          fix_href: `/ronyx/owner-operators/${id}`, fix_action: "upload_document",
        });
      } else if (oo[expField]) {
        const days = Math.floor((new Date(oo[expField] as string).getTime() - today.getTime()) / 86400000);
        if (days < 0) {
          reasons.push({ code: `expired_${coi}`, label: `${labels[coi]} expired`, detail: `Expired ${oo[expField]}. Request updated COI.`, severity: "critical", fix_label: "Request Updated COI", fix_href: `/ronyx/owner-operators/${id}`, fix_action: "send_reminder" });
        } else if (days <= 21) {
          reasons.push({ code: `expiring_${coi}`, label: `${labels[coi]} expires in ${days} days`, detail: `Expires ${oo[expField]}.`, severity: "warning", fix_label: "Request Renewal", fix_href: `/ronyx/owner-operators/${id}`, fix_action: "send_reminder" });
        }
      }
    }

    decision = reasons.some(r => r.severity === "critical") ? "Blocked"
      : reasons.some(r => r.severity === "warning") ? "Needs Review"
      : "Clear";
  }

  if (reasons.length === 0) {
    reasons.push({ code: "clear", label: "No blocks detected", detail: "All required documents and assignments are in order.", severity: "info", fix_label: "", fix_href: "" });
  }

  return NextResponse.json({ subject, type, id, decision, reasons });
}
