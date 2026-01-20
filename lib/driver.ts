import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data, error } = await supabase
      .from("dispatcher_ratings")
      .insert({
        driver_uuid: driver_uuid,
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
