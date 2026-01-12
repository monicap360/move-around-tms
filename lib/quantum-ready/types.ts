// Quantum-Ready Optimization Types
// This interface allows swapping between classical, quantum-inspired, and quantum backends

export interface OptimizationProblem {
  type: 'vehicle_routing' | 'load_assignment' | 'scheduling' | 'resource_allocation';
  constraints: OptimizationConstraint[];
  objective: OptimizationObjective;
  variables: OptimizationVariable[];
}

export interface OptimizationConstraint {
  type: 'capacity' | 'time_window' | 'location' | 'driver_availability' | 'truck_compatibility';
  value: any;
  operator: 'less_than' | 'greater_than' | 'equal' | 'not_equal';
}

export interface OptimizationObjective {
  type: 'minimize_cost' | 'minimize_distance' | 'maximize_utilization' | 'minimize_time';
  weights?: Record<string, number>;
}

export interface OptimizationVariable {
  name: string;
  type: 'integer' | 'boolean' | 'continuous';
  bounds?: [number, number];
}

export interface OptimizationSolution {
  assignments: Assignment[];
  cost: number;
  metadata: {
    solver: 'classical' | 'quantum_inspired' | 'quantum' | 'hybrid';
    executionTime: number;
    iterations?: number;
    qubitsUsed?: number;
    confidence?: number;
  };
}

export interface Assignment {
  loadId: string;
  driverId: string;
  truckId: string;
  route?: RoutePoint[];
  estimatedCost: number;
  estimatedTime: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  address?: string;
  sequence: number;
}

// Quantum Backend Interface
export interface QuantumBackend {
  name: string;
  provider: 'ibm' | 'aws' | 'azure' | 'google' | 'dwave' | 'hybrid';
  solve(problem: OptimizationProblem): Promise<OptimizationSolution>;
  isAvailable(): boolean;
  getCapabilities(): QuantumCapabilities;
}

export interface QuantumCapabilities {
  maxQubits: number;
  maxVariables: number;
  supportedProblemTypes: OptimizationProblem['type'][];
  executionTimeLimit: number;
  costPerExecution: number;
}
