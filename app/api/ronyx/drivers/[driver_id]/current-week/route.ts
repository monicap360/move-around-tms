import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { getNextFriday } from "@/lib/ronyx/payRateService";

function getWeekStart(date: Date) {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const start = new Date(date);
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: { driver_id: string } },
) {
  const driverId = params.driver_id;
  if (!driverId) {
    return NextResponse.json(
      { error: "driver_id is required" },
      { status: 400 },
    );
  }

  const { data: driver, error: driverError } = await supabaseAdmin
    .from("drivers")
    .select("id, first_name, last_name, truck_number")
    .eq("id", driverId)
    .single();

  if (driverError || !driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  const weekEndDate = getNextFriday(new Date());
  const weekStartDate = getWeekStart(new Date());

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("driver_settlement_items")
    .select("*")
    .eq("driver_id", driverId)
    .eq("week_end_date", weekEndDate)
    .order("created_at", { ascending: false });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const loadIds = Array.from(
    new Set((items || []).map((item: any) => item.load_id).filter(Boolean)),
  );
  let loadsById: Record<string, any> = {};
  if (loadIds.length > 0) {
    const { data: loads } = await supabaseAdmin
      .from("ronyx_loads")
      .select("id, load_number, delivery_location")
      .in("id", loadIds);
    loadsById = (loads || []).reduce((acc: Record<string, any>, load: any) => {
      acc[String(load.id)] = load;
      return acc;
    }, {});
  }

  const summary = (items || []).reduce(
    (acc: any, item: any) => {
      acc.total_tons += Number(item.quantity || 0);
      acc.total_amount += Number(item.calculated_amount || 0);
      acc.load_count += 1;
      return acc;
    },
    { total_tons: 0, total_amount: 0, load_count: 0 },
  );

  const responseItems = (items || []).map((item: any) => {
    const load = loadsById[String(item.load_id)] || {};
    return {
      id: item.id,
      date: item.created_at?.slice(0, 10) || null,
      load_id: item.load_id,
      load_number: load.load_number || "N/A",
      ticket_number: item.ticket_number,
      material: item.material_type,
      quantity: Number(item.quantity || 0),
      rate: `$${Number(item.rate_value || 0).toFixed(2)}/${item.rate_type}`,
      amount: Number(item.calculated_amount || 0),
      status: item.status,
      can_dispute: item.status === "PENDING",
      destination: load.delivery_location || null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      driver: {
        id: driver.id,
        name: `${driver.first_name || ""} ${driver.last_name || ""}`.trim(),
        truck_number: driver.truck_number || null,
      },
      week: {
        start_date: weekStartDate,
        end_date: weekEndDate,
        status: "ACTIVE",
      },
      summary: {
        total_tons: Number(summary.total_tons.toFixed(2)),
        total_loads: summary.load_count,
        haul_earnings: Number(summary.total_amount.toFixed(2)),
        adjustments: 0,
        net_pay: Number(summary.total_amount.toFixed(2)),
        currency: "USD",
      },
      items: responseItems,
      adjustments: [],
    },
  });
}
