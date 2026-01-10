import { ComplianceStatus } from './metrics.types'

export type ComplianceResultInput = {
  id: string
  organizationId: string
  status: ComplianceStatus
  occurredAt: string // ISO
  violations: Array<{
    code: string
    label: string
    evidenceIds: string[]
  }>
}

export type ScanInput = {
  id: string
  organizationId: string
  createdAt: string // ISO
  ocrConfidence?: number | null
}

export type DocumentInput = {
  id: string
  organizationId: string
  type: string
  expiresAt?: string | null // ISO
}
