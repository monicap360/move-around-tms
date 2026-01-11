"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";

type Ticket = {
  id: string;
  ticket_number: string;
  ticket_date: string;
  material: string;
  quantity: number;
  unit_type: string;
  pay_rate: number;
  bill_rate: number;
  total_pay: number;
  total_bill: number;
  total_profit: number;
  driver_name_ocr: string | null;
  driver_matched_confidence: number | null;
  auto_matched: boolean;
  ocr_confidence: number | null;
  image_url: string | null;
  drivers: {
    id: string;
    name: string;
    pay_type: string;
    tax_status: string;
  } | null;
  aggregate_partners: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
};

export default function ManagerReviewPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingTicket, setEditingTicket] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (adminToken) {
      loadTickets();
      loadDrivers();
    }
  }, [adminToken]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-tickets", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      } else {
        setError("Failed to load tickets");
      }
    } catch (err) {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to load drivers", err);
    }
  };

  const handleAction = async (
    ticketId: string,
    action: string,
    extraData?: any,
  ) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/review-ticket", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ ticketId, action, ...extraData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update ticket");
      }

      setSuccess(`Ticket ${action}d successfully`);
      setEditingTicket(null);
      loadTickets();
    } catch (err: any) {
      setError(err.message || "Failed to update ticket");
    }
  };

  const startEdit = (ticket: Ticket) => {
    setEditingTicket(ticket.id);
    setEditForm({
      ticket_number: ticket.ticket_number,
      material: ticket.material,
      quantity: ticket.quantity,
      pay_rate: ticket.pay_rate,
      bill_rate: ticket.bill_rate,
      ticket_date: ticket.ticket_date,
    });
  };

  const saveEdit = (ticketId: string) => {
    handleAction(ticketId, "edit", { edits: editForm });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Admin Token Input */}
      {!adminToken && (
        <Card className="shadow-lg border bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Admin Token (required)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your admin token"
              />
              <button
                onClick={() => loadTickets()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Load
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Manager Review - Pending Tickets</CardTitle>
          <p className="text-sm text-blue-100">
            Review and approve OCR-scanned aggregate tickets
          </p>
        </CardHeader>
      </Card>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Tickets List */}
      {loading && (
        <p className="text-gray-500 text-center">Loading tickets...</p>
      )}

      {!loading && adminToken && tickets.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No pending tickets to review
        </p>
      )}

      <div className="space-y-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="shadow-lg border bg-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left: Ticket Info */}
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">
                    Ticket #{ticket.ticket_number || "N/A"}
                  </h3>
                  {ticket.aggregate_partners && (
                    <p className="text-sm text-gray-600">
                      Partner:{" "}
                      <span className="font-semibold">
                        {ticket.aggregate_partners.name}
                      </span>
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    Date: {new Date(ticket.ticket_date).toLocaleDateString()}
                  </p>
                  {editingTicket === ticket.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editForm.material}
                        onChange={(e) =>
                          setEditForm({ ...editForm, material: e.target.value })
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="Material"
                      />
                      {/* Editable quantity field based on pay type */}
                      {(() => {
                        const payType =
                          ticket.drivers?.pay_type || ticket.unit_type;
                        if (payType === "per_yard") {
                          return (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.yards ?? editForm.quantity ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  yards: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Yards"
                            />
                          );
                        } else if (payType === "per_ton") {
                          return (
                            <input
                              type="number"
                              step="0.01"
                              value={
                                editForm.net_tons ?? editForm.quantity ?? ""
                              }
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  net_tons: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Net Tons"
                            />
                          );
                        } else if (payType === "per_load") {
                          return (
                            <input
                              type="number"
                              step="1"
                              value={editForm.loads ?? editForm.quantity ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  loads: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Loads"
                            />
                          );
                        } else if (payType === "hourly") {
                          return (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.hours ?? editForm.quantity ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  hours: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Hours"
                            />
                          );
                        } else {
                          return (
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.quantity ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  quantity: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Quantity"
                            />
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Material:{" "}
                        <span className="font-semibold">{ticket.material}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity:{" "}
                        <span className="font-semibold">
                          {ticket.quantity} {ticket.unit_type}
                        </span>
                      </p>
                    </>
                  )}
                  {ticket.ocr_confidence && (
                    <p className="text-xs text-gray-500">
                      OCR Confidence: {ticket.ocr_confidence}%
                    </p>
                  )}
                </div>

                {/* Middle: Driver & Rates */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Assigned Driver
                    </label>
                    {ticket.drivers ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">
                          {ticket.drivers.name}
                        </p>
                        {ticket.auto_matched && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Auto-matched ({ticket.driver_matched_confidence}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">No driver assigned</p>
                    )}
                    {ticket.driver_name_ocr && (
                      <p className="text-xs text-gray-500">
                        OCR detected: {ticket.driver_name_ocr}
                      </p>
                    )}
                  </div>

                  <div className="text-sm space-y-1">
                    {editingTicket === ticket.id ? (
                      <>
                        <div>
                          <label className="text-xs text-gray-600">
                            Pay Rate
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.pay_rate}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                pay_rate: parseFloat(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Bill Rate
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.bill_rate}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                bill_rate: parseFloat(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <p>
                          Pay Rate:{" "}
                          <span className="font-semibold">
                            ${ticket.pay_rate}/unit
                          </span>
                        </p>
                        <p>
                          Bill Rate:{" "}
                          <span className="font-semibold">
                            ${ticket.bill_rate}/unit
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Totals & Actions */}
                <div className="space-y-3">
                  <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
                    {/* Pay preview formula */}
                    {(() => {
                      const payType =
                        ticket.drivers?.pay_type || ticket.unit_type;
                      if (payType === "per_yard") {
                        return (
                          <p className="text-blue-700">
                            Pay Preview: {ticket.quantity} yards × $
                            {ticket.pay_rate} ={" "}
                            <b>
                              ${(ticket.quantity * ticket.pay_rate).toFixed(2)}
                            </b>
                          </p>
                        );
                      } else if (payType === "per_ton") {
                        return (
                          <p className="text-blue-700">
                            Pay Preview: {ticket.quantity} tons × $
                            {ticket.pay_rate} ={" "}
                            <b>
                              ${(ticket.quantity * ticket.pay_rate).toFixed(2)}
                            </b>
                          </p>
                        );
                      } else if (payType === "per_load") {
                        return (
                          <p className="text-blue-700">
                            Pay Preview: {ticket.pay_rate} per load ={" "}
                            <b>${ticket.pay_rate.toFixed(2)}</b>
                          </p>
                        );
                      } else if (payType === "hourly") {
                        return (
                          <p className="text-blue-700">
                            Pay Preview: {ticket.quantity} hours × $
                            {ticket.pay_rate} ={" "}
                            <b>
                              ${(ticket.quantity * ticket.pay_rate).toFixed(2)}
                            </b>
                          </p>
                        );
                      } else if (payType === "percentage") {
                        return (
                          <p className="text-blue-700">
                            Pay Preview: {ticket.quantity} × {ticket.pay_rate}%
                            ={" "}
                            <b>
                              $
                              {(
                                (ticket.quantity * ticket.pay_rate) /
                                100
                              ).toFixed(2)}
                            </b>
                          </p>
                        );
                      } else {
                        return (
                          <p className="text-blue-700">
                            Pay Preview: {ticket.quantity} × ${ticket.pay_rate}{" "}
                            ={" "}
                            <b>
                              ${(ticket.quantity * ticket.pay_rate).toFixed(2)}
                            </b>
                          </p>
                        );
                      }
                    })()}
                    <p>
                      Pay:{" "}
                      <span className="font-semibold">
                        ${ticket.total_pay.toFixed(2)}
                      </span>
                    </p>
                    <p>
                      Bill:{" "}
                      <span className="font-semibold">
                        ${ticket.total_bill.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-green-700">
                      Profit:{" "}
                      <span className="font-bold">
                        ${ticket.total_profit.toFixed(2)}
                      </span>
                    </p>
                    {/* Needs review flag */}
                    {ticket.quantity === 0 && (
                      <p className="text-red-600 font-bold">
                        Needs Review: Quantity is zero
                      </p>
                    )}
                  </div>

                  {editingTicket === ticket.id ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => saveEdit(ticket.id)}
                        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingTicket(null)}
                        className="w-full px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleAction(ticket.id, "approve")}
                        className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => startEdit(ticket)}
                        className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Mark this ticket as VOID (excluded from payroll)?",
                            )
                          ) {
                            handleAction(ticket.id, "void");
                          }
                        }}
                        className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition"
                      >
                        ⚠ Void (no pay)
                      </button>
                      <div className="flex gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAction(ticket.id, "reassign", {
                                driverId: e.target.value,
                              });
                            }
                          }}
                          className="flex-1 px-2 py-2 border rounded text-sm"
                          defaultValue=""
                        >
                          <option value="">Reassign Driver...</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleAction(ticket.id, "deny")}
                        className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition"
                      >
                        ✗ Deny
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Permanently DELETE this ticket? This cannot be undone.",
                            )
                          ) {
                            handleAction(ticket.id, "delete");
                          }
                        }}
                        className="w-full px-3 py-2 bg-red-800 hover:bg-red-900 text-white text-sm rounded transition"
                      >
                        ⨯ Delete Permanently
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Preview */}
              {ticket.image_url && (
                <div className="mt-4 pt-4 border-t">
                  <a
                    href={ticket.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Ticket Image →
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
