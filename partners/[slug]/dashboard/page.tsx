"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Shared components
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";
import PartnerCard from "@/components/dashboard/PartnerCard";

// Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PartnerDashboard({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug; // ronyx, elite, meighoo, garza

  const [partner, setPartner] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPartnerPortal();
  }, [slug]);

  async function loadPartnerPortal() {
    setLoading(true);

    const [
      partnerRes,
      companiesRes,
      driversRes,
      ticketsRes,
      billingRes,
      leadsRes,
    ] = await Promise.all([
      supabase.from("partners").select("*").eq("slug", slug).single(),
      supabase.from("companies").select("*").eq("partner_slug", slug),
      supabase.from("drivers").select("*").eq("partner_slug", slug),
      supabase.from("tickets").select("*").eq("partner_slug", slug),
      supabase.from("billing").select("*").eq("partner_slug", slug),
      supabase.from("agent_leads").select("*").eq("partner_slug", slug),
    ]);

    setPartner(partnerRes.data || null);
    setCompanies(companiesRes.data || []);
    setDrivers(driversRes.data || []);
    setTickets(ticketsRes.data || []);
    setBilling(billingRes.data || []);
    setLeads(leadsRes.data || []);

    setLoading(false);
  }

  if (loading || !partner) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading Partner Portal…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* HEADER */}
      <DashboardHeader
        title={`${partner.brand_name} — Partner Portal`}
        subtitle="Partner Operations • Revenue • Companies • Drivers"
        userName={partner.owner_name}
        userRole="Partner"
        view={slug}
        onViewChange={() => {}}
      />

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* PARTNER OVERVIEW */}
        <PartnerCard partner={partner} />

        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <DashboardCard
            title="Total Companies"
            value={companies.length}
            icon="🏢"
          />
          <DashboardCard
            title="Active Drivers"
            value={drivers.length}
            icon="🚛"
          />
          <DashboardCard
            title="Tickets Scanned"
            value={tickets.length}
            icon="🎫"
          />
          <DashboardCard
            title="Monthly Billing"
            value={`$${billing.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString()}`}
            icon="💰"
          />
        </div>

        {/* LEADS SECTION */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Your Leads</h2>
          {leads.length === 0 ? (
            <p className="text-gray-500">No leads assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Assigned At</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b">
                      <td className="p-2">{lead.name}</td>
                      <td className="p-2">{lead.phone}</td>
                      <td className="p-2">{lead.email}</td>
                      <td className="p-2">{lead.status}</td>
                      <td className="p-2">
                        {lead.assigned_at
                          ? new Date(lead.assigned_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* PIPELINE VIEW */}
        <section>
          <h2 className="text-xl font-bold mb-4">Lead Pipeline</h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {/* HOT */}
            <div className="min-w-[250px] bg-red-50 p-4 rounded-xl shadow">
              <h4 className="font-semibold mb-3">🔥 Hot</h4>
              {leads
                .filter((l) => l.status === "hot")
                .map((l) => (
                  <div
                    key={l.id}
                    className="bg-white p-3 rounded-lg shadow mb-2"
                  >
                    {l.name}
                  </div>
                ))}
            </div>

            {/* WARM */}
            <div className="min-w-[250px] bg-yellow-50 p-4 rounded-xl shadow">
              <h4 className="font-semibold mb-3">🌡️ Warm</h4>
              {leads
                .filter((l) => l.status === "warm")
                .map((l) => (
                  <div
                    key={l.id}
                    className="bg-white p-3 rounded-lg shadow mb-2"
                  >
                    {l.name}
                  </div>
                ))}
            </div>

            {/* NEW */}
            <div className="min-w-[250px] bg-blue-50 p-4 rounded-xl shadow">
              <h4 className="font-semibold mb-3">🆕 New</h4>
              {leads
                .filter((l) => l.status === "new")
                .map((l) => (
                  <div
                    key={l.id}
                    className="bg-white p-3 rounded-lg shadow mb-2"
                  >
                    {l.name}
                  </div>
                ))}
            </div>

            {/* COLD */}
            <div className="min-w-[250px] bg-gray-50 p-4 rounded-xl shadow">
              <h4 className="font-semibold mb-3">❄️ Cold</h4>
              {leads
                .filter((l) => l.status === "cold")
                .map((l) => (
                  <div
                    key={l.id}
                    className="bg-white p-3 rounded-lg shadow mb-2"
                  >
                    {l.name}
                  </div>
                ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
