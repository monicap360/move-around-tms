import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_LOOKBACK_DAYS = 30;
const LOW_CONFIDENCE_THRESHOLD = 0.7;

type AlertItem = {
  type: string;
  details: string;
  detected_at: string;
  severity?: string;
  entity_type?: string;
  entity_id?: string;
};

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

function getStartDate(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return now;
}

async function filterByOrganization(
  supabase: ReturnType<typeof createServerAdmin>,
  organizationId: string,
  events: any[],
) {
  const ticketIds = Array.from(
    new Set(
      events
        .filter((event) => event.entity_type === "ticket")
        .map((event) => event.entity_id),
    ),
  );
  const loadIds = Array.from(
    new Set(
      events
        .filter((event) => event.entity_type === "load")
        .map((event) => event.entity_id),
    ),
  );
  const documentIds = Array.from(
    new Set(
      events
        .filter((event) => event.entity_type === "document")
        .map((event) => event.entity_id),
    ),
  );

  const [ticketsRes, loadsRes, documentsRes] = await Promise.all([
    ticketIds.length
      ? supabase
          .from("aggregate_tickets")
          .select("id")
          .eq("organization_id", organizationId)
          .in("id", ticketIds)
      : Promise.resolve({ data: [] }),
    loadIds.length
      ? supabase
          .from("loads")
          .select("id")
          .eq("organization_id", organizationId)
          .in("id", loadIds)
      : Promise.resolve({ data: [] }),
    documentIds.length
      ? supabase
          .from("driver_documents")
          .select("id")
          .eq("organization_id", organizationId)
          .in("id", documentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const ticketSet = new Set((ticketsRes.data || []).map((row: any) => row.id));
  const loadSet = new Set((loadsRes.data || []).map((row: any) => row.id));
  const documentSet = new Set(
    (documentsRes.data || []).map((row: any) => row.id),
  );

  return events.filter((event) => {
    if (event.entity_type === "ticket") {
      return ticketSet.has(event.entity_id);
    }
    if (event.entity_type === "load") {
      return loadSet.has(event.entity_id);
    }
    if (event.entity_type === "document") {
      return documentSet.has(event.entity_id);
    }
    return false;
  });
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

  const [anomalyRes, confidenceRes] = await Promise.all([
    supabase
      .from("anomaly_events")
      .select(
        "id, entity_type, entity_id, anomaly_type, severity, explanation, field_name, actual_value, baseline_value, deviation_percentage, created_at, resolved",
      )
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("data_confidence_events")
      .select(
        "id, entity_type, entity_id, field_name, confidence_score, reason, created_at",
      )
      .gte("created_at", startDate.toISOString())
      .lt("confidence_score", LOW_CONFIDENCE_THRESHOLD)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (anomalyRes.error) {
    return NextResponse.json(
      { error: anomalyRes.error.message },
      { status: 500 },
    );
  }
  if (confidenceRes.error) {
    return NextResponse.json(
      { error: confidenceRes.error.message },
      { status: 500 },
    );
  }

  const anomalyEvents = anomalyRes.data || [];
  const confidenceEvents = confidenceRes.data || [];

  const filteredAnomalies = await filterByOrganization(
    supabase,
    organizationId,
    anomalyEvents,
  );
  const filteredConfidence = await filterByOrganization(
    supabase,
    organizationId,
    confidenceEvents,
  );

  const alerts: AlertItem[] = [
    ...filteredAnomalies.map((event: any) => ({
      type: event.anomaly_type || "Anomaly",
      details: event.explanation || "Anomaly detected",
      detected_at: event.created_at,
      severity: event.severity || "medium",
      entity_type: event.entity_type,
      entity_id: event.entity_id,
    })),
    ...filteredConfidence.map((event: any) => ({
      type: "Low Confidence",
      details: event.reason
        ? `${event.field_name || "Field"}: ${event.reason}`
        : `${event.field_name || "Field"} confidence below threshold`,
      detected_at: event.created_at,
      severity: "low",
      entity_type: event.entity_type,
      entity_id: event.entity_id,
    })),
  ];

  alerts.sort(
    (a, b) =>
      new Date(b.detected_at).getTime() -
      new Date(a.detected_at).getTime(),
  );

  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest, { params }: any) {
  return GET(req, { params });
}
