import { DashboardOverviewMetrics, TimeWindow } from './metrics.types'
import { ComplianceResultInput, ScanInput, DocumentInput } from './metrics.inputs'
import {
  calcStatusCounts,
  calcTopViolations,
  calcScansByDay,
  calcOCRConfidence,
  calcExpiringDocuments,
} from './metrics.calc'

export function buildDashboardOverview(
  organizationId: string,
  window: TimeWindow,
  inputs: {
    complianceResults: ComplianceResultInput[]
    scans: ScanInput[]
    documents: DocumentInput[]
  }
): DashboardOverviewMetrics {
  const statusCounts = calcStatusCounts(inputs.complianceResults, window)
  const topViolations = calcTopViolations(inputs.complianceResults, window)
  const byDay = calcScansByDay(inputs.scans, window)
  const ocr = calcOCRConfidence(inputs.scans, window)
  const expiringSoon = calcExpiringDocuments(inputs.documents, window)

  return {
    organizationId,
    window,
    scans: {
      total: statusCounts.total,
      byDay,
    },
    compliance: {
      statusCounts,
      topViolations,
      recentFailures: inputs.complianceResults
        .filter(r => r.status === 'fail')
        .filter(r => r.occurredAt >= window.from && r.occurredAt <= window.to)
        .slice(0, 10)
        .map(r => ({
          complianceResultId: r.id,
          occurredAt: r.occurredAt,
          reason: r.violations[0]?.label ?? 'Failure',
          evidenceIds: r.violations.flatMap(v => v.evidenceIds),
        })),
    },
    documents: { expiringSoon },
    ocr: {
      confidenceDistribution: ocr.distribution,
      averageConfidence: ocr.average,
    },
    generatedAt: new Date().toISOString(),
  }
}
