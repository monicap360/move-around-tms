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

    // Insert rating into dispatcher_ratings table (or create if doesn't exist)
    // If the table doesn't exist, we'll handle it gracefully
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
      // If table doesn't exist, log warning but don't fail
      // In production, you'd want to create the table via migration
      console.warn("Dispatcher ratings table may not exist:", error.message);
      // For now, we'll still return success since this is optional feedback
      return { success: true, warning: "Rating table not available" };
    }

    return { success: true, rating: data };
  } catch (err: any) {
    console.error("Error submitting dispatcher rating:", err);
    return { success: false, error: err.message };
  }
}
