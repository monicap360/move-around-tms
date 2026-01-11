"use client";
import { useState } from "react";

export default function PayrollTicketsPage({ params }) {
  const { organization_code } = params;
  const [ticketIds, setTicketIds] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handlePayrollCalc(e) {
    e.preventDefault();
    setLoading(true);
    const ids = ticketIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const res = await fetch(
      `/api/company/${organization_code}/tickets/payroll-calc`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_ids: ids }),
      },
    );
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Payroll Calculation</h1>
      <form onSubmit={handlePayrollCalc} className="space-y-4">
        <input
          className="border p-2 w-full"
          placeholder="Comma-separated Ticket IDs"
          value={ticketIds}
          onChange={(e) => setTicketIds(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Calculating..." : "Calculate Payroll"}
        </button>
      </form>
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          {result.totalPayroll !== undefined ? (
            <div>
              <div className="font-semibold">
                Total Payroll: ${result.totalPayroll}
              </div>
              <div className="mt-2">Tickets:</div>
              <ul className="list-disc ml-6">
                {result.tickets?.map((t) => (
                  <li key={t.id}>
                    #{t.id} - {t.title || "Untitled"} - ${t.amount}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-red-600">
              Error: {result.error?.message || "Unknown error"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
