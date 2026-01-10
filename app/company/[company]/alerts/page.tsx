"use client";
// Alerts UI scaffold: list of active alerts

import React, { useState } from 'react'
import Link from 'next/link'
import { AlertEvent } from '@/src/alerts/history/alert.event.types'

async function fetchAlertHistory(): Promise<AlertEvent[] | null> {
  const res = await fetch('/api/alerts/history', {
    headers: { 'x-organization-id': 'demo_org' },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

async function acknowledgeAlert(id: string) {
  await fetch('/api/alerts/acknowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, user: 'operator_1' }),
  })
}


export default function AlertsPage() {
  const [tab, setTab] = useState<'active' | 'acknowledged'>('active')
  const [history, setHistory] = React.useState<AlertEvent[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [acknowledging, setAcknowledging] = React.useState<string | null>(null)

  React.useEffect(() => {
    fetchAlertHistory().then(h => {
      setHistory(h)
      setLoading(false)
    })
  }, [acknowledging])

  const filtered = (history || []).filter(e =>
    tab === 'active' ? !e.acknowledgedAt : !!e.acknowledgedAt
  )

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Alerts</h1>
      <div className="mb-4 flex gap-4">
        <button
          className={`px-4 py-2 rounded ${tab === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('active')}
        >Active</button>
        <button
          className={`px-4 py-2 rounded ${tab === 'acknowledged' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('acknowledged')}
        >Acknowledged</button>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500">No {tab} alerts.</div>
      ) : (
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Severity</th>
              <th className="px-4 py-2 text-left">Message</th>
              <th className="px-4 py-2 text-left">Metric</th>
              <th className="px-4 py-2 text-left">Triggered</th>
              <th className="px-4 py-2 text-left">Acknowledged</th>
              <th className="px-4 py-2 text-left">Evidence</th>
              <th className="px-4 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(event => (
              <tr key={event.id}>
                <td className="px-4 py-2"><SeverityBadge severity={event.severity} /></td>
                <td className="px-4 py-2">{event.message}</td>
                <td className="px-4 py-2 text-xs text-gray-600">{event.metricPath}</td>
                <td className="px-4 py-2 text-xs">{new Date(event.triggeredAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs">
                  {event.acknowledgedAt ? new Date(event.acknowledgedAt).toLocaleString() : ''}
                </td>
                <td className="px-4 py-2">
                  <EvidenceLinks event={event} />
                </td>
                <td className="px-4 py-2">
                  {!event.acknowledgedAt && (
                    <button
                      className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                      disabled={acknowledging === event.id}
                      onClick={async () => {
                        setAcknowledging(event.id)
                        await acknowledgeAlert(event.id)
                        setAcknowledging(null)
                      }}
                    >Acknowledge</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}


function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === 'critical' ? 'bg-red-600' :
    severity === 'warn' ? 'bg-yellow-500' :
    'bg-blue-500'
  return (
    <span className={`inline-block px-2 py-1 text-xs text-white rounded ${color}`}>{severity}</span>
  )
}

function EvidenceLinks({ event }: { event: AlertEvent }) {
  // Example: link to compliance or fast scan based on metricPath
  if (event.metricPath.startsWith('compliance')) {
    return <Link href="../compliance" className="text-blue-600 underline">View Compliance</Link>
  }
  if (event.metricPath.startsWith('ocr')) {
    return <Link href="../fast-scan" className="text-blue-600 underline">View Fast Scan</Link>
  }
  if (event.metricPath.startsWith('documents')) {
    return <Link href="../documents" className="text-blue-600 underline">View Documents</Link>
  }
  return null
}
