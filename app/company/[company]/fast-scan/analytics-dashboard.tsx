"use client";
import { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import jsPDF from "jspdf";

interface Scan {
  id: string;
  organizationId: string;
  ticketId: string;
  documentId: string;
  createdAt: string;
  status: string;
  resultId?: string;
  driverId?: string;
  truckId?: string;
  material?: string;
  netWeight?: string;
  customer?: string;
  job?: string;
  timestamp?: string;
  pitName?: string;
  notes?: string;
  referenceNumber?: string;
}



export default function FastScanAnalyticsDashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScans() {
      setLoading(true);
      try {
        const res = await fetch("/api/fastscan/list");
        const data = await res.json();
        setScans(Array.isArray(data.scans) ? data.scans : []);
      } catch {
        setScans([]);
      }
      setLoading(false);
    }
    fetchScans();
  }, []);

  // Analytics calculations (guarded)
  const totalTickets = scans.length;
  const customerStats = scans.length ? Array.from(new Set(scans.map(s => s.customer || 'Unknown'))).map(customer => {
    const custTickets = scans.filter(s => (s.customer || 'Unknown') === customer);
    return {
      customer,
      tickets: custTickets.length,
      revenue: custTickets.length * 250,
      violations: custTickets.filter(s => s.status === "violation" || s.status === "failed").length,
    };
  }).sort((a, b) => b.tickets - a.tickets) : [];

  const jobStats = scans.length ? Array.from(new Set(scans.map(s => s.job || 'Unknown'))).map(job => {
    const jobTickets = scans.filter(s => (s.job || 'Unknown') === job);
    return {
      job,
      tickets: jobTickets.length,
      revenue: jobTickets.length * 250,
      violations: jobTickets.filter(s => s.status === "violation" || s.status === "failed").length,
    };
  }).sort((a, b) => b.tickets - a.tickets) : [];


  // Top/bottom drivers, customers, jobs (from real data)
  // (Optional: implement if needed for dashboard UI)
  const totalDrivers = new Set(scans.map(s => s.driverId)).size;
  const totalNetWeight = scans.reduce((sum, s) => sum + (parseFloat(s.netWeight || "0") || 0), 0);
  const violations = scans.filter(s => s.status === "violation" || s.status === "failed").length;
  const needsReview = scans.filter(s => s.status === "needs_review" || s.status === "pending").length;
  const clear = scans.filter(s => s.status === "clear" || s.status === "processed").length;

  // Revenue/profit summary (calculated from real tickets)
  // TODO: Replace with actual revenue/cost fields if available in Scan
  const totalRevenue = scans.reduce((sum, s) => sum + (parseFloat(s.netWeight || "0") * 1.0 || 250), 0); // fallback $250 if no netWeight
  const totalProfit = totalRevenue - (totalTickets * 50); // Placeholder: $50 cost per ticket, update if real cost data available

  // Driver performance

  // Risk/violation trends by week
  const weekMap = new Map();
  scans.forEach(s => {
    const week = new Date(s.createdAt).toISOString().slice(0, 10);
    if (!weekMap.has(week)) weekMap.set(week, { total: 0, violations: 0 });
    weekMap.get(week).total++;
    if (s.status === "violation" || s.status === "failed") weekMap.get(week).violations++;
  });
  const weekLabels = Array.from(weekMap.keys()).sort();
  heatmapWeeks = weekLabels;
  heatmapDrivers = Object.keys(riskHeatmap);
  const weekTotals = weekLabels.map(w => weekMap.get(w).total);
  const weekViolations = weekLabels.map(w => weekMap.get(w).violations);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Fast Scan Analytics Dashboard</h1>
      {loading ? (
        <div>Loading analytics…</div>
      ) : (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold">{totalTickets}</div>
            <div className="text-gray-500 mt-1">Total Tickets</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold">{totalDrivers}</div>
            <div className="text-gray-500 mt-1">Drivers</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold">{totalNetWeight.toLocaleString()}</div>
            <div className="text-gray-500 mt-1">Total Net Weight</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold text-green-700">${totalRevenue.toLocaleString()}</div>
            <div className="text-gray-500 mt-1">Total Revenue</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold text-blue-700">${totalProfit.toLocaleString()}</div>
            <div className="text-gray-500 mt-1">Estimated Profit</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold text-red-600">{violations}</div>
            <div className="text-gray-500 mt-1">Violations</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold text-yellow-600">{needsReview}</div>
            <div className="text-gray-500 mt-1">Needs Review</div>
          </div>
          <div className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="text-3xl font-bold text-green-600">{clear}</div>
            <div className="text-gray-500 mt-1">Clear</div>
          </div>
        </div>

        {/* Risk/Violation Trends Chart */}
        <div className="bg-white rounded shadow p-6 mb-8">
          <h2 className="text-lg font-bold mb-2">Risk/Violation Trends</h2>
          <Line
            data={{
              labels: weekLabels,
              datasets: [
                { label: 'Total Tickets', data: weekTotals, borderColor: 'rgba(59,130,246,1)', backgroundColor: 'rgba(59,130,246,0.1)', fill: true },
                { label: 'Violations', data: weekViolations, borderColor: 'rgba(239,68,68,1)', backgroundColor: 'rgba(239,68,68,0.1)', fill: true },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
          />
        </div>
        {/* Customer Breakdown Table */}
        <div className="bg-white rounded shadow p-6 mb-8">
          <h2 className="text-lg font-bold mb-2">Customer Breakdown</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">Customer</th>
                <th className="px-2 py-1">Tickets</th>
                <th className="px-2 py-1">Violations</th>
                <th className="px-2 py-1">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {customerStats.map(c => (
                <tr key={c.customer} className="border-b">
                  <td className="px-2 py-1 font-mono">{c.customer}</td>
                  <td className="px-2 py-1">{c.tickets}</td>
                  <td className="px-2 py-1 text-red-600">{c.violations}</td>
                  <td className="px-2 py-1">${c.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Job Breakdown Table */}
        <div className="bg-white rounded shadow p-6 mb-8">
          <h2 className="text-lg font-bold mb-2">Job Breakdown</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">Job</th>
                <th className="px-2 py-1">Tickets</th>
                <th className="px-2 py-1">Violations</th>
                <th className="px-2 py-1">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {jobStats.map(j => (
                <tr key={j.job} className="border-b">
                  <td className="px-2 py-1 font-mono">{j.job}</td>
                  <td className="px-2 py-1">{j.tickets}</td>
                  <td className="px-2 py-1 text-red-600">{j.violations}</td>
                  <td className="px-2 py-1">${j.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk Heatmap */}
        <div className="bg-white rounded shadow p-6 mb-8 overflow-x-auto">
          <h2 className="text-lg font-bold mb-2">Risk Heatmap (Driver x Week)</h2>
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="px-1 py-1">Driver</th>
                {heatmapWeeks.map(week => (
                  <th key={week} className="px-1 py-1">{week}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapDrivers.map(driver => (
                <tr key={driver}>
                  <td className="px-1 py-1 font-mono">{driver}</td>
                  {heatmapWeeks.map(week => (
                    <td key={week} className={`px-1 py-1 ${riskHeatmap[driver][week] ? 'bg-red-200' : ''}`}>{riskHeatmap[driver][week] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actionable Insights */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <h2 className="text-lg font-bold mb-2">Actionable Insights</h2>
          <ul className="list-disc ml-6 text-base">
            <li>Top 3 Drivers (by tickets): {topDrivers.map(d => d.driverId).join(', ')}</li>
            <li>Drivers with Most Violations: {driverStats.sort((a,b)=>b.violations-a.violations).slice(0,3).map(d=>d.driverId).join(', ')}</li>
            <li>Top Customers: {topCustomers.map(c => c.customer).join(', ')}</li>
            <li>Top Jobs: {topJobs.map(j => j.job).join(', ')}</li>
            <li>Biggest Revenue Source: {topCustomers[0]?.customer || 'N/A'}</li>
            <li>Unusual Risk Spikes: {weekLabels.filter((w,i)=>weekViolations[i]>2).join(', ') || 'None'}</li>
          </ul>
        </div>

        {/* Export Analytics as PDF */}
        <div className="flex gap-4 justify-end">
          <button
            className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded shadow"
            onClick={() => {
              const headers = ['Driver','Tickets','Violations','Revenue'];
              const rows = driverStats.map(d => [d.driverId, d.tickets, d.violations, d.revenue]);
              const csvContent = [headers, ...rows].map(r => r.map(String).map(x => '"'+x.replace(/"/g,'""')+'"').join(',')).join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'driver_performance.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export Driver Performance (CSV)
          </button>
          <button
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded shadow"
            onClick={() => {
              const doc = new jsPDF();
              doc.text('Fast Scan Analytics Report', 10, 10);
              doc.text('Total Tickets: ' + totalTickets, 10, 20);
              doc.text('Total Revenue: $' + totalRevenue.toLocaleString(), 10, 30);
              doc.text('Top Drivers: ' + topDrivers.map(d=>d.driverId).join(', '), 10, 40);
              doc.text('Top Customers: ' + topCustomers.map(c=>c.customer).join(', '), 10, 50);
              doc.save('fastscan_analytics_report.pdf');
            }}
          >
            Export Analytics (PDF)
          </button>
        </div>

        {/* Driver Performance Table */}
        <div className="bg-white rounded shadow p-6 mb-8">
          <h2 className="text-lg font-bold mb-2">Driver Performance</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">Driver</th>
                <th className="px-2 py-1">Tickets</th>
                <th className="px-2 py-1">Violations</th>
                <th className="px-2 py-1">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {driverStats.map(d => (
                <tr key={d.driverId} className="border-b">
                  <td className="px-2 py-1 font-mono">{d.driverId}</td>
                  <td className="px-2 py-1">{d.tickets}</td>
                  <td className="px-2 py-1 text-red-600">{d.violations}</td>
                  <td className="px-2 py-1">${d.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Export Analytics as CSV */}
        <div className="flex justify-end">
          <button
            className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded shadow"
            onClick={() => {
              const headers = ['Driver','Tickets','Violations','Revenue'];
              const rows = driverStats.map(d => [d.driverId, d.tickets, d.violations, d.revenue]);
              const csvContent = [headers, ...rows].map(r => r.map(String).map(x => '"'+x.replace(/"/g,'""')+'"').join(',')).join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'driver_performance.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            Export Driver Performance (CSV)
          </button>
        </div>
        </>
      )}
    </div>
  );
}
