"use client";
import { useEffect, useState } from "react";

import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";
import DVIRAnalytics from "./DVIRAnalytics";
import DVIRAlerts from "./DVIRAlerts";

export default function DVIRDashboard() {
  const [dvirs, setDvirs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    dateRange: "all",
    truck: "",
    driver: "",
    status: "all"
  });

  useEffect(() => {
    async function fetchDVIRs() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/dvir?limit=100");
        const data = await res.json();
        if (res.ok) {
          setDvirs(data.dvirs || []);
        } else {
          setError(data.error || "Failed to load DVIRs");
        }
      } catch (err) {
        setError("Network error loading DVIRs");
      }
      setLoading(false);
    }
    fetchDVIRs();
  }, []);

  useEffect(() => {
    let result = dvirs;
    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate;
      if (filters.dateRange === "today") {
        startDate = new Date(now); startDate.setHours(0,0,0,0);
      } else if (filters.dateRange === "week") {
        startDate = new Date(now); startDate.setDate(now.getDate()-7);
      } else if (filters.dateRange === "month") {
        startDate = new Date(now); startDate.setMonth(now.getMonth()-1);
      }
      if (startDate) {
        result = result.filter(d => new Date(d.date || d.created_at) >= startDate);
      }
    }
    // Truck filter
    if (filters.truck) {
      result = result.filter(d => (d.truck_number||"").toLowerCase().includes(filters.truck.toLowerCase()));
    }
    // Driver filter
    if (filters.driver) {
      result = result.filter(d => (d.driver_name||"").toLowerCase().includes(filters.driver.toLowerCase()));
    }
    // Status filter
    if (filters.status !== "all") {
      result = result.filter(d => d.overall_status === filters.status);
    }
    setFiltered(result);
  }, [dvirs, filters]);

  const exportCSV = () => {
    const headers = [
      "Date","Driver Name","Truck #","Odometer","Status","Defects","Remarks"
    ];
    const rows = dvirs.map(d => [
      d.date || d.created_at,
      d.driver_name,
      d.truck_number,
      d.odometer_reading,
      d.overall_status,
      (d.inspection_items||[]).filter(i=>i.status==="defective").map(i=>i.item).join("; "),
      d.remarks || ""
    ]);
    const csv = [headers, ...rows].map(r => r.map(x => `"${(x||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dvir_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg flex flex-row items-center justify-between">
          <CardTitle>DVIR Dashboard</CardTitle>
          <button onClick={exportCSV} className="ml-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Export CSV</button>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4">
          {/* Filter UI */}
          <div className="mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold mb-1">Date Range</label>
              <select value={filters.dateRange} onChange={e=>setFilters(f=>({...f,dateRange:e.target.value}))} className="input">
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Truck #</label>
              <input value={filters.truck} onChange={e=>setFilters(f=>({...f,truck:e.target.value}))} className="input" placeholder="Search truck..." />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Driver Name</label>
              <input value={filters.driver} onChange={e=>setFilters(f=>({...f,driver:e.target.value}))} className="input" placeholder="Search driver..." />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Status</label>
              <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="input">
                <option value="all">All</option>
                <option value="satisfactory">Satisfactory</option>
                <option value="defective">Defective</option>
                <option value="defects_corrected">Defects Corrected</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <>
              <DVIRAlerts dvirs={filtered} />
              <DVIRAnalytics dvirs={filtered} />
              <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Driver Name</th>
                      <th className="border px-2 py-1">Truck #</th>
                      <th className="border px-2 py-1">Odometer</th>
                      <th className="border px-2 py-1">Status</th>
                      <th className="border px-2 py-1">Defects</th>
                      <th className="border px-2 py-1">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d, i) => (
                      <tr key={d.id || i} className={d.overall_status === "defective" ? "bg-red-50" : ""}>
                        <td className="border px-2 py-1">{d.date || d.created_at}</td>
                        <td className="border px-2 py-1">{d.driver_name}</td>
                        <td className="border px-2 py-1">{d.truck_number}</td>
                        <td className="border px-2 py-1">{d.odometer_reading}</td>
                        <td className="border px-2 py-1 font-semibold">{d.overall_status}</td>
                        <td className="border px-2 py-1 text-xs">{(d.inspection_items || []).filter(i => i.status === "defective").map(i => i.item).join(", ")}</td>
                        <td className="border px-2 py-1 text-xs">{d.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && <div className="text-center py-8 text-gray-500">No DVIRs found.</div>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
