"use client";

import React, { useEffect, useState } from "react";
import {
  Truck,
  Clock,
  MapPin,
  Gauge,
  Activity,
  Loader2,
  Navigation,
  Brain,
  Users,
} from "lucide-react";

export default function LoadBoardPage({ params }: any) {
  const { org } = params;

  const [loads, setLoads] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingLoad, setDraggingLoad] = useState<any>(null);

  async function loadData() {
    setLoading(true);
    const loadsRes = await fetch(`/api/company/${org}/loads/pending`);
    const driversRes = await fetch(`/api/company/${org}/drivers/available`);

    setLoads(await loadsRes.json());
    setDrivers(await driversRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function assign(load_id: string, driver_id: string) {
    await fetch(`/api/company/${org}/dispatch/assign`, {
      method: "POST",
      body: JSON.stringify({ load_id, driver_id }),
    });
    loadData();
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Navigation className="w-10 h-10 text-blue-400" />
          Tesla Dispatch Console
        </h1>

        <button
          onClick={() =>
            fetch(`/api/company/${org}/dispatch/auto-assign`, {
              method: "POST",
            }).then(loadData)
          }
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"
        >
          <Brain className="w-5 h-5" />
          Auto-Assign All Loads
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {/* LOADS LIST */}
          <div>
            <h2 className="text-2xl mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-300" />
              Loads Waiting
            </h2>

            <div className="space-y-4">
              {loads.map((load) => (
                <div
                  key={load.id}
                  draggable
                  onDragStart={() => setDraggingLoad(load)}
                  className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition cursor-grab"
                >
                  <div className="flex justify-between">
                    <h3 className="text-xl font-semibold">
                      Load #{load.id.substring(0, 6)}
                    </h3>
                    <span className="text-sm text-blue-300">
                      {load.material}
                    </span>
                  </div>

                  <p className="text-gray-400 mt-1 text-sm flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {load.origin} →{" "}
                    {load.destination}
                  </p>

                  <div className="mt-3 grid grid-cols-3 text-sm text-gray-300">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {load.eta} ETA
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-4 h-4" />
                      {load.weight} tons
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />P{load.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DRIVERS LIST */}
          <div>
            <h2 className="text-2xl mb-4 flex items-center gap-2">
              <Truck className="w-6 h-6 text-green-300" />
              Available Drivers
            </h2>

            <div className="space-y-4">
              {drivers.map((driver) => (
                <div
                  key={driver.driver_uuid}
                  onDrop={() => {
                    if (draggingLoad) {
                      assign(draggingLoad.id, driver.driver_uuid);
                      setDraggingLoad(null);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition"
                >
                  <div className="flex justify-between">
                    <h3 className="text-xl font-semibold">{driver.name}</h3>
                    <span className="text-sm text-green-300">
                      Truck {driver.truck_number}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mt-1">
                    Hours Left: {driver.hours_left}
                  </p>

                  <div className="grid grid-cols-2 text-sm text-gray-300 mt-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {driver.current_yard}
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-4 h-4" />
                      {driver.distance_to_load} miles
                    </span>
                  </div>

                  <p className="text-blue-300 text-xs mt-3">
                    AI Fit Score: {driver.fit_score}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
