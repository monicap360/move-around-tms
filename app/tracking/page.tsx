"use client";
import { useEffect, useState } from "react";
import { fetchMockTrackingData, TrackingRecord } from "./trackingDataProvider";

// For map rendering, use a placeholder div (replace with react-leaflet or Google Maps later)
const statusColors = {
  on_schedule: "bg-green-500",
  delayed: "bg-yellow-400",
  critical: "bg-red-500"
};

export default function TrackingMapView() {
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [filter, setFilter] = useState({ driver: "", truck: "", status: "all" });

  useEffect(() => {
    fetchMockTrackingData().then(setRecords);
  }, []);

  const filtered = records.filter(r =>
    (!filter.driver || r.driverName.toLowerCase().includes(filter.driver.toLowerCase())) &&
    (!filter.truck || r.truckNumber.toLowerCase().includes(filter.truck.toLowerCase())) &&
    (filter.status === "all" || r.status === filter.status)
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <input className="input" placeholder="Filter by driver..." value={filter.driver} onChange={e => setFilter(f => ({ ...f, driver: e.target.value }))} />
        <input className="input" placeholder="Filter by truck..." value={filter.truck} onChange={e => setFilter(f => ({ ...f, truck: e.target.value }))} />
        <select className="input" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="all">All Statuses</option>
          <option value="on_schedule">On Schedule</option>
          <option value="delayed">Delayed</option>
          <option value="critical">Critical/Issue</option>
        </select>
      </div>
      <div className="mb-4 font-bold text-lg">Live GPS Driver Tracking (Mock Map)</div>
      <div className="relative w-full h-96 bg-blue-100 rounded-lg flex items-center justify-center">
        {/* Replace this with a real map component */}
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-xs">
          <div className="mb-1 font-semibold">Legend</div>
          <div><span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>On Schedule</div>
          <div><span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>Delayed</div>
          <div><span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>Critical/Issue</div>
        </div>
        {/* Render mock markers */}
        {filtered.map((r, i) => (
          <div
            key={r.driverId}
            className={`absolute z-10 ${statusColors[r.status]} text-white rounded-full flex flex-col items-center justify-center shadow-lg`}
            style={{ left: `${20 + i * 30}%`, top: `${30 + i * 20}px`, width: 40, height: 40 }}
            title={`Driver: ${r.driverName}\nTruck: ${r.truckNumber}\nStatus: ${r.status}`}
          >
            <span className="font-bold">{r.truckNumber}</span>
            <span className="text-xs">{r.status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <div className="font-semibold mb-2">Driver / Truck Info</div>
        <table className="min-w-full border text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Driver</th>
              <th className="border px-2 py-1">Truck</th>
              <th className="border px-2 py-1">Trailer</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Last Location</th>
              <th className="border px-2 py-1">Speed</th>
              <th className="border px-2 py-1">Direction</th>
              <th className="border px-2 py-1">Route</th>
              <th className="border px-2 py-1">ETA</th>
              <th className="border px-2 py-1">Load Status</th>
              <th className="border px-2 py-1">Customer</th>
              <th className="border px-2 py-1">Job Site</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.driverId} className={r.status === "critical" ? "bg-red-50" : r.status === "delayed" ? "bg-yellow-50" : "bg-green-50"}>
                <td className="border px-2 py-1">{r.driverName}</td>
                <td className="border px-2 py-1">{r.truckNumber}</td>
                <td className="border px-2 py-1">{r.trailerNumber}</td>
                <td className="border px-2 py-1 font-bold">{r.status.replace("_", " ")}</td>
                <td className="border px-2 py-1">{r.timestamp}</td>
                <td className="border px-2 py-1">{r.speed} mph</td>
                <td className="border px-2 py-1">{r.direction}</td>
                <td className="border px-2 py-1">{r.route}</td>
                <td className="border px-2 py-1">{new Date(r.eta).toLocaleTimeString()}</td>
                <td className="border px-2 py-1">{r.loadStatus}</td>
                <td className="border px-2 py-1">{r.customer}</td>
                <td className="border px-2 py-1">{r.jobSite}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={12} className="text-center py-4 text-gray-400">No records found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
