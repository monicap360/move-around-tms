"use client";
import { useState } from "react";

export default function FastScanTicketPage({ params }) {
  const { organization_code } = params;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(
      `/api/company/${organization_code}/tickets/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount: parseFloat(amount), status }),
      },
    );
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">FastScan Ticket Creator</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="border p-2 w-full"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="border p-2 w-full"
          placeholder="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <input
          className="border p-2 w-full"
          placeholder="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Ticket"}
        </button>
      </form>
      {result && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          {result.ticket ? (
            <div>Ticket created: #{result.ticket.id}</div>
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
