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

// Stub for submitDispatcherRating to resolve import error
export async function submitDispatcherRating(
  driver_uuid: string,
  score: number,
  feedback: string,
) {
  // TODO: Implement actual logic
  return { success: true };
}
