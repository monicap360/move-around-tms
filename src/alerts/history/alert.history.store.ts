// src/alerts/history/alert.history.store.ts
import { AlertHistoryRecord } from './alert.history.types'

// In-memory store for demo; replace with DB in production
const alertHistory: AlertHistoryRecord[] = []

export function recordAlert(
  organizationId: string,
  alert: AlertHistoryRecord['details']
): AlertHistoryRecord {
  const now = new Date().toISOString()
  const id = `${organizationId}:${alert.id}:${now}`
  const record: AlertHistoryRecord = {
    id,
    organizationId,
    alertId: alert.id,
    triggeredAt: now,
    acknowledged: false,
    details: alert,
  }
  alertHistory.push(record)
  return record
}

export function getAlertHistory(
  organizationId: string,
  limit = 50
): AlertHistoryRecord[] {
  return alertHistory
    .filter(r => r.organizationId === organizationId)
    .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
    .slice(0, limit)
}

export function acknowledgeAlert(
  recordId: string
): boolean {
  const rec = alertHistory.find(r => r.id === recordId)
  if (rec && !rec.acknowledged) {
    rec.acknowledged = true
    rec.acknowledgedAt = new Date().toISOString()
    return true
  }
  return false
}
