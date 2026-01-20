import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Query real analytics data from database
    const supabase = createSupabaseServerClient();

    const organizationId = searchParams.get("organization_id");

    // Calculate previous period for comparison
    const periodLength = now.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = startDate;

    // Build queries with optional organization filter
    let ticketsQuery = supabase
      .from("aggregate_tickets")
      .select("total_pay, total_bill, total_profit, status, ticket_date")
      .gte("ticket_date", startDate.toISOString().split('T')[0])
      .lte("ticket_date", now.toISOString().split('T')[0]);

    let previousTicketsQuery = supabase
      .from("aggregate_tickets")
      .select("total_pay, total_bill, total_profit, status, ticket_date")
      .gte("ticket_date", previousStartDate.toISOString().split('T')[0])
      .lt("ticket_date", previousEndDate.toISOString().split('T')[0]);

    let driversQuery = supabase
      .from("drivers")
      .select("id, status, created_at, active")
      .eq("status", "Active")
      .eq("active", true);

    let trucksQuery = supabase
      .from("trucks")
      .select("id, status");

    let documentsQuery = supabase
      .from("driver_documents")
      .select("expiration_date, status");

    if (organizationId) {
      ticketsQuery = ticketsQuery.eq("organization_id", organizationId);
      previousTicketsQuery = previousTicketsQuery.eq("organization_id", organizationId);
      driversQuery = driversQuery.eq("organization_id", organizationId);
      trucksQuery = trucksQuery.eq("organization_id", organizationId);
      documentsQuery = documentsQuery.eq("organization_id", organizationId);
    }

    const [ticketsRes, previousTicketsRes, driversRes, trucksRes, documentsRes] = await Promise.all([
      ticketsQuery,
      previousTicketsQuery,
      driversQuery,
      trucksQuery,
      documentsQuery,
    ]);

    const tickets = ticketsRes.data || [];
    const previousTickets = previousTicketsRes.data || [];
    const drivers = driversRes.data || [];
    const trucks = trucksRes.data || [];
    const documents = documentsRes.data || [];

    // Calculate current period metrics
    const currentRevenue = tickets.reduce((sum: number, t: any) => sum + (Number(t.total_bill) || 0), 0);
    const currentProfit = tickets.reduce((sum: number, t: any) => sum + (Number(t.total_profit) || (Number(t.total_bill) || 0) - (Number(t.total_pay) || 0)), 0);
    const currentDrivers = drivers.length;

    // Calculate previous period metrics
    const previousRevenue = previousTickets.reduce((sum: number, t: any) => sum + (Number(t.total_bill) || 0), 0);
    const previousProfit = previousTickets.reduce((sum: number, t: any) => sum + (Number(t.total_profit) || (Number(t.total_bill) || 0) - (Number(t.total_pay) || 0)), 0);
    const previousDrivers = drivers.filter((d: any) => new Date(d.created_at) < startDate).length;

    // Calculate trends
    const revenueTrend = currentRevenue >= previousRevenue ? "up" : "down";
    const revenuePercentage = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const profitTrend = currentProfit >= previousProfit ? "up" : "down";
    const profitPercentage = previousProfit > 0 ? ((currentProfit - previousProfit) / previousProfit) * 100 : 0;
    const driversTrend = currentDrivers >= previousDrivers ? "up" : "down";

    // Calculate vehicle metrics
    const activeVehicles = trucks.filter((t: any) => t.status === "active" || t.status === "in_use").length;
    const maintenanceVehicles = trucks.filter((t: any) => t.status === "maintenance" || t.status === "repair").length;
    const outOfServiceVehicles = trucks.filter((t: any) => t.status === "out_of_service" || t.status === "inactive").length;

    // Calculate compliance metrics
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const compliantDocs = documents.filter((d: any) => {
      if (!d.expiration_date) return false;
      const expDate = new Date(d.expiration_date);
      return expDate > thirtyDaysFromNow;
    }).length;
    const expiringSoonDocs = documents.filter((d: any) => {
      if (!d.expiration_date) return false;
      const expDate = new Date(d.expiration_date);
      return expDate <= thirtyDaysFromNow && expDate >= today;
    }).length;
    const expiredDocs = documents.filter((d: any) => {
      if (!d.expiration_date) return false;
      const expDate = new Date(d.expiration_date);
      return expDate < today;
    }).length;

    // Calculate ticket metrics
    const processedTickets = tickets.filter((t: any) => t.status === "Approved" || t.status === "processed").length;
    const pendingTickets = tickets.filter((t: any) => t.status === "Pending" || t.status === "pending").length;
    const rejectedTickets = tickets.filter((t: any) => t.status === "Rejected" || t.status === "rejected").length;

    let dvirCompliance = 0;
    let incidents = 0;
    let safetyScore = 0;

    try {
      let dvirQuery = supabase
        .from("dvir_inspections")
        .select("overall_status, created_at");

      if (organizationId) {
        dvirQuery = dvirQuery.eq("organization_id", organizationId);
      }

      dvirQuery = dvirQuery
        .gte("created_at", startDate.toISOString())
        .lte("created_at", now.toISOString());

      const { data: dvirs, error: dvirError } = await dvirQuery;
      let dvirList = dvirs || [];
      if ((!dvirList || dvirList.length === 0) && dvirError) {
        const { data: legacyDvirs } = await supabase
          .from("dvir")
          .select("created_at");
        dvirList = legacyDvirs || [];
      }
      if (dvirList.length > 0) {
        const compliantCount = dvirList.filter((d: any) => {
          if (!d.overall_status) return true;
          return (
            d.overall_status === "satisfactory" ||
            d.overall_status === "defects_corrected"
          );
        }).length;
        dvirCompliance = Math.round((compliantCount / dvirList.length) * 100);
      }
    } catch {
      dvirCompliance = 0;
    }

    try {
      let incidentsQuery = supabase
        .from("tms_incidents")
        .select("id, severity, created_at", { count: "exact" })
        .gte("created_at", startDate.toISOString())
        .lte("created_at", now.toISOString());

      if (organizationId) {
        incidentsQuery = incidentsQuery.eq("organization_id", organizationId);
      }

      const { count } = await incidentsQuery;
      incidents = count || 0;
    } catch {
      incidents = 0;
    }

    if (dvirCompliance > 0 || incidents > 0) {
      safetyScore = Math.max(0, Math.min(100, dvirCompliance - incidents * 2));
    }

    const metrics = {
      revenue: {
        current: Math.round(currentRevenue),
        previous: Math.round(previousRevenue),
        trend: revenueTrend,
        percentage: Math.round(revenuePercentage * 100) / 100,
      },
      profit: {
        current: Math.round(currentProfit),
        previous: Math.round(previousProfit),
        trend: profitTrend,
        percentage: Math.round(profitPercentage * 100) / 100,
      },
      activeDrivers: {
        current: currentDrivers,
        previous: previousDrivers,
        trend: driversTrend,
      },
      activeVehicles: {
        current: activeVehicles,
        maintenance: maintenanceVehicles,
        outOfService: outOfServiceVehicles,
      },
      compliance: {
        compliant: compliantDocs,
        expiringSoon: expiringSoonDocs,
        expired: expiredDocs,
        total: documents.length,
      },
      tickets: {
        processed: processedTickets,
        pending: pendingTickets,
        rejected: rejectedTickets,
      },
      safety: {
        dvirCompliance,
        incidents,
        safetyScore,
      },
    };

    return NextResponse.json({
      success: true,
      metrics,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range,
      },
    });
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics data" },
      { status: 500 },
    );
  }
}
