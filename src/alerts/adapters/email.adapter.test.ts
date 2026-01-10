// src/alerts/adapters/email.adapter.test.ts
import { sendAlertDigestEmail } from './email.adapter'
import { TriggeredAlert } from '../alerting.types'

describe('sendAlertDigestEmail', () => {
  it('formats and logs email for alerts', async () => {
    const alerts: TriggeredAlert[] = [
      {
        id: 'compliance-failures',
        label: 'Compliance Failures',
        severity: 'critical',
        message: 'Compliance failures detected: 2',
        value: 2,
        metricPath: 'compliance.statusCounts.fail',
      },
    ]
    const result = await sendAlertDigestEmail('ops@example.com', alerts, 'Demo Org', '7d')
    expect(result.sent).toBe(true)
    expect(result.subject).toContain('Demo Org')
    expect(result.subject).toContain('1 active alert')
  })

  it('does not send if no alerts', async () => {
    const result = await sendAlertDigestEmail('ops@example.com', [], 'Demo Org', '7d')
    expect(result.sent).toBe(false)
  })
})
