import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function safe<T>(promise: Promise<{ data: T | null; error: any }>): Promise<T | null> {
  try { const { data } = await promise; return data; } catch { return null; }
}

export async function GET() {
  const sb  = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7  = new Date(Date.now() + 7  * 86400000).toISOString();
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString();

  const [
    latestImport,
    openAlerts,
    expiringOverrides,
    activeOverrides,
    payrollHolds,
    billingReady,
    trucksOOS,
    staffOnShift,
    recentAudit,
  ] = await Promise.all([
    // Latest dispatch import
    safe(sb.from("dispatch_imports").select("id,import_name,schedule_date,total_rows,blocked_count,needs_docs_count,ready_count,created_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()),

    // Open compliance alerts
    safe(sb.from("dispatch_guard_alerts").select("id,severity,status").eq("status", "open")),

    // Overrides expiring in 7 days
    safe(sb.from("ronyx_compliance_overrides").select("id,document_type,customer_name,override_expires_at")
      .eq("status", "active").lte("override_expires_at", in7).gte("override_expires_at", today)),

    // All active overrides
    safe(sb.from("ronyx_compliance_overrides").select("id").eq("status", "active")),

    // Payroll holds
    safe(sb.from("tickets").select("id").eq("payroll_status", "hold")),

    // Billing ready
    safe(sb.from("tickets").select("id").eq("payroll_status", "approved").eq("status", "closed")),

    // Trucks out of service
    safe(sb.from("trucks").select("id,truck_number,status").eq("status", "out_of_service")),

    // Staff on shift
    safe(sb.from("ronyx_staff_users").select("id,full_name,role_name").eq("on_shift", true)),

    // Recent audit (last 24h)
    safe(sb.from("ronyx_admin_audit_logs").select("id,action,created_at")
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()).order("created_at", { ascending: false }).limit(10)),
  ]);

  // Derive dispatch job stats from the latest import
  let dispatchJobs: any[] | null = null;
  if (latestImport && (latestImport as any).id) {
    const { data } = await sb.from("dispatch_jobs")
      .select("id,compliance_severity,dispatch_status,driver_name,truck_number")
      .eq("dispatch_import_id", (latestImport as any).id)
      .limit(500);
    dispatchJobs = data;
  }

  const imp = latestImport as any;
  const disp = dispatchJobs || [];
  const alerts = (openAlerts as any[]) || [];
  const overridesExp = (expiringOverrides as any[]) || [];
  const holds = (payrollHolds as any[]) || [];
  const billing = (billingReady as any[]) || [];
  const oos = (trucksOOS as any[]) || [];
  const staff = (staffOnShift as any[]) || [];
  const audits = (recentAudit as any[]) || [];

  const missingDriverOrTruck = disp.filter((j: any) => !j.driver_name || !j.truck_number).length;
  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical").length;

  // Recommended first action
  let recommended: { text: string; href: string; icon: string } | null = null;
  if (imp?.blocked_count > 0) {
    recommended = { text: `${imp.blocked_count} dispatch jobs are blocked — resolve RMIS compliance issues before drivers go out.`, href: `/api/ronyx/dispatch-import/${imp.id}`, icon: "🚨" };
  } else if (missingDriverOrTruck > 0) {
    recommended = { text: `${missingDriverOrTruck} dispatch rows are missing driver or truck — assign before jobs can release.`, href: "/ronyx/dispatch/daily-import", icon: "👤" };
  } else if (overridesExp.length > 0) {
    recommended = { text: `${overridesExp.length} compliance override${overridesExp.length > 1 ? "s" : ""} expire within 7 days — renew or get updated documents.`, href: "/ronyx/compliance", icon: "⏰" };
  } else if (holds.length > 0) {
    recommended = { text: `${holds.length} payroll hold${holds.length > 1 ? "s" : ""} need ticket proof before settlement can be approved.`, href: "/ronyx/payroll", icon: "💰" };
  } else if (oos.length > 0) {
    recommended = { text: `${oos.length} truck${oos.length > 1 ? "s are" : " is"} out of service — check maintenance status and reassign jobs if needed.`, href: "/ronyx/maintenance", icon: "🔧" };
  } else {
    recommended = { text: "Operation looks clean. Review billing-ready tickets and close out today's settlements.", href: "/ronyx/payroll", icon: "✅" };
  }

  return NextResponse.json({
    date: today,
    dispatch: {
      import_date:      imp?.schedule_date || null,
      import_name:      imp?.import_name   || null,
      total_rows:       imp?.total_rows    || 0,
      blocked:          imp?.blocked_count || 0,
      needs_docs:       imp?.needs_docs_count || 0,
      ready:            imp?.ready_count   || 0,
      missing_driver_truck: missingDriverOrTruck,
    },
    compliance: {
      open_alerts:        alerts.length,
      critical_alerts:    criticalAlerts,
      active_overrides:   (activeOverrides as any[])?.length || 0,
      expiring_overrides: overridesExp.length,
      expiring_override_details: overridesExp,
    },
    fleet: {
      trucks_oos:   oos.length,
      oos_trucks:   oos,
    },
    payroll: {
      holds:         holds.length,
      billing_ready: billing.length,
    },
    staff: {
      on_shift:  staff.length,
      on_shift_list: staff,
    },
    activity: {
      recent_changes: audits.length,
    },
    recommended,
  });
}
