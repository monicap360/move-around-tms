import type { ComplianceContext, ComplianceResult, Violation } from "./types";
import { complianceRules } from "./rules";

export function evaluateCompliance(
  context: ComplianceContext,
): ComplianceResult[] {
  return complianceRules.map((rule) => rule.evaluate(context));
}

export function getViolations(context: ComplianceContext): Violation[] {
  const now = new Date().toISOString();
  return evaluateCompliance(context)
    .filter((r) => r.status === "fail")
    .map((r) => ({ ...r, timestamp: now }));
}
