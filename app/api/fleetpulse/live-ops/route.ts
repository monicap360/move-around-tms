import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Example: Live operational intelligence feed (aggregate latest data)
export async function GET() {
  const supa = createSupabaseServerClient();
  // This is a placeholder for a live ops dashboard feed
  // You can aggregate from multiple tables as needed
  const [tickets, drivers, trucks] = await Promise.all([
    supa
      .from("tickets")
      .select("id, status, forensic_score, anomaly_flags")
      .order("created_at", { ascending: false })
      .limit(10),
    supa
      .from("drivers")
      .select("id, ops_performance_score, delay_index")
      .order("created_at", { ascending: false })
      .limit(10),
    supa
      .from("trucks")
      .select("id, efficiency_score, idle_loss_score")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return NextResponse.json({
    tickets: tickets.data || [],
    drivers: drivers.data || [],
    trucks: trucks.data || [],
  });
}
