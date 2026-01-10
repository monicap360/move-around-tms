// src/dashboard/trends/trends.types.ts
export type TrendBucket = {
  date: string // YYYY-MM-DD
  alerts: number
  acknowledgements: number
  escalations: number
  complianceFailures: number
  bySeverity: Record<string, {
    alerts: number
    acknowledgements: number
    escalations: number
    complianceFailures: number
  }>
}

export type TrendsResult = {
  buckets: TrendBucket[]
  groupBy: 'day' | 'week'
  from: string
  to: string
}
