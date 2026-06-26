// app/advisor-dashboard/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ----------------------
// SUPABASE CLIENT
// ----------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ----------------------
// HELPERS
// ----------------------
function getLeadStatus(lead: any) {
  return lead?.status?.toLowerCase() || "new";
}

function getStatusColor(status: string) {
  switch ((status || "").toLowerCase()) {
    case "hot":
      return "#ff7875";
    case "warm":
      return "#ffd666";
    case "cold":
      return "#b5b5b5";
    case "new":
      return "#bae7ff";
    case "sold":
      return "#52c41a";
    case "pending":
      return "#1890ff";
    case "dead lead":
      return "#8c8c8c";
    default:
      return "#d9d9d9";
  }
}

// ----------------------
// MAIN COMPONENT
// ----------------------
export default function AdvisorDashboard() {
  const [agentLeads, setAgentLeads] = useState<any[]>([]);
  const [publicLeads, setPublicLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("7");
  const [page, setPage] = useState(1);
  const [showTable, setShowTable] = useState<"agent" | "public">("agent");

  const pageSize = 25;

  // ----------------------
  // FETCH LEADS
  // ----------------------
  useEffect(() => {
    async function fetchLeads() {
      setLoading(true);

      const [agentRes, publicRes] = await Promise.all([
        supabase
          .from("agent_leads")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("public_leads")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (!agentRes.error) setAgentLeads(agentRes.data || []);
      if (!publicRes.error) setPublicLeads(publicRes.data || []);

      setLoading(false);
    }

    fetchLeads();
  }, []);

  // ----------------------
  // MERGE & FILTER
  // ----------------------
  const allLeads = useMemo(
    () => [
      ...agentLeads.map((l) => ({ ...l, source: "Advisor" })),
      ...publicLeads.map((l) => ({ ...l, source: "Public" })),
    ],
    [agentLeads, publicLeads],
  );

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      // search match
      const matchesSearch =
        !search ||
        (lead.name && lead.name.toLowerCase().includes(search.toLowerCase())) ||
        (lead.email &&
          lead.email.toLowerCase().includes(search.toLowerCase())) ||
        (lead.phone && lead.phone.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        !statusFilter || getLeadStatus(lead) === statusFilter;

      const createdAt = lead.created_at ? new Date(lead.created_at) : null;
      let matchesDate = true;

      if (dateFilter === "7") {
        matchesDate =
          !!createdAt &&
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      } else if (dateFilter === "30") {
        matchesDate =
          !!createdAt &&
          (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 30;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [allLeads, search, statusFilter, dateFilter]);

  // ----------------------
  // PAGINATION
  // ----------------------
  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const pagedLeads = filteredLeads.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // ----------------------
  // SUMMARY CARDS
  // ----------------------
  const totalLeads = filteredLeads.length;
  const hotLeads = filteredLeads.filter(
    (l) => getLeadStatus(l) === "hot",
  ).length;
  const warmLeads = filteredLeads.filter(
    (l) => getLeadStatus(l) === "warm",
  ).length;
  const coldLeads = filteredLeads.filter(
    (l) => getLeadStatus(l) === "cold",
  ).length;

  const last7Days = filteredLeads.filter((l) => {
    if (!l.created_at) return false;
    const created = new Date(l.created_at);
    return (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7;
  }).length;

  // ----------------------
  // UI START
  // ----------------------
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 className="text-2xl font-bold mb-6">Advisor Leads Dashboard</h1>

      {/* ---------------------- */}
      {/* Table Switcher */}
      {/* ---------------------- */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowTable("agent")}
          className={`px-4 py-2 rounded-lg font-medium ${
            showTable === "agent"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Advisor Leads
        </button>

        <button
          onClick={() => setShowTable("public")}
          className={`px-4 py-2 rounded-lg font-medium ${
            showTable === "public"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Public Leads
        </button>
      </div>

      {/* ---------------------- */}
      {/* Stats Cards */}
      {/* ---------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="p-6 bg-gray-100 rounded-xl shadow">
          <div className="text-sm text-gray-600 font-semibold">Total Leads</div>
          <div className="text-2xl font-bold">{totalLeads}</div>
        </div>

        <div className="p-6 bg-red-50 rounded-xl shadow">
          <div className="text-sm text-gray-600 font-semibold">Hot</div>
          <div className="text-2xl font-bold">{hotLeads}</div>
        </div>

        <div className="p-6 bg-yellow-50 rounded-xl shadow">
          <div className="text-sm text-gray-600 font-semibold">Warm</div>
          <div className="text-2xl font-bold">{warmLeads}</div>
        </div>

        <div className="p-6 bg-blue-50 rounded-xl shadow">
          <div className="text-sm text-gray-600 font-semibold">Cold</div>
          <div className="text-2xl font-bold">{coldLeads}</div>
        </div>
      </div>

      {/* ---------------------- */}
      {/* Horizontal Scroll Table */}
      {/* ---------------------- */}
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-[900px] w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Phone</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {pagedLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-6 text-gray-500">
                  No leads found for your filters.
                </td>
              </tr>
            ) : (
              pagedLeads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{lead.name || "-"}</td>
                  <td className="p-3">{lead.email || "-"}</td>
                  <td className="p-3">{lead.phone || "-"}</td>
                  <td className="p-3">
                    <span
                      className="px-2 py-1 rounded text-sm font-medium"
                      style={{
                        background: getStatusColor(getLeadStatus(lead)),
                      }}
                    >
                      {getLeadStatus(lead)}
                    </span>
                  </td>
                  <td className="p-3">{lead.source}</td>
                  <td className="p-3">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------------- */}
      {/* Pagination */}
      {/* ---------------------- */}
      <div className="flex justify-center mt-6 gap-3">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <div className="px-4 py-2">Page {page}</div>

        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
