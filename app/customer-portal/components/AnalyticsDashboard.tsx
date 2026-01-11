"use client";
import { useEffect, useState } from "react";




export default function AnalyticsDashboard() {
  const [stats, setStats] = useState({
    loads: 0,
    delivered: 0,
    inTransit: 0,
    spend: 0,
    onTime: 0,
    avgRate: 0,
    exceptions: 0
  });
  const [trends, setTrends] = useState([]);

  // Fetch stats/trends from production API or Supabase
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics/customer-dashboard");
        const data = await res.json();
        setStats(data.stats || {});
        setTrends(data.trends || []);
      } catch {
        // fallback: keep zeros
      }
    }
    fetchAnalytics();
  }, []);

  return (
    <div className="bg-white rounded shadow p-6">
      <h2 className="text-xl font-bold mb-4">Analytics Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Loads" value={stats.loads} />
        <StatCard label="Delivered" value={stats.delivered} />
        <StatCard label="In Transit" value={stats.inTransit} />
        <StatCard label="Spend ($)" value={stats.spend.toLocaleString()} />
        <StatCard label="On-Time %" value={stats.onTime + "%"} />
        <StatCard label="Avg Rate ($)" value={stats.avgRate.toLocaleString()} />
        <StatCard label="Exceptions" value={stats.exceptions} />
      </div>
      <h3 className="text-lg font-semibold mb-2">Monthly Trends</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Month</th>
              <th className="p-2 text-left">Loads</th>
              <th className="p-2 text-left">Spend ($)</th>
            </tr>
          </thead>
          <tbody>
            {trends.map(t => (
              <tr key={t.month}>
                <td className="p-2">{t.month}</td>
                <td className="p-2">{t.loads}</td>
                <td className="p-2">{t.spend.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded p-4 text-center shadow-sm">
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
