// Types for analytics events and summaries
export type AnalyticsEventType =
  | "login"
  | "payment"
  | "fleet_update"
  | "document_upload"
  | "onboarding_step"
  | "error";

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  type: AnalyticsEventType;
  data: Record<string, any>;
  created_at: string;
}

export interface AnalyticsSummary {
  metric: string;
  value: number;
  period: string; // e.g. '2026-01', '2026-Q1'
}
