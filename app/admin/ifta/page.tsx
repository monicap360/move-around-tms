"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { jurisdiction_code: string; miles: number; gallons_purchased: number; taxable_gallons: number; rate: number; tax_due: number; tax_paid: number; net_tax: number };

export default function IFTAAdminPage() {
  const [token, setToken] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<1|2|3|4>(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ miles:0, gallons_purchased:0, taxable_gallons:0, tax_due:0, tax_paid:0, net_tax:0 });
  const [fleet, setFleet] = useState({ total_miles:0, total_gallons:0, mpg:0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const fuelFileRef = useRef<HTMLInputElement|null>(null);
  const tripsFileRef = useRef<HTMLInputElement|null>(null);
  const [rates, setRates] = useState<{ code: string; name: string; rate: number }[]>([]);
  const [newRate, setNewRate] = useState({ code: "LA", name: "Louisiana", rate: 0.0 });

  useEffect(()=>{ const t = localStorage.getItem('admin_token')||''; if (t) setToken(t) },[])

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/ifta/summary?year=${year}&quarter=${quarter}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to compute IFTA')
      setRows(json.rows || [])
      setTotals(json.totals || totals)
      setFleet(json.fleet || { total_miles:0, total_gallons:0, mpg:0 })
      if (token) localStorage.setItem('admin_token', token)
    } catch (e:any) { setError(e.message || 'Error') } finally { setLoading(false) }
  }

  function exportCsv() {
    const head = ['Jurisdiction','Miles','Gallons Purchased','Taxable Gallons','Rate','Tax Due','Tax Paid','Net Tax']
    const rowsCsv = rows.map(r => [r.jurisdiction_code, r.miles.toFixed(1), r.gallons_purchased.toFixed(3), r.taxable_gallons.toFixed(3), r.rate.toFixed(4), r.tax_due.toFixed(2), r.tax_paid.toFixed(2), r.net_tax.toFixed(2)])
    const csv = [head, ...rowsCsv, ['TOTALS', totals.miles.toFixed(1), totals.gallons_purchased.toFixed(3), totals.taxable_gallons.toFixed(3), '', totals.tax_due.toFixed(2), totals.tax_paid.toFixed(2), totals.net_tax.toFixed(2)]].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `ifta-q${quarter}-${year}.csv`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  async function exportPdf() {
    const res = await fetch(`/api/admin/ifta/export?year=${year}&quarter=${quarter}`, { headers: { Authorization: `Bearer ${token}` } })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`ifta-q${quarter}-${year}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
  }

  async function saveFiling() {
    const summary = { year, quarter, fleet, totals, rows }
    const res = await fetch('/api/admin/ifta/filings', { method:'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ year, quarter, summary_json: summary, status: 'Draft' }) })
    const json = await res.json(); if (!res.ok || !json.ok) { setError(json.error || 'Failed to save filing') } else { alert('Saved filing draft.') }
  }

  async function uploadCsv(endpoint: string, file?: File | null) {
    if (!token) { setError('Admin token required'); return; }
    if (!file) { setError('Please choose a CSV file'); return; }
    const form = new FormData(); form.append('file', file);
    setLoading(true); setError(null);
    try {
      const res = await fetch(endpoint, { method:'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const json = await res.json().catch(()=>({ ok: res.ok }));
      if (!res.ok || (json.ok === false)) throw new Error(json.error || 'Upload failed');
      alert('Upload successful');
    } catch(e:any) { setError(e.message || 'Upload error'); } finally { setLoading(false); }
  }

  async function loadRates() {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/ifta/rates', { headers: { Authorization: `Bearer ${token}` }});
      const json = await res.json();
      if (res.ok && json.ok) setRates(json.rates || []);
    } catch {}
  }

  async function upsertRate() {
    if (!token) { setError('Admin token required'); return; }
    try {
      const res = await fetch('/api/admin/ifta/rates', { method:'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(newRate) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to save rate');
      await loadRates();
      alert('Saved rate');
    } catch(e:any) { setError(e.message || 'Failed to save rate'); }
  }

  useEffect(() => { if (token) loadRates(); }, [token]);

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">IFTA (Texas) — Quarterly</h1>
        <Link href="/aggregates"><Button variant="secondary">Back</Button></Link>
      </header>

      <section className="bg-white p-4 rounded border shadow-sm space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Token</label>
            <input type="password" value={token} onChange={(e)=>setToken(e.target.value)} placeholder="Enter admin token" className="w-full md:w-96 px-3 py-2 border rounded" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={run} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!token || loading}>{loading ? 'Computing…' : 'Run'}</button>
            <Button onClick={exportCsv} variant="secondary">Export CSV</Button>
            <Button onClick={exportPdf} variant="secondary">Export PDF</Button>
            <Button onClick={saveFiling}>Save Filing</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <label className="text-sm">Year<input type="number" className="w-full border p-2 rounded" value={year} onChange={(e)=>setYear(Number(e.target.value))} /></label>
          <label className="text-sm">Quarter<select className="w-full border p-2 rounded" value={quarter} onChange={(e)=>setQuarter(Number(e.target.value) as any)}><option value={1}>Q1 (Jan–Mar)</option><option value={2}>Q2 (Apr–Jun)</option><option value={3}>Q3 (Jul–Sep)</option><option value={4}>Q4 (Oct–Dec)</option></select></label>
          <div className="md:col-span-3 text-sm text-gray-600 flex items-end">Fleet MPG: <span className="font-semibold ml-1">{fleet.mpg.toFixed(3)}</span> · Miles: {fleet.total_miles.toFixed(1)} · Gallons: {fleet.total_gallons.toFixed(3)}</div>
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>}
      </section>

      {/* Uploads */}
      <section className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Upload Gas Receipts (CSV)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input ref={fuelFileRef} type="file" accept=".csv" className="block" />
            <Button onClick={()=>uploadCsv('/api/admin/ifta/upload-fuel', fuelFileRef.current?.files?.[0] || null)} disabled={loading || !token}>Upload Fuel CSV</Button>
            <p className="text-xs text-gray-600">CSV headers: purchase_date,jurisdiction_code,truck_id,vendor,gallons,amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upload Mileage Logs (CSV)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <input ref={tripsFileRef} type="file" accept=".csv" className="block" />
            <Button onClick={()=>uploadCsv('/api/admin/ifta/upload-trips', tripsFileRef.current?.files?.[0] || null)} disabled={loading || !token}>Upload Trips CSV</Button>
            <p className="text-xs text-gray-600">CSV headers: trip_id,start_time,end_time,truck_id,jurisdiction_code,miles</p>
          </CardContent>
        </Card>
      </section>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left border">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-2">Jurisdiction</th>
              <th className="p-2 text-right">Miles</th>
              <th className="p-2 text-right">Gallons Purchased</th>
              <th className="p-2 text-right">Taxable Gallons</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Tax Due</th>
              <th className="p-2 text-right">Tax Paid</th>
              <th className="p-2 text-right">Net Tax</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.jurisdiction_code} className="border-b">
                <td className="p-2">{r.jurisdiction_code}</td>
                <td className="p-2 text-right">{r.miles.toFixed(1)}</td>
                <td className="p-2 text-right">{r.gallons_purchased.toFixed(3)}</td>
                <td className="p-2 text-right">{r.taxable_gallons.toFixed(3)}</td>
                <td className="p-2 text-right">${r.rate.toFixed(4)}</td>
                <td className="p-2 text-right">${r.tax_due.toFixed(2)}</td>
                <td className="p-2 text-right">${r.tax_paid.toFixed(2)}</td>
                <td className="p-2 text-right font-semibold">${r.net_tax.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={8}>Run a quarter to see results</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t">
                <td className="p-2 font-semibold">TOTALS</td>
                <td className="p-2 text-right font-semibold">{totals.miles.toFixed(1)}</td>
                <td className="p-2 text-right font-semibold">{totals.gallons_purchased.toFixed(3)}</td>
                <td className="p-2 text-right font-semibold">{totals.taxable_gallons.toFixed(3)}</td>
                <td className="p-2"></td>
                <td className="p-2 text-right font-semibold">${totals.tax_due.toFixed(2)}</td>
                <td className="p-2 text-right font-semibold">${totals.tax_paid.toFixed(2)}</td>
                <td className="p-2 text-right font-semibold">${totals.net_tax.toFixed(2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jurisdiction Tax Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.code} className="border-t">
                    <td className="p-2 font-mono">{r.code}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-right">{r.rate.toFixed(4)}</td>
                  </tr>
                ))}
                {rates.length===0 && <tr><td colSpan={3} className="p-3 text-gray-500">No rates loaded. Enter Admin Token to load.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <label className="text-sm">Code<input className="w-full border p-2 rounded" value={newRate.code} onChange={(e)=>setNewRate({...newRate, code: e.target.value.toUpperCase()})} /></label>
            <label className="text-sm">Name<input className="w-full border p-2 rounded" value={newRate.name} onChange={(e)=>setNewRate({...newRate, name: e.target.value})} /></label>
            <label className="text-sm">Rate<input type="number" step="0.0001" className="w-full border p-2 rounded" value={newRate.rate} onChange={(e)=>setNewRate({...newRate, rate: Number(e.target.value)})} /></label>
            <Button onClick={upsertRate} disabled={!token}>Save/Update</Button>
          </div>
          <p className="text-xs text-gray-600">Tip: Add Louisiana (LA) here with the latest published IFTA rate.</p>
        </CardContent>
      </Card>
    </main>
  )
}
