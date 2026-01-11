export type TimeWindow = {
  label: "7d" | "30d" | "90d" | string;
  from: string; // ISO
  to: string; // ISO
};

export type ComplianceStatus = "pass" | "warn" | "fail";

export type StatusCounts = {
  pass: number;
  warn: number;
  fail: number;
  total: number;
};

export type ViolationCount = {
  code: string;
  label: string;
  count: number;
};

export type ExpiringDocument = {
  documentId: string;
  type: string;
  expiresAt: string; // ISO
  daysRemaining: number;
};

export type OCRConfidenceBucket = {
  range: "0-49" | "50-69" | "70-84" | "85-100";
  count: number;
};

export type DashboardOverviewMetrics = {
  organizationId: string;
  window: TimeWindow;

  scans: {
    total: number;
    byDay: Array<{ date: string; count: number }>;
  };

  compliance: {
    statusCounts: StatusCounts;
    topViolations: ViolationCount[];
    recentFailures: Array<{
      complianceResultId: string;
      occurredAt: string; // ISO
      reason: string;
      evidenceIds: string[];
    }>;
  };

  documents: {
    expiringSoon: ExpiringDocument[];
  };

  ocr: {
    confidenceDistribution: OCRConfidenceBucket[];
    averageConfidence: number | null;
  };

  generatedAt: string; // ISO
};
