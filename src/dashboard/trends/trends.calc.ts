// src/dashboard/trends/trends.calc.ts
import { AlertEvent } from "@/src/alerts/history/alert.event.types";
import { TrendsResult, TrendBucket } from "./trends.types";

function getDateKey(date: Date, groupBy: "day" | "week") {
  if (groupBy === "week") {
    // ISO week: YYYY-Www
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const year = d.getFullYear();
    const week = Math.ceil(
      ((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 +
        new Date(year, 0, 1).getDay() +
        1) /
        7,
    );
    return `${year}-W${week.toString().padStart(2, "0")}`;
  }
  return date.toISOString().slice(0, 10);
}

export function calcTrends(
  events: AlertEvent[],
  from: string,
  to: string,
  groupBy: "day" | "week" = "day",
  severity?: string,
): TrendsResult {
  const buckets: Record<string, TrendBucket> = {};
  const fromDate = new Date(from);
  const toDate = new Date(to);
  for (const e of events) {
    if (e.triggeredAt < from || e.triggeredAt > to) continue;
    if (severity && e.severity !== severity) continue;
    const key = getDateKey(new Date(e.triggeredAt), groupBy);
    if (!buckets[key]) {
      buckets[key] = {
        date: key,
        alerts: 0,
        acknowledgements: 0,
        escalations: 0,
        complianceFailures: 0,
        bySeverity: {},
      };
    }
    const b = buckets[key];
    b.alerts++;
    if (e.acknowledgedAt) b.acknowledgements++;
    if (!e.acknowledgedAt) b.escalations++;
    if (e.metricPath.startsWith("compliance") && e.severity === "critical")
      b.complianceFailures++;
    // By severity
    if (!b.bySeverity[e.severity]) {
      b.bySeverity[e.severity] = {
        alerts: 0,
        acknowledgements: 0,
        escalations: 0,
        complianceFailures: 0,
      };
    }
    b.bySeverity[e.severity].alerts++;
    if (e.acknowledgedAt) b.bySeverity[e.severity].acknowledgements++;
    if (!e.acknowledgedAt) b.bySeverity[e.severity].escalations++;
    if (e.metricPath.startsWith("compliance") && e.severity === "critical")
      b.bySeverity[e.severity].complianceFailures++;
  }
  // Fill missing buckets
  const result: TrendBucket[] = [];
  let d = new Date(fromDate);
  while (d <= toDate) {
    const key = getDateKey(d, groupBy);
    result.push(
      buckets[key] || {
        date: key,
        alerts: 0,
        acknowledgements: 0,
        escalations: 0,
        complianceFailures: 0,
        bySeverity: {},
      },
    );
    if (groupBy === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
  }
  return {
    buckets: result,
    groupBy,
    from,
    to,
  };
}
