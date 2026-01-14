import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayrollConcurrencyControl } from "@/lib/payroll/concurrencyControl";

export const dynamic = 'force-dynamic';

/**
 * GET /api/payroll/queue-status
 * Get current queue status and position for organization
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 });
    }

    const concurrencyControl = new PayrollConcurrencyControl();
    const queueStatus = await concurrencyControl.getQueueStatus();

    // Get organization's job position in queue
    const { data: orgJob } = await supabase
      .from('payroll_jobs')
      .select('id, status, requested_at')
      .eq('organization_id', organizationId)
      .in('status', ['queued', 'paused', 'running'])
      .order('requested_at', { ascending: true })
      .limit(1)
      .single();

    let queuePosition = null;
    if (orgJob && orgJob.status === 'queued') {
      // Count jobs ahead in queue
      const { count } = await supabase
        .from('payroll_jobs')
        .select('id', { count: 'exact', head: true })
        .in('status', ['queued', 'paused'])
        .lt('requested_at', orgJob.requested_at);

      queuePosition = (count || 0) + 1;
    }

    return NextResponse.json({
      queue: queueStatus,
      organization_job: orgJob ? {
        id: orgJob.id,
        status: orgJob.status,
        queue_position: queuePosition,
      } : null,
    });
  } catch (error: any) {
    console.error("Queue status error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
