import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d";

    // Generate mock performance trend data
    const generatePerformanceData = (days: number) => {
      const data = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const period = date.toISOString().split("T")[0];

        data.push({
          period,
          revenue: Math.floor(Math.random() * 15000) + 8000, // $8k-$23k daily
          profit: Math.floor(Math.random() * 5000) + 2000, // $2k-$7k daily
          tickets: Math.floor(Math.random() * 30) + 15, // 15-45 tickets
          mpg: parseFloat((Math.random() * 2 + 6.5).toFixed(1)), // 6.5-8.5 MPG
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

    const performanceData = generatePerformanceData(days);

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
