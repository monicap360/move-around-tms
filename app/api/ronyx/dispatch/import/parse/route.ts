import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/dispatch/import/parse
// Body: { dispatch_import_id: string, rows: RawRow[] }
// Each RawRow = the raw CSV object from splitCSVRow (field names from header)
//
// This route:
//  1. Loads DB driver+truck records and RMIS rules
//  2. Classifies each row: RMIS, driver match, truck match, intelligence
//  3. Inserts into dispatch_import_rows (upserts — idempotent on re-parse)
//  4. Updates dispatch_imports aggregate counts
//
// SECURITY: raw_row is stored as-is. Staff corrections only update
//           parsed fields — the original raw_row is never mutated.

type RawRow = Record<string, string>;

interface RMISRule {
  pattern: string;
  classification: string;
  severity: string;
  meaning: string | null;
  action: string | null;
  task: string | null;
  priority: number;
}

interface RMISResult {
  classification: string;
  severity: string;
  meaning: string;
  action: string | null;
  task: string | null;
}

interface DriverRecord {
  id: string;
  full_name: string | null;
  company_name: string | null;
  carrier_name: string | null;
  assigned_truck_number: string | null;
}

interface TruckRecord {
  id: string;
  truck_number: string | null;
  status: string | null;
  company_name: string | null;
  owner_operator_name: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreName(full: string, target: string): number {
  const f = (full || "").toLowerCase().trim();
  const t = (target || "").toLowerCase().trim();
  if (!f || !t) return 0;
  if (f === t) return 1.0;
  if (f.includes(t) || t.includes(f)) return 0.88;
  const parts = t.split(/\s+/);
  let hit = 0;
  for (const p of parts) if (p.length > 1 && f.includes(p)) hit++;
  return (hit / Math.max(parts.length, 1)) * 0.75;
}

function classifyRMIS(note: string, rules: RMISRule[]): RMISResult {
  const n = (note || "").toLowerCase().trim();
  for (const rule of rules) {
    try {
      const re = new RegExp(rule.pattern, "i");
      if (re.test(n)) {
        return {
          classification: rule.classification,
          severity: rule.severity,
          meaning: rule.meaning || "",
          action: rule.action || null,
          task: rule.task || null,
        };
      }
    } catch {
      // skip invalid pattern
    }
  }
  return {
    classification: "Unknown Note",
    severity: "warning",
    meaning: "RMIS note not recognized — manual review required.",
    action: "Review RMIS note manually.",
    task: "Compliance Admin: Review unrecognized RMIS note",
  };
}

// Normalize raw CSV row field → canonical name
// CSV columns from the Ronyx dispatch export
function normalizeField(row: RawRow, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parseDateTime(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function computeRowStatus(
  rmis: RMISResult,
  driverFound: boolean,
  truckFound: boolean
): { status: string; issues: string[]; nextAction: string } {
  const issues: string[] = [];

  if (rmis.severity === "critical") issues.push("RMIS: Dispatch Block — " + rmis.meaning);
  else if (rmis.severity === "warning") issues.push("RMIS: " + rmis.classification);

  if (!driverFound) issues.push("Driver not found in system");
  if (!truckFound) issues.push("Truck not found in system");

  const status =
    rmis.severity === "critical" ? "critical"
    : issues.length === 0 ? "ready"
    : "needs_review";

  const nextAction =
    rmis.severity === "critical"
      ? "Resolve RMIS block before dispatching"
      : !driverFound
      ? "Add driver to system or correct name"
      : !truckFound
      ? "Add truck to system or correct number"
      : issues.length > 0
      ? "Review and resolve flags"
      : "Ready to import";

  return { status, issues, nextAction };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin;
    const body = await req.json();
    const { dispatch_import_id, rows } = body as {
      dispatch_import_id: string;
      rows: RawRow[];
    };

    if (!dispatch_import_id) {
      return NextResponse.json({ error: "dispatch_import_id required" }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array required" }, { status: 400 });
    }

    // ── Load DB reference data in parallel ──────────────────────────────────
    const [driversRes, trucksRes, rulesRes, importRes] = await Promise.all([
      sb.from("driver_profiles")
        .select("id, full_name, company_name, carrier_name, assigned_truck_number")
        .limit(2000),
      sb.from("ronyx_trucks")
        .select("id, truck_number, status, company_name, owner_operator_name")
        .limit(2000),
      sb.from("dispatch_rmis_note_rules")
        .select("pattern, classification, severity, meaning, action, task, priority")
        .eq("is_active", true)
        .order("priority", { ascending: true })
        .limit(500),
      sb.from("dispatch_imports")
        .select("id, organization_id")
        .eq("id", dispatch_import_id)
        .maybeSingle(),
    ]);

    const allDrivers: DriverRecord[] = driversRes.data || [];
    const allTrucks: TruckRecord[] = trucksRes.data || [];
    const rmisRules: RMISRule[] = rulesRes.data || [];
    const importRecord = importRes.data;

    if (!importRecord) {
      return NextResponse.json({ error: "dispatch_import not found" }, { status: 404 });
    }

    // Build truck lookup by number for O(1) access
    const truckMap: Record<string, TruckRecord> = {};
    for (const t of allTrucks) {
      if (t.truck_number) truckMap[t.truck_number.trim()] = t;
    }

    // ── Process each row ─────────────────────────────────────────────────────
    const insertRows = rows.map((raw) => {
      const driverName = normalizeField(raw, "Driver Name", "driver_name", "Driver");
      const truckNum = normalizeField(raw, "Truck Number", "truck_number", "Truck #", "Truck");
      const rmisNote = normalizeField(raw, "RMIS Note", "rmis_note", "Notes", "Note");
      const customerName = normalizeField(raw, "Customer Name", "customer_name", "Customer");
      const startTime = normalizeField(raw, "Start Time", "start_time", "Start Date", "Date");
      const pickupSite = normalizeField(raw, "Pickup Site", "pickup_site", "Pickup");
      const dropoffSite = normalizeField(raw, "Dropoff Site", "dropoff_site", "Dropoff");
      const qty = normalizeField(raw, "Quantity", "quantity", "Qty");
      const unit = normalizeField(raw, "Unit", "unit", "Quantity Unit");
      const material = normalizeField(raw, "Material", "material");
      const jobId = normalizeField(raw, "Job ID", "job_id", "Friendly Job ID");
      const vendor = normalizeField(raw, "Vendor", "vendor_name", "Vendor Name");
      const licPlate = normalizeField(raw, "Equipment License #", "equipment_license_number");
      const jobStatus = normalizeField(raw, "Status", "job_status");

      // RMIS classification
      const rmis = classifyRMIS(rmisNote, rmisRules);

      // Driver match
      let matchedDriverId: string | null = null;
      let matchedDriverCompany: string | null = null;
      let driverConfidence = 0;
      let driverFound = false;

      if (driverName && allDrivers.length > 0) {
        const scored = allDrivers
          .map((d) => ({ ...d, score: scoreName(d.full_name ?? "", driverName) }))
          .sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (best && best.score > 0.4) {
          matchedDriverId = best.id;
          matchedDriverCompany = best.company_name || best.carrier_name || null;
          driverConfidence = best.score;
          driverFound = true;
        } else {
          driverConfidence = best?.score ?? 0;
        }
      }

      // Truck match
      let matchedTruckId: string | null = null;
      let matchedOwnerOperator: string | null = null;
      let truckFound = false;
      const truck = truckNum ? truckMap[truckNum] : undefined;
      if (truck) {
        matchedTruckId = truck.id;
        matchedOwnerOperator = truck.owner_operator_name || truck.company_name || null;
        truckFound = true;
      }

      // Match status
      const matchStatus =
        !driverFound && !truckFound ? "needs_review"
        : !driverFound ? "unknown_driver"
        : !truckFound ? "unknown_truck"
        : "matched";

      // Overall confidence: average of driver score + truck found
      const confidence = Number(
        (((driverConfidence) + (truckFound ? 1 : 0)) / 2 * 100).toFixed(2)
      );

      // Intelligence: expected ticket count (1 ticket per 1 load per driver/truck pair)
      const expectedTicketCount = driverFound && truckFound ? 1 : 0;
      // Time proof required if job status indicates active or en-route
      const expectedTimeProof = ["active", "en_route", "in_progress"].includes(
        (jobStatus || "").toLowerCase()
      );

      const { status, issues, nextAction } = computeRowStatus(rmis, driverFound, truckFound);

      return {
        dispatch_import_id,
        organization_id: importRecord.organization_id,
        raw_row: raw,

        driver_name: driverName || null,
        truck_number: truckNum || null,
        customer_name: customerName || null,
        start_time: parseDateTime(startTime),
        pickup_site_name: pickupSite || null,
        dropoff_site_name: dropoffSite || null,
        job_quantity: qty ? parseFloat(qty) : null,
        job_quantity_unit: unit || null,
        material: material || null,
        friendly_job_id: jobId || null,
        vendor_name: vendor || null,
        equipment_license_number: licPlate || null,
        job_status: jobStatus || null,

        rmis_note: rmisNote || null,
        rmis_classification: rmis.classification,
        rmis_severity: rmis.severity,
        rmis_meaning: rmis.meaning || null,
        rmis_action: rmis.action || null,
        rmis_task: rmis.task || null,

        matched_driver_id: matchedDriverId,
        matched_driver_company: matchedDriverCompany,
        matched_truck_id: matchedTruckId,
        matched_owner_operator: matchedOwnerOperator,
        match_confidence: confidence,
        match_status: matchStatus,

        expected_ticket_count: expectedTicketCount,
        expected_time_proof: expectedTimeProof,
        row_status: status,
        next_best_action: nextAction,
        issues: issues.length > 0 ? issues : null,

        customer_requirement_status: "pending",
        dispatch_guard_status: status === "critical" ? "blocked" : "pending",
      };
    });

    // ── Insert rows (batch, idempotent: delete-then-insert on re-parse) ──────
    // GUARD: if any prior rows were already promoted to jobs (i.e. corrected/committed),
    // a delete-then-insert would silently wipe that work. Block the re-parse instead.
    const { count: promotedCount } = await sb
      .from("dispatch_import_rows")
      .select("id", { count: "exact", head: true })
      .eq("dispatch_import_id", dispatch_import_id)
      .not("promoted_to_job_id", "is", null);
    if (promotedCount && promotedCount > 0) {
      return NextResponse.json({
        error: `This import already has ${promotedCount} promoted/corrected row(s). Re-parsing is blocked so corrections aren't lost — start a new import instead.`,
      }, { status: 409 });
    }
    // Delete existing (un-promoted) rows for this import so re-parses are clean
    await sb.from("dispatch_import_rows").delete().eq("dispatch_import_id", dispatch_import_id);

    const { error: insertError } = await sb
      .from("dispatch_import_rows")
      .insert(insertRows);

    if (insertError) {
      console.error("[parse] insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // ── Aggregate counts for dispatch_imports update ──────────────────────────
    const totalRows = insertRows.length;
    const readyRows = insertRows.filter((r) => r.row_status === "ready").length;
    const criticalRows = insertRows.filter((r) => r.row_status === "critical").length;
    const needsReviewRows = insertRows.filter((r) => r.row_status === "needs_review").length;
    const matchedRows = insertRows.filter((r) => r.match_status === "matched").length;

    await sb
      .from("dispatch_imports")
      .update({
        total_rows: totalRows,
        ready_rows: readyRows,
        critical_rows: criticalRows,
        needs_review_rows: needsReviewRows,
        matched_rows: matchedRows,
        parsed_at: new Date().toISOString(),
        status: criticalRows > 0 ? "needs_review" : readyRows === totalRows ? "ready" : "needs_review",
      })
      .eq("id", dispatch_import_id);

    // Return summary + first 100 processed rows for UI preview
    return NextResponse.json({
      success: true,
      summary: {
        total: totalRows,
        ready: readyRows,
        needs_review: needsReviewRows,
        critical: criticalRows,
        matched: matchedRows,
      },
      rows: insertRows.slice(0, 100),
    });
  } catch (err: any) {
    console.error("[parse] unexpected error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
