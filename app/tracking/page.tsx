"use client";
import { useEffect, useState, useRef } from "react";
import { exportNodeAsPng } from "../maintenance/dvir-dashboard/exportAsImage";
import {
  fetchMockTrackingData,
  fetchGeotabTrackingData,
  fetchMotiveTrackingData,
  fetchVerizonTrackingData,
  fetchOmnitracsTrackingData,
  fetchFleetCompleteTrackingData,
  TrackingRecord,
} from "./trackingDataProvider";

// For map rendering, use a placeholder div (replace with react-leaflet or Google Maps later)
const statusColors = {
  on_schedule: "bg-green-500",
  delayed: "bg-yellow-400",
  critical: "bg-red-500",
};

export default function TrackingMapView() {
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [filter, setFilter] = useState({
    driver: "",
    truck: "",
    status: "all",
  });
  const [provider, setProvider] = useState("mock");

  useEffect(() => {
    let fetcher = fetchMockTrackingData;
    if (provider === "geotab") fetcher = fetchGeotabTrackingData;
    if (provider === "motive") fetcher = fetchMotiveTrackingData;
    if (provider === "verizon") fetcher = fetchVerizonTrackingData;
    if (provider === "omnitracs") fetcher = fetchOmnitracsTrackingData;
    if (provider === "fleetcomplete") fetcher = fetchFleetCompleteTrackingData;
    fetcher().then(setRecords);
  }, [provider]);

  const filtered = records.filter(
    (r) =>
      (!filter.driver ||
        r.driverName.toLowerCase().includes(filter.driver.toLowerCase())) &&
      (!filter.truck ||
        r.truckNumber.toLowerCase().includes(filter.truck.toLowerCase())) &&
      (filter.status === "all" || r.status === filter.status),
  );

  const mapRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <select
          className="input"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="mock">Mock Data</option>
          <option value="geotab">Geotab</option>
          <option value="motive">Motive (KeepTruckin)</option>
          <option value="verizon">Verizon Connect</option>
          <option value="omnitracs">Omnitracs</option>
          <option value="fleetcomplete">Fleet Complete</option>
        </select>
        <input
          className="input"
          placeholder="Filter by driver..."
          value={filter.driver}
          onChange={(e) => setFilter((f) => ({ ...f, driver: e.target.value }))}
        />
        <input
          className="input"
          placeholder="Filter by truck..."
          value={filter.truck}
          onChange={(e) => setFilter((f) => ({ ...f, truck: e.target.value }))}
        />
        <select
          className="input"
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="all">All Statuses</option>
          <option value="on_schedule">On Schedule</option>
          <option value="delayed">Delayed</option>
          <option value="critical">Critical/Issue</option>
        </select>
      </div>
      <div className="flex gap-4 mb-4">
        <button
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
          onClick={() => {
            const headers = [
              "Driver",
              "Truck",
              "Trailer",
              "Status",
              "Last Location",
              "Speed",
              "Direction",
              "Route",
              "ETA",
              "Load Status",
              "Customer",
              "Job Site",
            ];
            const rows = filtered.map((r) => [
              r.driverName,
              r.truckNumber,
              r.trailerNumber,
              r.status.replace("_", " "),
              r.timestamp,
              r.speed + " mph",
              r.direction,
              r.route,
              new Date(r.eta).toLocaleTimeString(),
              r.loadStatus,
              r.customer,
              r.jobSite,
            ]);
            const csv = [headers, ...rows]
              .map((r) =>
                r
                  .map((x) => `"${(x || "").toString().replace(/"/g, '""')}"`)
                  .join(","),
              )
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tracking_table_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export Table CSV
        </button>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
          onClick={() => {
            if (tableRef.current)
              exportNodeAsPng(
                tableRef.current,
                `tracking_table_${new Date().toISOString().slice(0, 10)}.png`,
              );
          }}
        >
          Export Table Image
        </button>
        <button
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
          onClick={() => {
            if (mapRef.current)
              exportNodeAsPng(
                mapRef.current,
                `tracking_map_${new Date().toISOString().slice(0, 10)}.png`,
              );
          }}
        >
          Export Map Image
        </button>
      </div>
      <div className="mb-4 font-bold text-lg">
        Live GPS Driver Tracking (Mock Map)
      </div>
      <div
        ref={mapRef}
        className="relative w-full h-96 bg-blue-100 rounded-lg flex items-center justify-center"
      >
        {/* Replace this with a real map component */}
        <div className="absolute top-2 left-2 bg-white p-2 rounded shadow text-xs">
          <div className="mb-1 font-semibold">Legend</div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
            On Schedule
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
            Delayed
          </div>
          <div>
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            Critical/Issue
          </div>
        </div>
        {/* Render mock markers */}
        {filtered.map((r, i) => (
          <div
            key={r.driverId}
            className={`absolute z-10 ${statusColors[r.status]} text-white rounded-full flex flex-col items-center justify-center shadow-lg`}
            style={{
              left: `${20 + i * 30}%`,
              top: `${30 + i * 20}px`,
              width: 40,
              height: 40,
            }}
            title={`Driver: ${r.driverName}\nTruck: ${r.truckNumber}\nStatus: ${r.status}`}
          >
            <span className="font-bold">{r.truckNumber}</span>
            <span className="text-xs">{r.status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
      <div className="mt-8" ref={tableRef}>
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
              <tr
                key={r.driverId}
                className={
                  r.status === "critical"
                    ? "bg-red-50"
                    : r.status === "delayed"
                      ? "bg-yellow-50"
                      : "bg-green-50"
                }
              >
                <td className="border px-2 py-1">{r.driverName}</td>
                <td className="border px-2 py-1">{r.truckNumber}</td>
                <td className="border px-2 py-1">{r.trailerNumber}</td>
                <td className="border px-2 py-1 font-bold">
                  {r.status.replace("_", " ")}
                </td>
                <td className="border px-2 py-1">{r.timestamp}</td>
                <td className="border px-2 py-1">{r.speed} mph</td>
                <td className="border px-2 py-1">{r.direction}</td>
                <td className="border px-2 py-1">{r.route}</td>
                <td className="border px-2 py-1">
                  {new Date(r.eta).toLocaleTimeString()}
                </td>
                <td className="border px-2 py-1">{r.loadStatus}</td>
                <td className="border px-2 py-1">{r.customer}</td>
                <td className="border px-2 py-1">{r.jobSite}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-4 text-gray-400">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
