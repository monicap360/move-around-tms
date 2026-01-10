// src/alerts/adapters/email.adapter.ts

import { TriggeredAlert } from '../alerting.types'
import { getPreferences } from '@/src/notifications/preferences.store'

export type EmailSendResult = {
  to: string
  subject: string
  sent: boolean
  error?: string
}

  to: string,
  alerts: TriggeredAlert[],
  orgName: string,
  windowLabel: string,
  organizationId: string
): Promise<EmailSendResult> {
  if (!alerts.length) return { to, subject: '', sent: false }
  // Check notification preferences
  const prefs = getPreferences(organizationId)
  const enabledSeverities = prefs.filter(p => p.channel === 'email' && p.enabled).map(p => p.severity)
  const filtered = alerts.filter(a => enabledSeverities.includes(a.severity as any))
  if (!filtered.length) return { to, subject: '', sent: false }
  const subject = `[ALERTS] ${orgName}: ${filtered.length} active alert${filtered.length > 1 ? 's' : ''} (${windowLabel})`
  const body = formatAlertDigestBody(filtered, orgName, windowLabel)
  // TODO: Replace with real email provider (SMTP, SendGrid, SES, etc.)
  try {
    // await sendMail({ to, subject, body })
    console.log('Sending email to', to, '\nSubject:', subject, '\nBody:\n', body)
    return { to, subject, sent: true }
  } catch (err: any) {
    return { to, subject, sent: false, error: err.message }
  }
}

function formatAlertDigestBody(alerts: TriggeredAlert[], orgName: string, windowLabel: string): string {
  return `Organization: ${orgName}\nTime Window: ${windowLabel}\n\n` +
    alerts.map(a =>
      `Severity: ${a.severity}\nMessage: ${a.message}\nMetric: ${a.metricPath}\n---`
    ).join('\n\n')
}
