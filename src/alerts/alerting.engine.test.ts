// src/alerts/alerting.engine.test.ts
import { evaluateAlerts } from "./alerting.engine";
import { SYSTEM_ALERT_DEFINITIONS } from "./alerting.definitions";
import { DashboardOverviewMetrics } from "../dashboard/metrics.types";

describe("evaluateAlerts", () => {
  it("triggers compliance failure alert", () => {
    const metrics = {
      organizationId: "o",
      window: { label: "7d", from: "2026-01-01", to: "2026-01-07" },
      scans: { total: 10, byDay: [] },
      compliance: {
        statusCounts: { pass: 8, warn: 1, fail: 1, total: 10 },
        topViolations: [],
        recentFailures: [],
      },
      documents: { expiringSoon: [] },
      ocr: { confidenceDistribution: [], averageConfidence: 85 },
      generatedAt: "2026-01-07T00:00:00Z",
    } as DashboardOverviewMetrics;
    const alerts = evaluateAlerts(metrics, SYSTEM_ALERT_DEFINITIONS);
    expect(alerts.some((a) => a.id === "compliance-failures")).toBe(true);
  });

  it("does not trigger when no failures", () => {
    const metrics = {
      organizationId: "o",
      window: { label: "7d", from: "2026-01-01", to: "2026-01-07" },
      scans: { total: 10, byDay: [] },
      compliance: {
        statusCounts: { pass: 10, warn: 0, fail: 0, total: 10 },
        topViolations: [],
        recentFailures: [],
      },
      documents: { expiringSoon: [] },
      ocr: { confidenceDistribution: [], averageConfidence: 85 },
      generatedAt: "2026-01-07T00:00:00Z",
    } as DashboardOverviewMetrics;
    const alerts = evaluateAlerts(metrics, SYSTEM_ALERT_DEFINITIONS);
    expect(alerts.some((a) => a.id === "compliance-failures")).toBe(false);
  });
});
