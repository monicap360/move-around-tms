// AI Dispatcher System Types

export interface DispatcherDecision {
  loadId: string;
  driverId: string;
  truckId?: string;
  reason: string;
  confidence: number;
  alternatives?: DispatcherDecision[];
  estimatedCost: number;
  estimatedTime: number;
  priority: number;
}

export interface LoadContext {
  id: string;
  pickup: { latitude: number; longitude: number; address?: string };
  delivery: { latitude: number; longitude: number; address?: string };
  priority: number;
  timeWindow?: { start: Date; end: Date };
  specialRequirements?: string[];
  weight: number;
  volume: number;
}

export interface DriverContext {
  id: string;
  location: { latitude: number; longitude: number };
  availability: { start: Date; end: Date };
  performance: {
    onTimeRate: number;
    safetyScore: number;
    rating: number;
  };
  currentLoads: number;
  certifications: string[];
  preferredLanes?: string[];
}

export interface DispatchRule {
  id: string;
  name: string;
  priority: number;
  condition: (load: LoadContext, driver: DriverContext) => boolean;
  action: (load: LoadContext, driver: DriverContext) => DispatcherDecision | null;
  enabled: boolean;
}

export interface DispatchResult {
  decisions: DispatcherDecision[];
  unassignedLoads: string[];
  metadata: {
    totalLoads: number;
    assignedLoads: number;
    executionTime: number;
    rulesApplied: string[];
  };
}
