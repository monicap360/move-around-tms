// app/api/dashboards/trends.ts
import { NextRequest, NextResponse } from "next/server";
import { getAlertEvents } from "@/src/alerts/history/alert.event.store";
import { calcTrends } from "@/src/dashboard/trends/trends.calc";

function getOrganizationId(req: NextRequest): string {
  const org = req.headers.get("x-organization-id");
  if (!org) throw new Error("Missing organization context");
  return org;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = getOrganizationId(req);
    const from =
      searchParams.get("from") ||
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
    const groupBy = (searchParams.get("groupBy") as "day" | "week") || "day";
    const severity = searchParams.get("severity") || undefined;
    const events = getAlertEvents(organizationId, 1000);
    const trends = calcTrends(events, from, to, groupBy, severity);
    return NextResponse.json(trends, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to load trends" },
      { status: 400 },
    );
  }
}
