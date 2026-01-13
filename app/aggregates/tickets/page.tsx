"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabaseClient";
import ConfidenceBadge from "../../../components/data-confidence/ConfidenceBadge";
import TicketSummary from "../../../components/tickets/TicketSummary";
import SavedViewsDropdown from "../../../components/tickets/SavedViewsDropdown";
import SaveViewModal from "../../../components/tickets/SaveViewModal";
import TicketSummary from "../../../components/tickets/TicketSummary";
import {
  FileText,
  Truck,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Download,
} from "lucide-react";

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
  pickup_location: string;
  delivery_location: string;
  pickup_date: string;
  delivery_date: string;
  status: "pending" | "approved" | "invoiced" | "paid" | "cancelled";
  odometer_start: number;
  odometer_end: number;
  fuel_used: number;
  notes: string;
  created_at: string;
  // Related data
  driver_name?: string;
  truck_number?: string;
  // Confidence data
  confidence?: {
    quantity?: { score: number; reason: string };
    pay_rate?: { score: number; reason: string };
    bill_rate?: { score: number; reason: string };
  };
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  cdl_number: string;
}

interface TruckInfo {
  id: string;
  truck_number: string;
  make: string;
  model: string;
  year: number;
}

export default function AggregateTicketsPage() {
  const [tickets, setTickets] = useState<AggregateTicket[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all"); // 'all', 'high', 'medium', 'low'
  const [sortBy, setSortBy] = useState<"created" | "confidence">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<AggregateTicket | null>(
    null,
  );
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [newTicket, setNewTicket] = useState({
    ticket_number: "",
    driver_id: "",
    truck_id: "",
    customer_name: "",
    material_type: "",
    quantity: 0,
    unit: "tons",
    rate: 0,
    pickup_location: "",
    delivery_location: "",
    pickup_date: "",
    delivery_date: "",
    odometer_start: 0,
    odometer_end: 0,
    fuel_used: 0,
    notes: "",
  });

  useEffect(() => {
    loadTicketData();
    // Get current user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  async function loadTicketData() {
    try {
      setLoading(true);

      // Load tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from("aggregate_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;

      // Load drivers
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, name, phone, cdl_number")
        .order("name");

      if (driverError) console.error("Error loading drivers:", driverError);

      // Load trucks
      const { data: truckData, error: truckError } = await supabase
        .from("trucks")
        .select("id, truck_number, make, model, year")
        .order("truck_number");

      if (truckError) console.error("Error loading trucks:", truckError);

      // Merge data
      const enrichedTickets = (ticketData || []).map((ticket) => ({
        ...ticket,
        driver_name:
          driverData?.find((d) => d.id === ticket.driver_id)?.name ||
          "Unknown Driver",
        truck_number:
          truckData?.find((t) => t.id === ticket.truck_id)?.truck_number ||
          "Unknown Truck",
      }));

      // Fetch confidence scores for all tickets
      const ticketsWithConfidence = await Promise.all(
        enrichedTickets.map(async (ticket) => {
          try {
            const response = await fetch(
              `/api/tickets/${ticket.id}/confidence`
            );
            if (response.ok) {
              const { confidence } = await response.json();
              return {
                ...ticket,
                confidence: confidence
                  ? {
                      quantity: confidence.quantity
                        ? {
                            score: confidence.quantity.confidence_score,
                            reason: confidence.quantity.reason,
                          }
                        : undefined,
                      pay_rate: confidence.pay_rate
                        ? {
                            score: confidence.pay_rate.confidence_score,
                            reason: confidence.pay_rate.reason,
                          }
                        : undefined,
                      bill_rate: confidence.bill_rate
                        ? {
                            score: confidence.bill_rate.confidence_score,
                            reason: confidence.bill_rate.reason,
                          }
                        : undefined,
                    }
                  : undefined,
              };
            }
          } catch (err) {
            console.error(
              `Error fetching confidence for ticket ${ticket.id}:`,
              err
            );
          }
          return ticket;
        })
      );

      setTickets(ticketsWithConfidence);
      setDrivers(driverData || []);
      setTrucks(truckData || []);
    } catch (error) {
      console.error("Error loading ticket data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    try {
      const ticketNumber = `TKT-${Date.now().toString().slice(-8)}`;
      const total = newTicket.quantity * newTicket.rate;

      const { data, error } = await supabase
        .from("aggregate_tickets")
        .insert([
          {
            ...newTicket,
            ticket_number: ticketNumber,
            total_amount: total,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Score confidence for the new ticket (async, don't wait)
      fetch('/api/tickets/score-confidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: data.id,
          driverId: newTicket.driver_id,
        }),
      }).catch(err => console.error('Error scoring ticket confidence:', err));

      await loadTicketData();
      setShowCreateModal(false);
      resetNewTicket();
    } catch (error) {
      console.error("Error creating ticket:", error);
      alert("Failed to create ticket. Please try again.");
    }
  }

  function resetNewTicket() {
    setNewTicket({
      ticket_number: "",
      driver_id: "",
      truck_id: "",
      customer_name: "",
      material_type: "",
      quantity: 0,
      unit: "tons",
      rate: 0,
      pickup_location: "",
      delivery_location: "",
      pickup_date: "",
      delivery_date: "",
      odometer_start: 0,
      odometer_end: 0,
      fuel_used: 0,
      notes: "",
    });
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      approved: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      invoiced: { color: "bg-blue-100 text-blue-800", icon: FileText },
      paid: { color: "bg-green-100 text-green-800", icon: DollarSign },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Helper function to get the lowest confidence score for a ticket
  const getLowestConfidence = (ticket: AggregateTicket): number => {
    if (!ticket.confidence) return 1.0; // Default to high confidence if no data
    const scores = [
      ticket.confidence.quantity?.score,
      ticket.confidence.pay_rate?.score,
      ticket.confidence.bill_rate?.score,
    ].filter((s): s is number => s !== undefined);
    return scores.length > 0 ? Math.min(...scores) : 1.0;
  };

  const filteredTickets = tickets
    .filter((ticket) => {
      const matchesSearch =
        ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.material_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.driver_name &&
          ticket.driver_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ticket.truck_number &&
          ticket.truck_number.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const ticketDate = new Date(ticket.created_at);
        const today = new Date();

        switch (dateFilter) {
          case "today":
            matchesDate = ticketDate.toDateString() === today.toDateString();
            break;
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = ticketDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(
              today.getTime() - 30 * 24 * 60 * 60 * 1000
            );
            matchesDate = ticketDate >= monthAgo;
            break;
        }
      }

      // Confidence filter
      let matchesConfidence = true;
      if (confidenceFilter !== "all") {
        const lowestConfidence = getLowestConfidence(ticket);
        switch (confidenceFilter) {
          case "high":
            matchesConfidence = lowestConfidence >= 0.7;
            break;
          case "medium":
            matchesConfidence = lowestConfidence >= 0.5 && lowestConfidence < 0.7;
            break;
          case "low":
            matchesConfidence = lowestConfidence < 0.5;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate && matchesConfidence;
    })
    .sort((a, b) => {
      if (sortBy === "confidence") {
        const aConfidence = getLowestConfidence(a);
        const bConfidence = getLowestConfidence(b);
        return sortOrder === "asc"
          ? aConfidence - bConfidence
          : bConfidence - aConfidence;
      } else {
        // Sort by created date
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      }
    });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Aggregate Tickets
          </h1>
          <p className="text-gray-600 mt-1">
            Manage delivery tickets with driver and truck assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Ticket
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Ticket
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Tickets</p>
                <p className="text-2xl font-bold">{tickets.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {tickets.filter((t) => t.status === "pending").length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {tickets.filter((t) => t.status === "approved").length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  $
                  {tickets
                    .reduce((sum, t) => sum + (t.total_amount || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {userId && (
              <SavedViewsDropdown
                currentFilters={{
                  searchTerm,
                  statusFilter,
                  dateFilter,
                  confidenceFilter,
                  sortBy,
                  sortOrder,
                }}
                onSelectView={(filters) => {
                  setSearchTerm(filters.searchTerm || "");
                  setStatusFilter(filters.status || "all");
                  setDateFilter(filters.dateRange || "all");
                  setConfidenceFilter(filters.confidence || "all");
                  setSortBy(filters.sortBy || "created");
                  setSortOrder(filters.sortOrder || "desc");
                }}
                onSaveView={() => setShowSaveViewModal(true)}
                userId={userId}
              />
            )}
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search tickets, customers, drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Confidence</option>
              <option value="high">High Confidence (≥70%)</option>
              <option value="medium">Medium Confidence (50-69%)</option>
              <option value="low">Low Confidence (&lt;50%)</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-");
                setSortBy(by as "created" | "confidence");
                setSortOrder(order as "asc" | "desc");
              }}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="created-desc">Sort: Newest First</option>
              <option value="created-asc">Sort: Oldest First</option>
              <option value="confidence-desc">Sort: High Confidence First</option>
              <option value="confidence-asc">Sort: Low Confidence First</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Tickets ({filteredTickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No tickets found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Ticket #</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Driver</th>
                    <th className="text-left p-3">Truck</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Material</th>
                    <th className="text-left p-3">Quantity</th>
                    <th className="text-left p-3">Amount</th>
                    <th className="text-left p-3">Delivery Date</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">
                        {ticket.ticket_number}
                      </td>
                      <td className="p-3">{getStatusBadge(ticket.status)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{ticket.driver_name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          <span>{ticket.truck_number}</span>
                        </div>
                      </td>
                      <td className="p-3">{ticket.customer_name}</td>
                      <td className="p-3">{ticket.material_type}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span>{ticket.quantity} {ticket.unit}</span>
                          {ticket.confidence?.quantity && (
                            <ConfidenceBadge
                              score={ticket.confidence.quantity.score}
                              reason={ticket.confidence.quantity.reason}
                              fieldName="Quantity"
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-green-600">
                        ${ticket.total_amount?.toLocaleString()}
                      </td>
                      <td className="p-3">
                        {ticket.delivery_date
                          ? new Date(ticket.delivery_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setShowSummaryModal(true);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Driver
                  </label>
                  <select
                    value={newTicket.driver_id}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, driver_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Driver</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Truck
                  </label>
                  <select
                    value={newTicket.truck_id}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, truck_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select Truck</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.truck_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer Name
                </label>
                <Input
                  value={newTicket.customer_name}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      customer_name: e.target.value,
                    })
                  }
                  placeholder="Customer name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Material Type
                  </label>
                  <Input
                    value={newTicket.material_type}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        material_type: e.target.value,
                      })
                    }
                    placeholder="e.g., Sand, Gravel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    value={newTicket.quantity}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Rate ($)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTicket.rate}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        rate: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pickup Location
                  </label>
                  <Input
                    value={newTicket.pickup_location}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        pickup_location: e.target.value,
                      })
                    }
                    placeholder="Pickup address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Delivery Location
                  </label>
                  <Input
                    value={newTicket.delivery_location}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        delivery_location: e.target.value,
                      })
                    }
                    placeholder="Delivery address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Pickup Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={newTicket.pickup_date}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        pickup_date: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Delivery Date
                  </label>
                  <Input
                    type="datetime-local"
                    value={newTicket.delivery_date}
                    onChange={(e) =>
                      setNewTicket({
                        ...newTicket,
                        delivery_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newTicket.notes}
                  onChange={(e) =>
                    setNewTicket({ ...newTicket, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createTicket}>Create Ticket</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ticket Summary Modal */}
      {showSummaryModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-y-auto m-4">
            <TicketSummary
              ticketId={selectedTicket.id}
              onClose={() => {
                setShowSummaryModal(false);
                setSelectedTicket(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Save View Modal */}
      {showSaveViewModal && userId && (
        <SaveViewModal
          currentFilters={{
            searchTerm,
            statusFilter,
            dateFilter,
            confidenceFilter,
            sortBy,
            sortOrder,
          }}
          onClose={() => setShowSaveViewModal(false)}
          onSave={() => {
            setShowSaveViewModal(false);
            // Optionally reload saved views or show success message
          }}
          userId={userId}
        />
      )}
    </div>
  );
}
