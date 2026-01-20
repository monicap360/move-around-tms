"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function DriverDashboard({
  params,
}: {
  params: { driverId: string };
}) {
  const driverId = params.driverId;
  const [driver, setDriver] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDriverDashboard();
  }, [driverId]);

  async function loadDriverDashboard() {
    setLoading(true);
    const [driverRes, ticketsRes, payrollRes, statusRes] = await Promise.all([
      supabase.from("drivers").select("*").eq("id", driverId).single(),
      supabase.from("tickets").select("*").eq("driver_id", driverId),
      supabase.from("payroll").select("*").eq("driver_id", driverId),
      supabase
        .from("driver_status")
        .select("*")
        .eq("driver_id", driverId)
        .single(),
    ]);
    setDriver(driverRes.data || null);
    setTickets(ticketsRes.data || []);
    setPayroll(payrollRes.data || []);
    setStatus(statusRes.data || null);
    setLoading(false);
  }

  if (loading || !driver) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading Driver Dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <DashboardHeader
        title={`${driver.name} — Driver Portal`}
        subtitle="Upload Tickets • View Pay • Status"
        userName={driver.name}
        userRole="Driver"
        view={driverId}
        onViewChange={() => {}}
      />
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        {/* STATUS */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Status</h2>
          <div className="flex flex-col gap-2">
            <div>
              Status:{" "}
              <span className="font-semibold">{status?.status || "N/A"}</span>
            </div>
            <div>
              Last Updated:{" "}
              {status?.updated_at
                ? new Date(status.updated_at).toLocaleString()
                : "-"}
            </div>
          </div>
        </section>
        {/* TICKETS */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Your Tickets</h2>
          {tickets.length === 0 ? (
            <p className="text-gray-500">No tickets uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Ticket #</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="p-2">{ticket.ticket_number}</td>
                      <td className="p-2">
                        {ticket.date
                          ? new Date(ticket.date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-2">
                        ${ticket.amount?.toLocaleString() || "-"}
                      </td>
                      <td className="p-2">{ticket.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* PAYROLL */}
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
                      <td className="p-2">
                        ${entry.total?.toLocaleString() || "-"}
                      </td>
                      <td className="p-2">{entry.status}</td>
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
