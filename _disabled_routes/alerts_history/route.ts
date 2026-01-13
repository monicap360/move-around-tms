// app/api/alerts/history/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAlertEvents } from "@/src/alerts/history/alert.event.store";

/**
 * Extract organization context from request headers
 */
function getOrganizationId(req: NextRequest): string {
  const org = req.headers.get("x-organization-id");
  if (!org) {
    throw new Error("Missing organization context");
  }
  return org;
}

/**
 * GET /api/alerts/history
 * Header required: x-organization-id
 */
export async function GET(req: NextRequest) {
  try {
    const organizationId = getOrganizationId(req);

    // IMPORTANT: await the async call
    const events = await getAlertEvents(organizationId);

    return NextResponse.json(
      { events },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Alert history route error:", err);

    return NextResponse.json(
      {
        error: err?.message ?? "Failed to load alert history",
      },
      { status: 400 }
    );
  }
}
