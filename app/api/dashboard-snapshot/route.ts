import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET() {
  const { data: loads, error: loadError } = await supabaseAdmin
    .from("ronyx_loads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  const { data: updates } = await supabaseAdmin
    .from("ronyx_driver_updates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: events } = await supabaseAdmin
    .from("ronyx_driver_events")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(200);

  const latestEventByLoad = new Map<string, any>();
  (events || []).forEach((event) => {
    if (!event.load_id) return;
    if (!latestEventByLoad.has(event.load_id)) {
      latestEventByLoad.set(event.load_id, event);
    }
  });

  const safeLoads = loads || [];
  const activeStatuses = new Set([
    "active",
    "en_route",
    "at_pit",
    "delivering",
    "loading",
    "on_site",
  ]);
  const activeLoads = safeLoads.filter((load) => activeStatuses.has(load.status));
  const distinctDrivers = new Set(
    safeLoads.map((load) => load.driver_name).filter(Boolean),
  );
  const estimatedRevenue = safeLoads.reduce((sum, load) => {
    const quantity = Number(load.quantity || 0);
    const rate = Number(load.rate_amount || 0);
    return sum + quantity * rate;
  }, 0);

  const completedLoads = safeLoads.filter((load) => load.status === "completed");
  const plannedLoads = safeLoads.length;
  const cycleMinutes = completedLoads
    .map((load) => {
      if (!load.started_at || !load.completed_at) return null;
      const start = new Date(load.started_at).getTime();
      const end = new Date(load.completed_at).getTime();
      return Number.isNaN(start) || Number.isNaN(end) ? null : (end - start) / 60000;
    })
    .filter((val) => val !== null) as number[];
  const avgCycle =
    cycleMinutes.length > 0
      ? Math.round(cycleMinutes.reduce((sum, val) => sum + val, 0) / cycleMinutes.length)
      : 0;

  const liveLoads = safeLoads.map((load) => {
    const hasTicket = Boolean(load.ticket_id || load.ticket_number);
    const hasPOD = Boolean(load.pod_url);
    const status = (load.status || "unknown").toUpperCase();
    const latestEvent = latestEventByLoad.get(load.id) || null;
    return {
      load_id: load.id,
      driver_name: load.driver_name || "Unassigned",
      status,
      status_display: status.replace("_", " "),
      source: load.pickup_location || load.route?.split("→")?.[0]?.trim() || "Unknown",
      destination:
        load.delivery_location || load.route?.split("→")?.[1]?.trim() || "Unknown",
      material: load.material || "Material",
      net_tons: load.quantity || null,
      attachments: {
        ticket_image: load.ticket_image_url || (hasTicket ? "attached" : null),
        delivery_proof: hasPOD ? load.pod_url : null,
        signature: load.digital_signature || null,
      },
      last_location: latestEvent?.location || null,
      actions_available: hasTicket && hasPOD ? ["GENERATE_INVOICE"] : ["MESSAGE_DRIVER"],
      invoice_ready: hasTicket && hasPOD,
    };
  });

  const activeExceptions = (updates || [])
    .filter((update) =>
      String(update.status || "").toLowerCase().includes("delay") ||
      String(update.status || "").toLowerCase().includes("truck_down") ||
      String(update.status || "").toLowerCase().includes("ticket"),
    )
    .map((update) => ({
      type: update.status || "STATUS",
      load_id: update.ticket_id || null,
      driver_id: update.driver_name || null,
      message: update.notes || update.status,
      timestamp: update.created_at || null,
    }));

  return NextResponse.json({
    summary_metrics: {
      active_trucks: activeLoads.length,
      total_trucks: distinctDrivers.size || activeLoads.length,
      estimated_revenue: Math.round(estimatedRevenue),
      loads_completed: completedLoads.length,
      loads_planned: plannedLoads,
      avg_cycle_time_minutes: avgCycle,
    },
    live_loads: liveLoads,
    active_exceptions: activeExceptions,
  });
}
