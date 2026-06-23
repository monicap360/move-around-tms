// TMS-Specific Quantum-Ready Optimizer
// Integrates quantum-ready optimization with TMS domain logic

import { quantumBackendManager } from './quantum-backend';
import type {
  OptimizationProblem,
  OptimizationSolution,
  Assignment,
  RoutePoint,
} from './types';

export interface TMSLoad {
  id: string;
  pickup: { latitude: number; longitude: number; address?: string };
  delivery: { latitude: number; longitude: number; address?: string };
  weight: number;
  volume: number;
  priority: number;
  timeWindow?: { start: Date; end: Date };
  specialRequirements?: string[];
}

export interface TMSDriver {
  id: string;
  location: { latitude: number; longitude: number };
  capacity: number;
  availability: { start: Date; end: Date };
  certifications?: string[];
  performanceScore?: number;
}

export interface TMSTruck {
  id: string;
  location: { latitude: number; longitude: number };
  capacity: number;
  type: string;
  driverId?: string;
  maintenanceDue?: Date;
}

export interface TMSOptimizationResult {
  assignments: TMSAssignment[];
  totalCost: number;
  totalDistance: number;
  utilizationRate: number;
  metadata: OptimizationSolution['metadata'];
}

export interface TMSAssignment {
  load: TMSLoad;
  driver: TMSDriver;
  truck: TMSTruck;
  route: RoutePoint[];
  estimatedCost: number;
  estimatedTime: number;
  estimatedDistance: number;
}

/**
 * TMS Quantum-Ready Optimizer
 * Optimizes load assignments using quantum-ready backend
 */
export class TMSOptimizer {
  /**
   * Optimize load assignments
   */
  async optimizeLoadAssignment(
    loads: TMSLoad[],
    drivers: TMSDriver[],
    trucks: TMSTruck[],
    options?: {
      backend?: string;
      maxExecutionTime?: number;
      optimizeFor?: 'cost' | 'distance' | 'time' | 'utilization';
    },
  ): Promise<TMSOptimizationResult> {
    // Convert TMS domain objects to optimization problem
    const problem = this.createOptimizationProblem(loads, drivers, trucks, options);

    // Solve using quantum-ready backend
    const solution = await quantumBackendManager.solve(problem, options?.backend);

    // Convert solution back to TMS domain objects
    return this.convertToTMSResult(solution, loads, drivers, trucks);
  }

  /**
   * Create optimization problem from TMS objects
   */
  private createOptimizationProblem(
    loads: TMSLoad[],
    drivers: TMSDriver[],
    trucks: TMSTruck[],
    options?: { optimizeFor?: string },
  ): OptimizationProblem {
    const objectiveType =
      options?.optimizeFor === 'distance'
        ? 'minimize_distance'
        : options?.optimizeFor === 'time'
          ? 'minimize_time'
          : options?.optimizeFor === 'utilization'
            ? 'maximize_utilization'
            : 'minimize_cost';

    return {
      type: 'load_assignment',
      constraints: [
        {
          type: 'capacity',
          value: { loads, trucks },
          operator: 'less_than',
        },
        {
          type: 'driver_availability',
          value: { drivers },
          operator: 'equal',
        },
        {
          type: 'truck_compatibility',
          value: { trucks, loads },
          operator: 'equal',
        },
      ],
      objective: {
        type: objectiveType as any,
        weights: {
          cost: 0.4,
          distance: 0.3,
          time: 0.2,
          utilization: 0.1,
        },
      },
      variables: loads.map((load) => ({
        name: `load_${load.id}`,
        type: 'integer',
        bounds: [0, drivers.length * trucks.length - 1],
      })),
    };
  }

  /**
   * Convert optimization solution to TMS result
   */
  private convertToTMSResult(
    solution: OptimizationSolution,
    loads: TMSLoad[],
    drivers: TMSDriver[],
    trucks: TMSTruck[],
  ): TMSOptimizationResult {
    const tmsAssignments: TMSAssignment[] = solution.assignments.map((assignment) => {
      const load = loads.find((l) => l.id === assignment.loadId)!;
      const driver = drivers.find((d) => d.id === assignment.driverId)!;
      const truck = trucks.find((t) => t.id === assignment.truckId)!;

      // Build route
      const route: RoutePoint[] = assignment.route || [
        { latitude: load.pickup.latitude, longitude: load.pickup.longitude, sequence: 0 },
        { latitude: load.delivery.latitude, longitude: load.delivery.longitude, sequence: 1 },
      ];

      // Calculate distance
      const distance = this.calculateRouteDistance(route);

      return {
        load,
        driver,
        truck,
        route,
        estimatedCost: assignment.estimatedCost,
        estimatedTime: assignment.estimatedTime,
        estimatedDistance: distance,
      };
    });

    const totalCost = tmsAssignments.reduce((sum, a) => sum + a.estimatedCost, 0);
    const totalDistance = tmsAssignments.reduce((sum, a) => sum + a.estimatedDistance, 0);
    const utilizationRate = tmsAssignments.length / Math.max(loads.length, 1);

    return {
      assignments: tmsAssignments,
      totalCost,
      totalDistance,
      utilizationRate,
      metadata: solution.metadata,
    };
  }

  /**
   * Calculate route distance
   */
  private calculateRouteDistance(route: RoutePoint[]): number {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      distance += this.calculateDistance(route[i], route[i + 1]);
    }
    return distance;
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number },
  ): number {
    const R = 3959; // Earth radius in miles
    const dLat = (point2.latitude - point1.latitude) * (Math.PI / 180);
    const dLon = (point2.longitude - point1.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * (Math.PI / 180)) *
        Math.cos(point2.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Export singleton instance
export const tmsOptimizer = new TMSOptimizer();
