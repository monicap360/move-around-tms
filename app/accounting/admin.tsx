// Admin invoice management page
import { useEffect, useState } from "react";
import { Invoice } from "../../accounting/invoice.types";
import { fetchAllInvoices } from "../../accounting/supabase";

export default function AdminInvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllInvoices()
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, []);

  const filtered = invoices.filter(
    (inv) =>
      inv.id.includes(search) ||
      inv.user_id.includes(search) ||
      inv.status.includes(search),
  );

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Invoice Management</h1>
      <input
        className="border p-2 mb-4 w-full"
        placeholder="Search by invoice #, user, or status"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <div>Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500">No invoices found.</div>
      ) : (
        <table className="w-full border mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Invoice #</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Issued</th>
              <th className="p-2 text-left">PDF</th>
              <th className="p-2 text-left">Zelle Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-2">{inv.id.slice(0, 8)}</td>
                <td className="p-2">{inv.user_id}</td>
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
                <td className="p-2">
                  {inv.zelle_receipt_url ? (
                    <a
                      href={inv.zelle_receipt_url}
                      target="_blank"
                      rel="noopener"
                      className="text-blue-600 underline"
                    >
                      View
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
