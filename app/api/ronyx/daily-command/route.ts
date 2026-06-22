import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Lightweight endpoint — fetches only the counts and blocking items the
// sidebar needs. All queries run in parallel and fail silently so a single
// slow table never blocks the whole sidebar from loading.
export async function GET() {
  const safe = async <T>(p: Promise<{ data: T | null; error: any; count?: number | null }>): Promise<{ data: T | null; count: number }> => {
    try {
      const r = await p;
      return { data: r.data, count: r.count ?? (Array.isArray(r.data) ? (r.data as any[]).length : 0) };
    } catch {
      return { data: null, count: 0 };
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [
    activeLoads,
    dispatchBlocks,
    ticketsNeedingReview,
    payrollHolds,
    trucksDown,
    expiringDriverDocs,
    expiringOODocs,
    missingTickets,
    staffTasks,
  ] = await Promise.all([
    // Active loads
    safe(supabaseAdmin.from("ronyx_loads").select("id", { count: "exact", head: true }).eq("status", "active") as any),
    // Dispatch blocks (driver/truck blocked)
    safe(supabaseAdmin.from("dispatch_guard_alerts").select("id", { count: "exact", head: true }).eq("resolved", false) as any),
    // Tickets needing review
    safe(supabaseAdmin.from("aggregate_tickets").select("id", { count: "exact", head: true }).eq("status", "needs_review") as any),
    // Payroll holds
    safe(supabaseAdmin.from("ronyx_payroll_items").select("id", { count: "exact", head: true }).eq("status", "hold") as any),
    // Trucks down / OOS
    safe(supabaseAdmin.from("ronyx_trucks").select("id", { count: "exact", head: true }).in("status", ["out_of_service", "maintenance", "breakdown"]) as any),
    // Driver docs expiring within 30 days
    safe(supabaseAdmin.from("driver_documents").select("driver_name,document_type,expiry_date", { count: "exact" }).lte("expiry_date", thirtyDaysOut).gte("expiry_date", today).order("expiry_date").limit(5) as any),
    // OO insurance expiring
    safe(supabaseAdmin.from("ronyx_oo_documents").select("oo_id,doc_type,expires_on", { count: "exact" }).lte("expires_on", thirtyDaysOut).gte("expires_on", today).in("doc_type", ["Insurance Certificate","Auto Liability Insurance","General Liability Insurance","Insurance Certificate (COI)","Cargo Insurance"]).order("expires_on").limit(5) as any),
    // Missing tickets
    safe(supabaseAdmin.from("aggregate_tickets").select("id", { count: "exact", head: true }).eq("status", "missing") as any),
    // Urgent staff tasks
    safe(supabaseAdmin.from("ronyx_staff_tasks").select("id,title,assigned_to,priority", { count: "exact" }).eq("status", "open").eq("priority", "urgent").order("created_at", { ascending: true }).limit(3) as any),
  ]);

  // Build "Do This First" critical blocking items
  const criticalItems: { text: string; href: string; category: string }[] = [];

  // Expired driver docs
  if ((expiringDriverDocs.data as any[])?.length) {
    const first = (expiringDriverDocs.data as any[])[0];
    criticalItems.push({
      text: `${first.driver_name ?? "Driver"} — ${first.document_type} expires ${first.expiry_date}`,
      href: "/ronyx/compliance/driver-docs",
      category: "compliance",
    });
  }

  // Expired OO insurance
  if ((expiringOODocs.data as any[])?.length) {
    const count = expiringOODocs.count;
    criticalItems.push({
      text: `${count} OO insurance doc${count !== 1 ? "s" : ""} expiring — blocks payment release`,
      href: "/ronyx/owner-operators/coi-matrix",
      category: "compliance",
    });
  }

  // Missing tickets
  if (missingTickets.count > 0) {
    criticalItems.push({
      text: `${missingTickets.count} missing ticket${missingTickets.count !== 1 ? "s" : ""} — payroll hold risk`,
      href: "/ronyx/tickets?tab=needs_review",
      category: "tickets",
    });
  }

  // Dispatch blocks
  if (dispatchBlocks.count > 0) {
    criticalItems.push({
      text: `${dispatchBlocks.count} dispatch block${dispatchBlocks.count !== 1 ? "s" : ""} — review before dispatch`,
      href: "/ronyx/dispatch/dispatch-guard",
      category: "dispatch",
    });
  }

  // Payroll holds
  if (payrollHolds.count > 0) {
    criticalItems.push({
      text: `${payrollHolds.count} payroll hold${payrollHolds.count !== 1 ? "s" : ""} — requires approval`,
      href: "/ronyx/payroll?filter=holds",
      category: "payroll",
    });
  }

  // Urgent tasks
  if ((staffTasks.data as any[])?.length) {
    for (const t of (staffTasks.data as any[])) {
      criticalItems.push({
        text: `Task: ${t.title}${t.assigned_to ? ` — ${t.assigned_to}` : ""}`,
        href: "/ronyx/tasks",
        category: "task",
      });
    }
  }

  return NextResponse.json({
    criticalItems: criticalItems.slice(0, 5),
    pulse: {
      activeLoads:          activeLoads.count,
      dispatchBlocks:       dispatchBlocks.count,
      ticketsNeedingReview: ticketsNeedingReview.count,
      payrollHolds:         payrollHolds.count,
      trucksDown:           trucksDown.count,
      expiringDocs:         (expiringDriverDocs.count ?? 0) + (expiringOODocs.count ?? 0),
      missingTickets:       missingTickets.count,
    },
    smartActions: [
      ...(dispatchBlocks.count > 0       ? [{ label: `Resolve ${dispatchBlocks.count} dispatch block${dispatchBlocks.count !== 1 ? "s" : ""}`,       href: "/ronyx/dispatch/dispatch-guard",    count: dispatchBlocks.count       }] : []),
      ...(ticketsNeedingReview.count > 0 ? [{ label: `Review ${ticketsNeedingReview.count} ticket${ticketsNeedingReview.count !== 1 ? "s" : ""}`,      href: "/ronyx/tickets?tab=needs_review",   count: ticketsNeedingReview.count }] : []),
      ...(payrollHolds.count > 0         ? [{ label: `Approve ${payrollHolds.count} payroll hold${payrollHolds.count !== 1 ? "s" : ""}`,               href: "/ronyx/payroll?filter=holds",       count: payrollHolds.count         }] : []),
      ...(trucksDown.count > 0           ? [{ label: `${trucksDown.count} truck${trucksDown.count !== 1 ? "s" : ""} down — reassign`,                   href: "/ronyx/maintenance/breakdowns",     count: trucksDown.count           }] : []),
      ...(expiringOODocs.count > 0       ? [{ label: `Upload ${expiringOODocs.count} expiring COI${expiringOODocs.count !== 1 ? "s" : ""}`,             href: "/ronyx/owner-operators/coi-matrix", count: expiringOODocs.count       }] : []),
    ].slice(0, 5),
  });
}
