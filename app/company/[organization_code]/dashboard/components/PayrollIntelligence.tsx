"use client";

import { useEffect, useState } from "react";

export default function PayrollIntelligence() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch("/api/payroll/summary")
      .then((r) => r.json())
      .then((d) => setSummary(d));
  }, []);

  if (!summary) return null;

  return (
    <section className="glass-panel rounded-2xl p-5 h-[360px]">
      <h2 className="font-semibold text-xl mb-3">Payroll Intelligence</h2>

      <p className="text-lg mb-2">
        Weekly Total: {" "}
        <span className="text-cyan-300 font-bold">
          ${summary.weekly_total}
        </span>
      </p>

      <p className="opacity-70 text-sm mb-3">
        Late Tickets: {summary.late_tickets}
      </p>

      <div className="text-cyan-300">
        {summary.ai_notes}
      </div>
    </section>
  );
}
