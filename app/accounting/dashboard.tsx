"use client";
import { useState } from "react";

const companies = ["RONYX LLC", "Acme Logistics"];
const currencies = ["USD", "CAD", "MXN"];

export default function AccountingDashboard() {
  const [company, setCompany] = useState(companies[0]);
  const [currency, setCurrency] = useState(currencies[0]);
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Accounting & Billing</h1>
      <div className="flex gap-4 mb-6">
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {companies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="border rounded px-2 py-1"
        >
          {currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Accounts Receivable (AR)</h2>
          {/* TODO: List AR invoices, status, and payment links */}
          <div className="text-gray-500">No AR invoices yet.</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Accounts Payable (AP)</h2>
          {/* TODO: List AP bills, status, and payment actions */}
          <div className="text-gray-500">No AP bills yet.</div>
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Tax Compliance</h2>
        {/* TODO: Show tax status, filings, and reminders */}
        <div className="text-gray-500">
          Tax compliance dashboard coming soon.
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">QuickBooks/Xero Integration</h2>
        <p className="text-gray-600 mb-4">Connect your accounting software to sync invoices, payments, and financial data automatically.</p>
        <a 
          href="/accounting/integrations"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Manage Integrations →
        </a>
      </div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <strong>Automated Invoice & Payment Portals:</strong> Coming soon.
        Customers and vendors will be able to pay and download invoices online.
      </div>
    </div>
  );
}
