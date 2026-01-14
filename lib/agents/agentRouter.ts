/**
 * Agent Router - Routes user intent to correct agent
 * Organization-scoped, RLS-enforced
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AgentType = 'resolution' | 'ops' | 'sales' | 'growth' | 'health' | 'learning';

export interface AgentContext {
  organizationId: string;
  userId: string;
  currentPage?: string;
  entityId?: string;
  entityType?: string;
  userMessage: string;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  agentType: AgentType;
  message: string;
  actions?: AgentAction[];
  confidence?: number;
  requiresApproval?: boolean;
}

export interface AgentAction {
  type: string;
  payload: Record<string, any>;
  description: string;
  requiresApproval: boolean;
}

export class AgentRouter {
  private supabase = createSupabaseServerClient();

  /**
   * Route user message to appropriate agent based on context
   */
  async route(context: AgentContext): Promise<AgentResponse> {
    const { organizationId, userMessage, currentPage, entityType } = context;

    // Get active agents for this organization
    const { data: agents, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (error || !agents || agents.length === 0) {
      throw new Error('No active agents found for organization');
    }

    // Route based on context and message intent
    const agent = this.selectAgent(agents, context);

    if (!agent) {
      throw new Error('No suitable agent found for this request');
    }

    // Log conversation
    await this.logConversation({
      agentId: agent.id,
      organizationId,
      userId: context.userId,
      message: userMessage,
      role: 'user',
      context: {
        page: currentPage,
        entity_id: context.entityId,
        entity_type: context.entityType,
      },
    });

    return {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type as AgentType,
      message: '', // Will be filled by agent execution
      requiresApproval: false,
    };
  }

  /**
   * Select best agent based on context and message
   */
  private selectAgent(agents: any[], context: AgentContext): any {
    const { userMessage, currentPage, entityType } = context;
    const message = userMessage.toLowerCase();

    // Resolution Agent: Ticket failures, violations, onboarding
    if (
      message.includes('fail') ||
      message.includes('error') ||
      message.includes('violation') ||
      message.includes('onboard') ||
      message.includes('help') ||
      message.includes('how to') ||
      entityType === 'ticket' ||
      currentPage?.includes('ticket')
    ) {
      return agents.find(a => a.type === 'resolution');
    }

    // Ops Agent: Alerts, payroll, violations, driver risk
    if (
      message.includes('alert') ||
      message.includes('payroll') ||
      message.includes('violation') ||
      message.includes('driver risk') ||
      message.includes('weekly') ||
      currentPage?.includes('dispatch') ||
      currentPage?.includes('payroll')
    ) {
      return agents.find(a => a.type === 'ops');
    }

    // Sales Agent: Leads, pricing, plans, proposals
    if (
      message.includes('lead') ||
      message.includes('pricing') ||
      message.includes('plan') ||
      message.includes('proposal') ||
      message.includes('roi') ||
      currentPage?.includes('sales') ||
      currentPage?.includes('pricing')
    ) {
      return agents.find(a => a.type === 'sales');
    }

    // Default to Resolution Agent
    return agents.find(a => a.type === 'resolution') || agents[0];
  }

  /**
   * Log conversation message
   */
  private async logConversation(data: {
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
}
