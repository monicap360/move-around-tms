import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_LOOKBACK_DAYS = 90;

type LaneMetric = {
  lane: string;
  profit: number;
  volume: number;
  avg_cycle: number | null;
};

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function toNumber(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getStartDate(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now;
}

function buildLaneName(yardName?: string | null, plant?: string | null) {
  const yardLabel = yardName || "Unknown Yard";
  const plantLabel = plant || "Unknown Plant";
  return `${yardLabel} ↔ ${plantLabel}`;
}

export async function GET(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const organizationId = params?.["org"];

  if (!organizationId) {
    return NextResponse.json(
      { error: "Missing organization id" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const lookbackParam = Number(searchParams.get("days"));
  const lookbackDays =
    Number.isFinite(lookbackParam) && lookbackParam > 0
      ? Math.min(Math.max(lookbackParam, 7), 365)
      : DEFAULT_LOOKBACK_DAYS;
  const startDate = getStartDate(lookbackDays);

  const [yardsRes, loadsRes, ticketsRes] = await Promise.all([
    supabase
      .from("yards")
      .select("id, name")
      .eq("organization_id", organizationId),
    supabase
      .from("loads")
      .select("yard_id, plant, cycle_seconds, load_start, load_end")
      .eq("organization_id", organizationId)
      .gte("created_at", startDate.toISOString()),
    supabase
      .from("aggregate_tickets")
      .select(
        "id, yard_id, plant, total_profit, total_bill, total_pay, quantity, bill_rate, pay_rate, ticket_date, created_at",
      )
      .eq("organization_id", organizationId)
      .gte("created_at", startDate.toISOString()),
  ]);

  if (yardsRes.error) {
    return NextResponse.json(
      { error: yardsRes.error.message },
      { status: 500 },
    );
  }
  if (loadsRes.error) {
    return NextResponse.json(
      { error: loadsRes.error.message },
      { status: 500 },
    );
  }
  if (ticketsRes.error) {
    return NextResponse.json(
      { error: ticketsRes.error.message },
      { status: 500 },
    );
  }

  const yardNameById = new Map<string, string>();
  (yardsRes.data || []).forEach((yard: any) => {
    if (yard?.id) yardNameById.set(yard.id, yard.name || "Unknown Yard");
  });

  const laneMap = new Map<
    string,
    {
      lane: string;
      profit: number;
      volume: number;
      cycleTotalMinutes: number;
      cycleCount: number;
    }
  >();

  const createEntry = (laneLabel: string) => ({
    lane: laneLabel,
    profit: 0,
    volume: 0,
    cycleTotalMinutes: 0,
    cycleCount: 0,
  });

  (ticketsRes.data || []).forEach((ticket: any) => {
    const yardId = ticket?.yard_id || null;
    const plant = ticket?.plant || null;
    const laneKey = `${yardId || "unknown"}::${plant || "unknown"}`;
    const laneName = buildLaneName(yardNameById.get(yardId), plant);

    const totalProfit =
      toNumber(ticket.total_profit) ||
      toNumber(ticket.total_bill) - toNumber(ticket.total_pay) ||
      toNumber(ticket.quantity) *
        (toNumber(ticket.bill_rate) - toNumber(ticket.pay_rate));

    const entry = laneMap.get(laneKey) || createEntry(laneName);

    entry.profit += totalProfit;
    entry.volume += 1;
    laneMap.set(laneKey, entry);
  });

  (loadsRes.data || []).forEach((load: any) => {
    const yardId = load?.yard_id || null;
    const plant = load?.plant || null;
    const laneKey = `${yardId || "unknown"}::${plant || "unknown"}`;
    const laneName = buildLaneName(yardNameById.get(yardId), plant);

    let cycleMinutes = 0;
    if (load?.cycle_seconds) {
      cycleMinutes = toNumber(load.cycle_seconds) / 60;
    } else if (load?.load_start && load?.load_end) {
      const start = new Date(load.load_start).getTime();
      const end = new Date(load.load_end).getTime();
      if (Number.isFinite(start) && Number.isFinite(end)) {
        cycleMinutes = (end - start) / (1000 * 60);
      }
    }

    const entry = laneMap.get(laneKey) || createEntry(laneName);

    if (cycleMinutes > 0) {
      entry.cycleTotalMinutes += cycleMinutes;
      entry.cycleCount += 1;
    }

    laneMap.set(laneKey, entry);
  });

  const lanes: LaneMetric[] = Array.from(laneMap.values()).map((entry) => ({
    lane: entry.lane,
    profit: Math.round(entry.profit),
    volume: entry.volume,
    avg_cycle:
      entry.cycleCount > 0
        ? Math.round(entry.cycleTotalMinutes / entry.cycleCount)
        : null,
  }));

  lanes.sort((a, b) => b.profit - a.profit);

  return NextResponse.json(lanes);
}

export async function POST(req: NextRequest, { params }: any) {
  return GET(req, { params });
}
