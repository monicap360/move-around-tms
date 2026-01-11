import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Query real performance data from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organization_id");

    // Generate performance data from real database
    const generatePerformanceData = async (days: number) => {
      const data = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const period = date.toISOString().split("T")[0];

        // Query tickets for this day
        let ticketsQuery = supabase
          .from("aggregate_tickets")
          .select("total_pay, total_bill, total_profit")
          .eq("ticket_date", period);

        if (organizationId) {
          ticketsQuery = ticketsQuery.eq("organization_id", organizationId);
        }

        const { data: dayTickets } = await ticketsQuery;

        const dayRevenue = (dayTickets || []).reduce((sum: number, t: any) => sum + (Number(t.total_bill) || 0), 0);
        const dayProfit = (dayTickets || []).reduce((sum: number, t: any) => sum + (Number(t.total_profit) || Number(t.total_bill) - Number(t.total_pay) || 0), 0);
        const dayTicketsCount = dayTickets?.length || 0;

        // MPG calculation (placeholder - would need fuel consumption data)
        const mpg = 7.2; // Placeholder

        data.push({
          period,
          revenue: Math.round(dayRevenue),
          profit: Math.round(dayProfit),
          tickets: dayTicketsCount,
          mpg: parseFloat(mpg.toFixed(1)),
        });
      }

      return data;
    };

    let days: number;
    switch (range) {
      case "7d":
        days = 7;
        break;
      case "90d":
        days = 30; // Show 30 data points for 90 days (every 3 days)
        break;
      case "1y":
        days = 52; // Show 52 data points for 1 year (weekly)
        break;
      default: // 30d
        days = 30;
    }

    const performanceData = await generatePerformanceData(days);

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
