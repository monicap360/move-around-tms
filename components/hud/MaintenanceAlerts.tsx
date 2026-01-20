"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type MaintenanceAlert = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  submitted_at: string;
};

export default function MaintenanceAlerts({ driver }: { driver?: any }) {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadAlerts() {
      if (!driver?.id && !driver?.truck_id && !driver?.current_truck_id) {
        setAlerts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const truckId = driver?.truck_id || driver?.current_truck_id || null;

      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(
          "id, issue_type, priority, description, status, submitted_at, truck_id",
        )
        .order("submitted_at", { ascending: false })
        .limit(10);

      if (!ignore) {
        if (error) {
          console.error("Error loading maintenance alerts:", error);
          setAlerts([]);
        } else {
          const filtered = (data || []).filter((row: any) => {
            if (!truckId) return true;
            if (!row.truck_id) return true;
            return row.truck_id === truckId;
          });

          const mapped = filtered.map((row: any) => ({
            id: row.id,
            title: row.issue_type || "Maintenance Request",
            description: row.description || "No description provided",
            priority: row.priority || "Medium",
            status: row.status || "Pending",
            submitted_at: row.submitted_at,
          }));
          setAlerts(mapped);
        }
        setLoading(false);
      }
    }

    loadAlerts();

    const interval = setInterval(loadAlerts, 30000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [driver?.id, driver?.truck_id, driver?.current_truck_id]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading alerts…</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No maintenance alerts right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Maintenance Alerts</h3>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="rounded-lg border border-yellow-400/40 bg-yellow-950/40 p-3 text-sm"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{alert.title}</span>
            <span className="text-xs uppercase tracking-wide text-yellow-200">
              {alert.priority}
            </span>
          </div>
          <div className="text-yellow-100/80">{alert.description}</div>
          <div className="text-xs text-yellow-200/70">
            {alert.status} ·{" "}
            {alert.submitted_at
              ? new Date(alert.submitted_at).toLocaleString()
              : "Unknown time"}
          </div>
        </div>
      ))}
    </div>
  );
}
