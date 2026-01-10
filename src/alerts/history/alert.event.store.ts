// src/alerts/history/alert.event.store.ts
import { AlertEvent } from './alert.event.types'

// In-memory append-only store for demo; replace with DB in production
const alertEvents: AlertEvent[] = []

export function appendAlertEvent(event: AlertEvent) {
  alertEvents.push(event)
}

export function getAlertEvents(organizationId: string, limit = 50): AlertEvent[] {
  return alertEvents
    .filter(e => e.organizationId === organizationId)
    .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))
    .slice(0, limit)
}

export function acknowledgeAlertEvent(id: string, user: string): boolean {
  const event = alertEvents.find(e => e.id === id)
  if (event && !event.acknowledgedAt) {
    event.acknowledgedAt = new Date().toISOString()
    event.acknowledgedBy = user
    return true
  }
  return false
}
