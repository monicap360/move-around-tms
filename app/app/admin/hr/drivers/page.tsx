"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function HRDriversPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const filtered = useMemo(()=> rows.filter(r => (r.name||'').toLowerCase().includes(q.toLowerCase()) || (r.email||'').toLowerCase().includes(q.toLowerCase())), [rows, q]);

  useEffect(()=>{ (async ()=>{
    const { data } = await supabase.from('drivers').select('id,name,email,phone,truck_make,truck_model');
    setRows(data || []);
  })(); },[]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">HR — Drivers</h1>
        <input className="border rounded p-2 w-64" placeholder="Search name or email" value={q} onChange={(e)=>setQ(e.target.value)} />
      </header>
      <Card>
        <CardHeader><CardTitle>All Drivers</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Phone</th>
                  <th className="p-2 text-left">Truck</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d)=> (
                  <tr key={d.id} className="border-b">
                    <td className="p-2">{d.name}</td>
                    <td className="p-2">{d.email}</td>
                    <td className="p-2">{d.phone||'—'}</td>
                    <td className="p-2">{[d.truck_make, d.truck_model].filter(Boolean).join(' ')||'—'}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Link href={`/drivers?id=${d.id}`} className="text-blue-600 underline">View Profile</Link>
                        <Link href={`/admin/hr-driver-verification?driver_id=${d.id}`} className="text-blue-600 underline">Verify Docs</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={5} className="p-3 text-gray-500">No drivers</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
