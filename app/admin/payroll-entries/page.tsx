"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";

type Employee = { id: string; full_name: string };
type Entry = {
  id: string;
  employee_id: string;
  employees?: { full_name: string } | null;
  pay_period_start: string;
  pay_period_end: string;
  pay_type: 'hourly'|'percentage'|'fixed'|string;
  total_hours: number|null;
  hourly_rate: number|null;
  percentage_rate: number|null;
  load_revenue: number|null;
  deductions: number|null;
  gross_pay: number|null;
  net_pay: number|null;
};

export default function PayrollEntriesAdminPage() {
  const [token, setToken] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Entry[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState<Partial<Entry>>({ pay_type:'hourly' });

  useEffect(()=> { if (token) { loadEmployees(); load(); } }, [token]);

  async function loadEmployees() {
    const res = await fetch('/api/admin/employees', { headers: { Authorization: `Bearer ${token}` }});
    const json = await res.json();
    if (res.ok && json.ok) setEmployees((json.items||[]).map((e:any)=>({ id: e.id, full_name: e.full_name })));
  }
  async function load() {
    setErr("");
    const url = new URL(window.location.origin + '/api/admin/payroll-entries');
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` }});
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error||'Failed to load'); return; }
    setItems(json.items || []);
  }

  async function create() {
    setErr(""); setMsg("");
    const res = await fetch('/api/admin/payroll-entries', { method:'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error||'Create failed'); return; }
    setMsg('Entry created'); setForm({ pay_type:'hourly' }); load();
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Payroll Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Token</label>
            <input type="password" value={token} onChange={(e)=>setToken(e.target.value)} className="w-full md:w-96 px-3 py-2 border rounded" placeholder="Enter admin token" />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={from} onChange={(e)=>setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={to} onChange={(e)=>setTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded w-full">Load</button>
            </div>
          </div>

          {/* Create */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Employee</label>
              <select className="w-full px-3 py-2 border rounded" value={form.employee_id as any || ''} onChange={(e)=>setForm({...form, employee_id: e.target.value})}>
                <option value="">Select...</option>
                {employees.map((e)=> (<option key={e.id} value={e.id}>{e.full_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Start</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.pay_period_start||''} onChange={(e)=>setForm({...form, pay_period_start: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">End</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.pay_period_end||''} onChange={(e)=>setForm({...form, pay_period_end: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pay Type</label>
              <select className="w-full px-3 py-2 border rounded" value={form.pay_type as any || 'hourly'} onChange={(e)=>setForm({...form, pay_type: e.target.value as any})}>
                <option>hourly</option>
                <option>percentage</option>
                <option>fixed</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={create} className="px-4 py-2 bg-blue-600 text-white rounded w-full">Create</button>
            </div>

            {/* Hourly */}
            {form.pay_type==='hourly' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hours</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.total_hours??''} onChange={(e)=>setForm({...form, total_hours: e.target.value? parseFloat(e.target.value): null})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hourly Rate</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.hourly_rate??''} onChange={(e)=>setForm({...form, hourly_rate: e.target.value? parseFloat(e.target.value): null})} />
                </div>
              </>
            )}
            {/* Percentage */}
            {form.pay_type==='percentage' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Load Revenue</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.load_revenue??''} onChange={(e)=>setForm({...form, load_revenue: e.target.value? parseFloat(e.target.value): null})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">% Rate</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.percentage_rate??''} onChange={(e)=>setForm({...form, percentage_rate: e.target.value? parseFloat(e.target.value): null})} />
                </div>
              </>
            )}
            {/* Common */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Deductions</label>
              <input type="number" step="0.01" className="w-full px-3 py-2 border rounded" value={form.deductions??''} onChange={(e)=>setForm({...form, deductions: e.target.value? parseFloat(e.target.value): null})} />
            </div>
          </div>

          {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
          {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}

          {/* List */}
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-2 text-left">Employee</th>
                  <th className="p-2 text-left">Period</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Gross</th>
                  <th className="p-2 text-left">Net</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it)=> (
                  <tr key={it.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{it.employees?.full_name || it.employee_id}</td>
                    <td className="p-2">{it.pay_period_start} → {it.pay_period_end}</td>
                    <td className="p-2">{it.pay_type}</td>
                    <td className="p-2">${(it.gross_pay??0).toFixed(2)}</td>
                    <td className="p-2">${(it.net_pay??0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
