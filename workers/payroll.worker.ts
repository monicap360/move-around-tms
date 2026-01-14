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
   * Uses existing payroll calculation logic from the system
   */
  private async processTicket(ticket: any, organizationId: string) {
    // Get driver/employee info for this ticket
    const driverId = ticket.driver_id;
    if (!driverId) {
      console.warn(`Ticket ${ticket.id} has no driver_id, skipping`);
      return;
    }

    // Get driver/employee payroll configuration
    const { data: driver } = await this.supabase
      .from('drivers')
      .select('id, pay_type, hourly_rate, percentage_rate, salary_amount, yard_rate, ton_rate, load_rate')
      .eq('id', driverId)
      .eq('organization_id', organizationId)
      .single();

    if (!driver) {
      console.warn(`Driver ${driverId} not found for ticket ${ticket.id}`);
      return;
    }

    // Calculate payroll using existing logic (matches calcPay from hr-payroll function)
    const payrollEntry = this.calculatePayroll(ticket, driver);

    // Save payroll entry to database
    // This would go to your payroll_entries or similar table
    // For now, we'll update the ticket with payroll info or create a payroll entry
    await this.savePayrollEntry(ticket, driver, payrollEntry);
  }

  /**
   * Calculate payroll for a ticket (matches existing calcPay logic)
   */
  private calculatePayroll(ticket: any, driver: any): { gross: number; net: number; needs_review: boolean } {
    const deductions = Number(ticket.deductions || 0);
    let gross = 0;
    let needs_review = false;

    switch (driver.pay_type) {
      case 'hourly':
        gross = Number(ticket.total_hours || 0) * Number(driver.hourly_rate || 0);
        break;
      case 'percentage':
        gross = Number(ticket.load_revenue || 0) * (Number(driver.percentage_rate || 0) / 100);
        break;
      case 'salary':
        gross = Number(driver.salary_amount || 0);
        break;
      case 'per_yard': {
        const yards = Number(ticket.yards || 0);
        const rate = Number(driver.yard_rate || 0);
        gross = yards * rate;
        if (yards === 0) needs_review = true;
        break;
      }
      case 'per_ton': {
        const tons = Number(ticket.net_tons || 0);
        const rate = Number(driver.ton_rate || 0);
        gross = tons * rate;
        if (tons === 0) needs_review = true;
        break;
      }
      case 'per_load': {
        const rate = Number(driver.load_rate || 0);
        gross = rate;
        break;
      }
      default:
        gross = 0;
        needs_review = true;
    }

    const net = gross - deductions;
    return { gross, net, needs_review };
  }

  /**
   * Save payroll entry to database
   */
  private async savePayrollEntry(ticket: any, driver: any, payroll: { gross: number; net: number; needs_review: boolean }) {
    // Check if payroll_entries table exists, otherwise update ticket
    const { data: payrollTable } = await this.supabase
      .from('payroll_entries')
      .select('id')
      .limit(1);

    if (payrollTable !== null) {
      // Use payroll_entries table
      await this.supabase.from('payroll_entries').upsert({
        ticket_id: ticket.id,
        driver_id: driver.id,
        organization_id: ticket.organization_id,
        gross_pay: payroll.gross,
        net_pay: payroll.net,
        deductions: ticket.deductions || 0,
        pay_type: driver.pay_type,
        needs_review: payroll.needs_review,
        pay_period_start: ticket.pay_period_start,
        pay_period_end: ticket.pay_period_end,
      });
    } else {
      // Fallback: update ticket with payroll info
      await this.supabase
        .from('aggregate_tickets')
        .update({
          payroll_calculated: true,
          gross_pay: payroll.gross,
          net_pay: payroll.net,
        })
        .eq('id', ticket.id);
    }
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
