/**
 * Payroll Incident Integration
 * Auto-pauses payroll during incidents
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayrollConcurrencyControl } from "./concurrencyControl";

export class PayrollIncidentIntegration {
  private supabase = createSupabaseServerClient();
  private concurrencyControl = new PayrollConcurrencyControl();

  /**
   * Check if payroll should be paused due to incidents
   */
  async checkIncidentStatus(): Promise<{ shouldPause: boolean; reason?: string }> {
    // Check for critical incidents
    const { data: criticalIncident } = await this.supabase
      .from('tms_incidents')
      .select('id, summary, severity')
      .eq('severity', 'critical')
      .eq('status', 'open')
      .limit(1)
      .single();

    if (criticalIncident) {
      return {
        shouldPause: true,
        reason: `Critical incident active: ${criticalIncident.summary}. Payroll paused for system stability.`,
      };
    }

    // Check for warning incidents that might affect payroll
    const { data: warningIncident } = await this.supabase
      .from('tms_incidents')
      .select('id, summary, incident_type')
      .eq('severity', 'warning')
      .eq('status', 'open')
      .in('incident_type', ['memory_exhaustion', 'disk_pressure'])
      .limit(1)
      .single();

    if (warningIncident) {
      return {
        shouldPause: true,
        reason: `System stress detected: ${warningIncident.summary}. Payroll paused to prevent overload.`,
      };
    }

    return { shouldPause: false };
  }

  /**
   * Auto-pause payroll queue during incidents
   */
  async pauseForIncident(incidentId: string): Promise<void> {
    const { data: incident } = await this.supabase
      .from('tms_incidents')
      .select('summary, severity')
      .eq('id', incidentId)
      .single();

    if (!incident) return;

    const reason = `Incident ${incidentId}: ${incident.summary}`;
    await this.concurrencyControl.pauseQueue(reason);

    // Log to incident
    await this.supabase.from('tms_incident_events').insert({
      incident_id: incidentId,
      source: 'system',
      event_type: 'stabilization',
      payload: {
        action: 'pause_payroll',
        reason: 'Payroll auto-paused to reduce system load',
      },
    });
  }

  /**
   * Resume payroll after incident resolution
   */
  async resumeAfterIncident(incidentId: string): Promise<void> {
    // Check if other incidents are still active
    const { data: activeIncidents } = await this.supabase
      .from('tms_incidents')
      .select('id')
      .in('severity', ['critical', 'warning'])
      .eq('status', 'open')
      .neq('id', incidentId);

    if (!activeIncidents || activeIncidents.length === 0) {
      // No other incidents, resume payroll
      await this.concurrencyControl.resumeQueue();

      // Log to incident
      await this.supabase.from('tms_incident_events').insert({
        incident_id: incidentId,
        source: 'system',
        event_type: 'resolution',
        payload: {
          action: 'resume_payroll',
          reason: 'Incident resolved, payroll queue resumed',
        },
      });
    }
  }

  /**
   * Get payroll impact for incident decision summary
   */
  async getPayrollImpact(incidentId: string): Promise<{
    queuedJobs: number;
    runningJobs: number;
    pausedJobs: number;
  }> {
    const { data: queued } = await this.supabase
      .from('payroll_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['queued', 'paused']);

    const { data: running } = await this.supabase
      .from('payroll_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'running');

    return {
      queuedJobs: queued?.count || 0,
      runningJobs: running?.count || 0,
      pausedJobs: queued?.count || 0,
    };
  }
}
