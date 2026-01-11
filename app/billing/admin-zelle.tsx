"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Button } from "../../components/ui/button";

export default function AdminZellePayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError("");
      // This assumes a 'payments' table exists with Zelle uploads and status
      const { data, error } = await supabase.from("payments").select("id, user_id, file_url, status, created_at").order("created_at", { ascending: false });
      if (error) setError(error.message);
      setPayments(data || []);
      setLoading(false);
    }
    fetchPayments();
  }, []);

  const handleApprove = async (id: string) => {
    await supabase.from("payments").update({ status: "active" }).eq("id", id);
    setPayments(payments => payments.map(p => p.id === id ? { ...p, status: "active" } : p));
  };
  const handleReject = async (id: string) => {
    await supabase.from("payments").update({ status: "rejected" }).eq("id", id);
    setPayments(payments => payments.map(p => p.id === id ? { ...p, status: "rejected" } : p));
  };

  return (
    <main className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Zelle Payment Receipts (Admin)</h1>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-600">{error}</div> : (
        <table className="w-full border mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">User</th>
              <th className="p-2">Receipt</th>
              <th className="p-2">Status</th>
              <th className="p-2">Actions</th>
              <th className="p-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.user_id}</td>
                <td className="p-2">
                  <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">View</a>
                </td>
                <td className="p-2 font-semibold capitalize">{p.status}</td>
                <td className="p-2">
                  {p.status === "pending" && <>
                    <Button onClick={() => handleApprove(p.id)} size="sm" className="mr-2">Approve</Button>
                    <Button onClick={() => handleReject(p.id)} size="sm" variant="destructive">Reject</Button>
                  </>}
                </td>
                <td className="p-2 text-xs">{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
