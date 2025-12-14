"use client";

import { useEffect, useState } from "react";

export default function KPIWall() {
  const [kpi, setKpi] = useState<any>(null);

  useEffect(() => {
    fetch("/api/company/kpi")
      .then((r) => r.json())
      .then((d) => setKpi(d));
  }, []);

  if (!kpi) return null;

  return (
    <section className="glass-panel p-6 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-6">
      <KPI label="Total Drivers" value={kpi.drivers} />
      <KPI label="Trucks Active" value={kpi.active_trucks} />
      <KPI label="Loads Today" value={kpi.loads_today} />
      <KPI label="Revenue Today" value={`$${kpi.revenue_today}`} />
    </section>
  );
}

function KPI({ label, value }: any) {
  return (
    <div className="glass-card p-4 text-center rounded-xl">
      <p className="opacity-70 text-sm mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-cyan-300">{value}</h3>
    </div>
  );
}
