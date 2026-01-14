import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const COST_PER_HOUR = 25;
const COST_PER_DISPUTE = 150;
const COST_PER_ANOMALY_MISSED = 500;

function getStartDate(timeframe: string) {
  const now = new Date();
  const startDate = new Date(now);

  if (timeframe === "90d") {
    startDate.setDate(now.getDate() - 90);
  } else if (timeframe === "1y") {
    startDate.setFullYear(now.getFullYear() - 1);
  } else {
    startDate.setDate(now.getDate() - 30);
  }

  return startDate;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function GET(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const supabase = createSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "30d";

    let organizationId = searchParams.get("organization_id") || undefined;

    if (!demoMode) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (!organizationId) {
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        organizationId = orgMember?.organization_id || undefined;
      } else {
        const { data: orgMember } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("organization_id", organizationId)
          .single();

        if (!orgMember?.organization_id) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 },
          );
        }
      }
    }

    const startDate = getStartDate(timeframe);

    let ticketsQuery = supabase
      .from("aggregate_tickets")
      .select("id, created_at, driver_id")
      .gte("created_at", startDate.toISOString());

    if (organizationId) {
      ticketsQuery = supabase
        .from("aggregate_tickets")
        .select("id, created_at, driver:drivers!inner(organization_id)")
        .eq("driver.organization_id", organizationId)
        .gte("created_at", startDate.toISOString());
    }

    const { data: tickets, error: ticketError } = await ticketsQuery;
    if (ticketError) {
      return NextResponse.json(
        { error: "Failed to load tickets" },
        { status: 500 },
      );
    }

    const ticketRows = tickets || [];
    const ticketIds = ticketRows.map((t: any) => t.id);

    const confidenceEvents: { created_at: string; confidence_score: number }[] =
      [];
    const anomalyEvents: { created_at: string }[] = [];

    if (ticketIds.length > 0) {
      const ticketChunks = chunkArray(ticketIds, 500);

      for (const chunk of ticketChunks) {
        const { data: confidenceChunk } = await supabase
          .from("data_confidence_events")
          .select("created_at, confidence_score, entity_id")
          .gte("created_at", startDate.toISOString())
          .in("entity_id", chunk);

        if (confidenceChunk) {
          confidenceEvents.push(
            ...confidenceChunk.map((e: any) => ({
              created_at: e.created_at,
              confidence_score: e.confidence_score,
            })),
          );
        }

        const { data: anomalyChunk } = await supabase
          .from("anomaly_events")
          .select("created_at, entity_id")
          .gte("created_at", startDate.toISOString())
          .in("entity_id", chunk);

        if (anomalyChunk) {
          anomalyEvents.push(
            ...anomalyChunk.map((e: any) => ({
              created_at: e.created_at,
            })),
          );
        }
      }
    }

    const ticketCount = ticketRows.length;
    const anomaliesDetected = anomalyEvents.length;
    const lowConfidenceTickets = confidenceEvents.filter(
      (e) => e.confidence_score < 0.7,
    ).length;

    const manualMinutesPerTicket = 15;
    const automatedMinutesPerTicket = 2;
    const minutesSaved =
      ticketCount * (manualMinutesPerTicket - automatedMinutesPerTicket);
    const hoursSaved = minutesSaved / 60;

    const disputesAvoided = Math.floor(anomaliesDetected * 0.05);

    const laborSavings = hoursSaved * COST_PER_HOUR;
    const disputeSavings = disputesAvoided * COST_PER_DISPUTE;
    const anomalySavings = anomaliesDetected * COST_PER_ANOMALY_MISSED * 0.1;
    const totalSavings = laborSavings + disputeSavings + anomalySavings;

    const accuracy =
      ticketCount > 0
        ? ((ticketCount - lowConfidenceTickets) / ticketCount) * 100
        : 100;

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const months =
      timeframe === "1y" ? 12 : timeframe === "90d" ? 3 : 1;
    const monthlyTrends = [];

    for (let i = 0; i < months; i++) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);

      const monthTickets = ticketRows.filter((t: any) => {
        const ticketDate = new Date(t.created_at);
        return (
          ticketDate.getMonth() === monthDate.getMonth() &&
          ticketDate.getFullYear() === monthDate.getFullYear()
        );
      }).length;

      const monthAnomalies = anomalyEvents.filter((a) => {
        const anomalyDate = new Date(a.created_at);
        return (
          anomalyDate.getMonth() === monthDate.getMonth() &&
          anomalyDate.getFullYear() === monthDate.getFullYear()
        );
      }).length;

      const monthSavings =
        (monthTickets * 13) / 60 * COST_PER_HOUR +
        monthAnomalies * 0.05 * COST_PER_DISPUTE;

      monthlyTrends.unshift({
        month: monthNames[monthDate.getMonth()],
        tickets: monthTickets,
        savings: monthSavings,
        anomalies: monthAnomalies,
      });
    }

    return NextResponse.json({
      metrics: {
        ticketsProcessed: ticketCount,
        ticketsWithAnomalies: lowConfidenceTickets,
        anomaliesCaught: anomaliesDetected,
        estimatedSavings: totalSavings,
        hoursAutomated: hoursSaved,
        reconciliationAccuracy: accuracy,
        payrollDisputesAvoided: disputesAvoided,
        averageProcessingTime: automatedMinutesPerTicket,
        manualProcessingTime: manualMinutesPerTicket,
      },
      monthlyTrends,
    });
  } catch (error: any) {
    console.error("ROI dashboard error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
