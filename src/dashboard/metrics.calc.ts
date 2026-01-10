import {
  DashboardOverviewMetrics,
  OCRConfidenceBucket,
  StatusCounts,
  TimeWindow,
  ViolationCount,
} from './metrics.types'
import { ComplianceResultInput, ScanInput, DocumentInput } from './metrics.inputs'

const inWindow = (iso: string, w: TimeWindow) =>
  iso >= w.from && iso <= w.to

export function calcStatusCounts(
  results: ComplianceResultInput[],
  window: TimeWindow
): StatusCounts {
  const counts = { pass: 0, warn: 0, fail: 0, total: 0 }
  for (const r of results) {
    if (!inWindow(r.occurredAt, window)) continue
    counts[r.status]++
    counts.total++
  }
  return counts
}

export function calcTopViolations(
  results: ComplianceResultInput[],
  window: TimeWindow,
  limit = 5
): ViolationCount[] {
  const map = new Map<string, ViolationCount>()
  for (const r of results) {
    if (!inWindow(r.occurredAt, window)) continue
    for (const v of r.violations) {
      const key = v.code
      const curr = map.get(key) ?? { code: v.code, label: v.label, count: 0 }
      curr.count++
      map.set(key, curr)
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

export function calcScansByDay(
  scans: ScanInput[],
  window: TimeWindow
): Array<{ date: string; count: number }> {
  const map = new Map<string, number>()
  for (const s of scans) {
    if (!inWindow(s.createdAt, window)) continue
    const day = s.createdAt.slice(0, 10)
    map.set(day, (map.get(day) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

export function calcOCRConfidence(
  scans: ScanInput[],
  window: TimeWindow
): { distribution: OCRConfidenceBucket[]; average: number | null } {
  const buckets: OCRConfidenceBucket[] = [
    { range: '0-49', count: 0 },
    { range: '50-69', count: 0 },
    { range: '70-84', count: 0 },
    { range: '85-100', count: 0 },
  ]
  let sum = 0
  let n = 0

  for (const s of scans) {
    if (!inWindow(s.createdAt, window)) continue
    if (s.ocrConfidence == null) continue
    const c = Math.max(0, Math.min(100, s.ocrConfidence))
    sum += c
    n++
    if (c < 50) buckets[0].count++
    else if (c < 70) buckets[1].count++
    else if (c < 85) buckets[2].count++
    else buckets[3].count++
  }

  return { distribution: buckets, average: n ? Math.round((sum / n) * 10) / 10 : null }
}

export function calcExpiringDocuments(
  docs: DocumentInput[],
  window: TimeWindow,
  withinDays = 30
) {
  const toMs = (iso: string) => new Date(iso).getTime()
  const now = toMs(window.to)

  return docs
    .filter(d => d.expiresAt)
    .map(d => ({
      documentId: d.id,
      type: d.type,
      expiresAt: d.expiresAt!,
      daysRemaining: Math.ceil((toMs(d.expiresAt!) - now) / 86400000),
    }))
    .filter(d => d.daysRemaining >= 0 && d.daysRemaining <= withinDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
}
