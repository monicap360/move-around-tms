// src/sla/metrics.ts
import { AlertEvent } from '@/src/alerts/history/alert.event.types'

export type SLAMetrics = {
  mttaMean: number | null
  mttaMedian: number | null
  mtta95th: number | null
  acknowledgedRate: number
  escalationRate: number
  total: number
  bySeverity: Record<string, SLAMetrics>
}

function getMTTAs(events: AlertEvent[]): number[] {
  return events
    .filter(e => e.acknowledgedAt)
    .map(e => (new Date(e.acknowledgedAt!).getTime() - new Date(e.triggeredAt).getTime()) / 1000)
}

function percentile(arr: number[], p: number) {
  if (!arr.length) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[idx]
}

export function computeSLAMetrics(events: AlertEvent[]): SLAMetrics {
  const total = events.length
  const acked = events.filter(e => e.acknowledgedAt).length
  const escalated = events.filter(e => !e.acknowledgedAt).length // simple: unacknowledged = escalated
  const mttas = getMTTAs(events)
  const mean = mttas.length ? mttas.reduce((a, b) => a + b, 0) / mttas.length : null
  const median = mttas.length ? percentile(mttas, 50) : null
  const p95 = mttas.length ? percentile(mttas, 95) : null
  // By severity
  const bySeverity: Record<string, SLAMetrics> = {}
  for (const sev of ['critical', 'warn', 'info']) {
    bySeverity[sev] = computeSLAMetrics(events.filter(e => e.severity === sev))
  }
  return {
    mttaMean: mean,
    mttaMedian: median,
    mtta95th: p95,
    acknowledgedRate: total ? acked / total : 0,
    escalationRate: total ? escalated / total : 0,
    total,
    bySeverity,
  }
}
