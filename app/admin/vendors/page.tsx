"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Vendor = {
  id?: string;
  name: string;
  type: 'Customer' | 'Vendor' | 'Factoring';
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  active?: boolean;
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

export default function VendorsAdminPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState<Vendor>({ name: '', type: 'Customer' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
  const data = await api<{ vendors: Vendor[] }>("/api/vendors");
        setVendors(data.vendors);
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
  const data = await api<{ vendor: Vendor }>("/api/vendors", { method: 'PATCH', body: JSON.stringify(form) })
        setVendors((arr) => arr.map((v) => v.id === data.vendor.id ? data.vendor : v))
      } else {
  const data = await api<{ vendor: Vendor }>("/api/vendors", { method: 'POST', body: JSON.stringify(form) })
        setVendors((arr) => [data.vendor, ...arr])
      }
      setForm({ name: '', type: 'Customer' })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const edit = (v: Vendor) => setForm(v)
  const del = async (id?: string) => {
    if (!id) return
    if (!confirm('Delete vendor?')) return
    try {
  await api<{ ok: true }>(`/api/vendors?id=${id}`, { method: 'DELETE' })
      setVendors((arr) => arr.filter((v) => v.id !== id))
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Vendors & Customers</h1>

      <Card>
        <CardHeader>
          <CardTitle>{form.id ? 'Edit' : 'Add'} Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="border p-2 rounded" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="border p-2 rounded" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
              <option value="Customer">Customer (AR)</option>
              <option value="Vendor">Vendor (AP)</option>
              <option value="Factoring">Factoring Provider</option>
            </select>
            <input className="border p-2 rounded" placeholder="Contact Name" value={form.contact_name||''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Contact Email" value={form.contact_email||''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Contact Phone" value={form.contact_phone||''} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            <input className="border p-2 rounded" placeholder="Address" value={form.address||''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>{form.id ? 'Update' : 'Add'}</Button>
            {form.id && <Button variant="secondary" onClick={() => setForm({ name: '', type: 'Customer' })}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? 'Loading…' : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Contact</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b">
                    <td className="py-2 pr-4">{v.name}</td>
                    <td className="py-2 pr-4">{v.type}</td>
                    <td className="py-2 pr-4">{v.contact_name || '-'} / {v.contact_email || '-'}</td>
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
