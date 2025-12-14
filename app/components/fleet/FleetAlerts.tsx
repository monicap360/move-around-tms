"use client";
import { useEffect, useState } from "react";

export default function FleetAlerts({ manager }) {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "Weather", message: "Storm warning in Houston." },
    { id: 2, type: "Compliance", message: "Truck 202 missing inspection." }
  ]);

  useEffect(() => {
    // Simulate fetching alerts
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Fleet Alerts</h2>
      <ul className="space-y-2">
        {alerts.map(a => (
          <li key={a.id} className="bg-red-900 text-red-200 p-2 rounded">
            <b>{a.type}:</b> {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
