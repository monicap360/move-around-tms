"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TrackingUpdate {
  id: string;
  status: string;
  location?: string;
  notes?: string;
  created_at: string;
}

export default function TrackingPage() {
  const [updates, setUpdates] = useState<TrackingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [location, setLocation] = useState("");
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  useEffect(() => {
    loadUpdates();
  }, []);

  async function loadUpdates() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracking/updates", { cache: "no-store" });
      const data = await res.json();
      setUpdates(data.updates || []);
    } catch (error) {
      console.error("Failed to load tracking updates", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUpdate() {
    if (!status || !location) return;
    try {
      const res = await fetch("/api/tracking/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, location }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add update");
      }
      setStatus("");
      setLocation("");
      await loadUpdates();
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-space-deep p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary uppercase tracking-wider">
            Real-Time Tracking
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Live status updates across active loads.
          </p>
        </div>

        {demoMode && (
          <div className="p-4 rounded border border-orange-400 bg-orange-50 text-orange-700 text-sm">
            Demo mode is enabled. Updates are not saved.
          </div>
        )}

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Post Update
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-wrap gap-4">
            <Input
              placeholder="Status (e.g., In Transit)"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="max-w-sm"
            />
            <Input
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleAddUpdate} disabled={demoMode}>
              Add Update
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-space-panel border-space-border">
          <CardHeader className="border-b border-space-border">
            <CardTitle className="text-text-primary text-sm uppercase tracking-wider">
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-text-secondary">Loading...</div>
            ) : updates.length === 0 ? (
              <div className="text-text-secondary">No updates yet.</div>
            ) : (
              <div className="space-y-3">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 rounded border border-space-border bg-space-surface"
                  >
                    <div>
                      <div className="text-text-primary font-medium">{update.status}</div>
                      <div className="text-text-secondary text-xs">
                        {update.location || "Unknown location"}
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(update.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
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
