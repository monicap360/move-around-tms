import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TicketRow = {
  ticket_date: string | null;
  material?: string | null;
  material_type?: string | null;
  total_profit?: number | null;
  total_bill?: number | null;
  quantity?: number | null;
  unit_type?: string | null;
  load_weight?: number | null;
  pickup_location?: string | null;
  dump_location?: string | null;
  calculated_distance?: number | null;
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
        "ticket_date, material, material_type, total_profit, total_bill, quantity, unit_type, load_weight, pickup_location, dump_location, calculated_distance",
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

    const materialMap = new Map<
      string,
      {
        profit: number;
        bill: number;
        loads: number;
        tons: number;
      }
    >();
    const routeMap = new Map<
      string,
      {
        profit: number;
        bill: number;
        loads: number;
        miles: number;
      }
    >();

    for (const row of rows) {
      const materialName = row.material_type || row.material || "Unknown";
      const profit = Number(row.total_profit) || 0;
      const bill = Number(row.total_bill) || 0;
      const quantity = Number(row.quantity) || 0;
      const loadWeight = Number(row.load_weight) || 0;
      const unitType = (row.unit_type || "").toLowerCase();
      const tons =
        loadWeight > 0
          ? loadWeight
          : unitType === "ton"
            ? quantity
            : 0;

      const materialEntry = materialMap.get(materialName) || {
        profit: 0,
        bill: 0,
        loads: 0,
        tons: 0,
      };
      materialEntry.profit += profit;
      materialEntry.bill += bill;
      materialEntry.loads += 1;
      materialEntry.tons += tons;
      materialMap.set(materialName, materialEntry);

      const routeKey = `${row.pickup_location || "Origin"} → ${row.dump_location || "Destination"}`;
      const routeEntry = routeMap.get(routeKey) || {
        profit: 0,
        bill: 0,
        loads: 0,
        miles: 0,
      };
      routeEntry.profit += profit;
      routeEntry.bill += bill;
      routeEntry.loads += 1;
      routeEntry.miles += Number(row.calculated_distance) || 0;
      routeMap.set(routeKey, routeEntry);
    }

    const totalProfit = Array.from(materialMap.values()).reduce(
      (sum, item) => sum + item.profit,
      0,
    );

    const materials = Array.from(materialMap.entries())
      .map(([material, item]) => {
        const margin = item.bill > 0 ? item.profit / item.bill : 0;
        return {
          material,
          profit: Math.round(item.profit),
          margin,
          loads: item.loads,
          share: totalProfit > 0 ? item.profit / totalProfit : 0,
          profitPerTon: item.tons > 0 ? item.profit / item.tons : 0,
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 4);

    const routes = Array.from(routeMap.entries())
      .map(([route, item]) => {
        const margin = item.bill > 0 ? item.profit / item.bill : 0;
        return {
          route,
          profit: Math.round(item.profit),
          margin,
          loads: item.loads,
          profitPerMile: item.miles > 0 ? item.profit / item.miles : 0,
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 3);

    return NextResponse.json({
      materials,
      routes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load financial insights" },
      { status: 500 },
    );
  }
}
