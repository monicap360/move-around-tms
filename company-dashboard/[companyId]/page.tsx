"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CompanyOwnerDashboard({ params }: { params: { companyId: string } }) {
  const companyId = params.companyId;
  const [company, setCompany] = useState<any>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [hr, setHR] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanyDashboard();
  }, [companyId]);

  async function loadCompanyDashboard() {
    setLoading(true);
    const [
      companyRes,
      driversRes,
      ticketsRes,
      payrollRes,
      dispatchesRes,
      hrRes,
      complianceRes,
    ] = await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).single(),
      supabase.from("drivers").select("*").eq("company_id", companyId),
      supabase.from("tickets").select("*").eq("company_id", companyId),
      supabase.from("payroll").select("*").eq("company_id", companyId),
      supabase.from("dispatches").select("*").eq("company_id", companyId),
      supabase.from("hr").select("*").eq("company_id", companyId),
      supabase.from("compliance").select("*").eq("company_id", companyId),
    ]);
    setCompany(companyRes.data || null);
    setDrivers(driversRes.data || []);
    setTickets(ticketsRes.data || []);
    setPayroll(payrollRes.data || []);
    setDispatches(dispatchesRes.data || []);
    setHR(hrRes.data || []);
    setCompliance(complianceRes.data || []);
    setLoading(false);
  }

  if (loading || !company) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading Company Dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <DashboardHeader
        title={`${company.name} — Owner Portal`}
        subtitle="Drivers • Tickets • Payroll • Dispatch • HR • Compliance"
        userName={company.owner_name}
        userRole="Company Owner"
        view={companyId}
        onViewChange={() => {}}
      />
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          <DashboardCard title="Active Drivers" value={drivers.length} icon="🚛" />
          <DashboardCard title="Tickets" value={tickets.length} icon="🎫" />
          <DashboardCard title="Payroll Entries" value={payroll.length} icon="💵" />
          <DashboardCard title="Dispatches" value={dispatches.length} icon="🗂️" />
          <DashboardCard title="HR Records" value={hr.length} icon="🧑‍💼" />
          <DashboardCard title="Compliance" value={compliance.length} icon="✅" />
        </div>
        {/* DRIVERS TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Drivers</h2>
          {drivers.length === 0 ? (
            <p className="text-gray-500">No drivers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver) => (
                    <tr key={driver.id} className="border-b">
                      <td className="p-2">{driver.name}</td>
                      <td className="p-2">{driver.phone}</td>
                      <td className="p-2">{driver.email}</td>
                      <td className="p-2">{driver.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* TICKETS TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-gray-500">No tickets found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Ticket #</th>
                    <th className="p-2 text-left">Driver</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="p-2">{ticket.ticket_number}</td>
                      <td className="p-2">{ticket.driver_name}</td>
                      <td className="p-2">{ticket.date ? new Date(ticket.date).toLocaleDateString() : '-'}</td>
                      <td className="p-2">${ticket.amount?.toLocaleString() || '-'}</td>
                      <td className="p-2">{ticket.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* PAYROLL TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Payroll</h2>
          {payroll.length === 0 ? (
            <p className="text-gray-500">No payroll entries found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-left">Total</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payroll.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-2">{entry.period}</td>
                      <td className="p-2">${entry.total?.toLocaleString() || '-'}</td>
                      <td className="p-2">{entry.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* DISPATCHES TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Dispatches</h2>
          {dispatches.length === 0 ? (
            <p className="text-gray-500">No dispatches found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Load #</th>
                    <th className="p-2 text-left">Driver</th>
                    <th className="p-2 text-left">Pickup</th>
                    <th className="p-2 text-left">Dropoff</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((d) => (
                    <tr key={d.id} className="border-b">
                      <td className="p-2">{d.load_number}</td>
                      <td className="p-2">{d.driver_name}</td>
                      <td className="p-2">{d.pickup_location}</td>
                      <td className="p-2">{d.dropoff_location}</td>
                      <td className="p-2">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* HR TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">HR Records</h2>
          {hr.length === 0 ? (
            <p className="text-gray-500">No HR records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {hr.map((record) => (
                    <tr key={record.id} className="border-b">
                      <td className="p-2">{record.name}</td>
                      <td className="p-2">{record.type}</td>
                      <td className="p-2">{record.date ? new Date(record.date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* COMPLIANCE TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Compliance</h2>
          {compliance.length === 0 ? (
            <p className="text-gray-500">No compliance records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="p-2">{c.type}</td>
                      <td className="p-2">{c.status}</td>
                      <td className="p-2">{c.due_date ? new Date(c.due_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
