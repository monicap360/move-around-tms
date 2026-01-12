// AI Predictive Analytics Types

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'demand_forecast' | 'route_prediction' | 'driver_performance' | 'maintenance_prediction' | 'cost_prediction';
  version: string;
  accuracy?: number;
  lastTrained?: Date;
}

export interface TrainingData {
  features: Record<string, number | string | boolean>[];
  labels: number[] | string[];
  timestamps?: Date[];
}

export interface Prediction {
  value: number | string;
  confidence: number;
  range?: [number, number]; // For numeric predictions
  metadata?: Record<string, any>;
}

export interface DemandForecast extends Prediction {
  predictedLoads: number;
  predictedRevenue: number;
  trends: TrendPoint[];
}

export interface TrendPoint {
  date: Date;
  value: number;
  confidence: number;
}

export interface RoutePrediction extends Prediction {
  predictedRoute: RoutePoint[];
  estimatedTime: number;
  estimatedCost: number;
  trafficFactors?: TrafficFactor[];
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp?: Date;
}

export interface TrafficFactor {
  location: { latitude: number; longitude: number };
  severity: 'low' | 'medium' | 'high';
  impact: number; // Time impact in minutes
}

export interface DriverPerformancePrediction extends Prediction {
  driverId: string;
  predictedScore: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  type: 'fatigue' | 'violation_risk' | 'accident_risk' | 'compliance_risk';
  severity: number;
  description: string;
}

export interface MaintenancePrediction extends Prediction {
  vehicleId: string;
  predictedFailureDate: Date;
  failureType: string;
  recommendedActions: MaintenanceAction[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface MaintenanceAction {
  type: 'inspection' | 'repair' | 'replacement' | 'service';
  description: string;
  estimatedCost: number;
  estimatedTime: number;
}

export interface CostPrediction extends Prediction {
  predictedTotalCost: number;
  breakdown: CostBreakdown;
  factors: CostFactor[];
}

export interface CostBreakdown {
  fuel: number;
  maintenance: number;
  driverWages: number;
  insurance: number;
  other: number;
}

export interface CostFactor {
  name: string;
  impact: number; // Percentage impact
  description: string;
}
