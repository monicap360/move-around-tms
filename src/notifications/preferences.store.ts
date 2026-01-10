// src/notifications/preferences.store.ts
import { NotificationPreference } from './preferences.types'

// In-memory store for demo; replace with DB in production
const defaultPrefs: NotificationPreference[] = [
  { organizationId: 'demo_org', channel: 'email', severity: 'critical', enabled: true },
  { organizationId: 'demo_org', channel: 'email', severity: 'warn', enabled: true },
  { organizationId: 'demo_org', channel: 'email', severity: 'info', enabled: false },
]
const prefs: NotificationPreference[] = [...defaultPrefs]

export function getPreferences(organizationId: string): NotificationPreference[] {
  return prefs.filter(p => p.organizationId === organizationId)
}

export function setPreferences(organizationId: string, updates: NotificationPreference[]) {
  // Remove old for org/channel/severity, add new
  for (const update of updates) {
    const idx = prefs.findIndex(p =>
      p.organizationId === organizationId &&
      p.channel === update.channel &&
      p.severity === update.severity
    )
    if (idx >= 0) prefs.splice(idx, 1)
    prefs.push({ ...update, organizationId })
  }
}
