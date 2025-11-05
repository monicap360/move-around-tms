"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { AlertTriangle, CheckCircle, XCircle, Ban, FileText, Calendar } from "lucide-react";

type MissingTicket = {
  id: string;
  ticket_number: string;
  partner_name: string;
  material: string;
  quantity: number;
  unit_type: string;
  ticket_date: string;
  total_pay: number;
  driver_name: string;
  missing_ticket_reason: string;
  target_week_start: string;
  target_week_end: string;
  csv_reconciled: boolean;
  csv_match_details: any;
  created_at: string;
  status: string;
};

export default function ReviewMissingTicketsPage() {
  const [tickets, setTickets] = useState<MissingTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadMissingTickets();
  }, []);

  async function loadMissingTickets() {
    try {
      const { data, error } = await supabase
        .from("aggregate_tickets")
        .select(`
          id,
          ticket_number,
          material,
          quantity,
          unit_type,
          ticket_date,
          total_pay,
          status,
          missing_ticket_reason,
          target_week_start,
          target_week_end,
          csv_reconciled,
          csv_match_details,
          created_at,
          aggregate_partners (name),
          drivers (name)
        `)
        .eq("is_missing_ticket", true)
        .eq("status", "Missing - Pending Approval")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading missing tickets:", error);
      } else {
        setTickets(
          (data || []).map((t: any) => ({
            id: t.id,
            ticket_number: t.ticket_number,
            partner_name: t.aggregate_partners?.name || "Unknown",
            material: t.material,
            quantity: t.quantity,
            unit_type: t.unit_type,
            ticket_date: t.ticket_date,
            total_pay: t.total_pay,
            driver_name: t.drivers?.name || "Unknown",
            missing_ticket_reason: t.missing_ticket_reason,
            target_week_start: t.target_week_start,
            target_week_end: t.target_week_end,
            csv_reconciled: t.csv_reconciled,
            csv_match_details: t.csv_match_details,
            created_at: t.created_at,
            status: t.status,
          }))
        );
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(ticketId: string, action: "approve" | "deny" | "void") {
    try {
      setProcessingId(ticketId);

      let newStatus = "";
      let voidTicket = false;

      switch (action) {
        case "approve":
          newStatus = "Approved";
          break;
        case "deny":
          newStatus = "Denied";
          break;
        case "void":
          newStatus = "Voided";
          voidTicket = true;
          break;
      }

      const updateData: any = { status: newStatus };
      
      // If voiding, set pay to $0
      if (voidTicket) {
        updateData.total_pay = 0;
        updateData.voided_at = new Date().toISOString();
        updateData.voided = true;
      }

      const { error } = await supabase
        .from("aggregate_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (error) {
        alert("Error: " + error.message);
      } else {
        alert(`✅ Ticket ${action}d successfully!`);
        loadMissingTickets(); // Refresh list
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading missing tickets...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          Review Missing Tickets
        </h1>
        <p className="text-gray-600">
          Approve, deny, or void tickets submitted by drivers after the pay week ended.
        </p>
      </div>

      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Review Guidelines:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Approve:</strong> Accept ticket, pay driver full amount, add to payroll</li>
            <li><strong>Deny:</strong> Reject ticket, driver receives no pay, not added to payroll</li>
            <li><strong>Void:</strong> Accept ticket exists but driver receives $0 pay (for tracking/billing only)</li>
            <li><strong>CSV Reconciliation:</strong> Green checkmark = ticket matches material plant records</li>
            <li><strong>AI Date Analysis:</strong> System auto-assigns correct pay week based on ticket date</li>
          </ul>
        </CardContent>
      </Card>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No missing tickets pending review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="border-2 border-orange-200">
              <CardHeader className="bg-orange-50">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span>Missing Ticket from {ticket.driver_name}</span>
                  </div>
                  <span className="text-sm font-normal text-gray-600">
                    Submitted: {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Ticket Details */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 mb-2">Ticket Details:</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Partner:</span>
                        <p className="font-medium">{ticket.partner_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Ticket #:</span>
                        <p className="font-medium">{ticket.ticket_number}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Material:</span>
                        <p className="font-medium">{ticket.material}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <p className="font-medium">{ticket.quantity} {ticket.unit_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Ticket Date:</span>
                        <p className="font-medium">{new Date(ticket.ticket_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Driver Pay:</span>
                        <p className="font-medium text-green-600">${ticket.total_pay.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <span className="text-gray-600 text-sm">Target Pay Week:</span>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {ticket.target_week_start} to {ticket.target_week_end}
                      </p>
                    </div>

                    {ticket.csv_reconciled && (
                      <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">CSV Reconciled</span>
                        </div>
                        {ticket.csv_match_details && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-blue-600">View Match Details</summary>
                            <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                              {JSON.stringify(ticket.csv_match_details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Driver Reason & Actions */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 mb-2">Driver's Reason:</h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-gray-800">{ticket.missing_ticket_reason}</p>
                    </div>

                    <div className="pt-3 border-t">
                      <h4 className="font-semibold text-gray-800 mb-3">Manager Actions:</h4>
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleAction(ticket.id, "approve")}
                          disabled={processingId === ticket.id}
                          className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve (Pay ${ticket.total_pay.toFixed(2)})
                        </Button>

                        <Button
                          onClick={() => handleAction(ticket.id, "void")}
                          disabled={processingId === ticket.id}
                          variant="outline"
                          className="w-full border-orange-500 text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4" />
                          Void (Accept but Pay $0)
                        </Button>

                        <Button
                          onClick={() => handleAction(ticket.id, "deny")}
                          disabled={processingId === ticket.id}
                          variant="outline"
                          className="w-full border-red-500 text-red-700 hover:bg-red-50 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Deny (Reject Ticket)
                        </Button>
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-700">
                        <p className="font-semibold mb-1">Action Details:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li><strong>Approve:</strong> Full pay, appears in payroll</li>
                          <li><strong>Void:</strong> $0 pay, kept for records/billing</li>
                          <li><strong>Deny:</strong> No pay, removed from payroll</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
