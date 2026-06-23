"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  FileText,
  User,
  Truck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  driver_name?: string;
  customer_name: string;
  material_type: string;
  quantity: number;
  unit: string;
  rate: number;
  total_amount: number;
  status: string;
  ticket_date?: string;
  created_at: string;
}

interface TicketComparisonProps {
  ticketIds: string[];
  onClose?: () => void;
}

export default function TicketComparison({
  ticketIds,
  onClose,
}: TicketComparisonProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const ticketIdsKey = useMemo(() => ticketIds.join(","), [ticketIds]);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/tickets/batch?ids=${ticketIdsKey}`,
      );
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
    } finally {
      setLoading(false);
    }
  }, [ticketIdsKey]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      invoiced: "bg-blue-100 text-blue-800",
      paid: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const highlightDifference = (value1: any, value2: any, field: string) => {
    if (field === "status" || field === "ticket_number") {
      return value1 !== value2;
    }
    if (typeof value1 === "number" && typeof value2 === "number") {
      const diff = Math.abs(value1 - value2);
      const percentDiff = value1 !== 0 ? (diff / value1) * 100 : 0;
      return percentDiff > 5; // Highlight if >5% difference
    }
    return value1 !== value2;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading tickets for comparison...</div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="p-6">
        <div className="text-red-600">No tickets found to compare</div>
      </div>
    );
  }

  const comparisonFields = [
    { key: "ticket_number", label: "Ticket Number", type: "text" },
    { key: "driver_name", label: "Driver", type: "text" },
    { key: "customer_name", label: "Customer", type: "text" },
    { key: "material_type", label: "Material", type: "text" },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "unit", label: "Unit", type: "text" },
    { key: "rate", label: "Rate", type: "currency" },
    { key: "total_amount", label: "Total Amount", type: "currency" },
    { key: "status", label: "Status", type: "status" },
    { key: "ticket_date", label: "Date", type: "date" },
  ];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ticket Comparison</h1>
          <p className="text-gray-600 mt-1">
            Comparing {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        )}
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Side-by-Side Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold w-48">Field</th>
                  {tickets.map((ticket, index) => (
                    <th key={ticket.id} className="text-left p-3 font-semibold min-w-48">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {ticket.ticket_number}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFields.map((field) => {
                  const values = tickets.map((t) => t[field.key as keyof Ticket]);
                  const hasDifference =
                    tickets.length > 1 &&
                    highlightDifference(values[0], values[1], field.key);

                  return (
                    <tr
                      key={field.key}
                      className={`border-b ${
                        hasDifference ? "bg-yellow-50" : ""
                      }`}
                    >
                      <td className="p-3 font-medium">{field.label}</td>
                      {tickets.map((ticket, index) => {
                        const value = ticket[field.key as keyof Ticket];
                        let displayValue: React.ReactNode = value;

                        if (field.type === "currency") {
                          displayValue = (
                            <span className="font-semibold">
                              ${typeof value === "number" ? value.toFixed(2) : value}
                            </span>
                          );
                        } else if (field.type === "status") {
                          displayValue = getStatusBadge(value as string);
                        } else if (field.type === "date" && value) {
                          displayValue = new Date(value as string).toLocaleDateString();
                        } else if (field.type === "number") {
                          displayValue = typeof value === "number" ? value.toLocaleString() : value;
                        }

                        return (
                          <td
                            key={`${ticket.id}-${field.key}`}
                            className={`p-3 ${
                              hasDifference ? "font-semibold text-orange-700" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {displayValue}
                              {hasDifference && index === 0 && (
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Summary Row */}
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="p-3 font-bold">Summary</td>
                  {tickets.map((ticket) => {
                    const margin = ticket.rate > 0 ? ((ticket.total_amount - (ticket.quantity * ticket.rate)) / ticket.total_amount) * 100 : 0;
                    return (
                      <td key={ticket.id} className="p-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>Total: ${ticket.total_amount.toFixed(2)}</span>
                          </div>
                          <div className={`flex items-center gap-1 ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {margin >= 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            <span>Margin: {margin.toFixed(1)}%</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Differences Summary */}
      {tickets.length === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Differences Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparisonFields.map((field) => {
                const value1 = tickets[0][field.key as keyof Ticket];
                const value2 = tickets[1][field.key as keyof Ticket];
                const hasDiff = highlightDifference(value1, value2, field.key);

                if (!hasDiff) return null;

                const diff =
                  typeof value1 === "number" && typeof value2 === "number"
                    ? Math.abs(value1 - value2).toFixed(2)
                    : null;
                const percentDiff =
                  typeof value1 === "number" && typeof value2 === "number" && value1 !== 0
                    ? ((Math.abs(value1 - value2) / value1) * 100).toFixed(1)
                    : null;

                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200"
                  >
                    <span className="font-medium">{field.label}:</span>
                    <span className="text-sm">
                      {tickets[0].ticket_number}: {String(value1)} →{" "}
                      {tickets[1].ticket_number}: {String(value2)}
                      {diff && ` (Difference: ${diff})`}
                      {percentDiff && ` (${percentDiff}%)`}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
