/**
 * Tool Registry - Defines what tools agents can use
 * Permission-gated, organization-scoped
 */

import { PermissionGate } from "./permissionGate";

export type ToolName = 
  | 'read_tickets'
  | 'read_violations'
  | 'read_upload_logs'
  | 'write_support_ticket'
  | 'read_drivers'
  | 'read_alerts'
  | 'write_ops_notes'
  | 'read_pricing'
  | 'read_features'
  | 'create_lead'
  | 'create_demo_request';

export interface Tool {
  name: ToolName;
  description: string;
  requiresApproval: boolean;
  execute: (params: Record<string, any>) => Promise<any>;
}

export class ToolRegistry {
  private permissionGate = new PermissionGate();
  private tools: Map<ToolName, Tool> = new Map();

  constructor() {
    this.registerTools();
  }

  /**
   * Register all available tools
   */
  private registerTools() {
    // Resolution Agent Tools
    this.tools.set('read_tickets', {
      name: 'read_tickets',
      description: 'Read ticket data including status, errors, and metadata',
      requiresApproval: false,
      execute: async (params) => {
        // Implementation will be added
        return { success: true, data: [] };
      },
    });

    this.tools.set('read_violations', {
      name: 'read_violations',
      description: 'Read violation rules and current violations',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true, data: [] };
      },
    });

    this.tools.set('read_upload_logs', {
      name: 'read_upload_logs',
      description: 'Read ticket upload logs and error messages',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true, data: [] };
      },
    });

    this.tools.set('write_support_ticket', {
      name: 'write_support_ticket',
      description: 'Draft a support ticket with diagnostics (requires approval)',
      requiresApproval: true,
      execute: async (params) => {
        return { success: true, actionId: 'draft', requiresApproval: true };
      },
    });

    // Ops Agent Tools
    this.tools.set('read_drivers', {
      name: 'read_drivers',
      description: 'Read driver data and status',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true, data: [] };
      },
    });

    this.tools.set('read_alerts', {
      name: 'read_alerts',
      description: 'Read system alerts and notifications',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true, data: [] };
      },
    });

    this.tools.set('write_ops_notes', {
      name: 'write_ops_notes',
      description: 'Write operational notes and summaries',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true };
      },
    });

    // Sales Agent Tools
    this.tools.set('read_pricing', {
      name: 'read_pricing',
      description: 'Read pricing plans and features',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true, data: [] };
      },
    });

    this.tools.set('read_features', {
      name: 'read_features',
      description: 'Read product features and capabilities',
      requiresApproval: false,
      execute: async (params) => {
        return { success: true, data: [] };
      },
    });

    this.tools.set('create_lead', {
      name: 'create_lead',
      description: 'Create a new lead record',
      requiresApproval: true,
      execute: async (params) => {
        return { success: true, actionId: 'draft', requiresApproval: true };
      },
    });

    this.tools.set('create_demo_request', {
      name: 'create_demo_request',
      description: 'Create a demo request',
      requiresApproval: true,
      execute: async (params) => {
        return { success: true, actionId: 'draft', requiresApproval: true };
      },
    });
  }

  /**
   * Get tool by name
   */
  getTool(name: ToolName): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if agent can use a tool
   */
  async canUseTool(agentId: string, toolName: ToolName, organizationId: string): Promise<boolean> {
    const tool = this.tools.get(toolName);
    if (!tool) return false;

    // Enforce organization isolation
    await this.permissionGate.enforceOrgIsolation(agentId, organizationId);

    // Check specific permissions based on tool
    if (toolName.startsWith('read_')) {
      const table = toolName.replace('read_', '');
      return await this.permissionGate.canRead(agentId, table);
    }

    if (toolName.startsWith('write_') || toolName.startsWith('create_')) {
      const table = toolName.replace('write_', '').replace('create_', '');
      return await this.permissionGate.canWrite(agentId, table);
    }

    return false;
  }

  /**
   * Execute tool with permission check
   */
  async executeTool(
    agentId: string,
    toolName: ToolName,
    params: Record<string, any>,
    organizationId: string
  ): Promise<any> {
    const canUse = await this.canUseTool(agentId, toolName, organizationId);
    if (!canUse) {
      throw new Error(`Agent ${agentId} does not have permission to use tool ${toolName}`);
    }

    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    return await tool.execute(params);
  }
}
