"use client";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function TicketDetailsPage() {
  const params = useParams();
  const ticketId = params.ticketId;
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTicket() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fastscan/ticket/${ticketId}`);
        if (!res.ok) throw new Error("Ticket not found");
        const data = await res.json();
        setTicket(data.ticket);
      } catch (err: any) {
        setError(err.message || "Error loading ticket");
      }
      setLoading(false);
    }
    if (ticketId) fetchTicket();
  }, [ticketId]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Ticket Details</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {ticket && (
        <div className="space-y-2">
          <div>Ticket ID: <span className="font-mono">{ticket.ticket_id}</span></div>
          <div>Driver: {ticket.driver_name || <span className="text-muted-foreground">(missing)</span>}</div>
          <div>Truck: {ticket.truck_number || <span className="text-muted-foreground">(missing)</span>}</div>
          <div>Material: {ticket.material || <span className="text-muted-foreground">(missing)</span>}</div>
          <div>Net Weight: {ticket.net_weight ?? <span className="text-muted-foreground">(missing)</span>}</div>
          <div>Load Date: {ticket.load_date || <span className="text-muted-foreground">(missing)</span>}</div>
          <div>Source: {ticket.source || <span className="text-muted-foreground">(missing)</span>}</div>
          <div>Status: <span className="font-semibold">{ticket.status}</span></div>
        </div>
      )}
    </div>
  );
}
