// app/api/sla/overview.ts
import { NextRequest, NextResponse } from "next/server";
import { getAlertEvents } from "@/src/alerts/history/alert.event.store";
import { computeSLAMetrics } from "@/src/sla/metrics";

function getOrganizationId(req: NextRequest): string {
  const company = req.headers.get("x-organization-id");
  if (!company) throw new Error("Missing organization context");
  return company;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = getOrganizationId(req);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    let events = getAlertEvents(organizationId, 1000);
    if (from) events = events.filter((e) => e.triggeredAt >= from);
    if (to) events = events.filter((e) => e.triggeredAt <= to);
    const metrics = computeSLAMetrics(events);
    return NextResponse.json(metrics, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to compute SLA metrics" },
      { status: 400 },
    );
  }
}

