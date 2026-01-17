import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId");

  if (!driverId) {
    return NextResponse.json({ error: "Missing driverId" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("driver_hr_profiles")
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
  const { id, created_at, updated_at, driver_id, organization_id, ...rest } = payload || {};

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
    .from("driver_hr_profiles")
    .upsert(
      {
        driver_id: driverId,
        organization_id: driver?.organization_id || organization_id || null,
        ...rest,
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
