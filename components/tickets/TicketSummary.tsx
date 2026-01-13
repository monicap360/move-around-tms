"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfidenceBadge from "@/components/data-confidence/ConfidenceBadge";
import RelatedDocumentsPreview from "./RelatedDocumentsPreview";
import FinancialIntelligence from "./FinancialIntelligence";
import TicketTimeline from "./TicketTimeline";
import {
  FileText,
  Truck,
  User,
  DollarSign,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface TicketSummaryProps {
  ticketId: string;
  onClose?: () => void;
}

interface TicketSummaryData {
  ticket: {
    id: string;
    ticket_number: string;
    ticket_date: string;
    status: string;
    material: string;
    quantity: number;
    unit: string;
    notes: string;
    created_at: string;
    updated_at: string;
  };
  driver: {
    id: string;
    name: string;
    phone: string;
    cdl_number: string;
    driver_uuid: string;
  } | null;
  truck: {
    id: string;
    truck_number: string;
    make: string;
    model: string;
    year: number;
  } | null;
  financial: {
    payRate: number;
    billRate: number;
    quantity: number;
    totalPay: number;
    totalBill: number;
    totalProfit: number;
    margin: number;
  };
  confidence: Record<string, {
    score: number;
    reason: string;
    baselineType: string;
    baselineValue: number;
    actualValue: number;
    deviationPercentage: number;
  }>;
  relatedLoads: any[];
  relatedDocuments: any[];
  statusTimeline: Array<{
    status: string;
    timestamp: string;
    description: string;
  }>;
}

export default function TicketSummary({ ticketId, onClose }: TicketSummaryProps) {
  const [data, setData] = useState<TicketSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true);
        const res = await fetch(`/api/tickets/${ticketId}/summary`);
        if (!res.ok) throw new Error("Failed to fetch ticket summary");
        const json = await res.json();
        setData(json.summary);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading ticket summary...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error: {error || "Ticket not found"}</div>
      </div>
    );
  }

  const { ticket, driver, truck, financial, confidence, relatedLoads, relatedDocuments, statusTimeline } = data;

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

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ticket Summary</h1>
          <p className="text-gray-600 mt-1">
            {ticket.ticket_number} • {ticket.material}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Pay Rate</p>
                  <p className="text-2xl font-bold">${financial.payRate.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">per {ticket.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bill Rate</p>
                  <p className="text-2xl font-bold">${financial.billRate.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">per {ticket.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Pay</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${financial.totalPay.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Bill</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${financial.totalBill.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Profit</p>
                    <p className={`text-3xl font-bold ${
                      financial.totalProfit >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      ${financial.totalProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Margin</p>
                    <div className="flex items-center gap-2">
                      {financial.margin >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <p className={`text-3xl font-bold ${
                        financial.margin >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {financial.margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Ticket Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Ticket Number</p>
                  <p className="font-semibold">{ticket.ticket_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">{getStatusBadge(ticket.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">
                    {ticket.ticket_date 
                      ? new Date(ticket.ticket_date).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Material</p>
                  <p className="font-semibold">{ticket.material || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="font-semibold">
                    {ticket.quantity.toLocaleString()} {ticket.unit}
                  </p>
                  {confidence.quantity && (
                    <div className="mt-1">
                      <ConfidenceBadge
                        score={confidence.quantity.score}
                        reason={confidence.quantity.reason}
                        fieldName="quantity"
                      />
                    </div>
                  )}
                </div>
                {ticket.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-sm">{ticket.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Driver & Truck Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {driver && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Driver
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-lg">{driver.name}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">CDL: {driver.cdl_number || "N/A"}</p>
                    <p className="text-gray-600">Phone: {driver.phone || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {truck && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Truck
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-lg">{truck.truck_number}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">
                      {truck.year} {truck.make} {truck.model}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Confidence Scores */}
          {Object.keys(confidence).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Data Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(confidence).map(([field, conf]) => (
                    <div key={field} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">
                          {field.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-600">{conf.reason}</p>
                      </div>
                      <ConfidenceBadge
                        score={conf.score}
                        reason={conf.reason}
                        fieldName={field}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Loads */}
          {relatedLoads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Related Loads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatedLoads.map((load) => (
                    <div key={load.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{load.material || "Load"}</p>
                        <p className="text-sm text-gray-600">{load.plant || "N/A"}</p>
                      </div>
                      <Badge>{load.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Documents Preview */}
          <RelatedDocumentsPreview
            ticketId={ticket.id}
            ticketNumber={ticket.ticket_number}
          />
        </div>

        {/* Right Column - Financial Intelligence & Timeline */}
        <div className="space-y-6">
          <FinancialIntelligence
            ticket={{
              id: ticket.id,
              total_pay: financial.totalPay,
              total_bill: financial.totalBill,
              total_profit: financial.totalProfit,
              pay_rate: financial.payRate,
              bill_rate: financial.billRate,
              quantity: ticket.quantity,
              status: ticket.status,
            }}
          />
          <TicketTimeline
            ticketId={ticket.id}
            currentStatus={ticket.status}
            createdAt={ticket.created_at}
            updatedAt={ticket.updated_at}
          />
        </div>
      </div>
    </div>
  );
}
