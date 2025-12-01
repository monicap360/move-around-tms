"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardCard from "@/components/dashboard/DashboardCard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FleetManagerDashboard({ params }: { params: { fleetId: string } }) {
  const fleetId = params.fleetId;
  const [fleet, setFleet] = useState<any>(null);
  const [loads, setLoads] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFleetDashboard();
  }, [fleetId]);

  async function loadFleetDashboard() {
    setLoading(true);
    const [fleetRes, loadsRes, driversRes, ticketsRes, mapRes] = await Promise.all([
      supabase.from("fleets").select("*").eq("id", fleetId).single(),
      supabase.from("loads").select("*").eq("fleet_id", fleetId),
      supabase.from("drivers").select("*").eq("fleet_id", fleetId),
      supabase.from("tickets").select("*").eq("fleet_id", fleetId),
      supabase.from("fleet_map").select("*").eq("fleet_id", fleetId),
    ]);
    setFleet(fleetRes.data || null);
    setLoads(loadsRes.data || []);
    setDrivers(driversRes.data || []);
    setTickets(ticketsRes.data || []);
    setMapData(mapRes.data || []);
    setLoading(false);
  }

  if (loading || !fleet) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading Fleet Manager Dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <DashboardHeader
        title={`${fleet.name} — Fleet Manager Portal`}
        subtitle="Assign Loads • Dispatch Board • Map View • Ticket Scanning"
        userName={fleet.manager_name}
        userRole="Fleet Manager"
        view={fleetId}
        onViewChange={() => {}}
      />
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <DashboardCard title="Active Loads" value={loads.length} icon="📦" />
          <DashboardCard title="Drivers" value={drivers.length} icon="🚛" />
          <DashboardCard title="Tickets" value={tickets.length} icon="🎫" />
          <DashboardCard title="Map Points" value={mapData.length} icon="🗺️" />
        </div>
        {/* LOADS TABLE */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Loads</h2>
          {loads.length === 0 ? (
            <p className="text-gray-500">No loads found.</p>
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
                  {loads.map((load) => (
                    <tr key={load.id} className="border-b">
                      <td className="p-2">{load.load_number}</td>
                      <td className="p-2">{load.driver_name}</td>
                      <td className="p-2">{load.pickup_location}</td>
                      <td className="p-2">{load.dropoff_location}</td>
                      <td className="p-2">{load.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
        {/* MAP VIEW (Placeholder) */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Map View</h2>
          {mapData.length === 0 ? (
            <p className="text-gray-500">No map data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {mapData.map((point) => (
                    <tr key={point.id} className="border-b">
                      <td className="p-2">{point.location}</td>
                      <td className="p-2">{point.type}</td>
                      <td className="p-2">{point.timestamp ? new Date(point.timestamp).toLocaleString() : '-'}</td>
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
