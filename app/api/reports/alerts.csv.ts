// app/api/reports/alerts.csv.ts
import { NextRequest, NextResponse } from "next/server";
import { getAlertEvents } from "@/src/alerts/history/alert.event.store";
import { toCSV } from "@/src/reports/csv.util";

function getOrganizationId(req: NextRequest): string {
  const org = req.headers.get("x-organization-id");
  if (!org) throw new Error("Missing organization context");
  return org;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = getOrganizationId(req);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const severity = searchParams.get("severity");
    let events = getAlertEvents(organizationId, 1000);
    if (from) events = events.filter((e) => e.triggeredAt >= from);
    if (to) events = events.filter((e) => e.triggeredAt <= to);
    if (severity) events = events.filter((e) => e.severity === severity);
    const rows = [
      [
        "Alert ID",
        "Severity",
        "Triggered At",
        "Acknowledged At",
        "Time to Ack (s)",
        "Evidence Refs",
        "Message",
        "Metric Path",
      ],
      ...events.map((e) => [
        e.alertId,
        e.severity,
        e.triggeredAt,
        e.acknowledgedAt || "",
        e.acknowledgedAt
          ? Math.round(
              (new Date(e.acknowledgedAt).getTime() -
                new Date(e.triggeredAt).getTime()) /
                1000,
            )
          : "",
        e.evidenceRefs.join(";"),
        e.message,
        e.metricPath,
      ]),
    ];
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="alerts.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to generate report" },
      { status: 400 },
    );
  }
}
