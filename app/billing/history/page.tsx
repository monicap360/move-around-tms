"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BillingHistoryPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError("");
      const user = supabase.auth.getUser
        ? (await supabase.auth.getUser()).data.user
        : null;
      if (!user) {
        setError("Not logged in");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("payments")
        .select("id, file_url, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      setPayments(data || []);
      setLoading(false);
    }
    fetchPayments();
  }, []);

  return (
    <main className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Billing History</h1>
      <div className="border rounded p-4 bg-white shadow">
        {loading ? (
          <div>Loading…</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : payments.length === 0 ? (
          <div>No payment records found.</div>
        ) : (
          <table className="w-full border mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Receipt</th>
                <th className="p-2">Status</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2">
                    <a
                      href={p.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View
                    </a>
                  </td>
                  <td className="p-2 font-semibold capitalize">{p.status}</td>
                  <td className="p-2 text-xs">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
