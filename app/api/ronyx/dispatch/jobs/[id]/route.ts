import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseAdmin;
  const body     = await req.json().catch(() => ({}));
  const jobId    = params.id;

  // ── Compliance gate when assigning a driver ────────────────
  if (body.assigned_driver_id) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: driverRow } = await supabase
      .from("drivers")
      .select("id, name, driver_profiles(full_name, medical_card_expiration, license_expiration_date, dispatch_eligible)")
      .eq("id", body.assigned_driver_id)
      .single();

    const profile = Array.isArray(driverRow?.driver_profiles)
      ? driverRow!.driver_profiles[0]
      : driverRow?.driver_profiles;

    const hardBlocks: string[] = [];
    const softBlocks: { type: string; message: string }[] = [];

    if (profile?.dispatch_eligible === false)
      hardBlocks.push("Driver is dispatch-ineligible (compliance block)");
    if (profile?.medical_card_expiration && profile.medical_card_expiration < today)
      hardBlocks.push(`Medical card expired on ${profile.medical_card_expiration}`);
    if (profile?.license_expiration_date && profile.license_expiration_date < today)
      hardBlocks.push(`CDL expired on ${profile.license_expiration_date}`);

    // Check for conflicting active assignment
    const { data: conflict } = await supabase
      .from("dispatch_assignments")
      .select("job_id")
      .eq("driver_id", body.assigned_driver_id)
      .not("acceptance_status", "eq", "declined")
      .single();
    if (conflict && conflict.job_id !== jobId)
      hardBlocks.push("Driver is already assigned to another active trip");

    // Soft blocks — can be overridden
    const { data: job } = await supabase
      .from("dispatch_jobs")
      .select("payment_status, customer_phone, special_instructions, special_instructions_ack, pickup_address")
      .eq("id", jobId)
      .single();

    if (!job?.pickup_address)
      hardBlocks.push("Missing pickup address — cannot dispatch");
    if (job?.payment_status === "unpaid")
      softBlocks.push({ type: "payment_unpaid", message: "Payment not cleared" });
    if (!job?.customer_phone)
      softBlocks.push({ type: "missing_customer_phone", message: "No customer phone on file" });
    if (job?.special_instructions && !job?.special_instructions_ack)
      softBlocks.push({ type: "special_instructions_unacked", message: "Special instructions not acknowledged by driver" });

    const hasOverride = body.override_approved && Array.isArray(body.override_reasons);

    if (hardBlocks.length > 0) {
      // Hard blocks always stop dispatch — no override allowed
      return NextResponse.json({
        blocked:      true,
        can_override: false,
        hard_blocks:  hardBlocks,
        soft_blocks:  softBlocks.map(s => s.message),
        driver_name:  profile?.full_name || driverRow?.name,
      }, { status: 422 });
    }

    if (softBlocks.length > 0 && !hasOverride) {
      // Soft blocks stop dispatch until manager approves override
      return NextResponse.json({
        blocked:      true,
        can_override: true,
        hard_blocks:  [],
        soft_blocks:  softBlocks.map(s => s.message),
        soft_block_types: softBlocks.map(s => s.type),
        driver_name:  profile?.full_name || driverRow?.name,
      }, { status: 422 });
    }

    // If we have an approved override, log each soft block overridden
    if (hasOverride && body.override_reasons) {
      for (const reason of body.override_reasons as string[]) {
        await supabase.from("dispatch_overrides").insert({
          job_id:          jobId,
          driver_id:       body.assigned_driver_id,
          rule_overridden: reason,
          reason:          body.override_reason || "Manager approved",
          manager_name:    body.manager_name    || "Admin",
          approved:        true,
        });
      }
    }
  }

  // ── Build update payload ───────────────────────────────────
  const update: Record<string, unknown> = {};
  const allowed = [
    "job_status","assigned_driver_id","assigned_vehicle_id",
    "payment_status","risk_level","special_instructions",
    "special_instructions_ack","missing_bol","proof_of_delivery_url",
    "customer_phone","customer_name","pickup_address","dropoff_address",
    "pickup_time","dropoff_time",
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }

  const { data: previous } = await supabase
    .from("dispatch_jobs")
    .select("job_status")
    .eq("id", jobId)
    .single();

  const { data, error } = await supabase
    .from("dispatch_jobs")
    .update(update)
    .eq("id", jobId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Status history ─────────────────────────────────────────
  if (update.job_status && update.job_status !== previous?.job_status) {
    await supabase.from("trip_status_history").insert({
      job_id:      jobId,
      from_status: previous?.job_status || null,
      to_status:   update.job_status as string,
      changed_by:  body.changed_by || "dispatch",
      note:        body.status_note || null,
    });
  }

  // ── Assignment record ──────────────────────────────────────
  if (body.assigned_driver_id && update.job_status === "assigned") {
    await supabase
      .from("dispatch_assignments")
      .upsert({
        job_id:            jobId,
        driver_id:         body.assigned_driver_id,
        vehicle_id:        body.assigned_vehicle_id || null,
        assigned_by:       body.changed_by          || "dispatch",
        acceptance_status: "sent",
        sent_at:           new Date().toISOString(),
      }, { onConflict: "job_id,driver_id" });
  }

  return NextResponse.json({ job: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = supabaseAdmin;
  const { data: job } = await supabase
    .from("dispatch_jobs").select("job_status").eq("id", params.id).single();

  if (job && ["completed","billing_review"].includes(job.job_status)) {
    return NextResponse.json({ error: "Cannot cancel a completed or billing job" }, { status: 422 });
  }

  await supabase.from("dispatch_jobs").update({ job_status: "cancelled" }).eq("id", params.id);
  return NextResponse.json({ cancelled: true });
}
