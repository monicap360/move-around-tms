"use client";
import { useEffect, useState } from "react";

export default function DriverTicketHistory({ params }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/company/move-around-tms/tickets/list`)
      .then(res => res.json())
      .then(data => {
        setTickets(data.filter(t => t.driver_id === params.driver_uuid));
        setLoading(false);
      });
  }, [params.driver_uuid]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">My Ticket History</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {tickets.map(t => (
            <div key={t.ticket_uuid} className="p-4 bg-gray-900 rounded-xl border border-gray-800">
              <div className="flex justify-between">
                <div>
                  <div className="text-xs opacity-60">#{t.ticket_uuid.slice(0,8)}</div>
                  <div className="font-bold">{t.material_id}</div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">${(t.weight_out - t.weight_in) * (t.rate / 2000)}</div>
                  <div className="text-xs opacity-50">Pay</div>
                </div>
              </div>
              <div className="mt-2 text-xs opacity-70">{new Date(t.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
