import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  return NextResponse.json({
    metrics: {
      fleet: { active: 18, total: 24, moving: 12, idle: 4, stopped: 2, offline: 6 },
      deliveries: { today: 142, completed: 128, in_progress: 14, on_time_rate: 94.7 },
      alerts: { total: 3, critical: 1, warning: 2, unread: 3 },
      efficiency: { fuel_avg: 5.8, mileage_today: 8420, driver_hours: 142 },
      last_updated: now.toISOString(),
      data_freshness: "updated just now",
    },
  });
}
