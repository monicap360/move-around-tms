import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: Request) {
  try {
    const supabase = createServerAdmin();
    const orgCode = "ronyx-logistics-llc";

    // Get organization_id from organization_code
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("organization_code", orgCode)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const organizationId = org.id;

    // Fetch available drivers (no active load, status is available/active)
    const { data: drivers, error: driversError } = await supabase
      .from("drivers")
      .select("id, driver_uuid, name, phone, email, status, safety_score, performance_score, endorsements, active_load")
      .eq("organization_id", organizationId)
      .is("active_load", null)
      .in("status", ["available", "Active", "active"])
      .order("safety_score", { ascending: false, nullsLast: true })
      .order("performance_score", { ascending: false, nullsLast: true });

    if (driversError) {
      return NextResponse.json(
        { error: driversError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      drivers: drivers || [],
      count: (drivers || []).length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch available drivers" },
      { status: 500 },
    );
  }
}
