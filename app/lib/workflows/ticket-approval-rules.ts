/**
 * Ticket Approval Workflow Rules
 * Business logic for automated approval workflows
 */

export interface ApprovalRule {
  id: string;
  name: string;
  condition: (ticket: any) => boolean;
  action: "auto_approve" | "require_manager" | "require_admin" | "flag_for_review";
  priority: number; // Lower number = higher priority
}

export interface TicketWorkflowResult {
  action: "auto_approve" | "require_manager" | "require_admin" | "flag_for_review" | "no_action";
  reason: string;
  ruleId?: string;
}

/**
 * Default approval rules
 */
export const DEFAULT_APPROVAL_RULES: ApprovalRule[] = [
  {
    id: "low_value_auto_approve",
    name: "Auto-approve low value tickets",
    condition: (ticket) => {
      const totalBill = ticket.total_bill || ticket.total_amount || 0;
      return totalBill > 0 && totalBill < 1000; // Auto-approve tickets under $1000
    },
    action: "auto_approve",
    priority: 1,
  },
  {
    id: "high_value_manager",
    name: "Require manager approval for high value",
    condition: (ticket) => {
      const totalBill = ticket.total_bill || ticket.total_amount || 0;
      return totalBill >= 10000; // Require manager for tickets $10k+
    },
    action: "require_manager",
    priority: 2,
  },
  {
    id: "very_high_value_admin",
    name: "Require admin approval for very high value",
    condition: (ticket) => {
      const totalBill = ticket.total_bill || ticket.total_amount || 0;
      return totalBill >= 50000; // Require admin for tickets $50k+
    },
    action: "require_admin",
    priority: 3,
  },
  {
    id: "low_confidence_review",
    name: "Flag low confidence tickets for review",
    condition: (ticket) => {
      // Check if ticket has low confidence scores
      if (ticket.confidence) {
        const confidences = Object.values(ticket.confidence) as any[];
        const lowestConfidence = Math.min(...confidences.map((c: any) => c.score || 1));
        return lowestConfidence < 0.5; // Flag if confidence < 50%
      }
      return false;
    },
    action: "flag_for_review",
    priority: 4,
  },
  {
    id: "negative_margin_review",
    name: "Flag negative margin tickets",
    condition: (ticket) => {
      const totalBill = ticket.total_bill || ticket.total_amount || 0;
      const totalPay = ticket.total_pay || 0;
      const margin = totalBill > 0 ? ((totalBill - totalPay) / totalBill) * 100 : 0;
      return margin < 0; // Flag if losing money
    },
    action: "flag_for_review",
    priority: 5,
  },
];

/**
 * Evaluate ticket against approval rules
 */
export function evaluateApprovalWorkflow(
  ticket: any,
  customRules: ApprovalRule[] = []
): TicketWorkflowResult {
  const allRules = [...DEFAULT_APPROVAL_RULES, ...customRules].sort(
    (a, b) => a.priority - b.priority
  );

  for (const rule of allRules) {
    try {
      if (rule.condition(ticket)) {
        return {
          action: rule.action,
          reason: `Rule: ${rule.name}`,
          ruleId: rule.id,
        };
      }
    } catch (err) {
      console.error(`Error evaluating rule ${rule.id}:`, err);
      continue;
    }
  }

  return {
    action: "no_action",
    reason: "No matching approval rules",
  };
}

/**
 * Check if ticket can be auto-approved
 */
export function canAutoApprove(ticket: any, customRules: ApprovalRule[] = []): boolean {
  const result = evaluateApprovalWorkflow(ticket, customRules);
  return result.action === "auto_approve";
}

/**
 * Get required approver level
 */
export function getRequiredApproverLevel(
  ticket: any,
  customRules: ApprovalRule[] = []
): "none" | "manager" | "admin" {
  const result = evaluateApprovalWorkflow(ticket, customRules);
  switch (result.action) {
    case "auto_approve":
      return "none";
    case "require_manager":
      return "manager";
    case "require_admin":
      return "admin";
    default:
      return "none";
  }
}
