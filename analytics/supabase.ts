// Supabase integration for analytics events
import { createClient } from "@supabase/supabase-js";
import { AnalyticsEvent } from "./analytics.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function logAnalyticsEvent(event: AnalyticsEvent) {
  const { data, error } = await supabase
    .from("analytics_events")
    .insert([event]);
  if (error) throw error;
  return data;
}

export async function fetchAnalyticsEvents(user_id?: string) {
  let query = supabase.from("analytics_events").select("*");
  if (user_id) query = query.eq("user_id", user_id);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data as AnalyticsEvent[];
}
