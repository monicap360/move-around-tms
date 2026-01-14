/**
 * Permission Gate - Enforces agent permissions
 * NO CROSS-TENANT VISIBILITY, EVER
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PermissionCheck {
  canRead: boolean;
  canWrite: boolean;
  canAct: boolean;
  reason?: string;
}

export class PermissionGate {
  private supabase = createSupabaseServerClient();

  /**
   * Check if agent can read from a table/field
   */
  async canRead(agentId: string, table: string, field?: string): Promise<boolean> {
    const { data: permissions } = await this.supabase
      .from('agent_permissions')
      .select('can_read')
      .eq('agent_id', agentId)
      .single();

    if (!permissions?.can_read) return false;

    const canRead = permissions.can_read as any;
    const allowedTables = canRead.tables || [];
    const allowedFields = canRead.fields || [];

    if (!allowedTables.includes(table)) return false;
    if (field && allowedFields.length > 0 && !allowedFields.includes(field)) {
      return false;
    }

    return true;
  }

  /**
   * Check if agent can write to a table/field
   */
  async canWrite(agentId: string, table: string, field?: string): Promise<boolean> {
    const { data: permissions } = await this.supabase
      .from('agent_permissions')
      .select('can_write')
      .eq('agent_id', agentId)
      .single();

    if (!permissions?.can_write) return false;

    const canWrite = permissions.can_write as any;
    const allowedTables = canWrite.tables || [];
    const allowedFields = canWrite.fields || [];

    if (!allowedTables.includes(table)) return false;
    if (field && allowedFields.length > 0 && !allowedFields.includes(field)) {
      return false;
    }

    return true;
  }

  /**
   * Check if agent can execute actions (not just draft)
   */
  async canAct(agentId: string): Promise<boolean> {
    const { data: permissions } = await this.supabase
      .from('agent_permissions')
      .select('can_act')
      .eq('agent_id', agentId)
      .single();

    return permissions?.can_act === true;
  }

  /**
   * Full permission check
   */
  async checkPermissions(
    agentId: string,
    operation: 'read' | 'write' | 'act',
    table?: string,
    field?: string
  ): Promise<PermissionCheck> {
    let canRead = false;
    let canWrite = false;
    let canAct = false;

    if (operation === 'read' && table) {
      canRead = await this.canRead(agentId, table, field);
    } else if (operation === 'write' && table) {
      canWrite = await this.canWrite(agentId, table, field);
    } else if (operation === 'act') {
      canAct = await this.canAct(agentId);
    }

    return {
      canRead,
      canWrite,
      canAct,
      reason: !canRead && !canWrite && !canAct
        ? 'Agent does not have permission for this operation'
        : undefined,
    };
  }

  /**
   * Enforce organization isolation - NEVER allow cross-tenant access
   */
  async enforceOrgIsolation(agentId: string, organizationId: string): Promise<boolean> {
    const { data: agent } = await this.supabase
      .from('agents')
      .select('organization_id')
      .eq('id', agentId)
      .single();

    if (!agent) return false;
    if (agent.organization_id !== organizationId) {
      throw new Error('CROSS-TENANT ACCESS ATTEMPT BLOCKED');
    }

    return true;
  }
}
