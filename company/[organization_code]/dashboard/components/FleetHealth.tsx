"use client";

import { useEffect, useState } from "react";

export default function FleetHealth() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch("/api/fleet/health")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts));
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-5 h-[360px]">
      <h2 className="font-semibold text-xl mb-3">Fleet Health</h2>

      <div className="flex flex-col gap-2 overflow-y-auto h-full">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="glass-card p-3 border border-red-400/30 rounded-lg"
          >
            <p className="font-semibold">{a.title}</p>
            <p className="opacity-70 text-sm">{a.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
