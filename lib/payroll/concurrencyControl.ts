/**
 * Payroll Concurrency Control
 * Enforces global limits to prevent system overload
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PayrollSlot {
  acquired: boolean;
  reason?: string;
}

export class PayrollConcurrencyControl {
  private supabase = createSupabaseServerClient();
  private readonly MAX_CONCURRENT_JOBS = 2;
  private readonly MAX_JOBS_PER_ORG = 1;

  /**
   * Check if organization can queue a new payroll job
   */
  async canQueueJob(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if org already has active job
    const { data: activeJob } = await this.supabase
      .from('payroll_jobs')
      .select('id, status')
      .eq('organization_id', organizationId)
      .in('status', ['queued', 'running', 'paused'])
      .limit(1)
      .single();

    if (activeJob) {
      return {
        allowed: false,
        reason: `Payroll already ${activeJob.status}. Please wait for it to complete.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Acquire a payroll execution slot (atomic)
   */
  async acquireSlot(): Promise<PayrollSlot> {
    try {
      // Use database function for atomic operation
      const { data, error } = await this.supabase.rpc('acquire_payroll_slot');

      if (error) {
        console.error('Failed to acquire payroll slot:', error);
        return { acquired: false, reason: 'Failed to acquire slot' };
      }

      if (data === true) {
        return { acquired: true };
      }

      // Check why slot wasn't acquired
      const { data: lock } = await this.supabase
        .from('payroll_global_lock')
        .select('*')
        .eq('id', 1)
        .single();

      if (lock?.paused) {
        return {
          acquired: false,
          reason: lock.paused_reason || 'Payroll is paused due to system stress',
        };
      }

      return {
        acquired: false,
        reason: `Maximum concurrent payroll jobs (${lock?.max_concurrent_jobs || this.MAX_CONCURRENT_JOBS}) reached. Please wait.`,
      };
    } catch (error: any) {
      console.error('Error acquiring payroll slot:', error);
      return { acquired: false, reason: 'System error acquiring slot' };
    }
  }

  /**
   * Release a payroll execution slot
   */
  async releaseSlot(): Promise<void> {
    try {
      await this.supabase.rpc('release_payroll_slot');
    } catch (error) {
      console.error('Failed to release payroll slot:', error);
    }
  }

  /**
   * Check system health before starting payroll
   */
  async checkSystemHealth(): Promise<{ healthy: boolean; reason?: string }> {
    // Check for critical incidents
    const { data: criticalIncident } = await this.supabase
      .from('tms_incidents')
      .select('id, summary')
      .eq('severity', 'critical')
      .eq('status', 'open')
      .limit(1)
      .single();

    if (criticalIncident) {
      return {
        healthy: false,
        reason: 'Critical incident active. Payroll paused for system stability.',
      };
    }

    // Check memory (placeholder - would integrate with real monitoring)
    // In production, this would check actual system metrics
    const memoryUsage = await this.getMemoryUsage();
    if (memoryUsage > 85) {
      return {
        healthy: false,
        reason: `Memory usage at ${memoryUsage.toFixed(1)}%. Payroll paused to prevent system overload.`,
      };
    }

    // Check disk (placeholder)
    const diskUsage = await this.getDiskUsage();
    if (diskUsage > 80) {
      return {
        healthy: false,
        reason: `Disk usage at ${diskUsage.toFixed(1)}%. Payroll paused to prevent system overload.`,
      };
    }

    return { healthy: true };
  }

  /**
   * Pause payroll queue (admin action or system stress)
   */
  async pauseQueue(reason: string): Promise<void> {
    await this.supabase
      .from('payroll_global_lock')
      .update({
        paused: true,
        paused_reason: reason,
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1);
  }

  /**
   * Resume payroll queue
   */
  async resumeQueue(): Promise<void> {
    await this.supabase
      .from('payroll_global_lock')
      .update({
        paused: false,
        paused_reason: null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', 1);
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<{
    running: number;
    queued: number;
    paused: boolean;
    maxConcurrent: number;
  }> {
    const { data: running } = await this.supabase
      .from('payroll_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'running');

    const { data: queued } = await this.supabase
      .from('payroll_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['queued', 'paused']);

    const { data: lock } = await this.supabase
      .from('payroll_global_lock')
      .select('*')
      .eq('id', 1)
      .single();

    return {
      running: running?.count || 0,
      queued: queued?.count || 0,
      paused: lock?.paused || false,
      maxConcurrent: lock?.max_concurrent_jobs || this.MAX_CONCURRENT_JOBS,
    };
  }

  /**
   * Get memory usage (placeholder - integrate with real monitoring)
   */
  private async getMemoryUsage(): Promise<number> {
    // In production, would check actual system memory
    // For now, return placeholder
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const totalMemory = 8 * 1024 * 1024 * 1024; // Assume 8GB
      return (usage.heapUsed / totalMemory) * 100;
    }
    return 0;
  }

  /**
   * Get disk usage (placeholder - integrate with real monitoring)
   */
  private async getDiskUsage(): Promise<number> {
    // In production, would check actual disk usage
    // For now, return placeholder
    return 0;
  }
}
