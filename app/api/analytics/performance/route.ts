import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";
    const organizationId = searchParams.get("organization_id");

    const supabase = createSupabaseServerClient();

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

    const startDate = getRangeStart(range);
    const endDate = new Date();

    let ticketsQuery = supabase
      .from("aggregate_tickets")
      .select("ticket_date, total_pay, total_bill, total_profit")
      .gte("ticket_date", startDate.toISOString().split("T")[0])
      .lte("ticket_date", endDate.toISOString().split("T")[0]);

    if (organizationId) {
      ticketsQuery = ticketsQuery.eq("organization_id", organizationId);
    }

    const { data: tickets } = await ticketsQuery;

    const ticketRows = tickets || [];
    const ticketMap = new Map<string, { revenue: number; profit: number; count: number }>();
    for (const ticket of ticketRows) {
      const dateKey = ticket.ticket_date || endDate.toISOString().split("T")[0];
      const current = ticketMap.get(dateKey) || { revenue: 0, profit: 0, count: 0 };
      const totalBill = Number(ticket.total_bill) || 0;
      const totalProfit =
        Number(ticket.total_profit) ||
        totalBill - (Number(ticket.total_pay) || 0);
      current.revenue += totalBill;
      current.profit += totalProfit;
      current.count += 1;
      ticketMap.set(dateKey, current);
    }

    const bucketSize =
      range === "90d" ? 3 : range === "1y" ? 7 : 1;

    const buildBuckets = () => {
      const buckets: Array<{
        period: string;
        revenue: number;
        profit: number;
        tickets: number;
      }> = [];

      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor);
        bucketEnd.setDate(bucketEnd.getDate() + bucketSize - 1);

        let revenue = 0;
        let profit = 0;
        let count = 0;

        for (let d = 0; d < bucketSize; d++) {
          const day = new Date(bucketStart);
          day.setDate(bucketStart.getDate() + d);
          const key = day.toISOString().split("T")[0];
          const dayData = ticketMap.get(key);
          if (dayData) {
            revenue += dayData.revenue;
            profit += dayData.profit;
            count += dayData.count;
          }
        }

        buckets.push({
          period: bucketStart.toISOString().split("T")[0],
          revenue: Math.round(revenue),
          profit: Math.round(profit),
          tickets: count,
        });

        cursor.setDate(cursor.getDate() + bucketSize);
      }

      return buckets;
    };

    const performanceBuckets = buildBuckets();

    const { data: eldTrips } = await supabase
      .from("eld_trips")
      .select("total_miles, start_time")
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString());

    const { data: fuelPurchases } = await supabase
      .from("fuel_purchases")
      .select("gallons, purchase_date")
      .gte("purchase_date", startDate.toISOString().split("T")[0])
      .lte("purchase_date", endDate.toISOString().split("T")[0]);

    const totalMiles = (eldTrips || []).reduce(
      (sum, trip) => sum + (Number(trip.total_miles) || 0),
      0,
    );
    const totalGallons = (fuelPurchases || []).reduce(
      (sum, purchase) => sum + (Number(purchase.gallons) || 0),
      0,
    );
    const averageMPG = totalGallons > 0 ? totalMiles / totalGallons : 0;

    const performanceData = performanceBuckets.map((bucket) => ({
      ...bucket,
      mpg: parseFloat(averageMPG.toFixed(1)),
    }));

    return NextResponse.json({
      success: true,
      data: performanceData,
      summary: {
        totalRevenue: performanceData.reduce(
          (sum, item) => sum + item.revenue,
          0,
        ),
        totalProfit: performanceData.reduce(
          (sum, item) => sum + item.profit,
          0,
        ),
        totalTickets: performanceData.reduce(
          (sum, item) => sum + item.tickets,
          0,
        ),
        averageMPG: parseFloat(
          (
            performanceData.reduce((sum, item) => sum + item.mpg, 0) /
            performanceData.length
          ).toFixed(1),
        ),
      },
    });
  } catch (error) {
    console.error("Analytics performance error:", error);
    return NextResponse.json(
      { error: "Failed to load performance data" },
      { status: 500 },
    );
  }
}
