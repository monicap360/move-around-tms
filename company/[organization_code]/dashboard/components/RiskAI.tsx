"use client";

import { useEffect, useState } from "react";

export default function RiskAI() {
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    fetch("/api/risk/ai")
      .then((r) => r.json())
      .then((d) => setRisks(d.risks));
  }, []);

  return (
    <section className="glass-panel rounded-2xl p-5 h-[360px]">
      <h2 className="font-semibold text-xl mb-3">Risk AI</h2>

      <div className="flex flex-col gap-3">
        {risks.map((r, i) => (
          <div key={i} className="glass-card p-3 rounded-lg">
            <p className="font-semibold">{r.driver_name}</p>
            <p className="text-sm opacity-70">
              {r.ai_reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
