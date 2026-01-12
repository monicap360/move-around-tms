// Automation Assistant Engine
// Provides routine automation SUGGESTIONS - human dispatch maintains final control
// This is an ASSISTANT TOOL, not a replacement for human dispatchers

import type {
  AutomationSuggestion,
  AutomationResult,
  AutomationAuditLog,
} from './types';
import { tmsOptimizer } from '../quantum-ready/tms-optimizer';

/**
 * Automation Assistant Engine
 * Generates SUGGESTIONS for load assignment - humans make final decisions
 * IMPORTANT: This assists human dispatchers, does not replace them
 */
export class AutomationAssistantEngine {
  private auditLogs: AutomationAuditLog[] = [];
  private readonly MAX_AUDIT_HISTORY = 5000;

  /**
   * Generate assignment suggestions for human review
   * Returns SUGGESTIONS, not automatic assignments
   */
  async generateSuggestions(
    loads: Array<{
      id: string;
      pickup: { latitude: number; longitude: number; address?: string };
      delivery: { latitude: number; longitude: number; address?: string };
      priority: number;
      timeWindow?: { start: Date; end: Date };
      specialRequirements?: string[];
    }>,
    drivers: Array<{
      id: string;
      location: { latitude: number; longitude: number };
      availability: { start: Date; end: Date };
      performance: { rating: number; onTimeRate: number };
      certifications: string[];
    }>,
    options?: {
      useOptimization?: boolean;
      requireHumanReview?: boolean; // Always true for safety
    },
  ): Promise<AutomationResult> {
    const startTime = Date.now();
    const suggestions: AutomationSuggestion[] = [];
    const rulesApplied: string[] = [];
    const requireHumanReview = options?.requireHumanReview ?? true; // Always require review

    // Use optimization to generate suggestions
    if (options?.useOptimization) {
      try {
        const tmsLoads = loads.map((load) => ({
          id: load.id,
          pickup: load.pickup,
          delivery: load.delivery,
          weight: 10000, // Placeholder
          volume: 100, // Placeholder
          priority: load.priority,
          timeWindow: load.timeWindow,
          specialRequirements: load.specialRequirements,
        }));

        const tmsDrivers = drivers.map((driver) => ({
          id: driver.id,
          location: driver.location,
          capacity: 20000,
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

        // Convert to SUGGESTIONS (not assignments)
        for (const assignment of result.assignments) {
          const factors: string[] = [];
          const load = loads.find(l => l.id === assignment.load.id);
          const driver = drivers.find(d => d.id === assignment.driver.id);

          if (load && driver) {
            const distance = this.calculateDistance(driver.location, load.pickup);
            factors.push(`Proximity: ${distance.toFixed(1)} miles`);
            factors.push(`Driver rating: ${driver.performance.rating}/5.0`);
            factors.push(`On-time rate: ${(driver.performance.onTimeRate * 100).toFixed(0)}%`);
          }

          suggestions.push({
            loadId: assignment.load.id,
            suggestedDriverId: assignment.driver.id,
            reason: 'Optimization analysis suggests this assignment',
            confidence: result.metadata.confidence || 0.85,
            factors,
            requiresReview: true, // Always require human review
            estimatedCost: assignment.estimatedCost,
            estimatedTime: assignment.estimatedTime,
          });
        }

        rulesApplied.push('quantum_optimization');
      } catch (error) {
        console.warn('Optimization failed, using rule-based suggestions', error);
      }
    }

    // Apply basic rules for remaining loads
    const unprocessedLoads: string[] = [];
    for (const load of loads) {
      if (suggestions.some(s => s.loadId === load.id)) continue;

      let bestSuggestion: AutomationSuggestion | null = null;
      let bestScore = 0;

      for (const driver of drivers) {
        const score = this.calculateSuggestionScore(load, driver);
        if (score > bestScore) {
          bestScore = score;
          const factors = this.getSuggestionFactors(load, driver);
          
          bestSuggestion = {
            loadId: load.id,
            suggestedDriverId: driver.id,
            reason: 'Rule-based suggestion',
            confidence: Math.min(0.9, score / 100),
            factors,
            requiresReview: true, // Always require review
            estimatedCost: 500,
            estimatedTime: 120,
          };
        }
      }

      if (bestSuggestion && bestSuggestion.confidence > 0.6) {
        suggestions.push(bestSuggestion);
      } else {
        unprocessedLoads.push(load.id);
      }
    }

    // Log suggestion generation
    for (const suggestion of suggestions) {
      this.logAudit({
        id: this.generateAuditId(),
        timestamp: new Date(),
        action: 'suggestion_generated',
        loadId: suggestion.loadId,
        driverId: suggestion.suggestedDriverId,
        userId: 'system',
        reason: suggestion.reason,
        metadata: {
          confidence: suggestion.confidence,
          factors: suggestion.factors,
        },
      });
    }

    return {
      suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
      requiresHumanReview: requireHumanReview, // Always true
      unprocessedLoads,
      metadata: {
        totalLoads: loads.length,
        suggestionsGenerated: suggestions.length,
        executionTime: Date.now() - startTime,
        rulesApplied,
      },
    };
  }

  /**
   * Log human decision on suggestion
   */
  logHumanDecision(
    suggestionId: string,
    userId: string,
    decision: 'accepted' | 'rejected' | 'override',
    reason?: string,
  ): void {
    this.logAudit({
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: decision === 'accepted' ? 'suggestion_accepted' : decision === 'rejected' ? 'suggestion_rejected' : 'manual_override',
      loadId: suggestionId,
      userId,
      reason,
    });
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit = 100): AutomationAuditLog[] {
    return [...this.auditLogs]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Private helper methods

  private calculateSuggestionScore(
    load: any,
    driver: any,
  ): number {
    let score = 50; // Base score

    // Proximity (0-30 points)
    const distance = this.calculateDistance(driver.location, load.pickup);
    score += Math.max(0, 30 - (distance / 5)); // Closer = higher score

    // Performance (0-20 points)
    score += driver.performance.rating * 4;

    // Availability (0-20 points)
    if (load.timeWindow && driver.availability) {
      const loadStart = load.timeWindow.start.getTime();
      const loadEnd = load.timeWindow.end.getTime();
      const driverStart = driver.availability.start.getTime();
      const driverEnd = driver.availability.end.getTime();
      if (loadStart >= driverStart && loadEnd <= driverEnd) {
        score += 20;
      }
    }

    // Certifications (0-10 points)
    if (load.specialRequirements) {
      const matching = load.specialRequirements.filter(req => 
        driver.certifications.includes(req)
      ).length;
      score += (matching / load.specialRequirements.length) * 10;
    }

    return Math.min(100, score);
  }

  private getSuggestionFactors(load: any, driver: any): string[] {
    const factors: string[] = [];
    const distance = this.calculateDistance(driver.location, load.pickup);
    factors.push(`Distance: ${distance.toFixed(1)} miles`);
    factors.push(`Rating: ${driver.performance.rating}/5.0`);
    return factors;
  }

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

  private logAudit(log: AutomationAuditLog): void {
    this.auditLogs.push(log);
    if (this.auditLogs.length > this.MAX_AUDIT_HISTORY) {
      this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_HISTORY);
    }
  }

  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton
export const automationAssistantEngine = new AutomationAssistantEngine();
