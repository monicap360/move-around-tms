import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const driver_profile_id = params.id;
  const body = await request.json().catch(() => ({}));
  const { organization_id, request_type = "unlock", notes } = body;

  if (!organization_id) {
    return NextResponse.json({ error: "organization_id required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Verify driver is network-visible and has granted consent
  const { data: driver, error: dErr } = await supabase
    .from("driver_profiles")
    .select("id, anonymous_driver_id, profile_visibility, driver_consent_status, identity_locked, network_status")
    .eq("id", driver_profile_id)
    .single();

  if (dErr || !driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  if (driver.profile_visibility !== "network" && driver.profile_visibility !== "public") {
    return NextResponse.json({ error: "Driver is not listed in the network" }, { status: 403 });
  }

  if (driver.driver_consent_status !== "granted") {
    return NextResponse.json({
      error: "Driver has not granted consent for profile unlocks",
      driver_consent_status: driver.driver_consent_status,
    }, { status: 403 });
  }

  // Upsert unlock request
  const { data: unlock, error: uErr } = await supabase
    .from("driver_network_unlocks")
    .upsert({
      organization_id,
      driver_profile_id,
      anonymous_driver_id: driver.anonymous_driver_id,
      request_type,
      status:         "payment_required",
      payment_status: "unpaid",
      unlock_fee_cents: request_type === "introduction" ? 0 : 9900,
      notes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "organization_id,driver_profile_id",
      ignoreDuplicates: false,
    })
    .select("id, status, unlock_fee_cents, anonymous_driver_id")
    .single();

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  // Log the action
  await supabase.from("audit_logs").insert({
    entity_type:       "driver_network",
    entity_id:         driver_profile_id,
    entity_name:       driver.anonymous_driver_id || driver_profile_id,
    action:            `${request_type}_requested`,
    notes:             `Organization ${organization_id} requested ${request_type}`,
    metadata:          { organization_id, request_type },
  }).then(null, () => {});

  return NextResponse.json({
    unlock,
    message:        `${request_type === "introduction" ? "Introduction" : "Unlock"} request created.`,
    next_step:      "complete_payment",
    payment_url:    `/ronyx/driver-network/checkout?unlock_id=${unlock.id}`,
    amount_cents:   unlock.unlock_fee_cents,
    amount_display: `$${(unlock.unlock_fee_cents / 100).toFixed(2)}`,
  });
}

// PATCH — admin approves an unlock after payment
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const driver_profile_id = params.id;
  const body = await request.json().catch(() => ({}));
  const { unlock_id, approved_by = "Admin", release_identity = true, release_contact = true } = body;

  if (!unlock_id) {
    return NextResponse.json({ error: "unlock_id required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: unlock, error } = await supabase
    .from("driver_network_unlocks")
    .update({
      status:             "approved",
      payment_status:     "paid",
      paid_at:            new Date().toISOString(),
      approved_at:        new Date().toISOString(),
      approved_by,
      identity_released:  release_identity,
      contact_released:   release_contact,
      resume_released:    false,  // Only released after driver explicitly approves
      updated_at:         new Date().toISOString(),
    })
    .eq("id", unlock_id)
    .select("id, status, driver_profile_id, anonymous_driver_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update driver network_status
  await supabase
    .from("driver_profiles")
    .update({ network_status: "unlocked" })
    .eq("id", driver_profile_id);

  return NextResponse.json({
    unlock,
    message: "Driver profile unlocked. Identity and contact info now available.",
  });
}
