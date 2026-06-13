import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Returns drivers with real-time compliance status and current job assignment
export async function GET() {
  const supabase = createSupabaseServerClient();
  const today    = new Date().toISOString().slice(0, 10);

  const [{ data: driverRows }, { data: activeJobs }] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, name, status, driver_profiles(full_name, phone, email, medical_card_expiration, license_expiration_date, mvr_expiration, dispatch_eligible, assigned_truck_number, payroll_eligible)")
      .neq("status", "inactive")
      .neq("status", "terminated")
      .order("name"),
    supabase
      .from("dispatch_jobs")
      .select("assigned_driver_id, job_status, job_number, customer_name, pickup_time")
      .not("assigned_driver_id", "is", null)
      .not("job_status", "in", '("completed","billing_review","cancelled","needs_review")'),
  ]);

  // Map active job assignments by driver ID
  const assignmentMap: Record<string, any> = {};
  for (const job of activeJobs || []) {
    if (job.assigned_driver_id) assignmentMap[job.assigned_driver_id] = job;
  }

  const drivers = (driverRows || []).map((d: any) => {
    const p = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    const name = p?.full_name || d.name || "Unknown";

    const medExpired  = p?.medical_card_expiration && p.medical_card_expiration < today;
    const cdlExpired  = p?.license_expiration_date && p.license_expiration_date < today;
    const dispBlocked = p?.dispatch_eligible === false;

    const activeJob = assignmentMap[d.id];

    let status: string;
    if (dispBlocked || medExpired || cdlExpired) {
      status = "blocked";
    } else if (activeJob) {
      status = activeJob.job_status === "assigned" ? "assigned" : "on_trip";
    } else if (d.status === "off_duty") {
      status = "off_duty";
    } else {
      status = "available";
    }

    const blockReasons: string[] = [];
    if (dispBlocked)  blockReasons.push("Dispatch ineligible");
    if (medExpired)   blockReasons.push(`Medical card expired ${p.medical_card_expiration}`);
    if (cdlExpired)   blockReasons.push(`CDL expired ${p.license_expiration_date}`);

    const compliance = medExpired || cdlExpired ? "expired"
      : (() => {
          const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
          const expiring = [p?.medical_card_expiration, p?.license_expiration_date, p?.mvr_expiration]
            .some(d => d && d > today && d <= in30);
          return expiring ? "expiring" : "valid";
        })();

    return {
      id:              d.id,
      name,
      phone:           p?.phone || null,
      status,
      compliance,
      dispatch_eligible: p?.dispatch_eligible ?? true,
      block_reasons:   blockReasons,
      vehicle:         p?.assigned_truck_number || null,
      payroll_eligible: p?.payroll_eligible ?? true,
      medical_card_expiration: p?.medical_card_expiration || null,
      license_expiration_date: p?.license_expiration_date || null,
      active_job:      activeJob ? { job_number: activeJob.job_number, status: activeJob.job_status, customer: activeJob.customer_name } : null,
    };
  });

  return NextResponse.json({ drivers });
}
