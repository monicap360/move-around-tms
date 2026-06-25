// Centralized Supabase Storage path builder.
//
// Single bucket: tms-documents
// Root structure: {org_uuid}/{module}/{entity_id?}/{timestamp}_{safe_filename}
//
// IMPORTANT: user_seats.organization_id is a UUID (not a text slug).
// The first path segment must be the Supabase UUID of the organization so
// the storage RLS policy (us.organization_id::text = foldername[1]) matches.
//
// To find your org UUID: SELECT id FROM public.organizations WHERE name = 'Ronyx';
// Then set RONYX_ORG_ID in .env.local to that UUID.
// Example: RONYX_ORG_ID=9f1c8e4a-1234-4567-8910-abcdef123456
//
// Path examples:
//   9f1c8e4a-.../fastscan/ticket-789/1718376000000_scale-ticket.jpg
//   9f1c8e4a-.../drivers/driver-123/1718376000000_cdl.pdf
//   9f1c8e4a-.../payroll/2026-W25/1718376000000_payroll-report.pdf

export const TMS_BUCKET = "tms-documents";

// Must be a UUID matching public.organizations.id
const ORG_ID = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000000";
if (ORG_ID === "00000000-0000-0000-0000-000000000000") {
  // Server-side warning — does not crash, but files will not pass RLS SELECT checks
  // until RONYX_ORG_ID is set in .env.local to the real org UUID from Supabase.
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
    console.warn("[storage-paths] RONYX_ORG_ID is not set. Run: SELECT id FROM public.organizations; and add it to .env.local");
  }
}

function safeName(filename: string): string {
  return filename.replace(/[<>:"/\\|?*\s]/g, "_");
}

function stamp(): string {
  return Date.now().toString();
}

// ════════════════════════════════════════════════════════════════════════════
// CANONICAL tenant-scoped path builders — orgId is REQUIRED.
// First segment MUST be the org UUID so the storage RLS policy
// (us.organization_id::text = foldername[1]) isolates each tenant. Resolve orgId
// per-request (lib/auth/resolveOrgId) and pass it explicitly — never an env org.
// ════════════════════════════════════════════════════════════════════════════
export function tenantPath(orgId: string, module: string, entityId: string, filename: string): string {
  if (!orgId) throw new Error("[storage-paths] tenantPath requires an explicit orgId");
  return `${orgId}/${module}/${entityId}/${stamp()}_${safeName(filename)}`;
}

/** Dated bucket for when the entity id isn't known yet (e.g. pre-OCR upload). */
export function tenantDatedPath(orgId: string, module: string, filename: string, label?: string): string {
  if (!orgId) throw new Error("[storage-paths] tenantDatedPath requires an explicit orgId");
  const today = new Date().toISOString().split("T")[0];
  const seg = label ? `${today}_${label}` : today;
  return `${orgId}/${module}/${seg}/${stamp()}_${safeName(filename)}`;
}

// ════════════════════════════════════════════════════════════════════════════
// @deprecated LEGACY single-tenant builders — bake in env RONYX_ORG_ID.
// DO NOT use in new code. Kept as transitional wrappers so existing callers keep
// building; migrate each to tenantPath()/tenantDatedPath(orgId, ...) then remove.
// ════════════════════════════════════════════════════════════════════════════

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
