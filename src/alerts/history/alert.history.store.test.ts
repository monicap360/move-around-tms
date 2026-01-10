// src/alerts/history/alert.history.store.test.ts
import { recordAlert, getAlertHistory, acknowledgeAlert } from './alert.history.store'
import { TriggeredAlert } from '../alerting.types'

describe('alert history store', () => {
  it('records and retrieves alert history', () => {
    const alert: TriggeredAlert = {
      id: 'compliance-failures',
      label: 'Compliance Failures',
      severity: 'critical',
      message: 'Compliance failures detected: 2',
      value: 2,
      metricPath: 'compliance.statusCounts.fail',
    }
    const rec = recordAlert('org1', alert)
    expect(rec.organizationId).toBe('org1')
    const history = getAlertHistory('org1')
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].details.id).toBe('compliance-failures')
  })

  it('acknowledges an alert', () => {
    const alert: TriggeredAlert = {
      id: 'ocr-confidence-low',
      label: 'Low OCR Confidence',
      severity: 'info',
      message: 'OCR average confidence is low: 75',
      value: 75,
      metricPath: 'ocr.averageConfidence',
    }
    const rec = recordAlert('org2', alert)
    const ok = acknowledgeAlert(rec.id)
    expect(ok).toBe(true)
    const history = getAlertHistory('org2')
    expect(history[0].acknowledged).toBe(true)
    expect(history[0].acknowledgedAt).toBeDefined()
  })
})
