"use client";

import { useEffect, useState } from "react";
// Placeholder for TanStack Table import and supabase client import
// import { useReactTable, ... } from '@tanstack/react-table';
// import { createClient } from '@/lib/supabase/client';

// Define the ticket type for OCR review
const columns = [
  { header: "Ticket #", accessorKey: "ticket_number", editable: false },
  { header: "Driver", accessorKey: "driver_name", editable: false },
  { header: "Date", accessorKey: "ticket_date", editable: false },
  { header: "Quantity (OCR)", accessorKey: "quantity", editable: false },
  { header: "Quantity (Reviewed)", accessorKey: "quantity_final", editable: true },
  { header: "Pay Method", accessorKey: "pay_method", editable: true },
  { header: "Pay Rate", accessorKey: "pay_rate", editable: true },
  { header: "% of Load", accessorKey: "pay_percentage", editable: true },
  { header: "Calculated Pay", accessorKey: "computed", editable: false },
  { header: "Needs Review", accessorKey: "needs_review", editable: false },
  { header: "Status", accessorKey: "ticket_status", editable: false },
  { header: "Notes", accessorKey: "admin_notes", editable: true },
];

export default function TicketsReviewPage() {
  // Placeholder state for tickets
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Load tickets from supabase (v_tickets_for_review)
    setLoading(false);
  }, []);

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
                <th key={col.header} className="p-2 text-left">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Placeholder: map tickets here */}
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-gray-500">
                No tickets loaded yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
