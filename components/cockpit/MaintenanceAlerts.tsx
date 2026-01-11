"use client";
import { useEffect, useState } from "react";

export default function MaintenanceAlerts({ driver }) {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "Oil Change", due: "2025-12-10" },
    { id: 2, type: "Tire Rotation", due: "2025-12-15" },
  ]);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Could fetch new alerts from backend
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Maintenance Alerts</h2>
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="bg-yellow-900 text-yellow-200 p-2 rounded">
            {a.type} due by <b>{a.due}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
