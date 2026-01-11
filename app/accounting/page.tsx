"use client";
import { useEffect, useState } from "react";
import { Invoice } from "../../accounting/invoice.types";
import { fetchInvoicesForUser } from "../../accounting/supabase";

export default function AccountingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  // TODO: Replace with real user ID from auth context
  const user_id =
    typeof window !== "undefined" ? localStorage.getItem("user_id") || "" : "";

  useEffect(() => {
    if (!user_id) return;
    fetchInvoicesForUser(user_id)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [user_id]);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">My Invoices</h1>
      {loading ? (
        <div>Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="text-gray-500">No invoices found.</div>
      ) : (
        <table className="w-full border mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Invoice #</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Issued</th>
              <th className="p-2 text-left">PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-2">{inv.id.slice(0, 8)}</td>
                <td className="p-2">
                  ${inv.amount.toFixed(2)} {inv.currency}
                </td>
                <td className="p-2 capitalize">{inv.status}</td>
                <td className="p-2">{inv.issued_at.slice(0, 10)}</td>
                <td className="p-2">
                  {inv.pdf_url ? (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener"
                      className="text-blue-600 underline"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
