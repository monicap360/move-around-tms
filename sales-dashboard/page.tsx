'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// Shared UI Components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardCard from '@/components/dashboard/DashboardCard';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Status colors
function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'hot': return '#ff7875';
    case 'warm': return '#ffd666';
    case 'cold': return '#bfbfbf';
    case 'new': return '#bae7ff';
    case 'sold': return '#52c41a';
    case 'dead': return '#8c8c8c';
    default: return '#d9d9d9';
  }
}

export default function SalesDashboard() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [advisorId, setAdvisorId] = useState(''); // Used when you assign advisors
  const [dateFilter, setDateFilter] = useState('7'); // Last 7 days by default

  // Fetch all ASSIGNED leads
  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);

    const { data, error } = await supabase
      .from('agent_leads')
      .select('*')
      .order('assigned_at', { ascending: false });

    if (!error) setLeads(data || []);
    setLoading(false);
  }

  // Filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !search ||
        lead.name?.toLowerCase().includes(search.toLowerCase()) ||
        lead.email?.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || lead.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== 'all') {
        const days = Number(dateFilter);
        const assignedAt = lead.assigned_at ? new Date(lead.assigned_at) : null;
        if (assignedAt) {
          const diff = (Date.now() - assignedAt.getTime()) / (1000 * 60 * 60 * 24);
          matchesDate = diff <= days;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [leads, search, statusFilter, dateFilter]);

  // Stats
  const hotLeads = filteredLeads.filter((l) => l.status === 'hot').length;
  const warmLeads = filteredLeads.filter((l) => l.status === 'warm').length;
  const coldLeads = filteredLeads.filter((l) => l.status === 'cold').length;
  const newLeads = filteredLeads.filter((l) => l.status === 'new').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* HEADER */}
      <DashboardHeader
        title="MoveAround TMS — Sales Dashboard"
        subtitle="Your Assigned Leads & Sales Pipeline"
        userName="Sales Agent"
        userRole="Sales Team"
        view="sales"
        onViewChange={() => {}}
      />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <DashboardCard title="New Leads" value={newLeads} icon="🆕" />
          <DashboardCard title="Hot Leads" value={hotLeads} icon="🔥" />
          <DashboardCard title="Warm Leads" value={warmLeads} icon="🌡️" />
          <DashboardCard title="Cold Leads" value={coldLeads} icon="❄️" />
        </div>

        {/* FILTER BAR */}
        <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl shadow">
          <input
            placeholder="Search name, email, phone"
            className="flex-1 border rounded-lg px-4 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border rounded-lg px-3 py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="new">New</option>
          </select>

          <select
            className="border rounded-lg px-3 py-2"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>

        {/* LEADS TABLE */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-bold mb-4">Your Assigned Leads</h3>

          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No leads match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Assigned At</th>
                    <th className="p-2 text-left">Age (days)</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLeads.map((lead) => {
                    const assignedAt = lead.assigned_at
                      ? new Date(lead.assigned_at)
                      : null;

                    const age = assignedAt
                      ? Math.floor((Date.now() - assignedAt.getTime()) / (1000 * 60 * 60 * 24))
                      : '-';

                    return (
                      <tr key={lead.id} className="border-b">
                        <td className="p-2">{lead.name || '-'}</td>
                        <td className="p-2">{lead.phone || '-'}</td>
                        <td className="p-2">{lead.email || '-'}</td>
                        <td className="p-2">
                          <span
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{ background: getStatusColor(lead.status || 'new') }}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-2">
                          {assignedAt ? assignedAt.toLocaleString() : '-'}
                        </td>
                        <td className="p-2">{age}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PIPELINE STYLE CARDS */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Pipeline View</h3>
          <div className="flex gap-6 overflow-x-auto pb-4">

            {/* HOT COLUMN */}
            <div className="min-w-[250px] bg-red-50 p-4 rounded-xl shadow">
              <h4 className="font-bold mb-3">🔥 Hot</h4>
              {filteredLeads.filter(l => l.status === 'hot').map(l => (
                <div key={l.id} className="bg-white p-3 rounded-lg shadow mb-2">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-gray-500">{l.phone}</div>
                </div>
              ))}
            </div>

            {/* WARM COLUMN */}
            <div className="min-w-[250px] bg-yellow-50 p-4 rounded-xl shadow">
              <h4 className="font-bold mb-3">🌡️ Warm</h4>
              {filteredLeads.filter(l => l.status === 'warm').map(l => (
                <div key={l.id} className="bg-white p-3 rounded-lg shadow mb-2">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-gray-500">{l.phone}</div>
                </div>
              ))}
            </div>

            {/* NEW COLUMN */}
            <div className="min-w-[250px] bg-blue-50 p-4 rounded-xl shadow">
              <h4 className="font-bold mb-3">🆕 New</h4>
              {filteredLeads.filter(l => l.status === 'new').map(l => (
                <div key={l.id} className="bg-white p-3 rounded-lg shadow mb-2">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-gray-500">{l.phone}</div>
                </div>
              ))}
            </div>

            {/* COLD COLUMN */}
            <div className="min-w-[250px] bg-gray-50 p-4 rounded-xl shadow">
              <h4 className="font-bold mb-3">❄️ Cold</h4>
              {filteredLeads.filter(l => l.status === 'cold').map(l => (
                <div key={l.id} className="bg-white p-3 rounded-lg shadow mb-2">
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-gray-500">{l.phone}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
