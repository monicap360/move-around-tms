// src/notifications/escalation/escalation.types.ts
export type EscalationRule = {
  organizationId: string
  severity: 'warn' | 'critical'
  afterMinutes: number
  action: 'email'
  target: 'ops' | 'admin' | 'executive'
}
