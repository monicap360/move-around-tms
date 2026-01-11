"use client";
import { useEffect, useState } from "react";

const mockStats = {
  loads: 128,
  delivered: 120,
  inTransit: 6,
  spend: 245000,
  onTime: 97,
  avgRate: 2100,
  exceptions: 2
};

const mockTrends = [
  { month: "Jan", loads: 10, spend: 18000 },
  { month: "Feb", loads: 12, spend: 20000 },
  { month: "Mar", loads: 14, spend: 22000 },
  { month: "Apr", loads: 13, spend: 21000 },
  { month: "May", loads: 15, spend: 25000 },
  { month: "Jun", loads: 16, spend: 26000 },
  { month: "Jul", loads: 18, spend: 28000 },
  { month: "Aug", loads: 20, spend: 30000 },
  { month: "Sep", loads: 12, spend: 19000 },
  { month: "Oct", loads: 10, spend: 17000 },
  { month: "Nov", loads: 8, spend: 14000 },
  { month: "Dec", loads: 10, spend: 16000 }
];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(mockStats);
  const [trends, setTrends] = useState(mockTrends);

  // In production, fetch stats/trends from backend or Supabase
  useEffect(() => {
    // setStats(...)
    // setTrends(...)
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
