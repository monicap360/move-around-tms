import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type TimelineEvent = {
  id: string;
  timestamp: string;
  driver_name: string;
  load_id: string;
  event: string;
};

export default function Timeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("load_status_history")
        .select("id, timestamp, driver_name, load_id, event")
        .order("timestamp", { ascending: false })
        .limit(10);
      if (error) {
        setError(error.message);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  return (
    <div className="bg-white rounded shadow p-4 mt-4">
      <div className="font-semibold mb-2">Real-Time Timeline</div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : (
        <ul className="space-y-2">
          {events.length === 0 ? (
            <li>No timeline events found.</li>
          ) : (
            events.map((ev) => (
              <li key={ev.id}>
                <span className="text-xs text-gray-500">
                  {new Date(ev.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>{" "}
                {ev.driver_name} {ev.event} Load {ev.load_id}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
