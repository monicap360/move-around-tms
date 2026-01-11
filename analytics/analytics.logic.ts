// Core logic for analytics event logging and summary
import { AnalyticsEvent, AnalyticsEventType, AnalyticsSummary } from './analytics.types';
import { v4 as uuidv4 } from 'uuid';

export function createAnalyticsEvent(params: {
  user_id: string;
  type: AnalyticsEventType;
  data?: Record<string, any>;
}): AnalyticsEvent {
  return {
    id: uuidv4(),
    user_id: params.user_id,
    type: params.type,
    data: params.data || {},
    created_at: new Date().toISOString(),
  };
}

// Aggregate events for a summary metric (stub)
export function summarizeEvents(events: AnalyticsEvent[], metric: string, period: string): AnalyticsSummary {
  // Example: count events of a type in a period
  const value = events.filter(e => e.type === metric && e.created_at.startsWith(period)).length;
  return { metric, value, period };
}
