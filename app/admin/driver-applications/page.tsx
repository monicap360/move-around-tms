"use client";
import React, { useEffect, useState } from "react";

export default function AdminDriverApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchApps() {
      setLoading(true);
      const res = await fetch("/api/hr/driver-applications");
      const data = await res.json();
      setApps(data || []);
      setLoading(false);
    }
    fetchApps();
  }, []);

  const filtered = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.license_type?.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Driver Applications (Admin)</h1>
      <input
        className="w-full border p-2 rounded mb-6"
        placeholder="Search by name, license, or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400">No applications found.</div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="bg-white rounded shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <div className="font-bold text-lg">{a.name}</div>
                <div className="text-gray-600 text-sm">
                  {a.license_type} • {a.experience} yrs
                </div>
                <div className="text-gray-500 text-xs">
                  {a.email} • {a.phone}
                </div>
                {a.notes && (
                  <div className="text-xs text-gray-400 mt-1">{a.notes}</div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  Applied: {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                {a.resume_url && (
                  <a
                    href={a.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    Résumé
                  </a>
                )}
                <button className="bg-green-600 text-white px-4 py-2 rounded font-semibold">
                  Approve
                </button>
                <button className="bg-yellow-500 text-white px-4 py-2 rounded font-semibold">
                  Screen
                </button>
                <button className="bg-red-600 text-white px-4 py-2 rounded font-semibold">
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
