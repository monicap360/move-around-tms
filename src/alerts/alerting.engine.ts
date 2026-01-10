// src/alerts/alerting.engine.ts
import { AlertDefinition, TriggeredAlert } from './alerting.types'
import { DashboardOverviewMetrics } from '../dashboard/metrics.types'

function getMetricValue(metrics: any, path: string): any {
  return path.split('.').reduce((obj, key) => (obj ? obj[key] : undefined), metrics)
}

function formatMessage(template: string, value: any): string {
  return template.replace('{value}', String(value))
}

export function evaluateAlerts(
  metrics: DashboardOverviewMetrics,
  definitions: AlertDefinition[]
): TriggeredAlert[] {
  const alerts: TriggeredAlert[] = []
  for (const def of definitions) {
    const value = getMetricValue(metrics, def.metricPath)
    let triggered = false
    switch (def.condition) {
      case '>':
        triggered = typeof value === 'number' && def.threshold !== undefined && value > def.threshold
        break
      case '>=':
        triggered = typeof value === 'number' && def.threshold !== undefined && value >= def.threshold
        break
      case '<':
        triggered = typeof value === 'number' && def.threshold !== undefined && value < def.threshold
        break
      case '<=':
        triggered = typeof value === 'number' && def.threshold !== undefined && value <= def.threshold
        break
      case '==':
        triggered = value === def.threshold
        break
      case 'exists':
        triggered = Array.isArray(value) ? value.length > 0 : !!value
        break
      case 'notExists':
        triggered = Array.isArray(value) ? value.length === 0 : !value
        break
    }
    if (triggered) {
      alerts.push({
        id: def.id,
        label: def.label,
        severity: def.severity,
        message: formatMessage(def.messageTemplate, value),
        value,
        metricPath: def.metricPath,
      })
    }
  }
  return alerts
}
