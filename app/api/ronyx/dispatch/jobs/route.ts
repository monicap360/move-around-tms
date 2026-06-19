import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const { searchParams } = new URL(req.url);
  const date   = searchParams.get("date");
  const status = searchParams.get("status");

  let query = supabase
    .from("dispatch_jobs")
    .select(`
      *,
      assigned_driver:assigned_driver_id(
        id, name,
        driver_profiles(full_name, phone, medical_card_expiration, license_expiration_date, dispatch_eligible)
      ),
      assigned_vehicle:assigned_vehicle_id(unit_number, status, dispatch_eligible),
      latest_assignment:dispatch_assignments(acceptance_status, sent_at, no_response_at)
    `)
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .order("pickup_time", { ascending: true });

  if (date)   query = query.gte("pickup_time", `${date}T00:00:00`).lte("pickup_time", `${date}T23:59:59`);
  if (status) query = query.eq("job_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ jobs: [], error: error.message });

  const today = new Date().toISOString().slice(0, 10);
  const now   = new Date();

  const jobs = (data || []).map((j: any) => {
    const profile = Array.isArray(j.assigned_driver?.driver_profiles)
      ? j.assigned_driver.driver_profiles[0]
      : j.assigned_driver?.driver_profiles;

    const vehicle = Array.isArray(j.assigned_vehicle)
      ? j.assigned_vehicle[0]
      : j.assigned_vehicle;

    // Pick latest assignment row
    const assignments = Array.isArray(j.latest_assignment) ? j.latest_assignment : [];
    const assignment  = assignments[0] || null;

    // Cannot-dispatch server-side checks
    const blockReasons: string[] = [];
    if (!j.pickup_address) blockReasons.push("Missing pickup address");
    if (profile?.medical_card_expiration && profile.medical_card_expiration < today) blockReasons.push("Driver medical card expired");
    if (profile?.license_expiration_date && profile.license_expiration_date < today)  blockReasons.push("Driver CDL expired");
    if (profile?.dispatch_eligible === false) blockReasons.push("Driver dispatch-ineligible");
    if (vehicle?.dispatch_eligible === false || vehicle?.status === "out_of_service")  blockReasons.push("Vehicle out of service");

    // No-response check: sent > 5 min ago and not yet accepted/declined
    const sentAt = assignment?.sent_at;
    const noResponse = sentAt && assignment?.acceptance_status === "sent"
      && (now.getTime() - new Date(sentAt).getTime()) > 5 * 60 * 1000;

    const pickupPast = j.pickup_time && new Date(j.pickup_time) < now
      && !["completed","billing_review","cancelled"].includes(j.job_status);

    return {
      ...j,
      assigned_driver_name:   profile?.full_name || j.assigned_driver?.name || null,
      assigned_driver_phone:  profile?.phone     || null,
      assigned_vehicle_number: vehicle?.unit_number || null,
      acceptance_status:      assignment?.acceptance_status || null,
      sent_at:                sentAt || null,
      no_response:            noResponse || false,
      dispatch_blocked:       blockReasons.length > 0,
      block_reasons:          blockReasons,
      is_late:                pickupPast,
    };
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const body = await req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from("dispatch_jobs")
    .insert({
      organization_id:      orgId,
      customer_name:        body.customer_name,
      customer_phone:       body.customer_phone       || null,
      customer_email:       body.customer_email       || null,
      pickup_address:       body.pickup_address       || null,
      pickup_time:          body.pickup_time          || null,
      dropoff_address:      body.dropoff_address      || null,
      dropoff_time:         body.dropoff_time         || null,
      passenger_count:      body.passenger_count      ?? 1,
      luggage_count:        body.luggage_count        ?? 0,
      special_instructions: body.special_instructions || null,
      payment_status:       body.payment_status       || "unpaid",
      job_status:           body.job_status           || "needs_review",
      risk_level:           body.risk_level           || "low",
      created_by:           body.created_by           || "dispatch",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ job: data }, { status: 201 });
}
