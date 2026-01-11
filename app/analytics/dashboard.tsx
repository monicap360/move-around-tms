"use client";

import { useEffect, useState } from "react";
import { fetchAnalyticsEvents } from "../../analytics/supabase";
import { AnalyticsEvent } from "../../analytics/analytics.types";
import { PieChart } from "../../analytics/charts";

export default function AnalyticsDashboard() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  // KPI calculations
  const kpi = {
    logins: events.filter((e) => e.type === "login").length,
    payments: events.filter((e) => e.type === "payment").length,
    fleetUpdates: events.filter((e) => e.type === "fleet_update").length,
    onboarding: events.filter((e) => e.type === "onboarding_step").length,
    errors: events.filter((e) => e.type === "error").length,
  };

  // Chart data (example: events by type)
  const eventTypeCounts = [
    "login",
    "payment",
    "fleet_update",
    "onboarding_step",
    "error",
  ].map((type) => events.filter((e) => e.type === type).length);
  const pieData = {
    labels: ["Login", "Payment", "Fleet", "Onboarding", "Error"],
    datasets: [
      {
        data: eventTypeCounts,
        backgroundColor: [
          "#2563eb",
          "#059669",
          "#f59e42",
          "#fbbf24",
          "#ef4444",
        ],
      },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
      {loading ? (
        <div>Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-gray-500">No analytics events found.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded shadow text-center">
              <div className="text-3xl font-bold">{kpi.logins}</div>
              <div className="text-gray-600">Logins</div>
            </div>
            <div className="bg-green-50 p-4 rounded shadow text-center">
              <div className="text-3xl font-bold">{kpi.payments}</div>
              <div className="text-gray-600">Payments</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded shadow text-center">
              <div className="text-3xl font-bold">{kpi.fleetUpdates}</div>
              <div className="text-gray-600">Fleet Updates</div>
            </div>
            <div className="bg-orange-50 p-4 rounded shadow text-center">
              <div className="text-3xl font-bold">{kpi.onboarding}</div>
              <div className="text-gray-600">Onboarding Steps</div>
            </div>
            <div className="bg-red-50 p-4 rounded shadow text-center col-span-2">
              <div className="text-3xl font-bold">{kpi.errors}</div>
              <div className="text-gray-600">Errors</div>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Event Distribution</h2>
            <PieChart data={pieData} />
          </div>
          <div className="bg-white rounded shadow p-4 mb-8">
            <h2 className="font-semibold mb-2">AI-Driven Recommendations</h2>
            <ul className="list-disc pl-6">
              <li>Optimize driver assignments for high-profit routes</li>
              <li>Reduce risk by flagging outlier loads</li>
              <li>Improve retention with targeted incentives</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
