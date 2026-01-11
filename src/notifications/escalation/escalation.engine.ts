// src/notifications/escalation/escalation.engine.ts
import { EscalationRule } from "./escalation.types";
import { AlertEvent } from "@/src/alerts/history/alert.event.types";
import { getEscalationRules } from "./escalation.store";
import { getAlertEvents } from "@/src/alerts/history/alert.event.store";
// import { sendAlertDigestEmail } from '@/src/alerts/adapters/email.adapter' // Uncomment and adapt for real email

// Simulated escalation action (replace with real email logic)
function sendEscalationEmail(
  target: string,
  events: AlertEvent[],
  org: string,
  rule: EscalationRule,
) {
  console.log(
    `[ESCALATION] Email to ${target} for org ${org}:`,
    events.map((e) => e.message),
  );
}

export async function evaluateEscalations(organizationId: string) {
  const rules = getEscalationRules(organizationId);
  const now = Date.now();
  const events = getAlertEvents(organizationId, 1000).filter(
    (e) => !e.acknowledgedAt,
  );
  for (const rule of rules) {
    const overdue = events.filter(
      (e) =>
        e.severity === rule.severity &&
        (now - new Date(e.triggeredAt).getTime()) / 60000 >= rule.afterMinutes,
    );
    if (overdue.length) {
      sendEscalationEmail(rule.target, overdue, organizationId, rule);
    }
  }
}
