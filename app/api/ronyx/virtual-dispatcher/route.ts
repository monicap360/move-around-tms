import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionButton = { label: string; action: string; href?: string };

type PriorityAction = {
  urgency: number;
  badge: "critical" | "high" | "warning";
  title: string;
  detail: string;
  job_id?: string;
  job_number?: string;
  driver_id?: string;
  driver_name?: string;
  vehicle_id?: string;
  recommended_driver?: { id: string; name: string; score: number; reasons: string[] };
  action_buttons: ActionButton[];
};

type DriverRec = {
  job_id: string;
  job_number: string;
  customer_name: string;
  pickup_time: string;
  mins_until: number;
  recommended_driver: { id: string; name: string; score: number; reasons: string[] } | null;
  alternatives: { id: string; name: string; score: number }[];
};

type EodSummary = {
  missing_proof: number;
  pending_payroll: number;
  open_incidents: number;
  drivers_expiring_soon: number;
  total_issues: number;
};

type OwnerSummary = {
  total_trips: number;
  completed: number;
  late: number;
  at_risk: number;
  pending_payment_count: number;
  driver_issues: number;
  vehicle_issues: number;
  recommended_followups: string[];
};

// ─── Driver scoring ───────────────────────────────────────────────────────────

function scoreDriver(driver: any, job: any): number {
  let score = 0;
  if (driver.status === "available")         score += 40;
  else if (driver.status === "off_duty")     score += 5;
  else                                        score -= 20;
  if (driver.compliance === "valid")         score += 25;
  else if (driver.compliance === "expiring") score += 5;
  else                                        score -= 100; // expired = don't recommend
  if (driver.dispatch_eligible === false)    score -= 100;
  if (!driver.active_job)                    score += 20;
  if (driver.vehicle)                        score += 10;
  return score;
}

