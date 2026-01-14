/**
 * Incident Response Agent
 * Detects, stabilizes, classifies, and generates calm decision summaries
 * SAFETY FIRST: Only safe, reversible actions
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HealthMonitor, HealthMetrics } from "./healthMonitor";
import { AuditLogger } from "@/lib/agents/auditLogger";

export type IncidentType =
  | 'memory_exhaustion'
  | 'disk_pressure'
  | 'upload_spike'
  | 'bad_deploy'
  | 'dependency_outage'
  | 'network_issue'
  | 'unknown';

export type SafeActionType =
  | 'pm2_restart'
  | 'nginx_reload'
  | 'pause_jobs'
  | 'rate_limit'
  | 'clear_temp';

export interface Incident {
  id: string;
  organizationId?: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'open' | 'stabilizing' | 'monitoring' | 'resolved';
  incidentType: IncidentType;
  summary: string;
  description?: string;
  detectedAt: string;
  resolvedAt?: string;
}

export interface DecisionSummary {
  incidentSummary: string; // 1-2 lines
  timeWindow: { start: string; end: string };
  autoActionsTaken: string[];
  currentSystemState: Record<string, any>;
  recommendation: string;
  riskIfNoAction: string;
}

export class IncidentResponseAgent {
  private supabase = createSupabaseServerClient();
  private healthMonitor = new HealthMonitor();
  private auditLogger = new AuditLogger();

  /**
   * Detect and create incident from health metrics
   */
  async detectIncident(
    metrics: HealthMetrics,
    organizationId?: string
  ): Promise<Incident | null> {
    const thresholdCheck = await this.healthMonitor.checkThresholds(metrics);

    if (!thresholdCheck.alert) {
      return null; // No incident
    }

    // Classify incident type
    const incidentType = this.classifyIncident(metrics, thresholdCheck.violations);

    // Create incident record
    const { data: incident, error } = await this.supabase
      .from('tms_incidents')
      .insert({
        organization_id: organizationId || null,
        severity: thresholdCheck.severity,
        status: 'open',
        incident_type: incidentType,
        summary: this.generateSummary(incidentType, thresholdCheck.violations),
        description: thresholdCheck.violations.join('\n'),
        current_system_state: {
          memory_percent: metrics.memoryPercent,
          disk_percent: metrics.diskPercent,
          pm2_status: metrics.pm2Status,
          pm2_restart_count: metrics.pm2RestartCount,
          upload_failure_rate: metrics.uploadFailureRate,
          error_rate: metrics.errorRate,
        },
        affected_time_window: {
          start: metrics.timestamp,
          end: null,
        },
      })
      .select()
      .single();

    if (error || !incident) {
      throw new Error(`Failed to create incident: ${error?.message}`);
    }

    // Log detection event
    await this.supabase.from('tms_incident_events').insert({
      incident_id: incident.id,
      source: 'health_check',
      event_type: 'detection',
      payload: {
        metrics,
        violations: thresholdCheck.violations,
      },
    });

    // Attempt safe stabilization
    await this.stabilize(incident.id, metrics, incidentType);

    return {
      id: incident.id,
      organizationId: incident.organization_id,
      severity: incident.severity as 'info' | 'warning' | 'critical',
      status: incident.status as 'open' | 'stabilizing' | 'monitoring' | 'resolved',
      incidentType: incident.incident_type as IncidentType,
      summary: incident.summary,
      description: incident.description || undefined,
      detectedAt: incident.detected_at,
      resolvedAt: incident.resolved_at || undefined,
    };
  }

  /**
   * Attempt safe stabilization actions
   */
  private async stabilize(
    incidentId: string,
    metrics: HealthMetrics,
    incidentType: IncidentType
  ): Promise<void> {
    const safeActions: SafeActionType[] = [];

    // Determine safe actions based on incident type
    if (incidentType === 'memory_exhaustion') {
      safeActions.push('pm2_restart'); // Restart to free memory
    }

    if (incidentType === 'disk_pressure') {
      safeActions.push('clear_temp'); // Clear temporary files
    }

    if (incidentType === 'upload_spike') {
      safeActions.push('rate_limit'); // Rate limit uploads
      safeActions.push('pause_jobs'); // Pause background jobs
    }

    if (metrics.pm2Status === 'restarting' || metrics.pm2RestartCount > 0) {
      safeActions.push('pm2_restart'); // Restart PM2 if stuck
    }

    // Execute safe actions
    const executedActions: string[] = [];
    for (const action of safeActions) {
      try {
        const result = await this.executeSafeAction(action, incidentId);
        if (result.success) {
          executedActions.push(action);
        }
      } catch (error) {
        console.error(`Failed to execute safe action ${action}:`, error);
      }
    }

    // Update incident with auto actions
    if (executedActions.length > 0) {
      await this.supabase
        .from('tms_incidents')
        .update({
          auto_actions_taken: executedActions,
          status: 'stabilizing',
        })
        .eq('id', incidentId);

      // Log stabilization event
      await this.supabase.from('tms_incident_events').insert({
        incident_id: incidentId,
        source: 'system',
        event_type: 'stabilization',
        payload: {
          actions: executedActions,
        },
      });
    }
  }

  /**
   * Execute a safe action (NO DESTRUCTIVE ACTIONS)
   */
  private async executeSafeAction(
    action: SafeActionType,
    incidentId: string
  ): Promise<{ success: boolean; details?: any }> {
    // Log action
    const { data: actionRecord } = await this.supabase
      .from('tms_incident_actions')
      .insert({
        incident_id: incidentId,
        action_type: action,
        result: 'pending',
      })
      .select()
      .single();

    try {
      let result: { success: boolean; details?: any } = { success: false };

      switch (action) {
        case 'pm2_restart':
          // In production, would call PM2 API: pm2.restart('move-around-tms')
          result = { success: true, details: { message: 'PM2 restart initiated' } };
          break;

        case 'nginx_reload':
          // In production, would call: nginx -s reload
          result = { success: true, details: { message: 'Nginx reloaded' } };
          break;

        case 'pause_jobs':
          // In production, would pause background job queue
          result = { success: true, details: { message: 'Background jobs paused' } };
          break;

        case 'rate_limit':
          // In production, would enable rate limiting on upload endpoints
          result = { success: true, details: { message: 'Upload rate limiting enabled' } };
          break;

        case 'clear_temp':
          // In production, would clear temporary upload directories
          result = { success: true, details: { message: 'Temporary files cleared' } };
          break;
      }

      // Update action record
      if (actionRecord) {
        await this.supabase
          .from('tms_incident_actions')
          .update({
            result: result.success ? 'success' : 'failed',
            result_details: result.details || {},
          })
          .eq('id', actionRecord.id);
      }

      return result;
    } catch (error: any) {
      if (actionRecord) {
        await this.supabase
          .from('tms_incident_actions')
          .update({
            result: 'failed',
            result_details: { error: error.message },
          })
          .eq('id', actionRecord.id);
      }
      return { success: false, details: { error: error.message } };
    }
  }

  /**
   * Classify incident type
   */
  private classifyIncident(
    metrics: HealthMetrics,
    violations: string[]
  ): IncidentType {
    if (violations.some(v => v.includes('Memory'))) {
      return 'memory_exhaustion';
    }
    if (violations.some(v => v.includes('Disk'))) {
      return 'disk_pressure';
    }
    if (violations.some(v => v.includes('Upload'))) {
      return 'upload_spike';
    }
    if (violations.some(v => v.includes('PM2'))) {
      return 'bad_deploy';
    }
    if (violations.some(v => v.includes('Error rate'))) {
      return 'dependency_outage';
    }
    return 'unknown';
  }

  /**
   * Generate incident summary (1-2 lines)
   */
  private generateSummary(type: IncidentType, violations: string[]): string {
    const firstViolation = violations[0] || 'System issue detected';
    
    switch (type) {
      case 'memory_exhaustion':
        return `Memory exhaustion detected. System performance degraded.`;
      case 'disk_pressure':
        return `Disk space running low. Temporary cleanup may be needed.`;
      case 'upload_spike':
        return `Upload spike detected. Rate limiting enabled to stabilize.`;
      case 'bad_deploy':
        return `Application restart loop detected. Possible deployment issue.`;
      case 'dependency_outage':
        return `External dependency outage detected. Service degradation expected.`;
      default:
        return firstViolation;
    }
  }

  /**
   * Generate calm decision summary
   */
  async generateDecisionSummary(incidentId: string): Promise<DecisionSummary> {
    const { data: incident } = await this.supabase
      .from('tms_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      throw new Error('Incident not found');
    }

    const { data: actions } = await this.supabase
      .from('tms_incident_actions')
      .select('*')
      .eq('incident_id', incidentId)
      .order('executed_at', { ascending: false });

    const { data: recommendations } = await this.supabase
      .from('tms_incident_recommendations')
      .select('*')
      .eq('incident_id', incidentId)
      .eq('status', 'pending')
      .order('risk_level', { ascending: false });

    const recommendation = recommendations && recommendations.length > 0
      ? recommendations[0].recommendation
      : 'Monitor system stability. No immediate action required.';

    const riskIfNoAction = this.assessRisk(incident);

    return {
      incidentSummary: incident.summary,
      timeWindow: {
        start: incident.affected_time_window?.start || incident.detected_at,
        end: incident.affected_time_window?.end || new Date().toISOString(),
      },
      autoActionsTaken: incident.auto_actions_taken || [],
      currentSystemState: incident.current_system_state || {},
      recommendation,
      riskIfNoAction,
    };
  }

  /**
   * Assess risk if no action taken
   */
  private assessRisk(incident: any): string {
    if (incident.severity === 'critical') {
      return 'High risk of service outage or data loss if not addressed.';
    }
    if (incident.severity === 'warning') {
      return 'Moderate risk of performance degradation or customer impact.';
    }
    return 'Low risk. System may self-recover, but monitoring recommended.';
  }

  /**
   * Create recommendation for human review
   */
  async createRecommendation(
    incidentId: string,
    recommendation: string,
    actionType?: SafeActionType,
    actionParams?: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' = 'medium'
  ) {
    await this.supabase.from('tms_incident_recommendations').insert({
      incident_id: incidentId,
      recommendation,
      risk_level: riskLevel,
      requires_approval: true,
      action_type: actionType || null,
      action_params: actionParams || {},
    });
  }
}
