"use client";
import { useEffect, useState } from "react";

export default function FleetLiveMap({ manager }) {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    // Simulate fetching truck locations
    setLocations([
      { id: 1, name: "Truck 101", lat: 29.76, lng: -95.36 },
      { id: 2, name: "Truck 202", lat: 29.78, lng: -95.34 },
    ]);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Fleet Live Map</h2>
      <div className="space-y-2">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-blue-900 text-blue-200 p-2 rounded">
            {loc.name}: {loc.lat}, {loc.lng}
          </div>
        ))}
      </div>
    </div>
  );
}
