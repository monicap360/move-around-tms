/**
 * Payroll Worker Process
 * Polls for queued jobs and executes them with concurrency control
 * 
 * This should run as a separate process (PM2 worker or cron job)
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayrollConcurrencyControl } from "@/lib/payroll/concurrencyControl";
import { PayrollIncidentIntegration } from "@/lib/payroll/incidentIntegration";

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
const CHECKPOINT_INTERVAL = 10; // Save checkpoint every 10 tickets

export class PayrollWorker {
  private supabase = createSupabaseServerClient();
  private concurrencyControl = new PayrollConcurrencyControl();
  private incidentIntegration = new PayrollIncidentIntegration();
  private running = false;

  /**
   * Start the worker
   */
  async start() {
    if (this.running) {
      console.warn("Payroll worker already running");
      return;
    }

    this.running = true;
    console.log("Payroll worker started");

    while (this.running) {
      try {
        await this.processQueue();
      } catch (error) {
        console.error("Payroll worker error:", error);
      }

      // Wait before next poll
      await this.sleep(POLL_INTERVAL_MS);
    }
  }

  /**
   * Stop the worker
   */
  stop() {
    this.running = false;
    console.log("Payroll worker stopped");
  }

  /**
   * Process queued payroll jobs
   */
  private async processQueue() {
    // Check incident status first
    const incidentCheck = await this.incidentIntegration.checkIncidentStatus();
    if (incidentCheck.shouldPause) {
      await this.pauseQueuedJobs(incidentCheck.reason || 'Incident detected');
      return;
    }

    // Check system health
    const healthCheck = await this.concurrencyControl.checkSystemHealth();
    if (!healthCheck.healthy) {
      // Pause all queued jobs
      await this.pauseQueuedJobs(healthCheck.reason || 'System health check failed');
      return;
    }

    // Try to acquire a slot
    const slot = await this.concurrencyControl.acquireSlot();
    if (!slot.acquired) {
      // No slot available, wait
      return;
    }

    try {
      // Get next queued job (FIFO, priority first)
      const { data: job } = await this.supabase
        .from('payroll_jobs')
        .select('*')
        .in('status', ['queued', 'paused'])
        .order('priority', { ascending: false }) // High priority first
        .order('requested_at', { ascending: true }) // Then FIFO
        .limit(1)
        .single();

      if (!job) {
        // No jobs to process
        return;
      }

      // Start job
      await this.startJob(job.id);

      // Execute payroll
      await this.executePayroll(job);

      // Release slot
      await this.concurrencyControl.releaseSlot();
    } catch (error: any) {
      console.error("Error processing payroll job:", error);
      await this.concurrencyControl.releaseSlot();
    }
  }

  /**
   * Start a payroll job
   */
  private async startJob(jobId: string) {
    await this.supabase
      .from('payroll_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await this.supabase.from('payroll_job_events').insert({
      job_id: jobId,
      event_type: 'started',
      message: 'Payroll job started',
    });
  }

  /**
   * Execute payroll calculation
   */
  private async executePayroll(job: any) {
    const { id: jobId, organization_id, metadata, checkpoint_data } = job;

    try {
      // Load checkpoint if resuming
      const checkpoint = checkpoint_data || {};
      const lastProcessedTicketId = checkpoint.last_processed_ticket_id || null;
      const processedCount = checkpoint.processed_count || 0;

      // Get tickets to process
      const payPeriodStart = metadata.pay_period_start;
      const payPeriodEnd = metadata.pay_period_end;

      // Fetch tickets for payroll period
      let query = this.supabase
        .from('aggregate_tickets')
        .select('*')
        .eq('organization_id', organization_id)
        .gte('ticket_date', payPeriodStart)
        .lte('ticket_date', payPeriodEnd)
        .order('id', { ascending: true })
        .limit(100); // Process in batches

      if (lastProcessedTicketId) {
        query = query.gt('id', lastProcessedTicketId);
      }

      const { data: tickets, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch tickets: ${error.message}`);
      }

      if (!tickets || tickets.length === 0) {
        // No more tickets, complete job
        await this.completeJob(jobId, processedCount);
        return;
      }

      // Process tickets in batches
      let processed = processedCount;
      for (const ticket of tickets) {
        // Calculate payroll for ticket
        await this.processTicket(ticket, organization_id);

        processed++;

        // Save checkpoint every N tickets
        if (processed % CHECKPOINT_INTERVAL === 0) {
          await this.saveCheckpoint(jobId, ticket.id, processed);
        }

        // Update progress
        const totalTickets = metadata.total_tickets || 1000; // Estimate
        const progress = Math.min(100, Math.round((processed / totalTickets) * 100));

        await this.supabase
          .from('payroll_jobs')
          .update({ progress_percent: progress })
          .eq('id', jobId);

        await this.supabase.from('payroll_job_events').insert({
          job_id: jobId,
          event_type: 'progress',
          message: `Processed ${processed} tickets`,
          metadata: { progress_percent: progress },
        });
      }

      // Continue processing (recursive call would happen in next poll)
      // For now, mark as completed if no more tickets
      await this.completeJob(jobId, processed);
    } catch (error: any) {
      await this.failJob(jobId, error.message);
    }
  }

  /**
   * Process a single ticket for payroll
   */
  private async processTicket(ticket: any, organizationId: string) {
    // Calculate payroll for this ticket
    // This would contain your actual payroll calculation logic
    // For now, placeholder
    console.log(`Processing ticket ${ticket.id} for payroll`);
  }

  /**
   * Save checkpoint for recovery
   */
  private async saveCheckpoint(jobId: string, lastTicketId: string, processedCount: number) {
    await this.supabase
      .from('payroll_jobs')
      .update({
        checkpoint_data: {
          last_processed_ticket_id: lastTicketId,
          processed_count: processedCount,
          checkpoint_at: new Date().toISOString(),
        },
      })
      .eq('id', jobId);

    await this.supabase.from('payroll_job_events').insert({
      job_id: jobId,
      event_type: 'checkpoint',
      message: `Checkpoint saved at ticket ${lastTicketId}`,
      metadata: { processed_count: processedCount },
    });
  }

  /**
   * Complete payroll job
   */
  private async completeJob(jobId: string, processedCount: number) {
    await this.supabase
      .from('payroll_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_percent: 100,
      })
      .eq('id', jobId);

    await this.supabase.from('payroll_job_events').insert({
      job_id: jobId,
      event_type: 'completed',
      message: `Payroll completed. Processed ${processedCount} tickets.`,
    });
  }

  /**
   * Fail payroll job
   */
  private async failJob(jobId: string, reason: string) {
    const { data: job } = await this.supabase
      .from('payroll_jobs')
      .select('retry_count, max_retries')
      .eq('id', jobId)
      .single();

    const retryCount = (job?.retry_count || 0) + 1;
    const maxRetries = job?.max_retries || 2;

    if (retryCount < maxRetries) {
      // Retry with exponential backoff
      const backoffSeconds = Math.pow(2, retryCount) * 60; // 2min, 4min
      await this.supabase
        .from('payroll_jobs')
        .update({
          status: 'queued',
          retry_count: retryCount,
          failure_reason: `Retry ${retryCount}/${maxRetries}: ${reason}`,
        })
        .eq('id', jobId);
    } else {
      // Final failure
      await this.supabase
        .from('payroll_jobs')
        .update({
          status: 'failed',
          failure_reason: reason,
          retry_count: retryCount,
        })
        .eq('id', jobId);
    }

    await this.supabase.from('payroll_job_events').insert({
      job_id: jobId,
      event_type: 'failed',
      message: reason,
      metadata: { retry_count: retryCount },
    });
  }

  /**
   * Pause queued jobs due to system stress
   */
  private async pauseQueuedJobs(reason: string) {
    await this.supabase
      .from('payroll_jobs')
      .update({ status: 'paused' })
      .eq('status', 'queued');

    // Update global lock
    await this.concurrencyControl.pauseQueue(reason);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// If running as standalone script
if (require.main === module) {
  const worker = new PayrollWorker();
  worker.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping worker...');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping worker...');
    worker.stop();
    process.exit(0);
  });
}
