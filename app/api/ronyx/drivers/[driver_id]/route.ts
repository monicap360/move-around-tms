import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// PATCH /api/ronyx/drivers/[driver_id]
// Handles: archive/restore (action field) OR driver_profiles compliance update
export async function PATCH(
  req: Request,
  { params }: { params: { driver_id: string } }
) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));
  const driverId = params.driver_id;

  if (!driverId) return NextResponse.json({ error: "Missing driver_id" }, { status: 400 });

  // ── Archive / Restore ─────────────────────────────────────────
  if (body.action === "archive" || body.action === "restore") {
    const newStatus = body.action === "archive" ? "archived" : "active";

    if (body.action === "archive") {
      // Snapshot the driver before archiving
      const { data: driver } = await supabase
        .from("drivers")
        .select("*")
        .eq("id", driverId)
        .single();

      if (driver) {
        await supabase.from("deleted_drivers_archive").insert({
          original_driver_id:      driverId,
          full_name:               driver.full_name,
          phone:                   driver.phone,
          email:                   driver.email,
          driver_type:             driver.driver_type,
          prior_status:            driver.status,
          license_number:          driver.license_number,
          license_state:           driver.license_state,
          license_expiration_date: driver.license_expiration_date,
          medical_card_number:     driver.medical_card_number,
          medical_card_expiration: driver.medical_card_expiration,
          mvr_expiration:          driver.mvr_expiration,
          drug_test_expiration:    driver.drug_test_expiration,
          background_check_status: driver.background_check_status,
          assigned_truck_number:   driver.assigned_truck_number,
          job_assignment:          driver.job_assignment,
          company_name:            driver.company_name,
          hire_date:               driver.hire_date,
          pay_rate:                driver.pay_rate,
          pay_type:                driver.pay_type,
          dispatch_eligible:       driver.dispatch_eligible,
          payroll_eligible:        driver.payroll_eligible,
          compliance_flags:        driver.compliance_flags,
          notes:                   driver.notes,
          organization_id:         driver.organization_id,
          action_type:             "archived",
          actioned_by:             body.actioned_by || "admin",
          action_reason:           body.reason || null,
          snapshot:                driver,
        });
      }
    }

    const { error } = await supabase
      .from("drivers")
      .update({ status: newStatus, updated_by: body.actioned_by || "admin" })
      .eq("id", driverId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Compliance / dispatch profile update ──────────────────────
  const profileUpdate: Record<string, unknown> = {};

  if (body.dispatch_eligible !== undefined) profileUpdate.dispatch_eligible = body.dispatch_eligible;
  if (body.payroll_eligible  !== undefined) profileUpdate.payroll_eligible  = body.payroll_eligible;
  if (body.compliance_status !== undefined) profileUpdate.compliance_status = body.compliance_status;
  if (body.last_audit_date   !== undefined) profileUpdate.last_audit_date   = body.last_audit_date;

  if (body.dispatch_eligible === false) {
    profileUpdate.dispatch_block_reason = body.dispatch_block_reason || "Manual block";
    profileUpdate.dispatch_blocked_at   = new Date().toISOString();
    profileUpdate.dispatch_blocked_by   = body.dispatch_blocked_by   || "admin";
  }
  if (body.dispatch_eligible === true) {
    profileUpdate.dispatch_block_reason = null;
    profileUpdate.dispatch_blocked_at   = null;
    profileUpdate.dispatch_blocked_by   = null;
  }

  const { error: profileErr } = await supabase
    .from("driver_profiles")
    .update(profileUpdate)
    .eq("driver_id", driverId);

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  if (body.audit_action) {
    await supabase.from("driver_compliance_audit_log").insert({
      driver_id:    driverId,
      driver_name:  body.driver_name || null,
      action:       body.audit_action,
      reason:       body.dispatch_block_reason || null,
      performed_by: body.dispatch_blocked_by || "admin",
      metadata:     body.audit_metadata || null,
    });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/ronyx/drivers/[driver_id]
// Hard-deletes the driver and saves a full snapshot to deleted_drivers_archive.
export async function DELETE(
  req: Request,
  { params }: { params: { driver_id: string } }
) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));
  const driverId = params.driver_id;

  if (!driverId) return NextResponse.json({ error: "Missing driver_id" }, { status: 400 });

  // Snapshot the driver before deleting
  const { data: driver, error: fetchErr } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .single();

  if (fetchErr || !driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Save to manager alerts archive
  await supabase.from("deleted_drivers_archive").insert({
    original_driver_id:      driverId,
    full_name:               driver.full_name,
    phone:                   driver.phone,
    email:                   driver.email,
    driver_type:             driver.driver_type,
    prior_status:            driver.status,
    license_number:          driver.license_number,
    license_state:           driver.license_state,
    license_expiration_date: driver.license_expiration_date,
    medical_card_number:     driver.medical_card_number,
    medical_card_expiration: driver.medical_card_expiration,
    mvr_expiration:          driver.mvr_expiration,
    drug_test_expiration:    driver.drug_test_expiration,
    background_check_status: driver.background_check_status,
    assigned_truck_number:   driver.assigned_truck_number,
    job_assignment:          driver.job_assignment,
    company_name:            driver.company_name,
    hire_date:               driver.hire_date,
    pay_rate:                driver.pay_rate,
    pay_type:                driver.pay_type,
    dispatch_eligible:       driver.dispatch_eligible,
    payroll_eligible:        driver.payroll_eligible,
    compliance_flags:        driver.compliance_flags,
    notes:                   driver.notes,
    organization_id:         driver.organization_id,
    action_type:             "deleted",
    actioned_by:             body.deleted_by || "admin",
    action_reason:           body.reason || null,
    snapshot:                driver,
  });

  // Hard delete
  const { error: delErr } = await supabase
    .from("drivers")
    .delete()
    .eq("id", driverId);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, name: driver.full_name });
}
