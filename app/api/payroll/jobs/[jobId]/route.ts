import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * GET /api/payroll/jobs/[jobId]
 * Get payroll job status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = params;

    // Get job
    const { data: job, error: jobError } = await supabase
      .from('payroll_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Payroll job not found" },
        { status: 404 }
      );
    }

    // Get events
    const { data: events } = await supabase
      .from('payroll_job_events')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      job,
      events: events || [],
    });
  } catch (error: any) {
    console.error("Get payroll job error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
