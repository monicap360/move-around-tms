import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TicketRow = {
  id: string;
  ticket_number?: string | null;
  ticket_id?: string | null;
  material?: string | null;
  material_type?: string | null;
  total_bill?: number | null;
  total_pay?: number | null;
  total_profit?: number | null;
  quantity?: number | null;
  unit_type?: string | null;
  load_weight?: number | null;
  pickup_location?: string | null;
  dump_location?: string | null;
  calculated_distance?: number | null;
  status?: string | null;
  driver_id?: string | null;
  truck_id?: string | null;
};

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

    let ticketsQuery = supabase
      .from("aggregate_tickets")
      .select(
        "id, ticket_number, ticket_id, material, material_type, total_bill, total_pay, total_profit, quantity, unit_type, load_weight, pickup_location, dump_location, calculated_distance, status, driver_id, truck_id, ticket_date",
      )
      .eq("organization_id", profile.organization_id)
      .gte("ticket_date", startDate.toISOString().split("T")[0])
      .lte("ticket_date", endDate.toISOString().split("T")[0]);

    if (projectId) {
      ticketsQuery = ticketsQuery.eq("project_id", projectId);
    }
    if (customerId) {
      ticketsQuery = ticketsQuery.eq("customer_id", customerId);
    }

    const { data: tickets, error } = await ticketsQuery.limit(5000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (tickets || []) as TicketRow[];

    const loadRows = rows
      .map((row) => {
        const revenue = Number(row.total_bill) || 0;
        const cost = Number(row.total_pay) || 0;
        const profit = Number(row.total_profit) || revenue - cost;
        const margin = revenue > 0 ? profit / revenue : 0;
        const unitType = (row.unit_type || "").toLowerCase();
        const tons =
          Number(row.load_weight) ||
          (unitType === "ton" || unitType === "tons" ? Number(row.quantity) : 0);
        return {
          loadId: row.ticket_number || row.ticket_id || row.id,
          material: row.material_type || row.material || "Material",
          route: `${row.pickup_location || "Origin"} → ${row.dump_location || "Destination"}`,
          revenue,
          cost,
          profit,
          margin,
          profitPerTon: tons > 0 ? profit / tons : 0,
          status: row.status || "Pending",
          truckId: row.truck_id,
          driverId: row.driver_id,
          distance: Number(row.calculated_distance) || 0,
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    const truckMap = new Map<
      string,
      { revenue: number; profit: number; loads: number; miles: number }
    >();
    const driverMap = new Map<
      string,
      { revenue: number; profit: number; loads: number }
    >();

    for (const row of loadRows) {
      if (row.truckId) {
        const current = truckMap.get(row.truckId) || {
          revenue: 0,
          profit: 0,
          loads: 0,
          miles: 0,
        };
        current.revenue += row.revenue;
        current.profit += row.profit;
        current.loads += 1;
        current.miles += row.distance;
        truckMap.set(row.truckId, current);
      }
      if (row.driverId) {
        const current = driverMap.get(row.driverId) || {
          revenue: 0,
          profit: 0,
          loads: 0,
        };
        current.revenue += row.revenue;
        current.profit += row.profit;
        current.loads += 1;
        driverMap.set(row.driverId, current);
      }
    }

    const truckIds = Array.from(truckMap.keys());
    const driverIds = Array.from(driverMap.keys());
    const truckLabels = new Map<string, string>();
    const driverLabels = new Map<string, string>();

    if (truckIds.length > 0) {
      const { data: trucks } = await supabase
        .from("trucks")
        .select("id, truck_number, name")
        .in("id", truckIds);
      (trucks || []).forEach((truck: any) => {
        truckLabels.set(truck.id, truck.truck_number || truck.name || truck.id);
      });

      if (truckLabels.size === 0) {
        const { data: fleets } = await supabase
          .from("fleets")
          .select("id, fleet_number, name")
          .in("id", truckIds);
        (fleets || []).forEach((fleet: any) => {
          truckLabels.set(fleet.id, fleet.fleet_number || fleet.name || fleet.id);
        });
      }
    }

    if (driverIds.length > 0) {
      const { data: drivers } = await supabase
        .from("drivers")
        .select("id, name")
        .eq("organization_id", profile.organization_id)
        .in("id", driverIds);
      (drivers || []).forEach((driver: any) => {
        driverLabels.set(driver.id, driver.name || driver.id);
      });
    }

    const truckRows = Array.from(truckMap.entries())
      .map(([truckId, entry]) => ({
        truckLabel: truckLabels.get(truckId) || truckId,
        revenue: Math.round(entry.revenue),
        profit: Math.round(entry.profit),
        margin: entry.revenue > 0 ? entry.profit / entry.revenue : 0,
        loads: entry.loads,
        profitPerMile: entry.miles > 0 ? entry.profit / entry.miles : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);

    const driverRows = Array.from(driverMap.entries())
      .map(([driverId, entry]) => ({
        driverName: driverLabels.get(driverId) || driverId,
        revenue: Math.round(entry.revenue),
        profit: Math.round(entry.profit),
        margin: entry.revenue > 0 ? entry.profit / entry.revenue : 0,
        loads: entry.loads,
        profitPerLoad: entry.loads > 0 ? entry.profit / entry.loads : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);

    return NextResponse.json({
      loads: loadRows.map(({ truckId, driverId, distance, ...row }) => row),
      trucks: truckRows,
      drivers: driverRows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load financial tabs" },
      { status: 500 },
    );
  }
}
