import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const numericFields = ["pay_rate", "mileage_rate", "miles_driven", "pay_period_earnings", "deductions", "bonuses_reimbursements"];

function normalizePayload(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = { ...payload };
  delete cleaned.id;
  delete cleaned.created_at;
  delete cleaned.updated_at;
  delete cleaned.driver_id;
  delete cleaned.organization_id;

  numericFields.forEach((field) => {
    if (field in cleaned) {
      const value = cleaned[field];
      if (value === "" || value === null) {
        cleaned[field] = null;
        return;
      }
      const numberValue = Number(value);
      cleaned[field] = Number.isFinite(numberValue) ? numberValue : null;
    }
  });

  return cleaned;
}

// POST — create a new driver + initial profile
export async function POST(request: Request) {
  const payload = await request.json();
  if (!payload?.full_name) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // 1. Insert core driver row — only columns that exist in the base drivers table
  const { data: driver, error: driverErr } = await supabase
    .from("drivers")
    .insert({
      name:  payload.full_name,
      phone: payload.phone || null,
      email: payload.email || null,
    })
    .select("id, organization_id")
    .single();

  if (driverErr) {
    return NextResponse.json({ error: driverErr.message }, { status: 500 });
  }

  // 2. Upsert the profile — only include columns from migration 073.
  // Extra columns (mvr_expiration, driver_type, etc.) are added by migration 097;
  // if that migration hasn't run yet, those fields are silently skipped so
  // driver creation still succeeds.
  const safe073Fields: Record<string, unknown> = {
    full_name:                 payload.full_name              || null,
    phone:                     payload.phone                  || null,
    email:                     payload.email                  || null,
    address:                   payload.address                || null,
    emergency_contact_name:    payload.emergency_contact_name || null,
    emergency_contact_phone:   payload.emergency_contact_phone || null,
    license_number:            payload.license_number         || null,
    license_state:             payload.license_state          || null,
    license_expiration_date:   payload.license_expiration_date || null,
    hire_date:                 payload.hire_date              || null,
    status:                    payload.status                 || "active",
    position_role:             payload.position_role          || null,
    supervisor_name:           payload.supervisor_name        || null,
    pay_rate:                  payload.pay_rate ? Number(payload.pay_rate) || null : null,
    assigned_truck_number:     payload.assigned_truck_number  || null,
    orientation_completed:     payload.orientation_completed  ?? false,
    hazmat_training:           payload.hazmat_training        ?? false,
  };

  // Fields added by migration 097 — include only if they're non-null
  // so Supabase ignores them if the column doesn't exist yet
  const extra097: Record<string, unknown> = {};
  if (payload.driver_type)           extra097.driver_type           = payload.driver_type;
  if (payload.mvr_expiration)        extra097.mvr_expiration        = payload.mvr_expiration;
  if (payload.medical_card_expiration) extra097.medical_card_expiration = payload.medical_card_expiration;
  if (payload.background_check_status) extra097.background_check_status = payload.background_check_status;
  if (payload.drug_test_status)      extra097.drug_test_status      = payload.drug_test_status;

  const { data: profile, error: profileErr } = await supabase
    .from("driver_profiles")
    .upsert(
      {
        driver_id:       driver.id,
        organization_id: driver.organization_id || null,
        ...safe073Fields,
        ...extra097,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id" },
    )
    .select("*")
    .single();

  if (profileErr) {
    // Profile save failed but driver row was created — return partial success
    return NextResponse.json(
      { driver: { id: driver.id, full_name: payload.full_name }, warning: profileErr.message },
      { status: 201 },
    );
  }

  return NextResponse.json({ driver: { id: driver.id, ...profile } }, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");

  if (!driverId) {
    return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("driver_profiles")
    .select("*")
    .eq("driver_id", driverId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data || null });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");

  if (!driverId) {
    return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
  }

  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});

  const supabase = createSupabaseServerClient();
  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("organization_id")
    .eq("id", driverId)
    .maybeSingle();

  if (driverError) {
    return NextResponse.json({ error: driverError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("driver_profiles")
    .upsert(
      {
        driver_id: driverId,
        organization_id: driver?.organization_id || null,
        ...cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
