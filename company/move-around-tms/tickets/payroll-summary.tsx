"use client";
import { useEffect, useState } from "react";

export default function PayrollSummary() {
  const [summary, setSummary] = useState({ total: 0, tickets: [] });
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [driverId, setDriverId] = useState("");

  async function fetchPayroll() {
    setLoading(true);
    const res = await fetch(
      "/api/company/move-around-tms/tickets/payroll-calc",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driverId,
          start_date: start,
          end_date: end,
        }),
      },
    );
    const data = await res.json();
    setSummary({ total: data.total_pay, tickets: data.tickets });
    setLoading(false);
  }

  return (
    <div className="bg-black text-white p-6 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Payroll Summary</h1>
      <div className="flex gap-2 mb-4">
        <input
          className="px-2 py-1 rounded bg-gray-800 border border-gray-700"
          placeholder="Driver ID"
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
        />
        <input
          className="px-2 py-1 rounded bg-gray-800 border border-gray-700"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          className="px-2 py-1 rounded bg-gray-800 border border-gray-700"
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <button
          className="px-4 py-1 bg-green-600 rounded"
          onClick={fetchPayroll}
        >
          Calculate
        </button>
      </div>
      {loading ? (
        <div>Enter info and click Calculate</div>
      ) : (
        <div>
          <div className="text-xl font-bold mb-2">
            Total Pay:{" "}
            <span className="text-green-400">${summary.total?.toFixed(2)}</span>
          </div>
          <div className="space-y-2">
            {summary.tickets.map((t) => (
              <div
                key={t.ticket_uuid}
                className="p-3 bg-gray-900 rounded border border-gray-800"
              >
                <div className="flex justify-between">
                  <div>#{t.ticket_uuid.slice(0, 8)}</div>
                  <div>${t.pay}</div>
                </div>
                <div className="text-xs opacity-60">
                  {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
