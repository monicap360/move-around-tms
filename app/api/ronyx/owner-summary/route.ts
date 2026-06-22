import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const weekAgo   = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo  = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const in30      = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [
    { data: jobsToday },
    { data: jobsYesterday },
    { data: jobsWeek },
    { data: drivers },
    { data: units },
    { data: workOrders },
    { data: tickets },
    { data: payrollItems },
    { data: billingItems },
    { data: recentActivity },
    { data: incidents },
  ] = await Promise.all([
    supabase.from("dispatch_jobs").select("id, job_status, estimated_revenue, actual_revenue, assigned_driver_id, pickup_time").gte("pickup_time", today).lt("pickup_time", `${today}T23:59:59`),
    supabase.from("dispatch_jobs").select("id, job_status, estimated_revenue, actual_revenue").gte("pickup_time", yesterday).lt("pickup_time", `${yesterday}T23:59:59`),
    supabase.from("dispatch_jobs").select("id, job_status, estimated_revenue, actual_revenue, pickup_time").gte("pickup_time", weekAgo),
    supabase.from("drivers").select("id, status, driver_profiles(dispatch_eligible, license_expiration_date, medical_card_expiration)").neq("status", "inactive").neq("status", "terminated"),
    supabase.from("maintenance_units").select("id, status, dispatch_eligible, annual_inspection_expires, registration_expires, insurance_expires, next_service_miles, odometer"),
    supabase.from("maintenance_work_orders").select("id, status, priority, estimated_cost, actual_cost, wo_type, dispatch_hold").not("status", "in", '("Completed","Archived")'),
    supabase.from("tickets").select("id, status, category, priority, payroll_status, payroll_impact, estimated_driver_pay").gte("created_at", monthAgo),
    supabase.from("payroll_items").select("id, status, gross_amount, item_type, driver_name").gte("created_at", monthAgo),
    supabase.from("billing_review_items").select("id, status, amount").neq("status", "closed").limit(100),
    supabase.from("trip_status_history").select("job_id, to_status, note, changed_by, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("dispatch_incidents").select("id, severity, created_at").gte("created_at", monthAgo).order("created_at", { ascending: false }),
  ]);

  // ── Dispatch metrics ──────────────────────────────────────────────────────
  const todayJobs   = jobsToday  || [];
  const yesterdayJobs = jobsYesterday || [];
  const weekJobs    = jobsWeek   || [];

  const activeStatuses = ["assigned","driver_accepted","en_route_pickup","arrived_pickup","loaded","en_route_dropoff","arrived_dropoff"];
  const tripsActive    = todayJobs.filter(j => activeStatuses.includes(j.job_status)).length;
  const tripsCompleted = todayJobs.filter(j => ["completed","billing_review"].includes(j.job_status)).length;
  const tripsUpcoming  = todayJobs.filter(j => ["needs_review","ready_to_dispatch"].includes(j.job_status)).length;
  const tripsUnassigned = todayJobs.filter(j => !j.assigned_driver_id && ["needs_review","ready_to_dispatch"].includes(j.job_status)).length;

  const revenueToday     = todayJobs.reduce((s, j) => s + (j.actual_revenue || j.estimated_revenue || 0), 0);
  const revenueYesterday = yesterdayJobs.reduce((s, j) => s + (j.actual_revenue || j.estimated_revenue || 0), 0);
  const revenueWeek      = weekJobs.reduce((s, j) => s + (j.actual_revenue || j.estimated_revenue || 0), 0);
  const tripsThisWeek    = weekJobs.length;

  // ── Driver metrics ────────────────────────────────────────────────────────
  const allDrivers    = drivers || [];
  const driversActive = allDrivers.filter(d => d.status === "active" || d.status === "available").length;
  const driversTotal  = allDrivers.length;
  const driversBlocked = allDrivers.filter(d => {
    const p = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    return p?.dispatch_eligible === false || (p?.license_expiration_date && p.license_expiration_date < today) || (p?.medical_card_expiration && p.medical_card_expiration < today);
  }).length;
  const driversExpiringCompliance = allDrivers.filter(d => {
    const p = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    return (p?.license_expiration_date && p.license_expiration_date >= today && p.license_expiration_date <= in30) ||
           (p?.medical_card_expiration && p.medical_card_expiration >= today && p.medical_card_expiration <= in30);
  }).length;

  // ── Fleet metrics ─────────────────────────────────────────────────────────
  const allUnits   = units || [];
  const fleetReady = allUnits.filter(u => u.dispatch_eligible && u.status === "Ready").length;
  const fleetTotal = allUnits.length;
  const fleetDown  = allUnits.filter(u => ["Out of Service","In Shop"].includes(u.status)).length;
  const fleetHold  = allUnits.filter(u => !u.dispatch_eligible).length;
  const fleetExpiredDocs = allUnits.filter(u =>
    (u.annual_inspection_expires && u.annual_inspection_expires < today) ||
    (u.registration_expires && u.registration_expires < today) ||
    (u.insurance_expires && u.insurance_expires < today)
  ).length;
  const openWOs        = (workOrders || []).length;
  const criticalWOs    = (workOrders || []).filter(w => w.priority === "Critical").length;
  const maintenanceCostOpen = (workOrders || []).reduce((s, w) => s + (w.estimated_cost || 0), 0);
  const dispatchHoldWOs = (workOrders || []).filter(w => w.dispatch_hold).length;

  // ── Ticket metrics ────────────────────────────────────────────────────────
  const allTickets     = tickets || [];
  const openTickets    = allTickets.filter(t => !["closed","rejected"].includes(t.status)).length;
  const payrollHolds   = allTickets.filter(t => t.payroll_status === "hold").length;
  const criticalTickets = allTickets.filter(t => t.priority === "critical" && !["closed","rejected"].includes(t.status)).length;

  // ── Payroll metrics ───────────────────────────────────────────────────────
  const allPayroll   = payrollItems || [];
  const pendingPay   = allPayroll.filter(p => ["pending","pending_approval"].includes(p.status)).reduce((s, p) => s + (p.gross_amount || 0), 0);
  const heldPay      = allPayroll.filter(p => p.status === "hold").reduce((s, p) => s + (p.gross_amount || 0), 0);
  const approvedPay  = allPayroll.filter(p => p.status === "approved").reduce((s, p) => s + (p.gross_amount || 0), 0);
  const pendingBilling = (billingItems || []).reduce((s, b) => s + (b.amount || 0), 0);

  // ── Incidents ─────────────────────────────────────────────────────────────
  const allIncidents = incidents || [];
  const lastIncident = allIncidents[0]?.created_at || null;
  const daysSinceIncident = lastIncident
    ? Math.floor((Date.now() - new Date(lastIncident).getTime()) / 86400000)
    : null;

  // ── Owner alerts ──────────────────────────────────────────────────────────
  const ownerAlerts: { severity: string; message: string; link: string }[] = [];

  if (tripsUnassigned > 0)       ownerAlerts.push({ severity: "critical", message: `${tripsUnassigned} trip${tripsUnassigned > 1 ? "s" : ""} unassigned for today`, link: "/ronyx/dispatch/board" });
  if (driversBlocked > 0)        ownerAlerts.push({ severity: "critical", message: `${driversBlocked} driver${driversBlocked > 1 ? "s" : ""} blocked from dispatch`, link: "/ronyx/hr-compliance" });
  if (fleetExpiredDocs > 0)      ownerAlerts.push({ severity: "critical", message: `${fleetExpiredDocs} vehicle${fleetExpiredDocs > 1 ? "s" : ""} with expired documents`, link: "/ronyx/maintenance" });
  if (criticalWOs > 0)           ownerAlerts.push({ severity: "critical", message: `${criticalWOs} critical work order${criticalWOs > 1 ? "s" : ""} open`, link: "/ronyx/maintenance" });
  if (payrollHolds > 0)          ownerAlerts.push({ severity: "high",     message: `${payrollHolds} payroll item${payrollHolds > 1 ? "s" : ""} on hold — manager review needed`, link: "/ronyx/dispatch/tickets" });
  if (criticalTickets > 0)       ownerAlerts.push({ severity: "high",     message: `${criticalTickets} critical ticket${criticalTickets > 1 ? "s" : ""} unresolved`, link: "/ronyx/dispatch/tickets" });
  if (driversExpiringCompliance > 0) ownerAlerts.push({ severity: "warning", message: `${driversExpiringCompliance} driver${driversExpiringCompliance > 1 ? "s" : ""} with expiring compliance in 30 days`, link: "/ronyx/hr-compliance" });
  if (fleetHold > 0)             ownerAlerts.push({ severity: "warning",  message: `${fleetHold} vehicle${fleetHold > 1 ? "s" : ""} on dispatch hold`, link: "/ronyx/maintenance" });
  if (dispatchHoldWOs > 0)       ownerAlerts.push({ severity: "warning",  message: `${dispatchHoldWOs} open work order${dispatchHoldWOs > 1 ? "s" : ""} blocking dispatch`, link: "/ronyx/maintenance" });

  // ── Week-over-week summary ────────────────────────────────────────────────
  const revChange = revenueYesterday > 0
    ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
    : 0;

  // ── Trip breakdown this week ──────────────────────────────────────────────
  const byDay: Record<string, number> = {};
  for (const j of weekJobs) {
    const day = j.pickup_time?.slice(0, 10) || "unknown";
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return NextResponse.json({
    as_of: new Date().toISOString(),
    alerts: ownerAlerts,

    operations: {
      trips_today:        todayJobs.length,
      trips_active:       tripsActive,
      trips_completed:    tripsCompleted,
      trips_upcoming:     tripsUpcoming,
      trips_unassigned:   tripsUnassigned,
      trips_this_week:    tripsThisWeek,
      trips_by_day:       byDay,
    },

    revenue: {
      today:           revenueToday,
      yesterday:       revenueYesterday,
      this_week:       revenueWeek,
      day_over_day_pct: revChange,
      pending_billing: pendingBilling,
    },

    drivers: {
      total:             driversTotal,
      active:            driversActive,
      blocked:           driversBlocked,
      expiring_soon:     driversExpiringCompliance,
    },

    fleet: {
      total:             fleetTotal,
      ready:             fleetReady,
      down:              fleetDown,
      on_hold:           fleetHold,
      expired_docs:      fleetExpiredDocs,
      open_work_orders:  openWOs,
      critical_work_orders: criticalWOs,
      maintenance_cost_open: maintenanceCostOpen,
    },

    payroll: {
      pending_amount:  pendingPay,
      held_amount:     heldPay,
      approved_amount: approvedPay,
      hold_count:      allPayroll.filter(p => p.status === "hold").length,
      pending_count:   allPayroll.filter(p => ["pending","pending_approval"].includes(p.status)).length,
    },

    tickets: {
      open:             openTickets,
      critical:         criticalTickets,
      payroll_holds:    payrollHolds,
      total_this_month: allTickets.length,
    },

    safety: {
      incidents_this_month: allIncidents.length,
      last_incident_date:   lastIncident,
      days_since_incident:  daysSinceIncident,
      critical_incidents:   allIncidents.filter(i => i.severity === "critical").length,
    },

    recent_activity: (recentActivity || []).slice(0, 10),
  });
}
