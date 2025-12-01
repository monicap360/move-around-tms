"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default function TicketTable() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    const res = await fetch("/api/company/move-around-tms/tickets/list");
    const data = await res.json();
    setTickets(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Dispatcher Ticket Table</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="w-full bg-gray-900 rounded-xl shadow-lg">
          <thead>
            <tr className="bg-gray-800">
              <th className="p-3">Ticket #</th>
              <th className="p-3">Driver</th>
              <th className="p-3">Plant</th>
              <th className="p-3">Material</th>
              <th className="p-3">Weight</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Pay</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.ticket_uuid} className="hover:bg-gray-700 transition">
                <td className="p-3 font-mono">{t.ticket_uuid}</td>
                <td className="p-3">{t.driver_id}</td>
                <td className="p-3">{t.plant_id}</td>
                <td className="p-3">{t.material_id}</td>
                <td className="p-3">{t.weight_out - t.weight_in} lbs</td>
                <td className="p-3">${t.rate}</td>
                <td className="p-3 font-bold text-green-400">${(t.weight_out - t.weight_in) * (t.rate / 2000)}</td>
                <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
