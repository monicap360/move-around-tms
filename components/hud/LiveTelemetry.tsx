"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type TelemetrySnapshot = {
  driverStatus: string;
  yardStatus: string;
  location: string;
  activeLoad: string | null;
  updatedAt: string | null;
};

export default function LiveTelemetry({ driver }: { driver?: any }) {
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadTelemetry() {
      if (!driver?.id) {
        setTelemetry(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      const truckId = driver?.truck_id || driver?.current_truck_id || null;

      const statusPromise = supabase
        .from("driver_status")
        .select("status, updated_at")
        .eq("driver_id", driver.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const yardPromise = truckId
        ? supabase
            .from("driver_yard_events")
            .select("event_type, timestamp, yard:yards(name)")
            .eq("truck_id", truckId)
            .order("timestamp", { ascending: false })
            .limit(1)
        : Promise.resolve({ data: [] as any[] });

      const loadPromise = driver?.active_load
        ? supabase
            .from("loads")
            .select("id, status, plant, material")
            .eq("id", driver.active_load)
            .limit(1)
        : supabase
            .from("loads")
            .select("id, status, plant, material")
            .eq("driver_uuid", driver.driver_uuid)
            .order("created_at", { ascending: false })
            .limit(1);

      const [statusRes, yardRes, loadRes] = await Promise.all([
        statusPromise,
        yardPromise,
        loadPromise,
      ]);

      if (!ignore) {
        if (statusRes.error) {
          console.error("Driver status error:", statusRes.error);
        }
        if (yardRes.error) {
          console.error("Yard event error:", yardRes.error);
        }
        if (loadRes.error) {
          console.error("Load status error:", loadRes.error);
        }

        const statusRow = statusRes.data?.[0];
        const yardRow = yardRes.data?.[0];
        const loadRow = loadRes.data?.[0];

        const yardName = yardRow?.yard?.name || "Unknown Yard";
        const yardStatus =
          yardRow?.event_type === "enter"
            ? "Inside"
            : yardRow?.event_type === "exit"
              ? "Outside"
              : "Unknown";

        setTelemetry({
          driverStatus: statusRow?.status || driver?.status || "Unknown",
          yardStatus,
          location: yardName,
          activeLoad: loadRow
            ? `${loadRow.status || "active"} · ${loadRow.plant || "Plant"}`
            : null,
          updatedAt: yardRow?.timestamp || statusRow?.updated_at || null,
        });
        setLoading(false);
      }
    }

    loadTelemetry();
    const interval = setInterval(loadTelemetry, 20000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [driver?.id, driver?.truck_id, driver?.current_truck_id, driver?.active_load]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading telemetry…</div>;
  }

  if (!telemetry) {
    return (
      <div className="text-sm text-muted-foreground">
        Telemetry data not available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Live Telemetry</h3>
      <div className="text-sm">
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-medium">{telemetry.driverStatus}</span>
        </div>
        <div className="flex justify-between">
          <span>Yard Geofence</span>
          <span className="font-medium">{telemetry.yardStatus}</span>
        </div>
        <div className="flex justify-between">
          <span>Last Location</span>
          <span className="font-medium">{telemetry.location}</span>
        </div>
        {telemetry.activeLoad && (
          <div className="flex justify-between">
            <span>Active Load</span>
            <span className="font-medium">{telemetry.activeLoad}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-400">
          <span>Last Update</span>
          <span>
            {telemetry.updatedAt
              ? new Date(telemetry.updatedAt).toLocaleString()
              : "Unknown"}
          </span>
        </div>
      </div>
    </div>
  );
}
