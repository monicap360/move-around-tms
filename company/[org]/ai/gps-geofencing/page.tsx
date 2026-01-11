"use client";

import { useEffect, useState } from "react";
import { MapPin, Truck, Globe, RefreshCcw } from "lucide-react";
import Card from "@/components/ui/Card";

export default function AIGPSGeofencing({ params }: any) {
  const org = params.org;
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLocations() {
    setLoading(true);
    const res = await fetch(`/api/company/${org}/ai/gps-geofencing`);
    const data = await res.json();
    setLocations(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchLocations();
  }, [org]);

  return (
    <div className="p-8 space-y-8 bg-[#0e1116] min-h-screen text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Globe className="w-8 h-8 text-blue-400" /> Real-time GPS & Geofencing
        </h1>
        <button
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 shadow-lg"
          onClick={fetchLocations}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="min-h-[300px] flex justify-center items-center text-blue-400">
          <RefreshCcw className="w-10 h-10 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {locations.map((loc: any, i: number) => (
            <Card
              key={i}
              className="bg-white/5 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-lg hover:bg-white/10 transition text-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-6 h-6 text-green-300" />
                <span className="font-bold text-lg">
                  Truck #{loc.truck_number}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-blue-300" />
                <span className="text-sm">Location:</span>
                <span className="font-bold text-xl text-blue-200">
                  {loc.location}
                </span>
              </div>
              <div className="text-gray-300 text-sm mt-2">
                <span className="font-semibold">Geofence:</span>{" "}
                {loc.geofence_status}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                Last Update: {loc.last_update}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
