// app/api/alerts/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAlertEvents } from "@/src/alerts/history/alert.event.store";

function getOrganizationId(req: NextRequest): string {
  const company = req.headers.get("x-organization-id");
  if (!company) throw new Error("Missing organization context");
  return company;
}

export async function GET(req: NextRequest) {
  try {
    const organizationId = getOrganizationId(req);
    const events = getAlertEvents(organizationId);
    return NextResponse.json(events, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to load alert history" },
      { status: 400 },
    );
  }
}

