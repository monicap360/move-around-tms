/**
 * Audit Logger - Logs every agent action
 * Immutable, append-only
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuditLog {
  agentId: string;
  organizationId: string;
  userId?: string;
  action: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private supabase = createSupabaseServerClient();

  /**
   * Log agent conversation
   */
  async logConversation(data: {
    agentId: string;
    organizationId: string;
    userId: string;
    message: string;
    role: 'user' | 'agent' | 'system';
    context?: Record<string, any>;
  }) {
    await this.supabase.from('agent_conversations').insert({
      agent_id: data.agentId,
      organization_id: data.organizationId,
      user_id: data.userId,
      message: data.message,
      role: data.role,
      context: data.context || {},
    });
  }

  /**
   * Log agent action (draft, approval, execution)
   */
  async logAction(data: {
    agentId: string;
    organizationId: string;
    actionType: string;
    payload: Record<string, any>;
    status: 'draft' | 'approved' | 'rejected' | 'executed';
    approvedBy?: string;
  }) {
    await this.supabase.from('agent_actions').insert({
      agent_id: data.agentId,
      organization_id: data.organizationId,
      action_type: data.actionType,
      payload: data.payload,
      status: data.status,
      approved_by: data.approvedBy || null,
      executed_at: data.status === 'executed' ? new Date().toISOString() : null,
    });
  }

  /**
   * Get audit trail for an agent
   */
  async getAuditTrail(agentId: string, organizationId: string) {
    const { data: conversations } = await this.supabase
      .from('agent_conversations')
      .select('*')
      .eq('agent_id', agentId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: actions } = await this.supabase
      .from('agent_actions')
      .select('*')
      .eq('agent_id', agentId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    return {
      conversations: conversations || [],
      actions: actions || [],
    };
  }
}
