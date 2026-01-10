// Trends Dashboard (placeholder for time-based charts)

import React, { useState, useEffect } from 'react'

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', // red-600
  warn: '#f59e42',     // yellow-500
  info: '#2563eb',     // blue-600
}

function formatDate(date: string) {
  return date.length > 10 ? date : new Date(date).toLocaleDateString()
}

export default function TrendsDashboard() {
  const [window, setWindow] = useState('30d')
  const [groupBy, setGroupBy] = useState<'day' | 'week'>('day')
  const [trends, setTrends] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSeverity, setShowSeverity] = useState({ critical: true, warn: true, info: true })

  useEffect(() => {
    setLoading(true)
    setError(null)
    const now = new Date()
    let from = new Date()
    if (window === '7d') from.setDate(now.getDate() - 7)
    else if (window === '90d') from.setDate(now.getDate() - 90)
    else from.setDate(now.getDate() - 30)
    fetch(`/api/dashboards/trends?from=${from.toISOString().slice(0,10)}&to=${now.toISOString().slice(0,10)}&groupBy=${groupBy}`,
      { headers: { 'x-organization-id': 'demo_org' }, cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setTrends)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [window, groupBy])

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Trends</h1>
      <DashboardNav active="trends" />

      {/* Related actions block */}
      <div className="mb-6 bg-slate-50 p-4 rounded">
        <strong>Related:</strong>
        <div className="flex gap-6 mt-2">
          <a href="../../alerts" className="text-blue-700 underline">View Alerts</a>
          <a href="../../compliance" className="text-blue-700 underline">View Compliance</a>
          <a href="../../fast-scan" className="text-blue-700 underline">View Fast Scan</a>
          <a href="../../documents" className="text-blue-700 underline">View Documents</a>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <label>Window:
          <select value={window} onChange={e => setWindow(e.target.value)} className="ml-2 border rounded px-2 py-1">
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
          </select>
        </label>
        <label>Group by:
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} className="ml-2 border rounded px-2 py-1">
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </label>
        <span className="ml-4">Severity:</span>
        {Object.keys(SEVERITY_COLORS).map(sev => (
          <label key={sev} className="ml-2">
            <input type="checkbox" checked={showSeverity[sev]} onChange={e => setShowSeverity(s => ({ ...s, [sev]: e.target.checked }))} />
            <span className="ml-1" style={{ color: SEVERITY_COLORS[sev] }}>{sev}</span>
          </label>
        ))}
      </div>
      {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : trends ? (
        <div className="space-y-8">
          <TrendChart title="Alerts Triggered" buckets={trends.buckets} type="alerts" showSeverity={showSeverity} />
          <TrendChart title="Acknowledgements" buckets={trends.buckets} type="acknowledgements" showSeverity={showSeverity} />
          <TrendChart title="Escalations" buckets={trends.buckets} type="escalations" showSeverity={showSeverity} />
          <TrendChart title="Compliance Failures" buckets={trends.buckets} type="complianceFailures" showSeverity={showSeverity} />
        </div>
      ) : <div>No data.</div>}
    </div>
  )
}

function TrendChart({ title, buckets, type, showSeverity }: { title: string, buckets: any[], type: string, showSeverity: Record<string, boolean> }) {
  // Simple SVG bar/line chart (production: use chart lib)
  const width = 600, height = 180, pad = 32
  const keys = buckets.map((b: any) => b.date)
  const allSev = Object.keys(showSeverity).filter(s => showSeverity[s])
  const max = Math.max(1, ...buckets.map(b => allSev.reduce((sum, sev) => sum + (b.bySeverity[sev]?.[type] || 0), 0)))
  return (
    <div>
      <div className="font-semibold mb-2">{title}</div>
      <svg width={width} height={height} style={{ background: '#f9fafb', borderRadius: 8 }}>
        {buckets.map((b, i) => {
          let y0 = height - pad
          return allSev.map(sev => {
            const val = b.bySeverity[sev]?.[type] || 0
            const barH = (val / max) * (height - 2 * pad)
            const x = pad + i * ((width - 2 * pad) / (buckets.length - 1 || 1))
            const y = y0 - barH
            y0 -= barH
            return val > 0 ? (
              <rect key={sev + i} x={x - 10} y={y} width={20} height={barH} fill={SEVERITY_COLORS[sev]}>
                <title>{`${sev}: ${val}`}</title>
              </rect>
            ) : null
          })
        })}
        {/* X axis */}
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#888" />
        {buckets.map((b, i) => (
          <text key={b.date} x={pad + i * ((width - 2 * pad) / (buckets.length - 1 || 1))} y={height - pad + 16} fontSize={10} textAnchor="middle">{formatDate(b.date)}</text>
        ))}
        {/* Y axis */}
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#888" />
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <text key={f} x={pad - 8} y={height - pad - f * (height - 2 * pad)} fontSize={10} textAnchor="end">{Math.round(f * max)}</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-2">
        {allSev.map(sev => (
          <span key={sev} className="flex items-center"><span style={{ background: SEVERITY_COLORS[sev], width: 12, height: 12, display: 'inline-block', borderRadius: 2, marginRight: 4 }}></span>{sev}</span>
        ))}
      </div>
    </div>
  )
}

function DashboardNav({ active }: { active: string }) {
  const tabs = [
    { key: 'overview', label: 'Overview', href: './' },
    { key: 'trends', label: 'Trends', href: './trends' },
    { key: 'sla', label: 'SLA', href: './sla' },
    { key: 'risk', label: 'Risk', href: './risk' },
  ]
  return (
    <div className="mb-6 flex gap-4">
      {tabs.map(tab => (
        <a
          key={tab.key}
          href={tab.href}
          className={`px-4 py-2 rounded ${active === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          {tab.label}
        </a>
      ))}
    </div>
  )
}
