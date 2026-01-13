/**
 * MOVEAROUND TMS — MULTI-VERTICAL SYSTEM
 * 
 * Support 4 buyer types without branching the codebase:
 * - Construction Hauling
 * - Aggregates / Quarries
 * - Waste & Recycling
 * - Ready-Mix Concrete
 * 
 * Design Principles:
 * - One shared data model (no forks)
 * - Vertical logic lives in profiles, not tables
 * - Intelligence adapts via baselines, not rules
 * - Same UI components, different defaults
 * - Monetization stays identical across verticals
 */

export enum VerticalType {
  CONSTRUCTION_HAULING = 'construction_hauling',
  AGGREGATES_QUARRY = 'aggregates_quarry',
  WASTE_RECYCLING = 'waste_recycling',
  READY_MIX = 'ready_mix',
}

export type VerticalTypeString = 
  | 'construction_hauling'
  | 'aggregates_quarry'
  | 'waste_recycling'
  | 'ready_mix';

export interface VerticalProfile {
  type: VerticalType;
  name: string;
  description: string;
  
  // Baseline configuration
  baselineWindowDays: {
    driver: number;
    site: number;
    route?: number; // For waste/recycling
  };
  
  // Intelligence emphasis
  emphasis: {
    confidenceFields: string[];
    anomalyPriorities: string[];
    exceptionFocus: string[];
  };
  
  // UI defaults
  uiDefaults: {
    defaultSort: string;
    highlightFields: string[];
    dashboardMetrics: string[];
  };
}

/**
 * Vertical profile configurations
 */
export const VERTICAL_PROFILES: Record<VerticalType, VerticalProfile> = {
  [VerticalType.CONSTRUCTION_HAULING]: {
    type: VerticalType.CONSTRUCTION_HAULING,
    name: 'Construction Hauling',
    description: 'Heavy hauling, site delivery, material transport',
    baselineWindowDays: {
      driver: 30,
      site: 60,
    },
    emphasis: {
      confidenceFields: ['net_weight', 'quantity', 'ticket_number'],
      anomalyPriorities: ['weight_variance', 'missing_weights', 'driver_variability'],
      exceptionFocus: ['disputes', 'missing_tickets', 'driver_reliability'],
    },
    uiDefaults: {
      defaultSort: 'dispute_risk',
      highlightFields: ['driver_name', 'net_weight', 'total_amount'],
      dashboardMetrics: ['revenue_at_risk', 'dispute_frequency', 'ticket_completeness'],
    },
  },
  
  [VerticalType.AGGREGATES_QUARRY]: {
    type: VerticalType.AGGREGATES_QUARRY,
    name: 'Aggregates / Quarries',
    description: 'Scale accuracy, site operations, audit exposure',
    baselineWindowDays: {
      driver: 60,
      site: 90,
    },
    emphasis: {
      confidenceFields: ['scale_weight', 'quantity', 'site_id'],
      anomalyPriorities: ['scale_variance', 'site_dwell', 'delivery_timing'],
      exceptionFocus: ['scale_discrepancies', 'site_delays', 'audit_exposure'],
    },
    uiDefaults: {
      defaultSort: 'scale_variance',
      highlightFields: ['site_name', 'scale_weight', 'dwell_time'],
      dashboardMetrics: ['scale_variance_trend', 'site_dwell_baseline', 'audit_exposure_score'],
    },
  },
  
  [VerticalType.WASTE_RECYCLING]: {
    type: VerticalType.WASTE_RECYCLING,
    name: 'Waste & Recycling',
    description: 'Route consistency, contamination, regulatory compliance',
    baselineWindowDays: {
      driver: 30,
      site: 30,
      route: 14,
    },
    emphasis: {
      confidenceFields: ['route_id', 'material_type', 'contamination_level'],
      anomalyPriorities: ['route_variance', 'repeat_issues', 'contamination'],
      exceptionFocus: ['route_performance', 'repeat_anomalies', 'compliance_risk'],
    },
    uiDefaults: {
      defaultSort: 'route_consistency',
      highlightFields: ['route_name', 'material_type', 'contamination'],
      dashboardMetrics: ['route_performance_health', 'repeat_issue_heatmap', 'compliance_risk_trend'],
    },
  },
  
  [VerticalType.READY_MIX]: {
    type: VerticalType.READY_MIX,
    name: 'Ready-Mix Concrete',
    description: 'Time sensitivity, rejected loads, delivery timing',
    baselineWindowDays: {
      driver: 7,
      site: 30,
    },
    emphasis: {
      confidenceFields: ['delivery_time', 'rejection_status', 'batch_time'],
      anomalyPriorities: ['delivery_timing', 'rejection_risk', 'batch_variance'],
      exceptionFocus: ['delivery_timing_risk', 'rejection_likelihood', 'same_day_exceptions'],
    },
    uiDefaults: {
      defaultSort: 'delivery_risk',
      highlightFields: ['delivery_time', 'rejection_status', 'batch_id'],
      dashboardMetrics: ['delivery_timing_risk', 'rejection_likelihood', 'same_day_exception_count'],
    },
  },
};

/**
 * Get vertical profile by type
 */
export function getVerticalProfile(verticalType: VerticalTypeString | null): VerticalProfile {
  if (!verticalType || !(verticalType in VERTICAL_PROFILES)) {
    // Default to construction hauling if not specified
    return VERTICAL_PROFILES[VerticalType.CONSTRUCTION_HAULING];
  }
  return VERTICAL_PROFILES[verticalType as VerticalType];
}

/**
 * Get baseline window days for a vertical
 */
export function getBaselineWindowDays(
  verticalType: VerticalTypeString | null,
  entityType: 'driver' | 'site' | 'route'
): number {
  const profile = getVerticalProfile(verticalType);
  
  if (entityType === 'route' && profile.baselineWindowDays.route) {
    return profile.baselineWindowDays.route;
  }
  
  return profile.baselineWindowDays[entityType] || 30;
}

/**
 * Validate vertical type
 */
export function isValidVerticalType(value: string): value is VerticalTypeString {
  return Object.values(VerticalType).includes(value as VerticalType);
}
