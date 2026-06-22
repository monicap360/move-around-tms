import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type DriverRow = {
  driver_name:             string;
  phone:                   string;
  email:                   string;
  driver_type:             string;
  truck_number:            string;
  cdl_number:              string;
  cdl_state:               string;
  cdl_expiration:          string;
  medical_card_number:     string;
  medical_card_expiration: string;
  job_assignment:          string;
  company_name:            string;
  mvr_expiration:          string;
  drug_test_expiration:    string;
  background_check_status: string;
  hire_date:               string;
  pay_rate:                string;
  pay_type:                string;
  owner_operator_company:  string;
  status:                  string;
  notes:                   string;
  _issues:                 string[];
  _importStatus:           string;
  _dup_action?:            "update" | "create" | "skip";
};

function toDateOrNull(val: string): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin;
  const body = await req.json().catch(() => ({}));
  const { rows = [], file_name = "", upload_type = "excel" } = body as {
    rows: DriverRow[];
    file_name: string;
    upload_type: string;
  };

  if (!rows.length) return NextResponse.json({ error: "No rows provided" }, { status: 400 });

  // Resolve user + org from active session
  const { data: { session } } = await supabase.auth.getSession();
  const userId    = session?.user?.id   ?? null;
  const userEmail = session?.user?.email ?? body.uploaded_by_email ?? null;

  let orgId: string | null = null;
  if (userId) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id")
      .eq("user_id", userId)
      .single();
    orgId = member?.org_id ?? null;
  }

  // Fallback: if no session/org, read org_id from an existing driver so imports
  // land in the same org as the rest of the data (avoids NOT NULL violations).
  if (!orgId) {
    const { data: anyDriver } = await supabase
      .from("drivers")
      .select("organization_id")
      .not("organization_id", "is", null)
      .limit(1)
      .maybeSingle();
    orgId = anyDriver?.organization_id ?? null;
  }

  // Create import batch record
  const { data: batch } = await supabase
    .from("driver_import_batches")
    .insert({
      organization_id: orgId,
      uploaded_by:     userId,
      file_name,
      upload_type,
      total_rows:      rows.length,
      status:          "processing",
    })
    .select("id")
    .single();

  const batchId = batch?.id ?? null;

  let imported = 0;
  let updated  = 0;
  let skipped  = 0;
  let failed   = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const isDup     = row._importStatus === "duplicate";
      const dupAction = row._dup_action ?? "update"; // always default to update, never silently skip

      if (isDup && dupAction === "skip") { skipped++; continue; }
      if (row._importStatus === "skip")   { skipped++; continue; }
      if (!row.driver_name?.trim())       { errors.push(`Row skipped — missing name`); failed++; continue; }

      const driverPayload = {
        full_name:               row.driver_name.trim(),
        name:                    row.driver_name.trim(),   // NOT NULL column alias
        phone:                   row.phone  || null,
        email:                   row.email  || null,
        driver_type:             row.driver_type || null,
        assigned_truck_number:   row.truck_number || null,
        license_number:          row.cdl_number   || null,
        license_state:           row.cdl_state    || null,
        license_expiration_date: toDateOrNull(row.cdl_expiration),
        medical_card_number:     row.medical_card_number     || null,
        medical_card_expiration: toDateOrNull(row.medical_card_expiration),
        job_assignment:          row.job_assignment          || null,
        company_name:            row.company_name            || null,
        mvr_expiration:          toDateOrNull(row.mvr_expiration),
        drug_test_expiration:    toDateOrNull(row.drug_test_expiration),
        background_check_status: row.background_check_status || null,
        hire_date:               toDateOrNull(row.hire_date),
        pay_rate:                row.pay_rate ? parseFloat(row.pay_rate) || null : null,
        pay_type:                row.pay_type || null,
        owner_operator_company:  row.owner_operator_company || null,
        status:                  "active",
        dispatch_eligible:       false,
        payroll_eligible:        false,
        notes:                   row.notes || null,
        import_batch_id:         batchId,
        compliance_flags:        row._issues?.length > 0 ? row._issues : null,
        organization_id:         orgId,
        updated_by:              userEmail || null,
      };

      if (isDup && dupAction === "update") {
        const nameClean = row.driver_name.trim().toLowerCase();
        const { data: existing } = await supabase
          .from("drivers")
          .select("id")
          .ilike("full_name", nameClean)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          // Two-tier update: try full payload, fall back to core fields only
          const { error: upErr1 } = await supabase
            .from("drivers")
            .update(driverPayload)
            .eq("id", existing.id);

          if (upErr1) {
            const coreUpdate = {
              full_name: driverPayload.full_name,
              name:      driverPayload.full_name,
              phone:     driverPayload.phone,
              email:     driverPayload.email,
              driver_type:             driverPayload.driver_type,
              assigned_truck_number:   driverPayload.assigned_truck_number,
              license_number:          driverPayload.license_number,
              license_state:           driverPayload.license_state,
              license_expiration_date: driverPayload.license_expiration_date,
              medical_card_expiration: driverPayload.medical_card_expiration,
              mvr_expiration:          driverPayload.mvr_expiration,
              status:                  driverPayload.status,
            };
            const { error: upErr2 } = await supabase
              .from("drivers")
              .update(coreUpdate)
              .eq("id", existing.id);
            if (upErr2) { errors.push(`Update failed for ${row.driver_name}: ${upErr2.message}`); failed++; }
            else { updated++; }
          } else {
            updated++;
          }
          continue; // ALWAYS continue — never insert a second copy of an existing driver
        }
        // No existing match found by name — fall through to insert as new
      }

      // Insert new driver — try full payload first, fall back to core fields only
      let newDriver: { id: string } | null = null;
      let insertError: { message: string } | null = null;

      const { data: d1, error: e1 } = await supabase
        .from("drivers")
        .insert(driverPayload)
        .select("id")
        .single();

      if (e1) {
        // Retry with minimal core fields that definitely exist on any drivers table
        const corePayload = {
          full_name:               driverPayload.full_name,
          name:                    driverPayload.full_name,  // NOT NULL alias
          phone:                   driverPayload.phone,
          email:                   driverPayload.email,
          driver_type:             driverPayload.driver_type,
          assigned_truck_number:   driverPayload.assigned_truck_number,
          license_number:          driverPayload.license_number,
          license_state:           driverPayload.license_state,
          license_expiration_date: driverPayload.license_expiration_date,
          medical_card_expiration: driverPayload.medical_card_expiration,
          mvr_expiration:          driverPayload.mvr_expiration,
          status:                  driverPayload.status,
          organization_id:         driverPayload.organization_id,
        };
        const { data: d2, error: e2 } = await supabase
          .from("drivers")
          .insert(corePayload)
          .select("id")
          .single();
        newDriver     = d2;
        insertError   = e2 ? { message: `${e1.message} (core retry: ${e2.message})` } : null;
      } else {
        newDriver = d1;
      }

      if (insertError) {
        errors.push(`Insert failed for ${row.driver_name}: ${insertError.message}`);
        failed++;
        continue;
      }

      imported++;

      // Create compliance alerts for missing/expired dates
      if (newDriver?.id && row._issues?.length > 0) {
        for (const flag of row._issues) {
          await supabase.from("ticket_audit_log").insert({
            action:      "compliance_alert_created",
            description: `Driver import compliance flag: ${flag} for ${row.driver_name}`,
            metadata:    { driver_id: newDriver.id, flag, import_batch_id: batchId },
          }).maybeSingle();
        }
      }

      // Audit trail
      await supabase.from("ticket_audit_log").insert({
        action:      "driver_created",
        description: `Driver imported from ${upload_type} file: ${row.driver_name}`,
        metadata:    { driver_id: newDriver?.id, file_name, batch_id: batchId, issues: row._issues },
      }).maybeSingle();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Row error for ${row.driver_name || "unknown"}: ${msg}`);
      failed++;
    }
  }

  // Finalize batch record
  if (batchId) {
    const now = new Date();
    const missing_cdl_count     = rows.filter(r => r._issues?.includes("MISSING_CDL_EXPIRATION")).length;
    const missing_medical_count = rows.filter(r => r._issues?.includes("MISSING_MEDICAL_CARD")).length;
    const expired_cdl_count     = rows.filter(r => r._issues?.includes("CDL_EXPIRED")).length;
    const expired_medical_count = rows.filter(r => r._issues?.includes("MEDICAL_CARD_EXPIRED")).length;

    await supabase.from("driver_import_batches").update({
      imported_count:      imported,
      updated_count:       updated,
      failed_count:        failed,
      needs_review_count:  rows.filter(r => r._importStatus === "needs_review").length,
      duplicate_count:     rows.filter(r => r._importStatus === "duplicate").length,
      missing_cdl_count,
      missing_medical_count,
      expired_cdl_count,
      expired_medical_count,
      status:              "completed",
      completed_at:        now.toISOString(),
    }).eq("id", batchId);

    await supabase.from("ticket_audit_log").insert({
      action:      "driver_import_completed",
      description: `Driver import batch completed: ${imported} created, ${updated} updated, ${failed} failed`,
      metadata:    { batch_id: batchId, file_name, imported, updated, failed, skipped },
    }).maybeSingle();
  }

  const missing_cdl_count     = rows.filter(r => r._issues?.includes("MISSING_CDL_EXPIRATION")).length;
  const missing_medical_count = rows.filter(r => r._issues?.includes("MISSING_MEDICAL_CARD")).length;
  const expired_cdl_count     = rows.filter(r => r._issues?.includes("CDL_EXPIRED")).length;
  const expired_medical_count = rows.filter(r => r._issues?.includes("MEDICAL_CARD_EXPIRED")).length;
  const missing_mvr_count     = rows.filter(r => r._issues?.includes("MISSING_MVR")).length;
  const missing_drug_count    = rows.filter(r => r._issues?.includes("MISSING_DRUG_TEST")).length;

  return NextResponse.json({
    imported, updated, skipped, failed, errors, batch_id: batchId,
    compliance: { missing_cdl_count, missing_medical_count, expired_cdl_count, expired_medical_count, missing_mvr_count, missing_drug_count },
  });
}
