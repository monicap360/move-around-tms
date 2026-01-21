import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const getRangeStart = (rangeValue: string) => {
  const now = new Date();
  switch (rangeValue) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const projectId = searchParams.get("project_id");
    const customerId = searchParams.get("customer_id");
    const supabase = createSupabaseServerClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 400 },
      );
    }

    const startDate = getRangeStart(range);
    const endDate = new Date();

    const { data: driverRows } = await supabase
      .from("drivers")
      .select("id")
      .eq("organization_id", profile.organization_id);
    const driverIds = (driverRows || []).map((row: any) => row.id).filter(Boolean);

    let truckIds: string[] = [];
    const { data: truckRows, error: truckError } = await supabase
      .from("trucks")
      .select("id")
      .eq("organization_id", profile.organization_id);
    if (!truckError && truckRows && truckRows.length > 0) {
      truckIds = truckRows.map((row: any) => row.id).filter(Boolean);
    } else {
      const { data: fleetRows, error: fleetError } = await supabase
        .from("fleets")
        .select("id")
        .eq("organization_id", profile.organization_id);
      if (!fleetError && fleetRows && fleetRows.length > 0) {
        truckIds = fleetRows.map((row: any) => row.id).filter(Boolean);
      }
    }

    const fuelRes =
      truckIds.length > 0
        ? await supabase
            .from("fuel_purchases")
            .select("amount, purchase_date")
            .in("truck_id", truckIds)
            .gte("purchase_date", startDate.toISOString().split("T")[0])
            .lte("purchase_date", endDate.toISOString().split("T")[0])
        : { data: [] };

    const maintenanceRes =
      driverIds.length > 0
        ? await supabase
            .from("maintenance_requests")
            .select("actual_cost, estimated_cost, submitted_at")
            .in("driver_id", driverIds)
            .gte("submitted_at", startDate.toISOString())
            .lte("submitted_at", endDate.toISOString())
        : { data: [] };

    const payrollRes = await supabase
      .from("payroll_entries")
      .select("gross_pay, net_pay, pay_period_end")
      .eq("organization_id", profile.organization_id)
      .gte("pay_period_end", startDate.toISOString().split("T")[0])
      .lte("pay_period_end", endDate.toISOString().split("T")[0]);

    let ticketsQuery = supabase
      .from("aggregate_tickets")
      .select("total_bill, waiting_minutes")
      .eq("organization_id", profile.organization_id)
      .gte("ticket_date", startDate.toISOString().split("T")[0])
      .lte("ticket_date", endDate.toISOString().split("T")[0]);

    if (projectId) {
      ticketsQuery = ticketsQuery.eq("project_id", projectId);
    }
    if (customerId) {
      ticketsQuery = ticketsQuery.eq("customer_id", customerId);
    }

    const ticketsRes = await ticketsQuery;

    const { data: orgTicketRows } = await supabase
      .from("aggregate_tickets")
      .select("total_bill")
      .eq("organization_id", profile.organization_id)
      .gte("ticket_date", startDate.toISOString().split("T")[0])
      .lte("ticket_date", endDate.toISOString().split("T")[0]);

    const fuelCost = (fuelRes.data || []).reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    const maintenanceCost = (maintenanceRes.data || []).reduce(
      (sum, row) =>
        sum + (Number(row.actual_cost) || Number(row.estimated_cost) || 0),
      0,
    );
    const laborCost = (payrollRes.data || []).reduce(
      (sum, row) => sum + (Number(row.gross_pay) || Number(row.net_pay) || 0),
      0,
    );
    const revenue = (ticketsRes.data || []).reduce(
      (sum, row) => sum + (Number(row.total_bill) || 0),
      0,
    );
    const orgRevenue = (orgTicketRows || []).reduce(
      (sum, row) => sum + (Number(row.total_bill) || 0),
      0,
    );
    const allocationRatio =
      projectId || customerId
        ? orgRevenue > 0
          ? revenue / orgRevenue
          : 0
        : 1;

    const allocatedFuel = fuelCost * allocationRatio;
    const allocatedMaintenance = maintenanceCost * allocationRatio;
    const allocatedLabor = laborCost * allocationRatio;
    const totalCost = allocatedFuel + allocatedMaintenance + allocatedLabor;
    const otherCost = Math.max(totalCost * 0.1, 0);
    const adjustedTotal = totalCost + otherCost;

    const calcPct = (value: number) =>
      adjustedTotal > 0 ? Math.round((value / adjustedTotal) * 100) : 0;

    const avgWaiting =
      (ticketsRes.data || []).reduce(
        (sum, row) => sum + (Number(row.waiting_minutes) || 0),
        0,
      ) / Math.max((ticketsRes.data || []).length, 1);

    const suggestions: string[] = [];
    if (revenue > 0 && allocatedFuel / revenue > 0.35) {
      suggestions.push("Negotiate fuel discounts or add fuel surcharges.");
    }
    if (maintenanceRes.data && maintenanceRes.data.length > 4) {
      suggestions.push("Schedule preventive maintenance to reduce breakdowns.");
    }
    if (avgWaiting > 20) {
      suggestions.push("Reduce idle/waiting time at pits to lift margins.");
    }
    if (allocatedLabor > 0 && revenue > 0 && allocatedLabor / revenue > 0.45) {
      suggestions.push("Rebalance driver assignments to improve utilization.");
    }
    if (suggestions.length === 0) {
      suggestions.push("Increase high-margin routes in daily dispatch.");
    }

    const potentialIncrease = revenue > 0 ? Math.round(revenue * 0.03) : 2850;

    return NextResponse.json({
      costs: {
        fuel: Math.round(allocatedFuel),
        maintenance: Math.round(allocatedMaintenance),
        labor: Math.round(allocatedLabor),
        other: Math.round(otherCost),
        total: Math.round(adjustedTotal),
        fuelPct: calcPct(allocatedFuel),
        maintenancePct: calcPct(allocatedMaintenance),
        laborPct: calcPct(allocatedLabor),
        otherPct: calcPct(otherCost),
      },
      optimizer: {
        potentialIncrease,
        suggestions,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load cost breakdown" },
      { status: 500 },
    );
  }
}
