"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Application = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  submitted_at?: string;
  status?: string;
};

export default function HRApplicationsPage() {
  const [rows, setRows] = useState<Application[]>([]);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (r.email || "").toLowerCase().includes(q.toLowerCase()),
      ),
    [rows, q],
  );

  useEffect(() => {
    (async () => {
      try {
        // Attempt to load from a conventional table name.
        const { data, error } = await supabase
          .from("driver_applications")
          .select("id,name,email,phone,position,submitted_at,status")
          .order("submitted_at", { ascending: false });
        if (error) throw error;
        setRows(data || []);
      } catch {
        // Fallback empty state if table not present
        setRows([]);
      }
    })();
  }, []);

  function mailtoDraft(a: Application) {
    const subject = encodeURIComponent(`Interview Availability — ${a.name}`);
    const body = encodeURIComponent(
      `Hi ${a.name},\n\nThank you for your application for the ${a.position || "Driver"} position.\n\nWe'd like to schedule a brief interview. Please reply with your availability over the next few days.\n\nThanks,\nHR Team`,
    );
    return `mailto:${a.email}?subject=${subject}&body=${body}`;
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">HR — Online Applications</h1>
        <input
          className="border rounded p-2 w-64"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Phone</th>
                  <th className="p-2 text-left">Position</th>
                  <th className="p-2 text-left">Submitted</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b">
                    <td className="p-2">{a.name}</td>
                    <td className="p-2">{a.email}</td>
                    <td className="p-2">{a.phone || "—"}</td>
                    <td className="p-2">{a.position || "Driver"}</td>
                    <td className="p-2">
                      {a.submitted_at
                        ? new Date(a.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-2">{a.status || "New"}</td>
                    <td className="p-2">
                      <a
                        className="text-blue-600 underline"
                        href={mailtoDraft(a)}
                      >
                        Draft Interview Email
                      </a>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-gray-500">
                      No applications found (or table missing). Ensure
                      'driver_applications' table exists.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
