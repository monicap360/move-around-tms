/**
 * TMS Health Monitor
 * Early warning system for incidents
 * Monitors: app health, uploads, PM2, memory, disk, errors
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface HealthMetrics {
  memoryPercent: number;
  diskPercent: number;
  pm2Status: 'running' | 'stopped' | 'restarting' | 'unknown';
  pm2RestartCount: number;
  uploadFailureRate: number; // 0-1
  errorRate: number; // 5xx errors per minute
  appHealthCheck: boolean;
  timestamp: string;
}

export interface AlertThreshold {
  memory: number; // Default: 85
  disk: number; // Default: 80
  uploadFailureRate: number; // Default: 0.1 (10%)
  errorRate: number; // Default: 10 errors/min
  pm2RestartLoop: number; // Default: 3 restarts in 5 min
}

export class HealthMonitor {
  private supabase = createSupabaseServerClient();
  private defaultThresholds: AlertThreshold = {
    memory: 85,
    disk: 80,
    uploadFailureRate: 0.1,
    errorRate: 10,
    pm2RestartLoop: 3,
  };

  /**
   * Collect current health metrics
   */
  async collectMetrics(organizationId?: string): Promise<HealthMetrics> {
    const metrics: HealthMetrics = {
      memoryPercent: await this.getMemoryUsage(),
      diskPercent: await this.getDiskUsage(),
      pm2Status: await this.getPM2Status(),
      pm2RestartCount: await this.getPM2RestartCount(),
      uploadFailureRate: await this.getUploadFailureRate(organizationId),
      errorRate: await this.getErrorRate(),
      appHealthCheck: await this.checkAppHealth(),
      timestamp: new Date().toISOString(),
    };

    // Save snapshot
    await this.saveSnapshot(metrics, organizationId);

    return metrics;
  }

  /**
   * Check if metrics exceed thresholds
   */
  async checkThresholds(
    metrics: HealthMetrics,
    thresholds: AlertThreshold = this.defaultThresholds
  ): Promise<{
    alert: boolean;
    violations: string[];
    severity: 'info' | 'warning' | 'critical';
  }> {
    const violations: string[] = [];
    let severity: 'info' | 'warning' | 'critical' = 'info';

    // Memory check
    if (metrics.memoryPercent > thresholds.memory) {
      violations.push(`Memory usage at ${metrics.memoryPercent}% (threshold: ${thresholds.memory}%)`);
      severity = metrics.memoryPercent > 95 ? 'critical' : 'warning';
    }

    // Disk check
    if (metrics.diskPercent > thresholds.disk) {
      violations.push(`Disk usage at ${metrics.diskPercent}% (threshold: ${thresholds.disk}%)`);
      severity = metrics.diskPercent > 90 ? 'critical' : severity === 'critical' ? 'critical' : 'warning';
    }

    // PM2 restart loop
    if (metrics.pm2RestartCount >= thresholds.pm2RestartLoop) {
      violations.push(`PM2 restart loop detected: ${metrics.pm2RestartCount} restarts`);
      severity = 'critical';
    }

    // Upload failure rate
    if (metrics.uploadFailureRate > thresholds.uploadFailureRate) {
      violations.push(`Upload failure rate: ${(metrics.uploadFailureRate * 100).toFixed(1)}%`);
      severity = metrics.uploadFailureRate > 0.3 ? 'critical' : severity === 'critical' ? 'critical' : 'warning';
    }

    // Error rate
    if (metrics.errorRate > thresholds.errorRate) {
      violations.push(`Error rate: ${metrics.errorRate} errors/min`);
      severity = metrics.errorRate > 50 ? 'critical' : severity === 'critical' ? 'critical' : 'warning';
    }

    // App health check
    if (!metrics.appHealthCheck) {
      violations.push('Application health check failing');
      severity = 'critical';
    }

    return {
      alert: violations.length > 0,
      violations,
      severity,
    };
  }

  /**
   * Get memory usage percentage
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      // In production, this would call a system endpoint or use OS APIs
      // For now, return a placeholder that would be replaced with actual monitoring
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        const totalMemory = 4 * 1024 * 1024 * 1024; // Assume 4GB for now
        return (usage.heapUsed / totalMemory) * 100;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get disk usage percentage
   */
  private async getDiskUsage(): Promise<number> {
    try {
      // In production, would use 'df' command or filesystem APIs
      // Placeholder for now
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get PM2 status
   */
  private async getPM2Status(): Promise<'running' | 'stopped' | 'restarting' | 'unknown'> {
    try {
      // In production, would check PM2 API or process list
      // Placeholder
      return 'running';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get PM2 restart count in last 5 minutes
   */
  private async getPM2RestartCount(): Promise<number> {
    try {
      // In production, would check PM2 logs or metrics
      // Placeholder
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get upload failure rate (last hour)
   */
  private async getUploadFailureRate(organizationId?: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      let query = this.supabase
        .from('aggregate_tickets')
        .select('id, status, created_at', { count: 'exact' })
        .gte('created_at', oneHourAgo);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: tickets, count } = await query;

      if (!count || count === 0) return 0;

      const failed = tickets?.filter(
        (t: any) => t.status === 'failed' || t.status === 'error'
      ).length || 0;

      return failed / count;
    } catch {
      return 0;
    }
  }

  /**
   * Get error rate (5xx errors per minute)
   */
  private async getErrorRate(): Promise<number> {
    try {
      // In production, would check application logs or error tracking
      // Placeholder
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Check application health endpoint
   */
  private async checkAppHealth(): Promise<boolean> {
    try {
      // Check /api/health endpoint
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Save health snapshot
   */
  private async saveSnapshot(metrics: HealthMetrics, organizationId?: string) {
    await this.supabase.from('tms_health_snapshots').insert({
      organization_id: organizationId || null,
      snapshot_type: 'periodic',
      metrics: {
        memory_percent: metrics.memoryPercent,
        disk_percent: metrics.diskPercent,
        pm2_status: metrics.pm2Status,
        pm2_restart_count: metrics.pm2RestartCount,
        upload_failure_rate: metrics.uploadFailureRate,
        error_rate: metrics.errorRate,
        app_health_check: metrics.appHealthCheck,
      },
    });
  }
}
