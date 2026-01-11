// src/alerts/alerting.types.ts
import { DashboardOverviewMetrics } from "../dashboard/metrics.types";

export type AlertSeverity = "info" | "warn" | "critical";

export type AlertDefinition = {
  id: string;
  label: string;
  severity: AlertSeverity;
  metricPath: string; // e.g. 'compliance.statusCounts.fail'
  condition: ">" | ">=" | "<" | "<=" | "==" | "exists" | "notExists";
  threshold?: number;
  messageTemplate: string; // e.g. 'Compliance failures: {value}'
};

export type TriggeredAlert = {
  id: string;
  label: string;
  severity: AlertSeverity;
  message: string;
  value: any;
  metricPath: string;
};

export type AlertingContext = {
  metrics: DashboardOverviewMetrics;
  definitions: AlertDefinition[];
};
