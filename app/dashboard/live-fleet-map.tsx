"use client";
import { useEffect, useState } from "react";
import { eldProviders } from "../../integrations/eld";

export default function LiveFleetMap() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      // Fetch from all providers (stub)
      const all = await Promise.all(
        eldProviders.map(p => p.fetchDriverLocations())
      );
      setLocations(all.flat());
      setLoading(false);
    }
    fetchAll();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Live Fleet Map (ELD/Telematics)</h1>
      {loading ? (
        <div>Loading driver locations…</div>
      ) : (
        <div className="bg-white rounded shadow p-4">
          {/* TODO: Integrate with a map component (e.g., Mapbox, Google Maps) */}
          <pre>{JSON.stringify(locations, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
