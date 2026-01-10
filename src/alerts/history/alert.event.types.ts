// src/alerts/history/alert.event.types.ts
export type AlertEvent = {
  id: string
  organizationId: string
  alertId: string
  severity: 'info' | 'warn' | 'critical'
  message: string
  metricPath: string
  triggeredAt: string // ISO
  acknowledgedAt?: string // ISO
  acknowledgedBy?: string
  evidenceRefs: string[]
}
