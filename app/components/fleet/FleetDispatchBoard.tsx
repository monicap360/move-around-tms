"use client";
import { useState } from "react";

export default function FleetDispatchBoard({ manager }) {
  const [dispatches, setDispatches] = useState([
    { id: 1, truck: "Truck 101", job: "Pickup at Plant 3", status: "En Route" },
    { id: 2, truck: "Truck 202", job: "Deliver to Site 7", status: "Idle" },
  ]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Dispatch Board</h2>
      <ul className="space-y-2">
        {dispatches.map((d) => (
          <li key={d.id} className="bg-green-900 text-green-200 p-2 rounded">
            {d.truck}: {d.job} — <b>{d.status}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
