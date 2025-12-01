"use client";

import { useEffect, useState } from "react";

export default function LoadPlanner() {
  const [recommendations, setRecs] = useState([]);

  useEffect(() => {
    fetch("/api/load/ai-recommendations")
      .then((r) => r.json())
      .then((d) => setRecs(d.recommendations));
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-5 h-[360px]">
      <h2 className="font-semibold text-xl mb-3">AI Load Planner</h2>

      <div className="flex flex-col gap-3">
        {recommendations.map((r, i) => (
          <div key={i} className="glass-card p-3 rounded-lg">
            <p className="font-semibold">{r.load_id}</p>
            <p className="opacity-70 text-sm">{r.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
