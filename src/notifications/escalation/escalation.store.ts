// src/notifications/escalation/escalation.store.ts
import { EscalationRule } from './escalation.types'

// In-memory store for demo; replace with DB in production
const rules: EscalationRule[] = [
  { organizationId: 'demo_org', severity: 'critical', afterMinutes: 30, action: 'email', target: 'admin' },
  { organizationId: 'demo_org', severity: 'warn', afterMinutes: 60, action: 'email', target: 'ops' },
]

export function getEscalationRules(organizationId: string): EscalationRule[] {
  return rules.filter(r => r.organizationId === organizationId)
}

export function setEscalationRules(organizationId: string, updates: EscalationRule[]) {
  // Remove old for org/severity, add new
  for (const update of updates) {
    const idx = rules.findIndex(r =>
      r.organizationId === organizationId &&
      r.severity === update.severity
    )
    if (idx >= 0) rules.splice(idx, 1)
    rules.push({ ...update, organizationId })
  }
}
