import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/ronyx/dispatch-import/[importId] — jobs + alerts for one import batch
export async function GET(_req: Request, { params }: { params: { importId: string } }) {
  const sb = supabaseAdmin;

  const [jobsRes, alertsRes, batchRes] = await Promise.all([
    sb.from("dispatch_jobs")
      .select("*")
      .eq("dispatch_import_id", params.importId)
      .order("compliance_severity", { ascending: true })
      .order("driver_name"),
    sb.from("dispatch_guard_alerts")
      .select("*")
      .eq("dispatch_import_id", params.importId)
      .eq("status", "open")
      .order("severity"),
    sb.from("dispatch_imports")
      .select("*")
      .eq("id", params.importId)
      .single(),
  ]);

  return NextResponse.json({
    batch:  batchRes.data,
    jobs:   jobsRes.data  || [],
    alerts: alertsRes.data || [],
  });
}
