"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Define the ticket type for OCR review
const columns = [
  { header: "Ticket #", accessorKey: "ticket_number", editable: false },
  { header: "Driver", accessorKey: "driver_name", editable: false },
  { header: "Date", accessorKey: "ticket_date", editable: false },
  { header: "Quantity (OCR)", accessorKey: "quantity", editable: false },
  {
    header: "Quantity (Reviewed)",
    accessorKey: "quantity_final",
    editable: true,
  },
  { header: "Pay Method", accessorKey: "pay_method", editable: true },
  { header: "Pay Rate", accessorKey: "pay_rate", editable: true },
  { header: "% of Load", accessorKey: "pay_percentage", editable: true },
  { header: "Calculated Pay", accessorKey: "computed", editable: false },
  { header: "Needs Review", accessorKey: "needs_review", editable: false },
  { header: "Status", accessorKey: "ticket_status", editable: false },
  { header: "Notes", accessorKey: "admin_notes", editable: true },
];

export default function TicketsReviewPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTickets() {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_tickets_for_review")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setTickets(data);
      } else {
        console.error("Error loading tickets:", error);
        setTickets([]);
      }
      setLoading(false);
    }

    loadTickets();
  }, []);

  const handleFieldChange = (id: string, field: string, value: any) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === id ? { ...ticket, [field]: value } : ticket,
      ),
    );
  };

  const saveTicketField = async (id: string, field: string) => {
    const ticket = tickets.find((row) => row.id === id);
    if (!ticket) return;

    setSavingId(id);
    const { error } = await supabase
      .from("tickets")
      .update({
        [field]: ticket[field],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating ticket:", error);
    }
    setSavingId(null);
  };

  const getComputedPay = (ticket: any) => {
    const quantity = Number(ticket.quantity_final ?? ticket.quantity ?? 0);
    const payRate = Number(ticket.pay_rate ?? 0);
    const percentage = Number(ticket.pay_percentage ?? 0);
    if (percentage > 0 && percentage <= 100) {
      return (quantity * payRate * (percentage / 100)).toFixed(2);
    }
    return (quantity * payRate).toFixed(2);
  };

  if (loading) {
    return <div className="p-6">Loading OCR tickets…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">OCR Review & Reconciliation</h1>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((col) => (
                <th key={col.header} className="p-2 text-left">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-6 text-center text-gray-500"
                >
                  No tickets loaded yet
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t">
                  {columns.map((col) => {
                    if (col.accessorKey === "computed") {
                      return (
                        <td key={col.accessorKey} className="p-2">
                          ${getComputedPay(ticket)}
                        </td>
                      );
                    }

                    if (!col.editable) {
                      return (
                        <td key={col.accessorKey} className="p-2">
                          {String(ticket[col.accessorKey] ?? "--")}
                        </td>
                      );
                    }

                    return (
                      <td key={col.accessorKey} className="p-2">
                        <input
                          className="w-full border rounded px-2 py-1"
                          value={ticket[col.accessorKey] ?? ""}
                          onChange={(event) =>
                            handleFieldChange(
                              ticket.id,
                              col.accessorKey,
                              event.target.value,
                            )
                          }
                          onBlur={() =>
                            saveTicketField(ticket.id, col.accessorKey)
                          }
                          disabled={savingId === ticket.id}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
