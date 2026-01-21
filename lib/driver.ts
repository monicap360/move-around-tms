import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

export async function getDriverResume(driver_uuid: string) {
  const { data, error } = await supabase
    .from("drivers")
    .select(
      `id, name, avatarUrl, licenseType, experienceYears, email, phone, bio, badges, history, certifications`,
    )
    .eq("id", driver_uuid)
    .single();
  if (error) return null;
  return data;
}

export async function submitDispatcherRating(
  driver_uuid: string,
  score: number,
  feedback: string,
) {
  try {
    // Validate inputs
    if (!driver_uuid || score < 1 || score > 5) {
      return { success: false, error: "Invalid input parameters" };
    }

    const { data: driverRow } = await supabaseAdmin
      .from("drivers")
      .select("id, organization_id, driver_uuid")
      .or(`id.eq.${driver_uuid},driver_uuid.eq.${driver_uuid}`)
      .maybeSingle();

    const { data, error } = await supabaseAdmin
      .from("dispatcher_ratings")
      .insert({
        driver_uuid: driver_uuid,
        organization_id: driverRow?.organization_id ?? null,
        score: score,
        feedback: feedback || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, rating: data };
  } catch (err: any) {
    console.error("Error submitting dispatcher rating:", err);
    return { success: false, error: err.message };
  }
}
