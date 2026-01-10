"use client";
import React, { useEffect, useState } from "react";

export default function FindDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchDrivers() {
      setLoading(true);
      const res = await fetch("/api/hr/driver-applications");
      const data = await res.json();
      setDrivers(data || []);
      setLoading(false);
    }
    fetchDrivers();
  }, []);

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.license_type?.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Find Screened Drivers</h1>
      <input
        className="w-full border p-2 rounded mb-6"
        placeholder="Search by name, license, or email"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-400">No drivers found.</div>
      ) : (
        <ul className="space-y-4">
          {filtered.map((d) => (
            <li key={d.id} className="bg-white rounded shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="font-bold text-lg">{d.name}</div>
                <div className="text-gray-600 text-sm">{d.license_type} • {d.experience} yrs</div>
                <div className="text-gray-500 text-xs">{d.email} • {d.phone}</div>
                {d.notes && <div className="text-xs text-gray-400 mt-1">{d.notes}</div>}
              </div>
              <div className="flex gap-2 items-center">
                {d.resume_url && (
                  <a href={d.resume_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm">Résumé</a>
                )}
                <button className="bg-blue-700 text-white px-4 py-2 rounded font-semibold">Contact</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
