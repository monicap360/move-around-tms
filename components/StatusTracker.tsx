import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type LoadStatus = {
  id: string;
  status: string;
  driver_id: string | null;
  driver_name?: string | null;
};

export default function StatusTracker() {
  const [loads, setLoads] = useState<LoadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLoads() {
      setLoading(true);
      setError(null);
      // Fetch loads and join with drivers for driver name
      const { data, error } = await supabase
        .from("loads")
        .select("id, status, driver_id, drivers(name)")
        .order("id", { ascending: false })
        .limit(10);
      if (error) {
        setError(error.message);
        setLoads([]);
      } else {
        // Map driver name from join
        setLoads(
          (data || []).map((l: any) => ({
            id: l.id,
            status: l.status,
            driver_id: l.driver_id,
            driver_name: l.drivers?.name || null,
          })),
        );
      }
      setLoading(false);
    }
    fetchLoads();
  }, []);

  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <div className="font-semibold mb-2">Status Tracker</div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <ul className="space-y-2">
          {loads.length === 0 ? (
            <li>No loads found.</li>
          ) : (
            loads.map((load) => (
              <li key={load.id}>
                <span className="font-bold">Load {load.id}:</span>{" "}
                <span
                  className={
                    load.status === "Acknowledged"
                      ? "bg-green-100 text-green-700 px-2 py-1 rounded"
                      : load.status === "Delivering"
                        ? "bg-yellow-100 text-yellow-700 px-2 py-1 rounded"
                        : "bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  }
                >
                  {load.status}
                </span>
                {load.driver_name && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({load.driver_name})
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
