"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Card from "@/components/ui/Card";
import { Flame, MapPin, TrendingUp, UserCheck, AlertTriangle, Clock, BarChart2 } from "lucide-react";

export default function AnalyticsDashboard({ params }: any) {
  const org = params.org;
  const [kpis, setKpis] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [lanes, setLanes] = useState<any[]>([]);
  const [scorecards, setScorecards] = useState<any[]>([]);
  const [diffs, setDiffs] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [k, h, l, s, d, a] = await Promise.all([
        fetch(`/api/company/${org}/analytics/kpis`).then(r => r.json()),
        fetch(`/api/company/${org}/analytics/heatmap`).then(r => r.json()),
        fetch(`/api/company/${org}/analytics/lanes`).then(r => r.json()),
        fetch(`/api/company/${org}/analytics/scorecards`).then(r => r.json()),
        fetch(`/api/company/${org}/analytics/diffs`).then(r => r.json()),
        fetch(`/api/company/${org}/analytics/audit`).then(r => r.json()),
      ]);
      setKpis(k); setHeatmap(h); setLanes(l); setScorecards(s); setDiffs(d); setAudit(a);
    }
    load();
  }, [org]);

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics & KPIs" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard icon={<Flame className="w-6 h-6 text-red-600" />} label="Avg Cycle Time" value={kpis?.avg_cycle_time} />
        <KpiCard icon={<TrendingUp className="w-6 h-6 text-green-600" />} label="Profit per Lane" value={kpis?.profit_per_lane} />
        <KpiCard icon={<UserCheck className="w-6 h-6 text-blue-600" />} label="On-Time %" value={kpis?.on_time_pct} />
        <KpiCard icon={<AlertTriangle className="w-6 h-6 text-amber-600" />} label="Exceptions" value={kpis?.exceptions} />
        <KpiCard icon={<Clock className="w-6 h-6 text-gray-600" />} label="Avg Payroll Diff" value={kpis?.payroll_diff} />
      </div>

      {/* Heatmap */}
      <Card>
        <h2 className="font-semibold text-xl mb-4 flex items-center gap-2"><MapPin className="w-5 h-5" /> Cycle Time Heatmap</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left">Yard</th>
                <th className="p-3 text-left">Plant</th>
                <th className="p-3 text-left">Avg Cycle (min)</th>
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{row.yard}</td>
                  <td className="p-3">{row.plant}</td>
                  <td className="p-3 font-bold text-red-600">{row.avg_cycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profitability per Lane */}
      <Card>
        <h2 className="font-semibold text-xl mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Profitability per Lane</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left">Lane</th>
                <th className="p-3 text-left">Profit</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{row.lane}</td>
                  <td className="p-3 font-bold text-green-600">${row.profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Driver Scorecards */}
      <Card>
        <h2 className="font-semibold text-xl mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5" /> Driver Scorecards</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left">Driver</th>
                <th className="p-3 text-left">Late Tickets</th>
                <th className="p-3 text-left">Exceptions</th>
                <th className="p-3 text-left">On-Time %</th>
                <th className="p-3 text-left">Avg Cycle</th>
                <th className="p-3 text-left">Safety Flags</th>
              </tr>
            </thead>
            <tbody>
              {scorecards.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 font-semibold">{row.driver}</td>
                  <td className="p-3 text-red-600">{row.late_tickets}</td>
                  <td className="p-3 text-amber-600">{row.exceptions}</td>
                  <td className="p-3 text-green-600">{row.on_time_pct}%</td>
                  <td className="p-3">{row.avg_cycle}</td>
                  <td className="p-3 text-blue-600">{row.safety_flags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payroll Diff View */}
      <Card>
        <h2 className="font-semibold text-xl mb-4 flex items-center gap-2"><Clock className="w-5 h-5" /> Payroll Diff (Since Last Week)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left">Driver</th>
                <th className="p-3 text-left">Change</th>
                <th className="p-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3 font-semibold">{row.driver}</td>
                  <td className={`p-3 font-bold ${row.change > 0 ? 'text-green-600' : 'text-red-600'}`}>{row.change > 0 ? '+' : ''}{row.change}</td>
                  <td className="p-3">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Audit Log */}
      <Card>
        <h2 className="font-semibold text-xl mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Audit Log</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3 text-left">Timestamp</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{row.timestamp}</td>
                  <td className="p-3">{row.user}</td>
                  <td className="p-3">{row.action}</td>
                  <td className="p-3">{row.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value }: any) {
  return (
    <Card className="p-6 flex flex-col items-start space-y-2">
      {icon}
      <p className="text-gray-500 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value ?? '--'}</p>
    </Card>
  );
}
