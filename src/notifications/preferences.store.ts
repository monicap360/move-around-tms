// src/notifications/preferences.store.ts
import { NotificationPreference } from "./preferences.types";
import supabase from "../../lib/supabase/server";

// Fetch preferences from Supabase
export async function getPreferences(
  organizationId: string,
): Promise<NotificationPreference[]> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("organizationId", organizationId);
  if (error) throw error;
  return data as NotificationPreference[];
}

// Upsert preferences in Supabase
export async function setPreferences(
  organizationId: string,
  updates: NotificationPreference[],
): Promise<void> {
  // Upsert each preference
  for (const update of updates) {
    const { error } = await supabase
      .from("notification_preferences")
      .upsert([{ ...update, organizationId }], {
        onConflict: ["organizationId", "channel", "severity"],
      });
    if (error) throw error;
  }
}
