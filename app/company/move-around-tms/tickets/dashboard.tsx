"use client";
import { useState } from "react";
import TicketDashboardWidgets from "./widgets";
import PayrollSummary from "./payroll-summary";

export default function TicketDashboard() {
  const [showPayroll, setShowPayroll] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Ticket Dashboard</h1>
      <TicketDashboardWidgets />
      <button
        className="mb-6 px-4 py-2 bg-blue-600 rounded-lg font-bold shadow hover:bg-blue-500 transition"
        onClick={() => setShowPayroll(!showPayroll)}
      >
        {showPayroll ? "Hide Payroll Summary" : "Show Payroll Summary"}
      </button>
      {showPayroll && <PayrollSummary />}
    </div>
  );
}
