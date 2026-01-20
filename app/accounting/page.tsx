"use client";
import { useEffect, useState } from "react";
import { Invoice } from "../../accounting/invoice.types";
import { fetchInvoicesForUser, supabase as accountingSupabase } from "../../accounting/supabase";

export default function AccountingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function resolveUser() {
      const {
        data: { user },
      } = await accountingSupabase.auth.getUser();
      if (active) {
        setUserId(user?.id || null);
      }
    }

    resolveUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchInvoicesForUser(userId)
      .then(setInvoices)
      .catch((error) => {
        console.error("Error loading invoices:", error);
        setInvoices([]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

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
