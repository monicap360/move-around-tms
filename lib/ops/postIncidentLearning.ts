/**
 * Post-Incident Learning System
 * Reviews incidents, identifies root causes, proposes prevention
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IncidentReview {
  incidentId: string;
  rootCause: string;
  preventionSteps: string[];
  alertImprovements: string[];
  automationSuggestions: string[];
  uxFrictionPatterns: string[];
}

export class PostIncidentLearning {
  private supabase = createSupabaseServerClient();

  /**
   * Review resolved incident and generate learnings
   */
  async reviewIncident(incidentId: string): Promise<IncidentReview> {
    const { data: incident } = await this.supabase
      .from('tms_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      throw new Error('Incident not found');
    }

    // Get all events and actions
    const { data: events } = await this.supabase
      .from('tms_incident_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    const { data: actions } = await this.supabase
      .from('tms_incident_actions')
      .select('*')
      .eq('incident_id', incidentId)
      .order('executed_at', { ascending: true });

    // Analyze timeline
    const rootCause = this.identifyRootCause(incident, events || [], actions || []);
    const preventionSteps = this.proposePreventionSteps(incident, rootCause);
    const alertImprovements = this.suggestAlertImprovements(incident);
    const automationSuggestions = this.suggestAutomation(incident, actions || []);
    const uxFrictionPatterns = this.identifyUXFriction(incident, events || []);

    // Update incident with learnings
    await this.supabase
      .from('tms_incidents')
      .update({
        root_cause: rootCause,
        prevention_steps: preventionSteps,
      })
      .eq('id', incidentId);

    return {
      incidentId,
      rootCause,
      preventionSteps,
      alertImprovements,
      automationSuggestions,
      uxFrictionPatterns,
    };
  }

  /**
   * Identify root cause from incident timeline
   */
  private identifyRootCause(
    incident: any,
    events: any[],
    actions: any[]
  ): string {
    const incidentType = incident.incident_type;
    const systemState = incident.current_system_state || {};

    // Analyze based on incident type
    switch (incidentType) {
      case 'memory_exhaustion':
        return `Memory usage reached ${systemState.memory_percent || 'unknown'}%. Likely caused by memory leak or insufficient resources.`;
      
      case 'disk_pressure':
        return `Disk usage reached ${systemState.disk_percent || 'unknown'}%. Temporary files or logs not being cleaned up.`;
      
      case 'upload_spike':
        return `Upload failure rate spiked to ${((systemState.upload_failure_rate || 0) * 100).toFixed(1)}%. Possible causes: sudden traffic increase, external service degradation, or rate limiting misconfiguration.`;
      
      case 'bad_deploy':
        return `PM2 restart loop detected (${systemState.pm2_restart_count || 0} restarts). Application crashing on startup, likely due to code error or configuration issue in recent deployment.`;
      
      case 'dependency_outage':
        return `External dependency outage detected. Error rate: ${systemState.error_rate || 0}/min. Service unable to reach external APIs or databases.`;
      
      default:
        return 'Root cause analysis pending. Review incident timeline for details.';
    }
  }

  /**
   * Propose prevention steps
   */
  private proposePreventionSteps(incident: any, rootCause: string): string[] {
    const steps: string[] = [];
    const incidentType = incident.incident_type;

    switch (incidentType) {
      case 'memory_exhaustion':
        steps.push('Increase server memory allocation');
        steps.push('Implement memory usage monitoring alerts at 80%');
        steps.push('Review and optimize memory-intensive operations');
        steps.push('Consider implementing memory limits for background jobs');
        break;

      case 'disk_pressure':
        steps.push('Set up automated cleanup of temporary files');
        steps.push('Implement log rotation and retention policies');
        steps.push('Monitor disk usage with alerts at 75%');
        steps.push('Review and optimize file storage usage');
        break;

      case 'upload_spike':
        steps.push('Implement rate limiting on upload endpoints');
        steps.push('Set up auto-scaling for upload processing');
        steps.push('Monitor upload patterns and set alerts');
        steps.push('Consider queue-based upload processing');
        break;

      case 'bad_deploy':
        steps.push('Implement automated testing before deployment');
        steps.push('Use blue-green or canary deployment strategy');
        steps.push('Set up health checks that prevent bad deploys');
        steps.push('Implement automatic rollback on health check failure');
        break;

      case 'dependency_outage':
        steps.push('Implement circuit breakers for external dependencies');
        steps.push('Add retry logic with exponential backoff');
        steps.push('Set up monitoring for external service health');
        steps.push('Consider fallback mechanisms for critical dependencies');
        break;
    }

    return steps;
  }

  /**
   * Suggest alert improvements
   */
  private suggestAlertImprovements(incident: any): string[] {
    const suggestions: string[] = [];
    const incidentType = incident.incident_type;

    // Check if incident was detected early enough
    const detectionTime = new Date(incident.detected_at);
    const firstEvent = incident.current_system_state;

    if (incidentType === 'memory_exhaustion') {
      suggestions.push('Lower memory alert threshold from 85% to 80% for earlier detection');
    }

    if (incidentType === 'disk_pressure') {
      suggestions.push('Add disk usage trend alerts (e.g., 5% increase in 1 hour)');
    }

    if (incidentType === 'upload_spike') {
      suggestions.push('Add upload failure rate trend monitoring');
      suggestions.push('Alert on upload volume spikes (>2x normal)');
    }

    return suggestions;
  }

  /**
   * Suggest automation improvements
   */
  private suggestAutomation(incident: any, actions: any[]): string[] {
    const suggestions: string[] = [];
    const incidentType = incident.incident_type;

    // Check if auto-actions were effective
    const autoActions = incident.auto_actions_taken || [];
    const successfulActions = actions.filter(a => a.result === 'success');

    if (autoActions.length > 0 && successfulActions.length === autoActions.length) {
      suggestions.push(`Auto-actions were effective. Consider expanding automation for ${incidentType} incidents.`);
    } else if (autoActions.length === 0) {
      suggestions.push(`No auto-actions taken. Consider adding safe automation for ${incidentType} incidents.`);
    }

    // Type-specific suggestions
    if (incidentType === 'memory_exhaustion') {
      suggestions.push('Automate PM2 restart when memory exceeds 90%');
    }

    if (incidentType === 'disk_pressure') {
      suggestions.push('Automate temporary file cleanup when disk exceeds 85%');
    }

    return suggestions;
  }

  /**
   * Identify UX friction patterns
   */
  private identifyUXFriction(incident: any, events: any[]): string[] {
    const patterns: string[] = [];

    // Check if incident caused user-facing errors
    const errorEvents = events.filter(e => e.event_type === 'detection' && e.payload?.violations);
    
    if (errorEvents.length > 0) {
      patterns.push('Users may have experienced errors during incident');
      patterns.push('Consider adding user-friendly error messages during incidents');
    }

    // Check incident duration
    if (incident.resolved_at) {
      const duration = new Date(incident.resolved_at).getTime() - new Date(incident.detected_at).getTime();
      const minutes = duration / 1000 / 60;
      
      if (minutes > 10) {
        patterns.push(`Incident lasted ${minutes.toFixed(0)} minutes. Consider adding status page for transparency.`);
      }
    }

    return patterns;
  }

  /**
   * Get weekly stability summary
   */
  async getWeeklySummary(organizationId?: string): Promise<{
    totalIncidents: number;
    criticalIncidents: number;
    avgResolutionTime: number;
    mostCommonType: string;
    stabilityScore: number; // 0-100
  }> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let query = this.supabase
      .from('tms_incidents')
      .select('*')
      .gte('detected_at', oneWeekAgo);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: incidents } = await query;

    const resolved = incidents?.filter(i => i.resolved_at) || [];
    const critical = incidents?.filter(i => i.severity === 'critical') || [];

    // Calculate average resolution time
    let avgResolutionTime = 0;
    if (resolved.length > 0) {
      const totalTime = resolved.reduce((sum, inc) => {
        const duration = new Date(inc.resolved_at).getTime() - new Date(inc.detected_at).getTime();
        return sum + duration;
      }, 0);
      avgResolutionTime = totalTime / resolved.length / 1000 / 60; // minutes
    }

    // Find most common incident type
    const typeCounts: Record<string, number> = {};
    incidents?.forEach(inc => {
      const type = inc.incident_type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    // Calculate stability score (0-100)
    // Lower incidents = higher score, faster resolution = higher score
    const stabilityScore = Math.max(0, Math.min(100, 100 - (incidents?.length || 0) * 10 - (avgResolutionTime / 10)));

    return {
      totalIncidents: incidents?.length || 0,
      criticalIncidents: critical.length,
      avgResolutionTime: Math.round(avgResolutionTime),
      mostCommonType,
      stabilityScore: Math.round(stabilityScore),
    };
  }
}
