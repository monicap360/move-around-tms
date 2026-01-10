import { ComplianceResultInput, ScanInput, DocumentInput } from './metrics.inputs'

// Replace bodies with real queries (DB, services, etc.)
export async function fetchComplianceResults(
  organizationId: string
): Promise<ComplianceResultInput[]> {
  // TODO: query compliance results by organizationId
  return []
}

export async function fetchScans(
  organizationId: string
): Promise<ScanInput[]> {
  // TODO: query scans by organizationId
  return []
}

export async function fetchDocuments(
  organizationId: string
): Promise<DocumentInput[]> {
  // TODO: query documents by organizationId
  return []
}
