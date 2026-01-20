import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// Example: Live operational intelligence feed (aggregate latest data)
export async function GET() {
  const supa = createSupabaseServerClient();

  const [ticketsRes, driversRes, trucksRes, loadsRes] = await Promise.all([
    supa
      .from("aggregate_tickets")
      .select("id, status, total_profit, ticket_date")
      .order("ticket_date", { ascending: false })
      .limit(20),
    supa
      .from("drivers")
      .select("id, status, active, last_seen_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supa
      .from("trucks")
      .select("id, status, last_gps_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supa
      .from("loads")
      .select("id, status, source, destination, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const tickets = ticketsRes.data || [];
  const drivers = driversRes.data || [];
  const trucks = trucksRes.data || [];
  const loads = loadsRes.data || [];

  const ticketStatusCounts = tickets.reduce<Record<string, number>>((acc, t: any) => {
    const key = t.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const driverStatusCounts = drivers.reduce<Record<string, number>>((acc, d: any) => {
    const key = d.status || (d.active ? "Active" : "Inactive");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const truckStatusCounts = trucks.reduce<Record<string, number>>((acc, t: any) => {
    const key = t.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const loadStatusCounts = loads.reduce<Record<string, number>>((acc, l: any) => {
    const key = l.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    summary: {
      tickets: ticketStatusCounts,
      drivers: driverStatusCounts,
      trucks: truckStatusCounts,
      loads: loadStatusCounts,
    },
    tickets,
    drivers,
    trucks,
    loads,
  });
}
