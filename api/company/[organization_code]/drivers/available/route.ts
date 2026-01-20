import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const organizationCode = params?.["organization_code"];

  if (!organizationCode) {
    return NextResponse.json(
      { error: "Missing organization code" },
      { status: 400 },
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("organization_code", organizationCode)
    .single();

  if (organizationError || !organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const organizationId = organization.id;

  // Fetch all available drivers for this org
  const { data, error } = await supabase
    .from("drivers")
    .select(
      "id, driver_uuid, name, phone, email, status, safety_score, performance_score, endorsements, active_load",
    )
    .eq("organization_id", organizationId)
    .is("active_load", null)
    .in("status", ["available", "Active", "active"])
    .order("safety_score", { ascending: false, nullsLast: true })
    .order("performance_score", { ascending: false, nullsLast: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    drivers: data || [],
    count: (data || []).length,
  });
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
