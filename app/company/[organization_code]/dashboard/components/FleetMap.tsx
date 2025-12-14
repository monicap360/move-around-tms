"use client";

import { useEffect, useState } from "react";

export default function FleetMap() {
  const [units, setUnits] = useState([]);

  useEffect(() => {
    const sse = new EventSource("/api/fleet/map-stream");

    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setUnits(data.units);
    };

    return () => sse.close();
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-5 h-[480px] relative">
      <h2 className="font-semibold text-xl mb-3">Fleet Map</h2>
      <div className="text-sm opacity-70 mb-2">Live Telematics Feed</div>

      {/* Map placeholder - you can embed Mapbox later */}
      <div className="bg-black/20 w-full h-full rounded-xl relative overflow-hidden">
        {units.map((u, i) => (
          <div
            key={i}
            className="absolute text-cyan-300 text-xs"
            style={{
              top: `${u.lat}%`,
              left: `${u.lng}%`,
            }}
          >
            🚚 {u.driver_name}
          </div>
        ))}
      </div>
    </section>
  );
}
