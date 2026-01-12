// AI Dispatcher Engine
// Automates dispatch decisions using AI and rules

import type {
  DispatcherDecision,
  LoadContext,
  DriverContext,
  DispatchRule,
  DispatchResult,
} from './types';
import { tmsOptimizer } from '../quantum-ready/tms-optimizer';

/**
 * AI Dispatcher Engine
 * Makes intelligent dispatch decisions without human intervention
 */
export class AIDispatcherEngine {
  private rules: Map<string, DispatchRule> = new Map();
  private useQuantumOptimization = true;

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default dispatch rules
   */
  private initializeDefaultRules(): void {
    // Rule 1: High priority loads to best drivers
    this.addRule({
      id: 'high_priority_best_driver',
      name: 'High Priority to Best Drivers',
      priority: 1,
      enabled: true,
      condition: (load, driver) => load.priority >= 8 && driver.performance.rating >= 4.5,
      action: (load, driver) => ({
        loadId: load.id,
        driverId: driver.id,
        reason: 'High priority load assigned to high-rated driver',
        confidence: 0.9,
        estimatedCost: 500,
        estimatedTime: 120,
        priority: load.priority,
      }),
    });

    // Rule 2: Geographic proximity
    this.addRule({
      id: 'geographic_proximity',
      name: 'Assign by Proximity',
      priority: 2,
      enabled: true,
      condition: (load, driver) => {
        const distance = this.calculateDistance(driver.location, load.pickup);
        return distance < 50; // Within 50 miles
      },
      action: (load, driver) => {
        const distance = this.calculateDistance(driver.location, load.pickup);
        return {
          loadId: load.id,
          driverId: driver.id,
          reason: `Driver is ${distance.toFixed(1)} miles from pickup`,
          confidence: 0.85,
          estimatedCost: distance * 2.5,
          estimatedTime: distance / 50 * 60,
          priority: load.priority,
        };
      },
    });

    // Rule 3: Certification matching
    this.addRule({
      id: 'certification_match',
      name: 'Match Required Certifications',
      priority: 1,
      enabled: true,
      condition: (load, driver) => {
        if (!load.specialRequirements) return true;
        return load.specialRequirements.every((req) => driver.certifications.includes(req));
      },
      action: (load, driver) => ({
        loadId: load.id,
        driverId: driver.id,
        reason: 'Driver has required certifications',
        confidence: 0.95,
        estimatedCost: 600,
        estimatedTime: 150,
        priority: load.priority,
      }),
    });

    // Rule 4: Time window availability
    this.addRule({
      id: 'time_window',
      name: 'Check Time Window Availability',
      priority: 1,
      enabled: true,
      condition: (load, driver) => {
        if (!load.timeWindow) return true;
        const loadStart = load.timeWindow.start.getTime();
        const loadEnd = load.timeWindow.end.getTime();
        const driverStart = driver.availability.start.getTime();
        const driverEnd = driver.availability.end.getTime();
        return loadStart >= driverStart && loadEnd <= driverEnd;
      },
      action: (load, driver) => ({
        loadId: load.id,
        driverId: driver.id,
        reason: 'Driver available in time window',
        confidence: 0.9,
        estimatedCost: 550,
        estimatedTime: 130,
        priority: load.priority,
      }),
    });
  }

  /**
   * Add custom dispatch rule
   */
  addRule(rule: DispatchRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove dispatch rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Automatically dispatch loads to drivers
   */
  async autoDispatch(
    loads: LoadContext[],
    drivers: DriverContext[],
    options?: {
      useOptimization?: boolean;
      maxAssignmentsPerDriver?: number;
    },
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    const decisions: DispatcherDecision[] = [];
    const assignedDrivers = new Set<string>();
    const assignedLoads = new Set<string>();
    const rulesApplied: string[] = [];

    // Sort loads by priority
    const sortedLoads = [...loads].sort((a, b) => b.priority - a.priority);

    // Use quantum-ready optimization if enabled
    if (options?.useOptimization && this.useQuantumOptimization) {
      try {
        // Convert to TMS optimizer format
        const tmsLoads = loads.map((load) => ({
          id: load.id,
          pickup: load.pickup,
          delivery: load.delivery,
          weight: load.weight,
          volume: load.volume,
          priority: load.priority,
          timeWindow: load.timeWindow,
          specialRequirements: load.specialRequirements,
        }));

        const tmsDrivers = drivers.map((driver) => ({
          id: driver.id,
          location: driver.location,
          capacity: 20000, // Placeholder
          availability: driver.availability,
          certifications: driver.certifications,
          performanceScore: driver.performance.rating,
        }));

        const tmsTrucks = drivers.map((driver) => ({
          id: `truck-${driver.id}`,
          location: driver.location,
          capacity: 20000,
          type: 'standard',
          driverId: driver.id,
        }));

        const result = await tmsOptimizer.optimizeLoadAssignment(
          tmsLoads,
          tmsDrivers,
          tmsTrucks,
          { optimizeFor: 'cost' },
        );

        // Convert results to decisions
        for (const assignment of result.assignments) {
          decisions.push({
            loadId: assignment.load.id,
            driverId: assignment.driver.id,
            truckId: assignment.truck.id,
            reason: 'Optimized by AI dispatcher',
            confidence: result.metadata.confidence || 0.85,
            estimatedCost: assignment.estimatedCost,
            estimatedTime: assignment.estimatedTime,
            priority: assignment.load.priority,
          });
          assignedLoads.add(assignment.load.id);
          assignedDrivers.add(assignment.driver.id);
        }

        rulesApplied.push('quantum_optimization');
      } catch (error) {
        console.warn('Optimization failed, falling back to rules', error);
      }
    }

    // Apply rules for remaining loads
    const sortedRules = Array.from(this.rules.values())
      .filter((r) => r.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const load of sortedLoads) {
      if (assignedLoads.has(load.id)) continue;

      let bestDecision: DispatcherDecision | null = null;
      let bestScore = 0;

      for (const driver of drivers) {
        if (assignedDrivers.has(driver.id)) continue;
        if (options?.maxAssignmentsPerDriver && driver.currentLoads >= options.maxAssignmentsPerDriver) {
          continue;
        }

        // Apply rules
        for (const rule of sortedRules) {
          if (rule.condition(load, driver)) {
            const decision = rule.action(load, driver);
            if (decision) {
              const score = decision.confidence * decision.priority;
              if (score > bestScore) {
                bestScore = score;
                bestDecision = decision;
                if (!rulesApplied.includes(rule.id)) {
                  rulesApplied.push(rule.id);
                }
              }
            }
          }
        }
      }

      if (bestDecision) {
        decisions.push(bestDecision);
        assignedLoads.add(load.id);
        assignedDrivers.add(bestDecision.driverId);
      }
    }

    const unassignedLoads = loads
      .filter((load) => !assignedLoads.has(load.id))
      .map((load) => load.id);

    return {
      decisions,
      unassignedLoads,
      metadata: {
        totalLoads: loads.length,
        assignedLoads: decisions.length,
        executionTime: Date.now() - startTime,
        rulesApplied,
      },
    };
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

  /**
   * Explain dispatch decision
   */
  explainDecision(decision: DispatcherDecision): string {
    return `Load ${decision.loadId} assigned to driver ${decision.driverId}. ${decision.reason}. Confidence: ${(decision.confidence * 100).toFixed(0)}%`;
  }
}

// Export singleton
export const aiDispatcherEngine = new AIDispatcherEngine();
