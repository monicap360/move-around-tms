import type {
  ComplianceRule,
  ComplianceContext,
  ComplianceResult,
} from "./types";

// Example rules
export const complianceRules: ComplianceRule[] = [
  {
    id: "missing-document",
    name: "Missing Required Document",
    description: "Scan must have an associated document.",
    evaluate: (ctx: ComplianceContext): ComplianceResult => {
      if (!ctx.document) {
        return {
          ruleId: "missing-document",
          status: "fail",
          reason: "No document found for scan.",
          evidence: [ctx.scan.id],
        };
      }
      return {
        ruleId: "missing-document",
        status: "pass",
        reason: "Document present.",
        evidence: [ctx.scan.id, ctx.document.id],
      };
    },
  },
  {
    id: "ocr-confidence",
    name: "OCR Confidence Threshold",
    description: "OCR must succeed for scan.",
    evaluate: (ctx: ComplianceContext): ComplianceResult => {
      if (!ctx.scanResult || ctx.scanResult.ocrStatus !== "success") {
        return {
          ruleId: "ocr-confidence",
          status: "fail",
          reason: "OCR did not succeed.",
          evidence: [ctx.scan.id],
        };
      }
      return {
        ruleId: "ocr-confidence",
        status: "pass",
        reason: "OCR succeeded.",
        evidence: [ctx.scan.id, ctx.scanResult.id],
      };
    },
  },
  {
    id: "ticket-mismatch",
    name: "Ticket Mismatch",
    description: "Scan ticket must match expected ticket number.",
    evaluate: (ctx: ComplianceContext): ComplianceResult => {
      if (!ctx.ticket || ctx.scan.ticketId !== ctx.ticket.id) {
        return {
          ruleId: "ticket-mismatch",
          status: "fail",
          reason: "Scan ticket does not match ticket record.",
          evidence: [ctx.scan.id],
        };
      }
      return {
        ruleId: "ticket-mismatch",
        status: "pass",
        reason: "Scan ticket matches ticket record.",
        evidence: [ctx.scan.id, ctx.ticket.id],
      };
    },
  },
];
