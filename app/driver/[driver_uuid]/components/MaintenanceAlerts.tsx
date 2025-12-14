"use client";

import { useEffect, useState } from "react";

export default function MaintenanceAlerts({ driver }: any) {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/trucks/${driver.truck_id}/maintenance`)
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts || []));
  }, [driver]);

  if (alerts.length === 0) return null;

  return (
    <section className="glass-panel p-5 rounded-2xl">
      <h3 className="font-semibold text-lg mb-3">
        Maintenance Alerts
      </h3>

      {alerts.map((a, i) => (
        <div
          key={i}
          className="glass-card p-3 rounded-lg border border-red-400/40 mb-2"
        >
          <p className="font-semibold">{a.title}</p>
          <p className="opacity-70 text-sm">{a.description}</p>
        </div>
      ))}
    </section>
  );
}
