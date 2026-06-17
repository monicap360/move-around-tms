// Centralized Supabase Storage path builder.
//
// Single bucket: tms-documents
// Root structure: {org_id}/{module}/{entity_id?}/{timestamp}_{safe_filename}
//
// Set RONYX_ORG_ID in .env to change the org (defaults to "ronyx").
// When selling MoveAround TMS to other companies, each company gets its own
// org_id and their files are fully isolated in the same bucket.

export const TMS_BUCKET = "tms-documents";

const ORG_ID = process.env.RONYX_ORG_ID || "ronyx";

function safeName(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\s]/g, "_");
}

function stamp(): string {
  return Date.now().toString();
}

// ── Module path builders ──────────────────────────────────────────────────

/** Ticket scan images / PDFs — organizations/{org}/fastscan/{ticketId}/{file} */
export function fastScanPath(ticketId: string, filename: string): string {
  return `${ORG_ID}/fastscan/${ticketId}/${stamp()}_${safeName(filename)}`;
}

/** CDL, MVR, physicals, applications — organizations/{org}/drivers/{driverId}/{file} */
export function driverDocPath(driverId: string, filename: string): string {
  return `${ORG_ID}/drivers/${driverId}/${stamp()}_${safeName(filename)}`;
}

/** Maintenance docs, inspection sheets — organizations/{org}/equipment/{equipmentId}/{file} */
export function equipmentPath(equipmentId: string, filename: string): string {
  return `${ORG_ID}/equipment/${equipmentId}/${stamp()}_${safeName(filename)}`;
}

/** COIs, W-9s, RMIS, drug/background — organizations/{org}/compliance/{entityId}/{file} */
export function compliancePath(entityId: string, filename: string): string {
  return `${ORG_ID}/compliance/${entityId}/${stamp()}_${safeName(filename)}`;
}

/** Pay sheets, settlement reports — organizations/{org}/payroll/{payPeriodId}/{file} */
export function payrollPath(payPeriodId: string, filename: string): string {
  return `${ORG_ID}/payroll/${payPeriodId}/${stamp()}_${safeName(filename)}`;
}

/** Contractor settlement packets — organizations/{org}/settlements/{contractorId}/{file} */
export function settlementPath(contractorId: string, filename: string): string {
  return `${ORG_ID}/settlements/${contractorId}/${stamp()}_${safeName(filename)}`;
}

/** Customer-facing docs — organizations/{org}/customers/{customerId}/{file} */
export function customerDocPath(customerId: string, filename: string): string {
  return `${ORG_ID}/customers/${customerId}/${stamp()}_${safeName(filename)}`;
}

/** Job site docs, permits, plans — organizations/{org}/projects/{projectId}/{file} */
export function projectDocPath(projectId: string, filename: string): string {
  return `${ORG_ID}/projects/${projectId}/${stamp()}_${safeName(filename)}`;
}

/** Customer invoices, billing packets — organizations/{org}/invoices/{invoiceId}/{file} */
export function invoicePath(invoiceId: string, filename: string): string {
  return `${ORG_ID}/invoices/${invoiceId}/${stamp()}_${safeName(filename)}`;
}

/** Subhauler agreements, ACH, OO contracts — organizations/{org}/contracts/{entityId}/{file} */
export function contractPath(entityId: string, filename: string): string {
  return `${ORG_ID}/contracts/${entityId}/${stamp()}_${safeName(filename)}`;
}

/** Closeout exports, backup archives — organizations/{org}/audit/{label}/{file} */
export function auditPath(label: string, filename: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `${ORG_ID}/audit/${today}_${label}/${stamp()}_${safeName(filename)}`;
}

// ── General fallback (when entity ID is not yet known) ───────────────────
// Used by the universal upload-file route before OCR assigns the entity.
export function generalUploadPath(module: string, filename: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `${ORG_ID}/${module}/${today}/${stamp()}_${safeName(filename)}`;
}

// ── Module → path builder map ─────────────────────────────────────────────
// Used by upload-file route to pick the right builder when no entity_id is given.
export const MODULE_BUCKET_MAP: Record<string, string> = {
  fastscan:    TMS_BUCKET,
  drivers:     TMS_BUCKET,
  equipment:   TMS_BUCKET,
  compliance:  TMS_BUCKET,
  payroll:     TMS_BUCKET,
  settlements: TMS_BUCKET,
  customers:   TMS_BUCKET,
  projects:    TMS_BUCKET,
  invoices:    TMS_BUCKET,
  contracts:   TMS_BUCKET,
  audit:       TMS_BUCKET,
  // Legacy aliases
  dispatch:    TMS_BUCKET,
  payout:      TMS_BUCKET,
  billing:     TMS_BUCKET,
  general:     TMS_BUCKET,
  images:      TMS_BUCKET,
};
