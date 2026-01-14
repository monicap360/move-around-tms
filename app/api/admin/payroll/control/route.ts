import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayrollConcurrencyControl } from "@/lib/payroll/concurrencyControl";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/payroll/control
 * Admin controls: pause, resume, cancel, re-run
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if super admin
    const isSuperAdmin = user.user_metadata?.is_super_admin === true;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, jobId, reason } = body;

    const concurrencyControl = new PayrollConcurrencyControl();

    switch (action) {
      case 'pause_all':
        await concurrencyControl.pauseQueue(reason || 'Manual pause by admin');
        return NextResponse.json({ success: true, message: 'Payroll queue paused' });

      case 'resume_all':
        await concurrencyControl.resumeQueue();
        return NextResponse.json({ success: true, message: 'Payroll queue resumed' });

      case 'cancel_job':
        if (!jobId) {
          return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        const { data: job } = await supabase
          .from('payroll_jobs')
          .select('status')
          .eq('id', jobId)
          .single();

        if (!job) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (job.status === 'running') {
          // Release slot if running
          await concurrencyControl.releaseSlot();
        }

        await supabase
          .from('payroll_jobs')
          .update({
            status: 'failed',
            failure_reason: reason || 'Cancelled by admin',
          })
          .eq('id', jobId);

        await supabase.from('payroll_job_events').insert({
          job_id: jobId,
          event_type: 'cancelled',
          message: reason || 'Cancelled by admin',
        });

        return NextResponse.json({ success: true, message: 'Job cancelled' });

      case 'rerun_job':
        if (!jobId) {
          return NextResponse.json({ error: "Job ID required" }, { status: 400 });
        }

        const { data: oldJob } = await supabase
          .from('payroll_jobs')
          .select('organization_id, requested_by, metadata')
          .eq('id', jobId)
          .single();

        if (!oldJob) {
          return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Create new job
        const { data: newJob } = await supabase
          .from('payroll_jobs')
          .insert({
            organization_id: oldJob.organization_id,
            requested_by: oldJob.requested_by,
            status: 'queued',
            priority: 'high',
            metadata: oldJob.metadata,
          })
          .select()
          .single();

        return NextResponse.json({ success: true, job_id: newJob?.id });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin payroll control error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
