"use client";

import { useEffect, useState } from "react";

export default function PlantReconciliation({ params }: any) {
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetch("./api/reconcile")
      .then((r) => r.json())
      .then((d) => setResults(d));
  }, []);

  if (!results) return <div>Loading...</div>;

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold text-cyan-300 mb-6">
        Reconciliation Report
      </h1>

      <section className="glass-panel p-6 rounded-2xl">
        <h2 className="text-xl font-semibold mb-4">
          Summary
        </h2>

        <p>Plant Tickets: {results.plant_count}</p>
        <p>Driver Tickets: {results.driver_count}</p>
        <p>Matched: {results.matched}</p>
        <p>Missing: {results.missing}</p>
        <p>Mismatched Weights: {results.weights}</p>
        <p>Rate Variances: {results.rate_variances}</p>
      </section>

      <section className="mt-10 glass-panel p-6 rounded-2xl">
        <h2 className="text-xl">Detailed Issues</h2>
        {results.issues.map((i: any, idx: number) => (
          <div key={idx} className="glass-card p-3 rounded-lg mt-3">
            <p className="font-semibold">{i.ticket}</p>
            <p className="opacity-70">{i.reason}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
