import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export async function GET(_req, { params }) {
  const { driver_uuid } = params;
  const client = createSupabaseServerClient();

  const { data, error } = await client
    .from("drivers")
    .select("*")
    .eq("driver_uuid", driver_uuid)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    full_name: data.full_name,
    rank: data.rank,
    total_loads: data.total_loads,
    safety_score: data.safety_score,
    endorsements: data.endorsements,
    twic: data.twic,
    medical_card: data.medical_card,
    hire_ready: data.hire_ready,
    experience_years: data.experience_years,
    violations: data.violations_count,
    truck_skin: data.truck_skin,
    custom_logo_url: data.custom_logo_url,
    resume: data.resume_json,
    updated_at: data.rank_updated_at,
  });
}
