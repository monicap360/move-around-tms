// Compliance Rule Engine Types
import type { Scan, Document, ScanResult, Ticket } from "@/lib/fastscan/types";

export type ComplianceStatus = "pass" | "warn" | "fail";

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  evaluate: (context: ComplianceContext) => ComplianceResult;
}

export interface ComplianceContext {
  organizationId: string;
  scan: Scan;
  document?: Document;
  scanResult?: ScanResult;
  ticket?: Ticket;
}

export interface ComplianceResult {
  ruleId: string;
  status: ComplianceStatus;
  reason: string;
  evidence: string[]; // IDs of Scan/Document/Ticket
}

export interface Violation extends ComplianceResult {
  timestamp: string;
}
