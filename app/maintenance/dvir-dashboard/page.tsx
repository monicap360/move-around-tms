"use client";

import { useEffect, useState } from "react";
import { validateDVIR } from "../../../lib/complianceRules";
import ComplianceCalendar from "./ComplianceCalendar";
import { logAuditAction } from "../../../lib/auditLog";

import { Card, CardHeader, CardContent, CardTitle } from "../../components/ui/card";
import DVIRAnalytics from "./DVIRAnalytics";
import PredictiveAnalytics from "./PredictiveAnalytics";
import DVIRAlerts from "./DVIRAlerts";

import { useSession } from "next-auth/react";

export default function DVIRDashboard() {
  const [dvirs, setDvirs] = useState([]);
    // Optionally get user info for audit log (stub, replace with real auth if available)
    // If using next-auth, uncomment:
    // const { data: session } = useSession();
    // const userId = session?.user?.id || null;
    const userId = null; // Replace with real user id if available
  const [filtered, setFiltered] = useState([]);
  const [complianceMap, setComplianceMap] = useState({});
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  type Filters = {
    dateRange: string;
    truck: string;
    driver: string;
    status: string;
    compliance: string;
  };
  const [filters, setFilters] = useState<Filters>({
    dateRange: "all",
    truck: "",
    driver: "",
    status: "all",
    compliance: "all"
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
    // Log dashboard view action
    logAuditAction({
      userId,
      action: "view_dashboard",
      details: { page: "DVIRDashboard", timestamp: new Date().toISOString() },
    });
  }, []);

  // Compute compliance for each DVIR (assume dvir.state or fallback to 'federal')
  useEffect(() => {
    const map = {};
    const calMap = {};
    dvirs.forEach(dvir => {
      const state = dvir.state || "federal";
      const compliance = validateDVIR(
        {
          ...dvir,
          company: dvir.company,
          date: dvir.date || dvir.created_at,
          truckNumber: dvir.truck_number,
          odometer: dvir.odometer_reading,
          driverName: dvir.driver_name,
          driverSignature: dvir.driver_signature,
          inspection: dvir.inspection_items?.reduce((acc, item) => {
            acc[item.item] = item.status;
            return acc;
          }, {}) || {},
          lastInspectionDate: dvir.lastInspectionDate
        },
        state
      );
      map[dvir.id] = compliance;
      // Calendar aggregation by date
      const dateKey = (dvir.date || dvir.created_at).slice(0,10);
      if (!calMap[dateKey]) calMap[dateKey] = { date: dateKey, compliant: 0, noncompliant: 0, total: 0 };
      const isCompliant = compliance.missingFields.length === 0 && compliance.invalidDefects.length === 0 && compliance.intervalOk;
      if (isCompliant) calMap[dateKey].compliant++;
      else calMap[dateKey].noncompliant++;
      calMap[dateKey].total++;
    });
    setComplianceMap(map);
    // Convert calMap to sorted array for calendar
    const arr = Object.values(calMap).sort((a,b)=>a.date.localeCompare(b.date));
    setCalendarData(arr);
  }, [dvirs]);

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
    // Compliance filter (optional, for future UI)
    if (filters.compliance && filters.compliance !== "all") {
      result = result.filter(d => {
        const c = complianceMap[d.id];
        if (!c) return false;
        if (filters.compliance === "compliant") {
          return c.missingFields.length === 0 && c.invalidDefects.length === 0 && c.intervalOk;
        } else if (filters.compliance === "noncompliant") {
          return c.missingFields.length > 0 || c.invalidDefects.length > 0 || !c.intervalOk;
        }
        return true;
      });
    }
    setFiltered(result);
  }, [dvirs, filters, complianceMap]);

  const exportCSV = () => {
    logAuditAction({
      userId,
      action: "export_dvir_csv",
      details: { count: dvirs.length, timestamp: new Date().toISOString() },
    });
    const headers = [
      "Date","Driver Name","Truck #","Odometer","Status","Defects","Remarks","Compliance Status","Missing Fields","Invalid Defects","Interval OK"
    ];
    const rows = dvirs.map(d => {
      const c = complianceMap[d.id] || {missingFields:[],invalidDefects:[],intervalOk:true};
      return [
        d.date || d.created_at,
        d.driver_name,
        d.truck_number,
        d.odometer_reading,
        d.overall_status,
        (d.inspection_items||[]).filter(i=>i.status==="defective").map(i=>i.item).join("; "),
        d.remarks || "",
        (c.missingFields.length === 0 && c.invalidDefects.length === 0 && c.intervalOk) ? "Compliant" : "Noncompliant",
        c.missingFields.join("; "),
        c.invalidDefects.join("; "),
        c.intervalOk ? "Yes" : "No"
      ];
    });
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
            <div>
              <label className="block text-xs font-semibold mb-1">Compliance Status</label>
              <select value={filters.compliance} onChange={e=>setFilters(f=>({...f,compliance:e.target.value}))} className="input">
                <option value="all">All</option>
                <option value="compliant">Compliant</option>
                <option value="noncompliant">Noncompliant</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <>
              <PredictiveAnalytics dvirs={filtered} />
              <DVIRAlerts dvirs={filtered} />
              <DVIRAnalytics dvirs={filtered} />
              <div className="my-8">
                <ComplianceCalendar data={calendarData} onDayClick={date => {
                  // Optionally filter table to that date
                  setFilters(f => ({ ...f, dateRange: "all" }));
                  setFiltered(dvirs.filter(d => (d.date || d.created_at).slice(0,10) === date));
                }} />
              </div>
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
                      <th className="border px-2 py-1">Compliance</th>
                      <th className="border px-2 py-1">Missing Fields</th>
                      <th className="border px-2 py-1">Invalid Defects</th>
                      <th className="border px-2 py-1">Interval OK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d, i) => {
                      const c = complianceMap[d.id] || {missingFields:[],invalidDefects:[],intervalOk:true};
                      const compliant = c.missingFields.length === 0 && c.invalidDefects.length === 0 && c.intervalOk;
                      return (
                        <tr key={d.id || i} className={compliant ? "bg-green-50" : "bg-red-50"}>
                          <td className="border px-2 py-1">{d.date || d.created_at}</td>
                          <td className="border px-2 py-1">{d.driver_name}</td>
                          <td className="border px-2 py-1">{d.truck_number}</td>
                          <td className="border px-2 py-1">{d.odometer_reading}</td>
                          <td className="border px-2 py-1 font-semibold">{d.overall_status}</td>
                          <td className="border px-2 py-1 text-xs">{(d.inspection_items || []).filter(i => i.status === "defective").map(i => i.item).join(", ")}</td>
                          <td className="border px-2 py-1 text-xs">{d.remarks}</td>
                          <td className={
                            "border px-2 py-1 font-bold " +
                            (compliant ? "text-green-700" : "text-red-700")
                          }>{compliant ? "Compliant" : "Noncompliant"}</td>
                          <td className="border px-2 py-1 text-xs">{c.missingFields.join(", ")}</td>
                          <td className="border px-2 py-1 text-xs">{c.invalidDefects.join(", ")}</td>
                          <td className="border px-2 py-1 text-xs">{c.intervalOk ? "Yes" : "No"}</td>
                        </tr>
                      );
                    })}
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
