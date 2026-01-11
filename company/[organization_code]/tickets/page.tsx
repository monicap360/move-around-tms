"use client";
import { useEffect, useState } from "react";

export default function TicketsPage({ params }) {
  const { organization_code } = params;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      const res = await fetch(`/api/company/${organization_code}/tickets/list`);
      const data = await res.json();
      setTickets(data.tickets || []);
      setLoading(false);
    }
    fetchTickets();
  }, [organization_code]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tickets</h1>
      {loading ? (
        <div>Loading...</div>
      ) : tickets.length === 0 ? (
        <div>No tickets found.</div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="border p-4 rounded bg-white shadow">
              <div className="font-semibold">
                {ticket.title || `Ticket #${ticket.id}`}
              </div>
              <div>Status: {ticket.status}</div>
              <div>Amount: ${ticket.amount}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
