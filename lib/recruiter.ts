import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getRecruiterProfile(recruiterId: string) {
  const { data, error } = await supabase
    .from("recruiters")
    .select("id, name, avatarUrl, companyName, email, phone, bio")
    .eq("id", recruiterId)
    .single();
  if (error) return null;
  return data;
}

export async function getActiveJobPostings(recruiterId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, location, description")
    .eq("recruiter_id", recruiterId)
    .eq("status", "active");
  if (error) return [];
  return data || [];
}
