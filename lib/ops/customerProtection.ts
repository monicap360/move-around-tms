/**
 * Customer Protection
 * Detects customer-facing impact and drafts safe status messages
 * NEVER auto-sends without approval
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CustomerImpact {
  affectedCustomers: number;
  impactLevel: 'none' | 'low' | 'medium' | 'high';
  affectedFeatures: string[];
  estimatedDowntime?: number; // minutes
}

export interface StatusMessage {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  suggestedChannels: ('email' | 'sms' | 'in_app' | 'status_page')[];
  requiresApproval: boolean;
}

export class CustomerProtection {
  private supabase = createSupabaseServerClient();

  /**
   * Detect customer-facing impact from incident
   */
  async detectImpact(incidentId: string, organizationId?: string): Promise<CustomerImpact> {
    const { data: incident } = await this.supabase
      .from('tms_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return {
        affectedCustomers: 0,
        impactLevel: 'none',
        affectedFeatures: [],
      };
    }

    // Determine impact based on incident type and severity
    const impact = this.assessImpact(incident, organizationId);

    return impact;
  }

  /**
   * Assess impact level
   */
  private async assessImpact(incident: any, organizationId?: string): Promise<CustomerImpact> {
    const incidentType = incident.incident_type;
    const severity = incident.severity;

    // Count affected customers (users in organization)
    let affectedCustomers = 0;
    if (organizationId) {
      const { count } = await this.supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('active', true);
      affectedCustomers = count || 0;
    } else {
      // Platform-wide incident
      const { count } = await this.supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('active', true);
      affectedCustomers = count || 0;
    }

    // Determine impact level
    let impactLevel: 'none' | 'low' | 'medium' | 'high' = 'none';
    const affectedFeatures: string[] = [];

    if (severity === 'critical') {
      impactLevel = 'high';
      affectedFeatures.push('Core functionality');
    } else if (severity === 'warning') {
      impactLevel = incidentType === 'upload_spike' ? 'medium' : 'low';
      if (incidentType === 'upload_spike') {
        affectedFeatures.push('Ticket uploads');
      }
    }

    // Estimate downtime based on incident type
    let estimatedDowntime: number | undefined;
    if (incidentType === 'memory_exhaustion' || incidentType === 'bad_deploy') {
      estimatedDowntime = 5; // 5 minutes for restart
    } else if (incidentType === 'dependency_outage') {
      estimatedDowntime = 30; // 30 minutes estimated
    }

    return {
      affectedCustomers,
      impactLevel,
      affectedFeatures,
      estimatedDowntime,
    };
  }

  /**
   * Draft customer-safe status message
   */
  async draftStatusMessage(incidentId: string): Promise<StatusMessage> {
    const { data: incident } = await this.supabase
      .from('tms_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      throw new Error('Incident not found');
    }

    const impact = await this.detectImpact(incidentId, incident.organization_id);

    // Generate safe, professional message
    const message = this.generateMessage(incident, impact);
    const suggestedChannels = this.suggestChannels(impact.impactLevel);

    return {
      title: `Service Update: ${incident.summary}`,
      message,
      severity: impact.impactLevel === 'high' ? 'critical' : impact.impactLevel === 'medium' ? 'warning' : 'info',
      suggestedChannels,
      requiresApproval: true, // ALWAYS requires approval
    };
  }

  /**
   * Generate customer-safe message
   */
  private generateMessage(incident: any, impact: CustomerImpact): string {
    if (impact.impactLevel === 'none') {
      return "We're monitoring system performance. All services are operating normally.";
    }

    if (impact.impactLevel === 'low') {
      return "We're experiencing minor performance issues. Services remain available. We're working to resolve this quickly.";
    }

    if (impact.impactLevel === 'medium') {
      const features = impact.affectedFeatures.join(' and ');
      return `We're experiencing issues with ${features}. Some features may be temporarily unavailable. We're actively working to restore full service.`;
    }

    // High impact
    const downtime = impact.estimatedDowntime
      ? `Estimated resolution time: ${impact.estimatedDowntime} minutes.`
      : '';
    return `We're experiencing a service disruption. ${downtime} Our team is working to restore service as quickly as possible. We'll provide updates as they become available.`;
  }

  /**
   * Suggest communication channels based on impact
   */
  private suggestChannels(impactLevel: string): ('email' | 'sms' | 'in_app' | 'status_page')[] {
    if (impactLevel === 'high') {
      return ['email', 'in_app', 'status_page'];
    }
    if (impactLevel === 'medium') {
      return ['in_app', 'status_page'];
    }
    return ['in_app'];
  }

  /**
   * Save draft message (requires approval before sending)
   */
  async saveDraftMessage(incidentId: string, message: StatusMessage) {
    // Store in incident metadata or separate table
    await this.supabase
      .from('tms_incidents')
      .update({
        current_system_state: {
          ...(await this.supabase.from('tms_incidents').select('current_system_state').eq('id', incidentId).single()).data?.current_system_state,
          customer_message_draft: message,
        },
      })
      .eq('id', incidentId);
  }
}
