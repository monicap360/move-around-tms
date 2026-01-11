"use client";
import { useState } from "react";

interface Load {
  id: string;
  status: string;
  driver?: string;
  route?: string;
}

const initialLoads: Load[] = [
  { id: "L-1001", status: "pending" },
  { id: "L-1002", status: "assigned", driver: "John D." },
  { id: "L-1003", status: "in_transit", driver: "Jane S.", route: "A-B" },
];

export default function DispatchBoard() {
  const [loads, setLoads] = useState(initialLoads);
  // TODO: Implement drag-and-drop, AI matching, and route optimization
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dispatch Board</h1>
      <div className="grid grid-cols-3 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Pending</h2>
          <div className="space-y-2">
            {loads.filter(l=>l.status==="pending").map(l=>(
              <div key={l.id} className="bg-white rounded shadow p-2">{l.id}</div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Assigned</h2>
          <div className="space-y-2">
            {loads.filter(l=>l.status==="assigned").map(l=>(
              <div key={l.id} className="bg-white rounded shadow p-2">{l.id} <span className="text-xs text-gray-500">({l.driver})</span></div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-2">In Transit</h2>
          <div className="space-y-2">
            {loads.filter(l=>l.status==="in_transit").map(l=>(
              <div key={l.id} className="bg-white rounded shadow p-2">{l.id} <span className="text-xs text-gray-500">({l.driver}, {l.route})</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>AI Matching & Route Optimization:</strong> Coming soon. Loads will be auto-matched to drivers and routes using AI.
      </div>
    </div>
  );
}
