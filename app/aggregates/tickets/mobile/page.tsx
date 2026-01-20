"use client";

/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import MobileTicketList from "../../../../components/tickets/MobileTicketList";
import MobileTicketDetail from "../../../../components/tickets/MobileTicketDetail";
import { Input } from "../../../../components/ui/input";
import { Search, Filter } from "lucide-react";

interface AggregateTicket {
  id: string;
  ticket_number: string;
  driver_id: string;
  truck_id: string;
  customer_name: string;
  material_type: string;
  quantity: number;
  unit: string;
  rate: number;
  total_amount: number;
  status: string;
  ticket_date?: string;
  created_at: string;
  driver_name?: string;
  truck_number?: string;
  confidence?: {
    quantity?: { score: number; reason: string };
  };
}

export default function MobileTicketsPage() {
  const [tickets, setTickets] = useState<AggregateTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<AggregateTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AggregateTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter]);

  async function loadTickets() {
    try {
      setLoading(true);
      const { data: ticketData, error } = await supabase
        .from("aggregate_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Load related data
      const ticketsWithRelations = await Promise.all(
        (ticketData || []).map(async (ticket) => {
          let driverName, truckNumber;

          if (ticket.driver_id) {
            const { data: driver } = await supabase
              .from("drivers")
              .select("full_name")
              .eq("id", ticket.driver_id)
              .single();
            driverName = driver?.full_name;
          }

          if (ticket.truck_id) {
            const { data: truck } = await supabase
              .from("fleets")
              .select("truck_number")
              .eq("id", ticket.truck_id)
              .single();
            truckNumber = truck?.truck_number;
          }

          // Load confidence scores
          let confidence;
          try {
            const res = await fetch(`/api/tickets/${ticket.id}/confidence`);
            if (res.ok) {
              const confData = await res.json();
              if (confData.confidence?.quantity) {
                confidence = {
                  quantity: {
                    score: confData.confidence.quantity.confidence_score,
                    reason: confData.confidence.quantity.reason,
                  },
                };
              }
            }
          } catch (err) {
            // Ignore confidence errors
          }

          return {
            ...ticket,
            driver_name: driverName,
            truck_number: truckNumber,
            confidence,
          };
        })
      );

      setTickets(ticketsWithRelations);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterTickets() {
    let filtered = [...tickets];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.driver_name &&
            t.driver_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    setFilteredTickets(filtered);
  }

  async function handleQuickApprove(ticketId: string) {
    try {
      const res = await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          ticket_ids: [ticketId],
        }),
      });

      if (res.ok) {
        await loadTickets();
        alert("Ticket approved");
      }
    } catch (err) {
      console.error("Error approving ticket:", err);
      alert("Failed to approve ticket");
    }
  }

  async function handleQuickReject(ticketId: string) {
    try {
      const res = await fetch("/api/tickets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          ticket_ids: [ticketId],
        }),
      });

      if (res.ok) {
        await loadTickets();
        alert("Ticket rejected");
      }
    } catch (err) {
      console.error("Error rejecting ticket:", err);
      alert("Failed to reject ticket");
    }
  }

  function handleUploadPhoto(ticketId: string) {
    // This would trigger camera/file picker
    alert("Photo upload feature - implement file upload API");
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8">Loading tickets...</div>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <MobileTicketDetail
        ticket={selectedTicket}
        onBack={() => setSelectedTicket(null)}
        onApprove={() => {
          handleQuickApprove(selectedTicket.id);
          setSelectedTicket(null);
        }}
        onReject={() => {
          handleQuickReject(selectedTicket.id);
          setSelectedTicket(null);
        }}
        onUploadPhoto={() => handleUploadPhoto(selectedTicket.id)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 bg-white border-b z-10 p-4">
        <h1 className="text-xl font-bold mb-3">Tickets</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="invoiced">Invoiced</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Mobile Ticket List */}
      <div className="p-4">
        <MobileTicketList
          tickets={filteredTickets}
          onTicketClick={(ticketId) => {
            const ticket = tickets.find((t) => t.id === ticketId);
            if (ticket) setSelectedTicket(ticket);
          }}
          onQuickApprove={handleQuickApprove}
          onQuickReject={handleQuickReject}
          onUploadPhoto={handleUploadPhoto}
        />
      </div>
    </div>
  );
}
