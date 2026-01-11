"use client";
import { useEffect, useState } from "react";

export default function FleetKPIs({ manager }) {
  const [kpis, setKpis] = useState({
    totalMiles: 12000,
    avgFuel: 7.2,
    onTime: 98,
    incidents: 1,
  });

  useEffect(() => {
    // Simulate fetching KPIs
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Fleet KPIs</h2>
      <div>
        Total Miles: <b>{kpis.totalMiles}</b>
      </div>
      <div>
        Avg Fuel Economy: <b>{kpis.avgFuel} mpg</b>
      </div>
      <div>
        On-Time %: <b>{kpis.onTime}%</b>
      </div>
      <div>
        Incidents: <b>{kpis.incidents}</b>
      </div>
    </div>
  );
}
