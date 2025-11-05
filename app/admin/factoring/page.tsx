"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

type Company = {
  id?: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  advance_rate?: number;
  fee_rate?: number;
  reserve_rate?: number;
  standard_days?: number;
  address?: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...(init || {}),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export default function FactoringAdminPage() {
  const [rows, setRows] = useState<Company[]>([]);
  const [form, setForm] = useState<Company>({ name: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
  const data = await api<{ factoring: Company[] }>("/api/factoring");
        setRows(data.factoring);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [])

  const save = async () => {
    try {
      if (form.id) {
  const data = await api<{ company: Company }>("/api/factoring", { method: 'PATCH', body: JSON.stringify(form) })
        setRows((arr) => arr.map((v) => v.id === data.company.id ? data.company : v))
      } else {
  const data = await api<{ company: Company }>("/api/factoring", { method: 'POST', body: JSON.stringify(form) })
        setRows((arr) => [data.company, ...arr])
      }
      setForm({ name: '' })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const edit = (v: Company) => setForm(v)
  const del = async (id?: string) => {
    if (!id) return
    if (!confirm('Delete factoring company?')) return
    try {
  await api<{ ok: true }>(`/api/factoring?id=${id}`, { method: 'DELETE' })
      setRows((arr) => arr.filter((v) => v.id !== id))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Factoring Providers</h1>

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? 'Edit' : 'Add'} Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="border p-2 rounded" type="number" step="0.01" placeholder="Advance Rate (e.g., 0.9)" value={form.advance_rate ?? ''} onChange={(e) => setForm({ ...form, advance_rate: Number(e.target.value) })} />
            <input className="border p-2 rounded" type="number" step="0.01" placeholder="Fee Rate (e.g., 0.02)" value={form.fee_rate ?? ''} onChange={(e) => setForm({ ...form, fee_rate: Number(e.target.value) })} />
            <input className="border p-2 rounded" type="number" step="0.01" placeholder="Reserve (e.g., 0.1)" value={form.reserve_rate ?? ''} onChange={(e) => setForm({ ...form, reserve_rate: Number(e.target.value) })} />
            <input className="border p-2 rounded" type="number" placeholder="Standard Days" value={form.standard_days ?? ''} onChange={(e) => setForm({ ...form, standard_days: Number(e.target.value) })} />
            <input className="border p-2 rounded" placeholder="Address" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{form.id ? 'Update' : 'Add'}</Button>
            {form.id && <Button variant="secondary" onClick={() => setForm({ name: '' })}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? 'Loading…' : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Advance</th>
                  <th className="py-2 pr-4">Fee</th>
                  <th className="py-2 pr-4">Reserve</th>
                  <th className="py-2 pr-4">Days</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 pr-4">{v.name}</td>
                    <td className="py-2 pr-4">{v.advance_rate ?? '-'}</td>
                    <td className="py-2 pr-4">{v.fee_rate ?? '-'}</td>
                    <td className="py-2 pr-4">{v.reserve_rate ?? '-'}</td>
                    <td className="py-2 pr-4">{v.standard_days ?? '-'}</td>
                    <td className="py-2 pr-4 flex gap-2">
                      <Button size="sm" onClick={() => edit(v)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => del(v.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
