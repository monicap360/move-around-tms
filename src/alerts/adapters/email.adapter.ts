// src/alerts/adapters/email.adapter.ts

import { TriggeredAlert } from "../alerting.types";
import { getPreferences } from "@/src/notifications/preferences.store";

export type EmailSendResult = {
  to: string;
  subject: string;
  sent: boolean;
  error?: string;
};

export async function sendAlertDigestEmail(
  to: string,
  alerts: TriggeredAlert[],
  orgName: string,
  windowLabel: string,
  organizationId: string,
): Promise<EmailSendResult> {
  if (!alerts.length) return { to, subject: "", sent: false };
  const prefs = getPreferences(organizationId);
  const enabledSeverities = prefs
    .filter((pref) => pref.channel === "email" && pref.enabled)
    .map((pref) => pref.severity);
  const filtered = alerts.filter((alert) =>
    enabledSeverities.includes(alert.severity as any),
  );
  if (!filtered.length) return { to, subject: "", sent: false };
  const subject = `[ALERTS] ${orgName}: ${filtered.length} active alert${
    filtered.length > 1 ? "s" : ""
  } (${windowLabel})`;
  const body = formatAlertDigestBody(filtered, orgName, windowLabel);
  try {
    console.log("Sending email to", to, "\nSubject:", subject, "\nBody:\n", body);
    return { to, subject, sent: true };
  } catch (err: any) {
    return { to, subject, sent: false, error: err.message };
  }
}

function formatAlertDigestBody(
  alerts: TriggeredAlert[],
  orgName: string,
  windowLabel: string,
): string {
  return (
    `Organization: ${orgName}\nTime Window: ${windowLabel}\n\n` +
    alerts
      .map(
        (alert) =>
          `Severity: ${alert.severity}\nMessage: ${alert.message}\nMetric: ${alert.metricPath}\n---`,
      )
      .join("\n\n")
  );
}
