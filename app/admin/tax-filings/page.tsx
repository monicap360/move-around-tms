"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type Employee = { id: string; full_name: string };
type Filing = {
  id: string;
  form_type: '940'|'941'|'W2'|'1099'|string;
  period_start?: string|null;
  period_end?: string|null;
  filing_date?: string|null;
  status?: 'filed'|'pending'|'overdue'|string;
  uploaded_pdf?: string|null;
  submitted_by?: string|null;
  employees?: { full_name: string } | null;
};

export default function TaxFilingsAdminPage() {
  const [token, setToken] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Filing[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<Partial<Filing>>({ form_type:'941', status:'pending' });

  useEffect(()=> { if (token) { loadEmployees(); load(); } }, [token]);

  async function loadEmployees() {
    const res = await fetch('/api/admin/employees', { headers: { Authorization: `Bearer ${token}` }});
    const json = await res.json();
    if (res.ok && json.ok) setEmployees((json.items||[]).map((e:any)=>({ id: e.id, full_name: e.full_name })));
  }
  async function load() {
    setErr("");
    const res = await fetch('/api/admin/tax-filings', { headers: { Authorization: `Bearer ${token}` }});
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error||'Failed to load'); return; }
    setItems(json.items || []);
  }

  async function create() {
    setErr(""); setMsg("");
    const res = await fetch('/api/admin/tax-filings', { method:'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error||'Create failed'); return; }
    setMsg('Filing recorded'); setForm({ form_type:'941', status:'pending' }); load();
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="shadow-lg border bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle>Tax Filings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Token</label>
            <input type="password" value={token} onChange={(e)=>setToken(e.target.value)} className="w-full md:w-96 px-3 py-2 border rounded" placeholder="Enter admin token" />
          </div>

          {/* Create */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Form Type</label>
              <select className="w-full px-3 py-2 border rounded" value={form.form_type as any} onChange={(e)=>setForm({...form, form_type: e.target.value as any})}>
                <option>940</option>
                <option>941</option>
                <option>W2</option>
                <option>1099</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Period Start</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.period_start||''} onChange={(e)=>setForm({...form, period_start: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Period End</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.period_end||''} onChange={(e)=>setForm({...form, period_end: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Filing Date</label>
              <input type="date" className="w-full px-3 py-2 border rounded" value={form.filing_date||''} onChange={(e)=>setForm({...form, filing_date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border rounded" value={form.status as any || 'pending'} onChange={(e)=>setForm({...form, status: e.target.value as any})}>
                <option>pending</option>
                <option>filed</option>
                <option>overdue</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">PDF URL</label>
              <input className="w-full px-3 py-2 border rounded" value={form.uploaded_pdf||''} onChange={(e)=>setForm({...form, uploaded_pdf: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Submitted By</label>
              <select className="w-full px-3 py-2 border rounded" value={form.submitted_by as any || ''} onChange={(e)=>setForm({...form, submitted_by: e.target.value})}>
                <option value="">(none)</option>
                {employees.map((e)=> (<option key={e.id} value={e.id}>{e.full_name}</option>))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={create} className="px-4 py-2 bg-blue-600 text-white rounded w-full">Record</button>
            </div>
          </div>

          {err && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{err}</div>}
          {msg && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{msg}</div>}

          {/* List */}
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-2 text-left">Form</th>
                  <th className="p-2 text-left">Period</th>
                  <th className="p-2 text-left">Filing</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Submitted By</th>
                  <th className="p-2 text-left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it)=> (
                  <tr key={it.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{it.form_type}</td>
                    <td className="p-2">{(it.period_start||'')} → {(it.period_end||'')}</td>
                    <td className="p-2">{it.filing_date||''}</td>
                    <td className="p-2">{it.status||''}</td>
                    <td className="p-2">{(it as any).employees?.full_name || ''}</td>
                    <td className="p-2">{it.uploaded_pdf ? <a className="text-blue-600 underline" href={it.uploaded_pdf} target="_blank">Open</a> : ''}</td>
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
