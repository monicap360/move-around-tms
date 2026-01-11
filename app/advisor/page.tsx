// app/advisor/page.tsx
"use client";
import { useEffect, useState } from "react";

function statusColor(status: string) {
  switch ((status || "").toLowerCase()) {
    case "hot":
      return "bg-red-100 text-red-700";
    case "warm":
      return "bg-yellow-100 text-yellow-700";
    case "cold":
      return "bg-gray-200 text-gray-700";
    case "new":
      return "bg-blue-100 text-blue-700";
    case "sold":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-blue-200 text-blue-800";
    case "dead lead":
      return "bg-gray-400 text-white";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AdvisorPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("7");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/advisor/leads?search=${encodeURIComponent(search)}&status=${status}&date=${date}&page=${page}`,
    )
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.leads || []);
        setSummary(data.summary || {});
        setTotalPages(data.totalPages || 1);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load leads");
        setLoading(false);
      });
  }, [search, status, date, page]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Advisor Leads Dashboard</h1>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Total Leads</div>
          <div className="text-2xl font-bold">{summary.total ?? "-"}</div>
        </div>
        <div className="bg-red-50 rounded shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Hot</div>
          <div className="text-2xl font-bold text-red-600">
            {summary.hot ?? "-"}
          </div>
        </div>
        <div className="bg-yellow-50 rounded shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Warm</div>
          <div className="text-2xl font-bold text-yellow-600">
            {summary.warm ?? "-"}
          </div>
        </div>
        <div className="bg-gray-100 rounded shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Cold</div>
          <div className="text-2xl font-bold text-gray-700">
            {summary.cold ?? "-"}
          </div>
        </div>
        <div className="bg-blue-50 rounded shadow p-4 text-center">
          <div className="text-gray-500 text-sm">Leads This Week</div>
          <div className="text-2xl font-bold text-blue-600">
            {summary.thisWeek ?? "-"}
          </div>
        </div>
      </div>
      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="border rounded px-3 py-2"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="new">New</option>
        </select>
        <select
          className="border rounded px-3 py-2"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="all">All Dates</option>
        </select>
      </div>
      {/* Data Table */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Override/Trial</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead: any) => (
                <tr key={lead.id + "-" + lead.source}>
                  <td className="p-3">{lead.name || "-"}</td>
                  <td className="p-3">{lead.phone || "-"}</td>
                  <td className="p-3">{lead.email || "-"}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColor(lead.status)}`}
                    >
                      {lead.status || "New"}
                    </span>
                  </td>
                  <td className="p-3">{lead.source}</td>
                  <td className="p-3">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-3">
                    {lead.override_status === "trial" && (
                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                        Trial
                      </span>
                    )}
                    {lead.override_status === "override" && (
                      <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold">
                        Override
                      </span>
                    )}
                    {lead.override_status === "permanent" && (
                      <span className="inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                        Permanent
                      </span>
                    )}
                    {!lead.override_status && (
                      <span className="inline-block bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">
                        -
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          className="px-3 py-1 rounded border bg-gray-50 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={`px-3 py-1 rounded border ${p === page ? "bg-blue-100 border-blue-400 font-bold" : "bg-white"}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="px-3 py-1 rounded border bg-gray-50 disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
