import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(_req, { params }) {
  const client = createSupabaseServerClient();
  const { driver_uuid } = params;

  const { data: d, error } = await client
    .from("drivers")
    .select("*")
    .eq("driver_uuid", driver_uuid)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const resume = {
    full_name: d.full_name,
    rank: d.rank,
    safety_score: d.safety_score,
    total_loads: d.total_loads,
    experience_years: d.experience_years,
    endorsements: d.endorsements,
    twic: d.twic,
    medical_card: d.medical_card,
    certifications: [
      d.twic ? "TWIC Certified" : null,
      d.medical_card ? "Valid Medical Card" : null,
      d.endorsements?.length
        ? "Endorsements: " + d.endorsements.join(", ")
        : null,
    ].filter(Boolean),
    updated: new Date().toISOString(),
  };

  await client
    .from("drivers")
    .update({
      resume_json: resume,
      resume_last_generated: new Date(),
    })
    .eq("driver_uuid", driver_uuid);

  return NextResponse.json({ resume });
}
