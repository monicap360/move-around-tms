// src/alerts/history/alert.history.types.ts
import { TriggeredAlert } from "../alerting.types";

export type AlertHistoryRecord = {
  id: string; // unique (alertId + org + timestamp)
  organizationId: string;
  alertId: string;
  triggeredAt: string; // ISO
  acknowledged: boolean;
  acknowledgedAt?: string; // ISO
  details: TriggeredAlert;
};