function driverReasons(driver: any): string[] {
  const r: string[] = [];
  if (driver.status === "available")         r.push("Available now");
  if (driver.compliance === "valid")         r.push("Full compliance");
  if (!driver.active_job)                    r.push("No active trip");
  if (driver.vehicle)                        r.push(`Vehicle Unit ${driver.vehicle}`);
  if (driver.compliance === "expiring")      r.push("Compliance expiring soon");
  return r;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const now  = new Date();
  const today = now.toISOString().slice(0, 10);

  // ── Load all data in parallel ──────────────────────────────────────────────
  const [jobsRes, driversRes, vehiclesRes, incidentsRes, billingRes] = await Promise.all([
    // Today's jobs with driver/vehicle/assignment info
    supabase
      .from("dispatch_jobs")
      .select(`
        id, job_number, customer_name, customer_phone, pickup_address, dropoff_address,
        pickup_time, dropoff_time, passenger_count, luggage_count, payment_status,
        job_status, risk_level, assigned_driver_id, assigned_vehicle_id,
        special_instructions, special_instructions_ack,
        assigned_driver:assigned_driver_id(
          id, name,
          driver_profiles(full_name, dispatch_eligible, medical_card_expiration, license_expiration_date, compliance_status)
        ),
        assigned_vehicle:assigned_vehicle_id(id, unit_number, status, dispatch_eligible, seat_capacity, luggage_capacity),
        latest_assignment:dispatch_assignments(acceptance_status, sent_at, no_response_at)
      `)
      .gte("pickup_time", `${date}T00:00:00`)
      .lte("pickup_time", `${date}T23:59:59`)
      .order("pickup_time", { ascending: true }),

    // All drivers with compliance
    supabase
      .from("drivers")
      .select(`
        id, name, phone, status, dispatch_eligible, payroll_eligible,
        driver_profiles(full_name, dispatch_eligible, medical_card_expiration, license_expiration_date, dispatch_block_reason, compliance_status)
      `),

    // Vehicles
    supabase
      .from("maintenance_units")
      .select("id, unit_number, status, dispatch_eligible, seat_capacity, luggage_capacity, current_mileage"),

    // Open incidents
    supabase
      .from("dispatch_incidents")
      .select("id, job_id, incident_type, severity, status, created_at")
      .in("status", ["open", "under_review"])
      .order("created_at", { ascending: false })
      .limit(50),

    // Billing review items not yet closed
    supabase
      .from("billing_review_items")
      .select("id, job_id, proof_uploaded, payment_cleared, driver_payout_set, incidents_resolved, invoice_created, closed")
      .eq("closed", false),
  ]);

  const rawJobs     = jobsRes.data     || [];
  const rawDrivers  = driversRes.data  || [];
  const rawVehicles = vehiclesRes.data || [];
  const incidents   = incidentsRes.data || [];
  const billingItems = billingRes.data  || [];

  // Normalize jobs
  const jobs = rawJobs.map((j: any) => {
    const profile     = Array.isArray(j.assigned_driver?.driver_profiles)    ? j.assigned_driver.driver_profiles[0]  : j.assigned_driver?.driver_profiles;
    const vehicle     = Array.isArray(j.assigned_vehicle) ? j.assigned_vehicle[0] : j.assigned_vehicle;
    const assignment  = (Array.isArray(j.latest_assignment) ? j.latest_assignment : [])[0] || null;
    const sentAt      = assignment?.sent_at;
    const noResponse  = sentAt && assignment?.acceptance_status === "sent"
      && (now.getTime() - new Date(sentAt).getTime()) > 5 * 60 * 1000;
    const pickupTime  = j.pickup_time ? new Date(j.pickup_time) : null;
    const minsUntil   = pickupTime ? Math.floor((pickupTime.getTime() - now.getTime()) / 60000) : null;
    const isLate      = pickupTime && pickupTime < now && !["completed","billing_review","cancelled"].includes(j.job_status);
    const medExpired  = profile?.medical_card_expiration && profile.medical_card_expiration < today;
    const cdlExpired  = profile?.license_expiration_date && profile.license_expiration_date < today;
    const blocked     = profile?.dispatch_eligible === false || medExpired || cdlExpired || vehicle?.dispatch_eligible === false || vehicle?.status === "out_of_service";

    return { ...j, profile, vehicle, assignment, noResponse, minsUntil, isLate, blocked, sentAt };
  });

  // Normalize drivers
  const drivers = rawDrivers.map((d: any) => {
    const profile    = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    const eligible   = profile?.dispatch_eligible !== false && d.dispatch_eligible !== false;
    const medOk      = !profile?.medical_card_expiration || profile.medical_card_expiration >= today;
    const cdlOk      = !profile?.license_expiration_date || profile.license_expiration_date >= today;
    const compliance = (!medOk || !cdlOk) ? "expired"
      : (profile?.medical_card_expiration && profile.medical_card_expiration <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)) ? "expiring"
      : "valid";
    const blockReason = profile?.dispatch_block_reason || null;
    return { ...d, profile, eligible, compliance, medOk, cdlOk, blockReason };
  });

  // ── Priority Actions ───────────────────────────────────────────────────────
  const actions: PriorityAction[] = [];

  // 1. Late trips
  for (const j of jobs) {
    if (j.isLate && !["completed","billing_review","cancelled"].includes(j.job_status)) {
      actions.push({
        urgency: 95,
        badge: "critical",
        title: `Trip #${j.job_number} is LATE — pickup time passed`,
        detail: `${j.customer_name} · ${j.pickup_address || "No address"}`,
        job_id: j.id, job_number: j.job_number,
        action_buttons: [
          { label: "View Trip",     action: "view_job" },
          { label: "Call Customer", action: "call_customer", href: j.customer_phone ? `tel:${j.customer_phone}` : undefined },
        ],
      });
    }
  }

  // 2. Unassigned trips with pickup < 30 min
  for (const j of jobs) {
    if (!j.assigned_driver_id && j.minsUntil != null && j.minsUntil > 0 && j.minsUntil <= 30 && !["completed","billing_review","cancelled"].includes(j.job_status)) {
      const available = drivers.filter(d => d.eligible && d.compliance !== "expired" && d.status === "available");
      const scored = available.map(d => ({ ...d, score: scoreDriver(d, j) })).sort((a, b) => b.score - a.score);
      const top = scored[0] || null;
      actions.push({
        urgency: 98 - j.minsUntil,
        badge: "critical",
        title: `Trip #${j.job_number} — no driver, pickup in ${j.minsUntil} min`,
        detail: `${j.customer_name} · ${j.pickup_address || "No address"}`,
        job_id: j.id, job_number: j.job_number,
        recommended_driver: top ? { id: top.id, name: top.name, score: top.score, reasons: driverReasons(top) } : undefined,
        action_buttons: [
          { label: top ? `Assign ${top.name.split(" ")[0]}` : "Assign Driver", action: "assign_driver" },
          { label: "View Trip", action: "view_job" },
        ],
      });
    }
  }

  // 3. No-response drivers (sent > 5 min, not accepted)
  for (const j of jobs) {
    if (j.noResponse && j.assignment?.acceptance_status === "sent") {
      const driverName = j.assigned_driver?.name || j.profile?.full_name || "Driver";
      const minsAgo = j.sentAt ? Math.floor((now.getTime() - new Date(j.sentAt).getTime()) / 60000) : "?";
      actions.push({
        urgency: 85,
        badge: "critical",
        title: `${driverName} has not accepted Trip #${j.job_number} — ${minsAgo} min`,
        detail: `Pickup${j.minsUntil != null ? ` in ${j.minsUntil} min` : ""} · ${j.pickup_address || "No address"}`,
        job_id: j.id, job_number: j.job_number,
        driver_id: j.assigned_driver_id, driver_name: driverName,
        action_buttons: [
          { label: "Reassign", action: "assign_driver" },
          { label: `Call ${driverName.split(" ")[0]}`, action: "call_driver" },
          { label: "Mark Accepted", action: "mark_accepted" },
        ],
      });
    }
  }

  // 4. Unassigned trips with pickup 30–60 min
  for (const j of jobs) {
    if (!j.assigned_driver_id && j.minsUntil != null && j.minsUntil > 30 && j.minsUntil <= 60 && !["completed","billing_review","cancelled"].includes(j.job_status)) {
      const available = drivers.filter(d => d.eligible && d.compliance !== "expired" && d.status === "available");
      const scored = available.map(d => ({ ...d, score: scoreDriver(d, j) })).sort((a, b) => b.score - a.score);
      const top = scored[0] || null;
      actions.push({
        urgency: 75,
        badge: "high",
        title: `Trip #${j.job_number} — assign driver now (${j.minsUntil} min until pickup)`,
        detail: `${j.customer_name} · ${j.pickup_address || "No address"}`,
        job_id: j.id, job_number: j.job_number,
        recommended_driver: top ? { id: top.id, name: top.name, score: top.score, reasons: driverReasons(top) } : undefined,
        action_buttons: [
          { label: top ? `Assign ${top.name.split(" ")[0]}` : "Assign Driver", action: "assign_driver" },
        ],
      });
    }
  }

  // 5. Blocked drivers with compliance issues
  for (const d of drivers) {
    if (d.compliance === "expired" || d.eligible === false) {
      actions.push({
        urgency: 70,
        badge: "high",
        title: `${d.name} — dispatch blocked (${!d.medOk ? "medical card expired" : !d.cdlOk ? "CDL expired" : d.blockReason || "ineligible"})`,
        detail: d.blockReason || "Cannot be assigned to any trip until resolved",
        driver_id: d.id, driver_name: d.name,
        action_buttons: [
          { label: "View HR", action: "go_hr", href: "/ronyx/hr-compliance" },
          { label: "Send Reminder", action: "send_reminder" },
        ],
      });
    }
  }

  // 6. Payments pending near dispatch
  for (const j of jobs) {
    if (j.payment_status === "unpaid" && j.minsUntil != null && j.minsUntil < 120 && !["completed","billing_review","cancelled"].includes(j.job_status)) {
      actions.push({
        urgency: 65,
        badge: "high",
        title: `Trip #${j.job_number} — payment pending, pickup ${j.minsUntil != null ? `in ${j.minsUntil} min` : "soon"}`,
        detail: `${j.customer_name} · Manager approval required before dispatch`,
        job_id: j.id, job_number: j.job_number,
        action_buttons: [
          { label: "Request Override", action: "request_override" },
          { label: "View Trip",        action: "view_job" },
        ],
      });
    }
  }

  // 7. Missing pickup address with upcoming pickup
  for (const j of jobs) {
    if (!j.pickup_address && j.minsUntil != null && j.minsUntil < 180 && !["completed","billing_review","cancelled"].includes(j.job_status)) {
      actions.push({
        urgency: 80,
        badge: "critical",
        title: `Trip #${j.job_number} — missing pickup address`,
        detail: `${j.customer_name} · Cannot dispatch without pickup address`,
        job_id: j.id, job_number: j.job_number,
        action_buttons: [
          { label: "Edit Trip",       action: "view_job" },
          { label: "Call Customer",   action: "call_customer", href: j.customer_phone ? `tel:${j.customer_phone}` : undefined },
        ],
      });
    }
  }

  // 8. Vehicles out of service (check maintenance_units)
  for (const v of rawVehicles) {
    if (v.status === "out_of_service" || v.dispatch_eligible === false) {
      actions.push({
        urgency: 60,
        badge: "warning",
        title: `Unit ${v.unit_number} — out of service / dispatch blocked`,
        detail: "Vehicle cannot be assigned until cleared by maintenance",
        vehicle_id: v.id,
        action_buttons: [
          { label: "Maintenance", action: "go_maintenance", href: "/ronyx/maintenance" },
        ],
      });
    }
  }

  // 9. Compliance expiring in 7 days
  const warn7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  for (const d of drivers) {
    const medExpiring = d.profile?.medical_card_expiration && d.profile.medical_card_expiration >= today && d.profile.medical_card_expiration <= warn7;
    const cdlExpiring = d.profile?.license_expiration_date && d.profile.license_expiration_date >= today && d.profile.license_expiration_date <= warn7;
    if (medExpiring || cdlExpiring) {
      actions.push({
        urgency: 50,
        badge: "warning",
        title: `${d.name} — ${medExpiring ? "medical card" : "CDL"} expires in 7 days`,
        detail: "Send reminder now to prevent dispatch block",
        driver_id: d.id, driver_name: d.name,
        action_buttons: [
          { label: "Send Reminder", action: "send_reminder" },
          { label: "View HR",       action: "go_hr", href: "/ronyx/hr-compliance" },
        ],
      });
    }
  }

  // 10. Open incidents on active trips
  const activeJobIds = new Set(jobs.filter(j => !["completed","billing_review","cancelled"].includes(j.job_status)).map(j => j.id));
  for (const inc of incidents.filter(i => activeJobIds.has(i.job_id))) {
    const job = jobs.find(j => j.id === inc.job_id);
    actions.push({
      urgency: 55,
      badge: inc.severity === "critical" ? "critical" : "high",
      title: `Open incident on Trip #${job?.job_number || "?"} — ${inc.incident_type.replace(/_/g," ")}`,
      detail: `Severity: ${inc.severity}`,
      job_id: inc.job_id, job_number: job?.job_number,
      action_buttons: [
        { label: "View Trip", action: "view_job" },
      ],
    });
  }

  const sortedActions = actions
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 12);

  // ── Smart Driver Recommendations ──────────────────────────────────────────
  const unassignedJobs = jobs.filter(j =>
    !j.assigned_driver_id &&
    j.minsUntil != null && j.minsUntil > 0 &&
    !["completed","billing_review","cancelled"].includes(j.job_status)
  );

  const availableDrivers = drivers.filter(d => d.eligible && d.compliance !== "expired" && ["available"].includes(d.status));

  const driverRecs: DriverRec[] = unassignedJobs.slice(0, 8).map(j => {
    const scored = availableDrivers
      .map(d => ({ ...d, score: scoreDriver(d, j) }))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score);
    return {
      job_id:       j.id,
      job_number:   j.job_number,
      customer_name: j.customer_name,
      pickup_time:  j.pickup_time,
      mins_until:   j.minsUntil ?? 999,
      recommended_driver: scored[0]
        ? { id: scored[0].id, name: scored[0].name, score: scored[0].score, reasons: driverReasons(scored[0]) }
        : null,
      alternatives: scored.slice(1, 3).map(d => ({ id: d.id, name: d.name, score: d.score })),
    };
  });

  // ── EOD Summary ────────────────────────────────────────────────────────────
  const missingProof    = billingItems.filter(b => !b.proof_uploaded).length;
  const pendingPayroll  = billingItems.filter(b => !b.driver_payout_set).length;
  const openIncidents   = incidents.length;
  const expiring7       = drivers.filter(d => {
    const med = d.profile?.medical_card_expiration;
    const cdl = d.profile?.license_expiration_date;
    return (med && med >= today && med <= warn7) || (cdl && cdl >= today && cdl <= warn7);
  }).length;

  const eodSummary: EodSummary = {
    missing_proof:          missingProof,
    pending_payroll:        pendingPayroll,
    open_incidents:         openIncidents,
    drivers_expiring_soon:  expiring7,
    total_issues:           missingProof + pendingPayroll + openIncidents + expiring7,
  };

  // ── Owner Summary ──────────────────────────────────────────────────────────
  const completedJobs    = jobs.filter(j => ["completed","billing_review"].includes(j.job_status));
  const lateJobs         = jobs.filter(j => j.isLate);
  const atRiskJobs       = jobs.filter(j => j.minsUntil != null && j.minsUntil <= 60 && !j.assigned_driver_id && j.minsUntil > 0);
  const pendingPayCount  = jobs.filter(j => j.payment_status === "unpaid" && !["completed","billing_review"].includes(j.job_status)).length;
  const blockedDrivers   = drivers.filter(d => d.eligible === false || d.compliance === "expired").length;
  const vehiclesOos      = rawVehicles.filter(v => v.status === "out_of_service" || v.dispatch_eligible === false).length;

  const followups: string[] = [];
  if (lateJobs.length > 0)       followups.push(`${lateJobs.length} trip${lateJobs.length > 1 ? "s" : ""} were late today — review with dispatch team`);
  if (openIncidents > 0)         followups.push(`${openIncidents} open incident${openIncidents > 1 ? "s" : ""} need resolution`);
  if (pendingPayCount > 0)       followups.push(`${pendingPayCount} trip${pendingPayCount > 1 ? "s" : ""} have pending payment`);
  if (blockedDrivers > 0)        followups.push(`${blockedDrivers} driver${blockedDrivers > 1 ? "s" : ""} blocked — check HR Compliance`);
  if (vehiclesOos > 0)           followups.push(`${vehiclesOos} vehicle${vehiclesOos > 1 ? "s" : ""} out of service — check Maintenance`);
  if (missingProof > 0)          followups.push(`${missingProof} completed trip${missingProof > 1 ? "s" : ""} missing proof of service`);

  const ownerSummary: OwnerSummary = {
    total_trips:           jobs.length,
    completed:             completedJobs.length,
    late:                  lateJobs.length,
    at_risk:               atRiskJobs.length,
    pending_payment_count: pendingPayCount,
    driver_issues:         blockedDrivers,
    vehicle_issues:        vehiclesOos,
    recommended_followups: followups,
  };

  return NextResponse.json({
    priority_actions:      sortedActions,
    driver_recommendations: driverRecs,
    eod_summary:           eodSummary,
    owner_summary:         ownerSummary,
    last_updated:          now.toISOString(),
  });
}
