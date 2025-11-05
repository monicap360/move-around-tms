"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Employee = {
  id: string;
  full_name: string;
  role_type: 'DRIVER'|'OWNER_OPERATOR'|'OFFICE_STAFF'|string;
  worker_type: 'W2'|'1099'|string;
  pay_type: 'hourly'|'percentage'|'fixed'|string;
  hourly_rate: number|null;
  percentage_rate: number|null;
  salary_amount: number|null;
  phone?: string|null;
  email?: string|null;
  address?: string|null;
  active: boolean;
};

export default function EmployeesAdminPage() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Employee[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({
    role_type: 'DRIVER',
    worker_type: '1099',
    pay_type: 'percentage',
    active: true,
  });

  useEffect(() => { if (token) load(); }, [token]);

  async function load() {
    setLoading(true); setErr("");
    try {
      const res = await fetch('/api/admin/employees', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to load');
      setItems(json.items || []);
    } catch (e:any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function createEmployee() {
    setErr(""); setMsg("");
    const res = await fetch('/api/admin/employees', {
      method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form)
    });
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error || 'Create failed'); return; }
    setMsg('Employee created'); setForm({ role_type:'DRIVER', worker_type:'1099', pay_type:'percentage', active:true }); load();
  }

  async function updateEmployee(id: string, updates: Partial<Employee>) {
    setErr(""); setMsg("");
    const res = await fetch('/api/admin/employees', {
      method: 'PATCH', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, ...updates })
    });
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error || 'Update failed'); return; }
    setMsg('Updated'); load();
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Token</label>
            <input type="password" value={token} onChange={(e)=>setToken(e.target.value)} className="w-full md:w-96 px-3 py-2 border rounded" placeholder="Enter admin token" />
          </div>

          {/* Create form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
              <input className="w-full px-3 py-2 border rounded" value={form.full_name||''} onChange={(e)=>setForm({...form, full_name:e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
              <select className="w-full px-3 py-2 border rounded" value={form.role_type as any} onChange={(e)=>setForm({...form, role_type:e.target.value as any})}>
                <option>DRIVER</option>
                <option>OWNER_OPERATOR</option>
                <option>OFFICE_STAFF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Worker Type</label>
              <select className="w-full px-3 py-2 border rounded" value={form.worker_type as any} onChange={(e)=>setForm({...form, worker_type:e.target.value as any})}>
                <option>W2</option>
                <option>1099</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pay Type</label>
              <select className="w-full px-3 py-2 border rounded" value={form.pay_type as any} onChange={(e)=>setForm({...form, pay_type:e.target.value as any})}>
                <option>hourly</option>
                <option>percentage</option>
                <option>fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hourly Rate</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.hourly_rate??''} onChange={(e)=>setForm({...form, hourly_rate: e.target.value? parseFloat(e.target.value): null})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">% Rate</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.percentage_rate??''} onChange={(e)=>setForm({...form, percentage_rate: e.target.value? parseFloat(e.target.value): null})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Salary</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.salary_amount??''} onChange={(e)=>setForm({...form, salary_amount: e.target.value? parseFloat(e.target.value): null})} />
            </div>
            <div className="flex items-end">
              <button onClick={createEmployee} className="px-4 py-2 bg-blue-600 text-white rounded w-full">Create</button>
            </div>
          </div>

          {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
          {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}

          {/* List */}
          {loading && <p className="text-gray-500">Loading...</p>}
          {!loading && (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Worker</th>
                    <th className="p-2 text-left">Pay</th>
                    <th className="p-2 text-left">Rates</th>
                    <th className="p-2 text-left">Active</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it)=> (
                    <tr key={it.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{it.full_name}</td>
                      <td className="p-2">{it.role_type}</td>
                      <td className="p-2">{it.worker_type}</td>
                      <td className="p-2">{it.pay_type}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <input type="number" step="0.01" className="w-24 px-2 py-1 border rounded" defaultValue={it.hourly_rate??''} onBlur={(e)=>updateEmployee(it.id,{ hourly_rate: e.target.value? parseFloat(e.target.value): null })} />
                          <input type="number" step="0.01" className="w-20 px-2 py-1 border rounded" defaultValue={it.percentage_rate??''} onBlur={(e)=>updateEmployee(it.id,{ percentage_rate: e.target.value? parseFloat(e.target.value): null })} />
                          <input type="number" step="0.01" className="w-28 px-2 py-1 border rounded" defaultValue={it.salary_amount??''} onBlur={(e)=>updateEmployee(it.id,{ salary_amount: e.target.value? parseFloat(e.target.value): null })} />
                        </div>
                      </td>
                      <td className="p-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={it.active} onChange={(e)=>updateEmployee(it.id,{ active: e.target.checked })} /> Active
                        </label>
                      </td>
                      <td className="p-2">
                        <button onClick={()=>updateEmployee(it.id, { pay_type: it.pay_type === 'hourly' ? 'percentage':'hourly' })} className="px-3 py-1 text-xs bg-gray-200 rounded">Toggle Pay</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
