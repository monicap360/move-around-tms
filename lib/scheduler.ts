// lib/scheduler.ts
// Simple auto-scheduler using Supabase client. Intended to run server-side.

import { supabase } from "@/lib/supabaseClient";

export async function autoScheduleLoads() {
  const { data: drivers, error: dErr } = await supabase
    .from("driver_status")
    .select("driver_id")
    .eq("status", "Available");

  if (dErr) {
    console.error('Error fetching available drivers', dErr)
    return []
  }

  const { data: trucks, error: tErr } = await supabase
    .from("trucks")
    .select("*")
    .eq("status", "Ready");

  if (tErr) {
    console.error('Error fetching ready trucks', tErr)
    return []
  }

  const assignments: Array<{ driver: string; truck: string }> = [];

  const count = Math.min((drivers || []).length, (trucks || []).length);

  for (let i = 0; i < count; i++) {
    const d = drivers![i];
    const t = trucks![i];
    const { error } = await supabase
      .from("driver_assignments")
      .insert({ driver_id: d.driver_id, truck_id: t.id, status: "Scheduled" });
    if (!error) assignments.push({ driver: d.driver_id, truck: t.unit || t.unit_number || t.id });
  }

  return assignments;
}
