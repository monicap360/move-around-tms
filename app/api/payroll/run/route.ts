import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayrollConcurrencyControl } from "@/lib/payroll/concurrencyControl";

export const dynamic = 'force-dynamic';

/**
 * POST /api/payroll/run
 * Enqueue payroll job (NON-BLOCKING)
 * 
 * CRITICAL: This endpoint ONLY enqueues jobs.
 * NO payroll computation happens here.
 * NO blocking operations.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const organizationId = body.organization_id || user.user_metadata?.organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Verify user belongs to organization
    const { data: company } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .single();

    if (!company) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Check concurrency control
    const concurrencyControl = new PayrollConcurrencyControl();
    const canQueue = await concurrencyControl.canQueueJob(organizationId);

    if (!canQueue.allowed) {
      return NextResponse.json(
        {
          error: canQueue.reason || "Cannot queue payroll job",
          code: "PAYROLL_ALREADY_RUNNING",
        },
        { status: 409 } // Conflict
      );
    }

    // Check system health
    const healthCheck = await concurrencyControl.checkSystemHealth();
    if (!healthCheck.healthy) {
      // Still create job, but mark as paused
      const { data: job, error: jobError } = await supabase
        .from('payroll_jobs')
        .insert({
          organization_id: organizationId,
          requested_by: user.id,
          status: 'paused',
          priority: body.priority || 'normal',
          metadata: {
            pay_period_start: body.pay_period_start,
            pay_period_end: body.pay_period_end,
            pause_reason: healthCheck.reason,
          },
        })
        .select()
        .single();

      if (jobError) {
        return NextResponse.json(
          { error: "Failed to create payroll job" },
          { status: 500 }
        );
      }

      // Log event
      await supabase.from('payroll_job_events').insert({
        job_id: job.id,
        event_type: 'queued',
        message: 'Job queued but paused due to system health',
        metadata: { reason: healthCheck.reason },
      });

      return NextResponse.json({
        job_id: job.id,
        status: 'paused',
        message: healthCheck.reason || 'Payroll queued but paused due to system conditions',
      });
    }

    // Create payroll job (status = queued)
    const { data: job, error: jobError } = await supabase
      .from('payroll_jobs')
      .insert({
        organization_id: organizationId,
        requested_by: user.id,
        status: 'queued',
        priority: body.priority || 'normal',
        metadata: {
          pay_period_start: body.pay_period_start,
          pay_period_end: body.pay_period_end,
        },
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create payroll job:", jobError);
      return NextResponse.json(
        { error: "Failed to queue payroll job" },
        { status: 500 }
      );
    }

    // Log queued event
    await supabase.from('payroll_job_events').insert({
      job_id: job.id,
      event_type: 'queued',
      message: 'Payroll job queued',
    });

    // Return immediately (200 OK)
    // UI will show "Payroll queued" and poll for status
    return NextResponse.json({
      job_id: job.id,
      status: 'queued',
      message: 'Payroll queued. Processing safely to avoid errors.',
    });
  } catch (error: any) {
    console.error("Payroll run error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

