// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export type RecruiterProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
};

export type RecruiterJobPosting = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
};

export async function getRecruiterProfile(recruiterId: string): Promise<RecruiterProfile | null> {
  const { data, error } = await supabase
    .from("recruiters")
    .select("id, name, avatarUrl, companyName, email, phone, bio")
    .eq("id", recruiterId)
    .single();
  if (error) return null;
  return data;
}

export async function getActiveJobPostings(recruiterId: string): Promise<RecruiterJobPosting[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, location, description")
    .eq("recruiter_id", recruiterId)
    .eq("status", "active");
  if (error) return [];
  return data || [];
}
