"use client";

import { useEffect, useState } from "react";

export default function Notifications() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const sse = new EventSource("/api/system-events");

    sse.onmessage = (e) => {
      const d = JSON.parse(e.data);
      setEvents((prev) => [d, ...prev]);
    };

    return () => sse.close();
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-5">
      <h2 className="font-semibold text-xl mb-3">System Notifications</h2>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {events.map((e, i) => (
          <div key={i} className="glass-card p-3 rounded-lg text-sm">
            <p className="font-semibold">{e.title}</p>
            <p className="opacity-70">{e.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
