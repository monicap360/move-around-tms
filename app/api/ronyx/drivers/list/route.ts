import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organization = searchParams.get("organization"); // optional org filter

  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("drivers")
    .select("id, name, status, email, phone, driver_profiles(*)")
    .order("name", { ascending: true });

  if (organization) {
    // filter by organization_code stored on the driver or via driver_profiles
    query = query.eq("organization_code", organization);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ drivers: [], error: error.message }, { status: 200 });
  }

  // Flatten: merge driver_profiles (0 or 1) into the driver row
  const drivers = (data || []).map((d: any) => {
    const profile = Array.isArray(d.driver_profiles)
      ? d.driver_profiles[0]
      : d.driver_profiles;
    return {
      id:                        d.id,
      full_name:                 profile?.full_name          || d.name || "",
      phone:                     profile?.phone              || d.phone || "",
      email:                     profile?.email              || d.email || "",
      driver_type:               profile?.driver_type        || "W2",
      status:                    profile?.status             || d.status || "active",
      license_number:            profile?.license_number     || "",
      license_state:             profile?.license_state      || "",
      license_expiration_date:   profile?.license_expiration_date || "",
      mvr_expiration:            profile?.mvr_expiration     || "",
      medical_card_expiration:   profile?.medical_card_expiration || "",
      assigned_truck_number:     profile?.assigned_truck_number || "",
      rating:                    profile?.rating             || 0,
      last_ticket_date:          profile?.last_ticket_date   || "",
      hire_date:                 profile?.hire_date          || "",
      background_check_status:   profile?.background_check_status || "pending",
      drug_test_status:          profile?.drug_test_status   || "pending",
      photo_url:                 profile?.photo_url          || "",
      address:                   profile?.address            || "",
      emergency_contact_name:    profile?.emergency_contact_name  || "",
      emergency_contact_phone:   profile?.emergency_contact_phone || "",
      position_role:             profile?.position_role      || "",
      pay_rate:                  profile?.pay_rate           ? String(profile.pay_rate) : "",
      supervisor_name:           profile?.supervisor_name    || "",
      orientation_completed:     profile?.orientation_completed   ?? false,
      hazmat_training:           profile?.hazmat_training         ?? false,
      driver_scorecard:          profile?.driver_scorecard   || "",
    };
  });

  return NextResponse.json({ drivers });
}
