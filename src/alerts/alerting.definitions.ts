// src/alerts/alerting.definitions.ts
import { AlertDefinition } from './alerting.types'

export const SYSTEM_ALERT_DEFINITIONS: AlertDefinition[] = [
  {
    id: 'compliance-failures',
    label: 'Compliance Failures',
    severity: 'critical',
    metricPath: 'compliance.statusCounts.fail',
    condition: '>',
    threshold: 0,
    messageTemplate: 'Compliance failures detected: {value}',
  },
  {
    id: 'compliance-failure-rate',
    label: 'Compliance Failure Rate',
    severity: 'warn',
    metricPath: 'compliance.statusCounts.fail',
    condition: '>=',
    threshold: 0.1, // 10% failure rate (example, can be refined)
    messageTemplate: 'Compliance failure rate is high: {value}',
  },
  {
    id: 'documents-expiring',
    label: 'Documents Expiring Soon',
    severity: 'warn',
    metricPath: 'documents.expiringSoon',
    condition: 'exists',
    messageTemplate: 'Documents expiring within 7 days: {value}',
  },
  {
    id: 'ocr-confidence-low',
    label: 'Low OCR Confidence',
    severity: 'info',
    metricPath: 'ocr.averageConfidence',
    condition: '<',
    threshold: 80,
    messageTemplate: 'OCR average confidence is low: {value}',
  },
]
