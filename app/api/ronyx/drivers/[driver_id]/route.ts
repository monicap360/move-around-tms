import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// PATCH /api/ronyx/drivers/[driver_id]
// Updates driver_profiles fields and writes a compliance audit log entry.
export async function PATCH(
  req: Request,
  { params }: { params: { driver_id: string } }
) {
  const supabase = createSupabaseServerClient();
  const body = await req.json().catch(() => ({}));
  const driverId = params.driver_id;

  if (!driverId) return NextResponse.json({ error: "Missing driver_id" }, { status: 400 });

  // Build the profile update payload — only include fields present in body
  const profileUpdate: Record<string, unknown> = {};

  if (body.dispatch_eligible !== undefined) profileUpdate.dispatch_eligible = body.dispatch_eligible;
  if (body.payroll_eligible  !== undefined) profileUpdate.payroll_eligible  = body.payroll_eligible;
  if (body.compliance_status !== undefined) profileUpdate.compliance_status = body.compliance_status;
  if (body.last_audit_date   !== undefined) profileUpdate.last_audit_date   = body.last_audit_date;

  // Dispatch block metadata — set when explicitly blocking (dispatch_eligible === false)
  if (body.dispatch_eligible === false) {
    profileUpdate.dispatch_block_reason  = body.dispatch_block_reason  || "Manual block";
    profileUpdate.dispatch_blocked_at    = new Date().toISOString();
    profileUpdate.dispatch_blocked_by    = body.dispatch_blocked_by    || "admin";
  }

  // Dispatch restore — clear block metadata when re-enabling
  if (body.dispatch_eligible === true) {
    profileUpdate.dispatch_block_reason  = null;
    profileUpdate.dispatch_blocked_at    = null;
    profileUpdate.dispatch_blocked_by    = null;
  }

  const { error: profileErr } = await supabase
    .from("driver_profiles")
    .update(profileUpdate)
    .eq("driver_id", driverId);

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // Write audit log entry if this is a dispatch or compliance change
  if (body.audit_action) {
    await supabase.from("driver_compliance_audit_log").insert({
      driver_id:   driverId,
      driver_name: body.driver_name || null,
      action:      body.audit_action,
      reason:      body.dispatch_block_reason || null,
      performed_by: body.dispatch_blocked_by || "admin",
      metadata:    body.audit_metadata || null,
    });
  }

  return NextResponse.json({ ok: true });
}
